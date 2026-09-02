import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Animated,
  Platform,
  AccessibilityInfo,
  Image,
  Dimensions,
} from "react-native";
import Svg, { Defs, RadialGradient, Stop, Circle, Polygon, Line } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useLocalHome } from "@/lib/home-store";
import { formatEquity } from "@/lib/format";
import { NET_LAYER } from "@/lib/ecosystem";
import { BOND, SEATS, SEATS_HELD, SEATS_OPEN, usdShort } from "@/lib/investor-data";
import { CockpitBackdrop } from "@/components/cockpit-backdrop";
import { DualStrandHelix } from "@/components/dual-strand-helix";
import { OntologyReadoutPanel } from "@/components/ontology-readout-panel";
import { probeDomains, WEB_PROBE_BLOCKED, type ProbeResult } from "@/lib/domain-probe";
import { useJourneyChecklist, toggleChecklistItem, type ChecklistKind } from "@/lib/journey-checklist";
import { AGENT_MINDS } from "@/lib/agents";
import { DEFAULT_AVATAR } from "@/lib/default-avatar";
import { useHomeLedger } from "@/lib/use-home-ledger";
import { piStream } from "@/lib/pi-stream";
import { computeStrands } from "@/lib/strands";
import { computeRecovery } from "@/lib/recovery";
import { hasBones } from "@/lib/jspace-facts";
import { custodianOverlook, TTP_V4_APPS, TTP_V4_BANDS, TTP_V4_MATRIX } from "@ml-systems/types";

/**
 * The Custodian cockpit — Sal's view of the apps & ecosystems while he builds the
 * user base, focused on the two things that make ML Systems a force multiplier: the
 * **Dual J-Space** (one home → a physical + a financial strand) and **collective
 * ontology compression** (the Custodian's mint→confirm→reuse loop). Below the two
 * focus surfaces sits one merged "Apps & Ecosystems" board (domain wiring + every
 * app grouped by its mind + the .net professional layer) and the homeowner roster.
 * Everything is derived from the roster (lib/agents.ts) + the live swarm board so
 * nothing drifts. Agent MINDS stay private.
 *
 * Theme: a deep-space backdrop + aurora + starfield (CockpitBackdrop) and a gold
 * 2-layer Custodian apex node (Fiduciary shell / Operational core).
 */

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });
const GOLD = "#FFE500";

// Translucent "glass" over the space field.
const glass = {
  backgroundColor: "rgba(255,255,255,0.03)",
  borderColor: "rgba(255,255,255,0.08)",
  borderWidth: 1,
} as const;

const LENSES = [
  { key: "TT", name: "Transparency Trust" },
  { key: "LL", name: "Lucent Lens" },
  { key: "MVE", name: "Min. Viable Expense" },
];

// The engine-flow loop — the Custodian's multidimensional × multilayered pass, ported
// from value-chain/collective-agent-consciousness/engine-flow.html as a compact strip.
const ENGINE_LOOP: { label: string; color: string }[] = [
  { label: "Intent", color: "#22C55E" },
  { label: "Gate", color: "#FFE500" },
  { label: "Fragment", color: "#FFE500" },
  { label: "Resolve", color: "#60A5FA" },
  { label: "VERA", color: "#34D399" },
  { label: "PI drafts", color: "#22C55E" },
  { label: "Close", color: "#FFE500" },
  { label: "Homeowner", color: "#86EFAC" },
];

// ── Apps & Ecosystems — every app each mind has wired, grouped by agent, with the
// mind's tier + phone-wired state folded into the group header. Derived from the
// roster so the cockpit never drifts. ──────────────────────────────────────────────
const APPS_BY_AGENT = AGENT_MINDS.map((m) => ({
  agent: m.name,
  color: m.color,
  tier: m.tier,
  phoneWired: !!m.chatWired,
  apps: m.compartment.map((c) => ({ name: c.label, route: c.href, data: c.data ?? "STATIC" })),
})).filter((g) => g.apps.length > 0);
const WIRED_APP_COUNT = APPS_BY_AGENT.reduce((n, g) => n + g.apps.length, 0);
const PHONE_WIRED = AGENT_MINDS.filter((m) => m.chatWired).length;
const MIND_COUNT = AGENT_MINDS.length;
// Domain fallback when the API is unreachable — the Custodian's own .xyz is the apex
// (not a governed domain), so it is excluded from the governed-ecosystem wiring board.
const PENDING_DOMAINS = AGENT_MINDS.filter((m) => m.slug !== "custodian").flatMap((m) =>
  (m.domains ?? []).map((d) => ({ host: d.host, purpose: d.purpose, wired: d.wired, color: m.color })),
);
// Every governed ecosystem host (Custodian apex excluded) — PI's run-through list, and
// each host's mobile compartment route so a row reads "which app it feeds".
const GOVERNED_HOSTS = PENDING_DOMAINS.map((d) => d.host);
const DOMAIN_ROUTE: Record<string, string | undefined> = Object.fromEntries(
  AGENT_MINDS.filter((m) => m.slug !== "custodian").flatMap((m) =>
    (m.domains ?? []).map((d) => [d.host, m.compartment?.[0]?.href] as const),
  ),
);
const DATA_BADGE: Record<string, string> = { LIVE: "#22C55E", DEMO: "#F59E0B", STATIC: "#94A3B8" };

// ── Collective ontology compression — MVE as a control loop ─────────────────────────
// Measured 2026-07-29 from packages/ai/scripts/test-orchestrate.mts (garage run) and a
// qualityBar=90 stress run. Full readouts bundled in the Collective Consciousness gallery
// (compression-trace + ontology-compression-map).
const COMPRESSION = {
  run1Mc: 2906,
  run2Mc: 1818,
  savedPct: 37, // (2906 - 1818) / 2906 ≈ 0.374
  run2Width: "63%" as const, // 1818 / 2906 ≈ 0.626
  ladder: [
    { model: "haiku", vera: 78, pass: false, color: "#A78BFA" },
    { model: "sonnet", vera: 87, pass: false, color: "#A78BFA" },
    { model: "opus", vera: 89, pass: false, color: "#A78BFA" },
    { model: "flash-lite", vera: 72, pass: false, color: "#14B8A6" },
    { model: "3.6-flash", vera: 100, pass: true, color: "#22C55E" },
  ],
  widenAt: 3, // index where the family widens Claude → Gemini
} as const;

// ── Reduced-motion hook ────────────────────────────────────────────────────
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduced(!!v));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      mounted = false;
      (sub as { remove?: () => void } | undefined)?.remove?.();
    };
  }, []);
  return reduced;
}

// ── The 2-layer Custodian apex node ────────────────────────────────────────
function ApexNode({ reduced }: { reduced: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, t]);

  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const haloOp = t.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.6] });

  const S = 150;
  const c = S / 2;
  const shellR = 46;

  return (
    <View style={{ width: S, height: S, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ position: "absolute", opacity: reduced ? 0.45 : haloOp }}>
        <Svg width={S} height={S}>
          <Circle cx={c} cy={c} r={58} stroke={GOLD} strokeOpacity={0.5} strokeWidth={1} fill="none" />
        </Svg>
      </Animated.View>

      <Svg width={S} height={S} style={{ position: "absolute" }}>
        <Defs>
          <RadialGradient id="apexGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={GOLD} stopOpacity={0.75} />
            <Stop offset="42%" stopColor={GOLD} stopOpacity={0.2} />
            <Stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={66} fill="url(#apexGlow)" />
        <Polygon
          points={`${c},${c - shellR} ${c + shellR},${c} ${c},${c + shellR} ${c - shellR},${c}`}
          stroke={GOLD}
          strokeOpacity={0.5}
          strokeWidth={1.2}
          fill="none"
        />
        <Line x1={c - shellR} y1={c} x2={c + shellR} y2={c} stroke={GOLD} strokeOpacity={0.22} strokeWidth={0.8} />
        <Line x1={c} y1={c - shellR} x2={c} y2={c + shellR} stroke={GOLD} strokeOpacity={0.22} strokeWidth={0.8} />
      </Svg>

      <Animated.View style={{ transform: [{ scale: reduced ? 1 : scale }] }}>
        <Image
          source={DEFAULT_AVATAR}
          style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: GOLD, backgroundColor: "#0A0A0A" }}
        />
      </Animated.View>
    </View>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontFamily: MONO }} className="text-[#6B7280] text-[11px] uppercase tracking-[0.16em] mb-3">
      {children}
    </Text>
  );
}

// ── PI · Stream of Consciousness — the founder view of the SAME selector the J-Space
// renders (lib/pi-stream.ts), computed off the local home's ledger read-only. Which
// agent runs next, what tier opens it, and the one integration that's LIVE today:
// CDA × Design Studio (master VC ledger → plan-set genome handoff). ──────────────────
const STREAM_STATUS: Record<string, { label: string; color: string }> = {
  ran: { label: "RAN", color: "#34D399" },
  ready: { label: "READY", color: "#60A5FA" },
  "needs-data": { label: "WAITING", color: "#6B7280" },
  "tier-locked": { label: "TIER", color: "#F59E0B" },
};

function PiStreamPanel() {
  const home = useLocalHome();
  // Read-only compile — the cockpit observes the ledger, it never authors it.
  const ledger = useHomeLedger({ address: home?.address, persist: false });
  const facts = ledger.facts;
  const art = ledger.artifacts;
  const stream = useMemo(() => {
    const bones = hasBones(facts);
    const overlook = custodianOverlook({
      genome: facts.genome ?? null,
      fidelity: art.fidelity,
      swarm: {
        commonalities: art.swarmReport.commonalities.length,
        conflicts: art.swarmReport.conflicts.length,
        opsApplied: art.swarmReport.opsApplied,
      },
    });
    const grossSF = facts.grossSF ?? (bones ? art.tiled.grossSF : undefined);
    const strands = computeStrands(grossSF ? { ...facts, grossSF } : undefined);
    const rec = computeRecovery({ ...(grossSF ? { grossSF } : {}), ...(facts.levels ? { levels: facts.levels } : {}) });
    const p = strands.physical;
    const f = strands.financial;
    return piStream({
      reads: {
        cda: bones ? { grossSF: art.tiled.grossSF, levels: art.tiled.levels, rooms: art.tiled.rooms.length } : null,
        pit: f ? { marketValue: f.marketValue, equityAtClose: f.equityAtClose, monthlyPayment: f.monthlyPayment } : null,
        financingOpen: false, // founder read — the two-key gate lives with the homeowner
        reaper: rec ? { recoveryPct: rec.recoveryScore, salvage: rec.estSalvageValue } : null,
        murphy: p ? { nextCycleSF: p.nextCycleSF, nextCycleN: p.cycle + 1, nextLevels: p.levels + 1 } : null,
      },
      overlook,
      claimed: ledger.view.templateTotal - ledger.view.missing.length,
      templateTotal: ledger.view.templateTotal,
    });
  }, [facts, art, ledger.view]);

  return (
    <View className="rounded-2xl p-3.5 mb-7" style={{ backgroundColor: "rgba(34,197,94,0.05)", borderColor: "rgba(34,197,94,0.25)", borderWidth: 1 }}>
      <Text className="text-[#9CA3AF] text-[10px] leading-4 mb-2">
        {home?.address ? `${home.address} — ${stream.opening}` : stream.opening}
      </Text>
      {stream.lanes.map((lane) => {
        const s = STREAM_STATUS[lane.status] ?? STREAM_STATUS["needs-data"]!;
        return (
          <View key={lane.agent} className="flex-row items-center gap-2 py-1">
            <Text style={{ color: lane.color }} className="text-[10px] w-4 text-center">{lane.glyph}</Text>
            <Text style={{ color: lane.color }} className="text-[7.5px] font-bold tracking-widest w-24" numberOfLines={1}>
              {lane.title.split(" — ")[0]?.toUpperCase()}
            </Text>
            <Text className="text-[#D1D5DB] text-[9.5px] flex-1" numberOfLines={2}>{lane.thought}</Text>
            <Text style={{ color: s.color, borderColor: `${s.color}55`, backgroundColor: `${s.color}12` }} className="text-[6.5px] font-bold rounded-full px-1.5 py-0.5 border">
              {s.label}
            </Text>
          </View>
        );
      })}
      <View className="mt-2 pt-2 border-t" style={{ borderColor: "rgba(34,197,94,0.18)" }}>
        <Text className="text-[#86EFAC] text-[9px]">
          ⚡ CDA × Design Studio — master VC ledger → plan-set genome handoff · LIVE
        </Text>
        {stream.lucent ? (
          <Text style={{ fontFamily: MONO }} className="text-[#6B7280] text-[8.5px] mt-1">
            LL {stream.lucent.total}/100 (H{stream.lucent.homeowner} · C{stream.lucent.collective} · E{stream.lucent.engine}) · MVE {stream.mve}
          </Text>
        ) : (
          <Text style={{ fontFamily: MONO }} className="text-[#6B7280] text-[8.5px] mt-1">MVE {stream.mve}</Text>
        )}
      </View>
    </View>
  );
}

// ── TTP v4 · the App × Band pricing matrix (promoted to @ml-systems/types so PI —
// and this cockpit — can find it). 5 apps × L0–L4; each agent's tier ladder. ────────
function TtpMatrixPanel() {
  return (
    <View className="rounded-2xl p-3.5 mb-7" style={glass}>
      {/* Band header row */}
      <View className="flex-row items-center gap-1 mb-1.5">
        <View className="w-[76px]" />
        {TTP_V4_BANDS.map((b) => (
          <View key={b.key} className="flex-1 items-center">
            <Text style={{ color: b.color }} className="text-[8px] font-black">{b.key}</Text>
            <Text className="text-[#4B5563] text-[6px]" numberOfLines={1}>{b.queryCost}</Text>
          </View>
        ))}
      </View>
      {TTP_V4_APPS.map((app) => (
        <View key={app.key} className="flex-row items-center gap-1 py-1 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <View className="w-[76px]">
            <Text style={{ color: app.color }} className="text-[8.5px] font-bold" numberOfLines={1}>{app.short} · {app.agent}</Text>
          </View>
          {TTP_V4_BANDS.map((b) => (
            <View key={b.key} className="flex-1 items-center">
              <Text className="text-[#D1D5DB] text-[7px] text-center" numberOfLines={2}>
                {TTP_V4_MATRIX[app.key][b.key].tag}
              </Text>
            </View>
          ))}
        </View>
      ))}
      <Text className="text-[#4B5563] text-[7.5px] mt-2">
        Higher band = higher TTP score = deeper agent runs. PI reads this ladder to open lanes when a homeowner pays up a tier.
      </Text>
    </View>
  );
}

export function CustodianCockpit({ paddingTop }: { paddingTop?: number }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const home = useLocalHome();

  // The shared swarm list — each agent wires its own domain. Live wire state comes
  // from the backend capability map (wiring.board); falls back to the static roster
  // when the API is unreachable. The mobile trpc client is untyped (any), so the
  // backend shapes are declared here.
  const board = trpc.wiring.board.useQuery(undefined, { retry: 0 });
  // Homeowners on the mainframe — every real project PI orchestrates (admin scope).
  const homeowners = trpc.pi.listOrchestration.useQuery(undefined, { retry: 0 });
  type HomeownerRow = { projectId: string; address: string; city: string; cycleNumber: number; latestEquity: number | null };
  const homeownerRows: HomeownerRow[] = homeowners.data?.projects ?? [];

  // PI's live run-through — a client-side probe of every governed domain, so the board
  // shows what actually SERVES an app (feeds mobile/web), independent of whether the
  // backend API is a fresh deploy or reachable. The server governed counts (board) are
  // a bonus overlay when available.
  const [probe, setProbe] = useState<Record<string, ProbeResult>>({});
  const [probing, setProbing] = useState(false);
  const runProbe = useCallback(async () => {
    setProbing(true);
    try {
      setProbe(await probeDomains(GOVERNED_HOSTS));
    } finally {
      setProbing(false);
    }
  }, []);
  useEffect(() => {
    void runProbe();
  }, [runProbe]);

  type BoardAgent = {
    slug: string;
    name: string;
    color: string;
    domain: { host: string; purpose: string };
    wireState: "wired" | "pending";
    governed: number | null;
  };
  const boardAgents: BoardAgent[] | null = board.data?.agents ?? null;
  // Governed ecosystems only — the Custodian apex (.xyz) is not a governed domain.
  const swarmRows: {
    key: string;
    name: string | undefined;
    host: string;
    purpose: string;
    color: string;
    wired: boolean;
    governed: number | null;
  }[] = boardAgents
    ? boardAgents
        .filter((a) => a.slug !== "custodian")
        .map((a) => ({
          key: a.slug,
          name: a.name,
          host: a.domain.host,
          purpose: a.domain.purpose,
          color: a.color,
          wired: a.wireState === "wired",
          governed: a.governed,
        }))
    : PENDING_DOMAINS.map((d) => ({
        key: d.host,
        name: undefined,
        host: d.host,
        purpose: d.purpose,
        color: d.color,
        wired: d.wired,
        governed: null,
      }));
  // A row is "feeding an app" when PI's probe says it serves; on web (CORS-blocked)
  // fall back to the roster's static wired flag.
  const rowLive = (row: { host: string; wired: boolean }): boolean => {
    const p = probe[row.host];
    if (!p) return false; // not probed yet → "checking"
    if (p.webBlocked) return row.wired;
    return p.live;
  };
  const probed = (host: string): boolean => !!probe[host];
  const swarmWired = swarmRows.filter(rowLive).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#050507" }}>
      <CockpitBackdrop />
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: "transparent" }}
        contentContainerStyle={{
          paddingTop: paddingTop ?? insets.top + 12,
          paddingBottom: 40,
          paddingHorizontal: 16,
        }}
      >
        {/* ── 2-layer Custodian apex ── */}
        <View
          className="rounded-2xl items-center px-4 pt-5 pb-4 mb-4"
          style={{ backgroundColor: "rgba(255,229,0,0.04)", borderColor: "rgba(255,229,0,0.22)", borderWidth: 1 }}
        >
          <ApexNode reduced={reduced} />
          <Text style={{ fontFamily: MONO, color: "rgba(255,229,0,0.55)" }} className="text-[10px] uppercase tracking-[0.3em] mt-1">
            Tier 0 · Apex
          </Text>
          <Text
            className="text-[19px] font-extrabold mt-1"
            style={{ color: GOLD, letterSpacing: 1, textShadowColor: "rgba(255,229,0,0.6)", textShadowRadius: 14 }}
          >
            ◆ TT · Custodian
          </Text>
          <Text style={{ fontFamily: MONO }} className="text-[#6B7280] text-[9.5px] mt-2 uppercase tracking-[0.14em]">
            Two ecosystems · {swarmWired}/{swarmRows.length} domains wired · gates L1–L4
          </Text>
        </View>

        {/* ── Lens strip (compact) ── */}
        <View className="flex-row gap-2 mb-7">
          {LENSES.map((l) => (
            <View key={l.key} className="flex-1 rounded-xl px-3 py-2" style={glass}>
              <Text className="text-[#22C55E] text-[12px] font-black">{l.key}</Text>
              <Text className="text-[#9CA3AF] text-[9px] mt-0.5" numberOfLines={1}>{l.name}</Text>
            </View>
          ))}
        </View>

        {/* ══ AT THE TOP (Sal 9/1) — PI's stream of consciousness + the TTP v4 matrix:
             what PI would run next off the master ledger, and the pricing ladder that
             opens deeper runs. Same selector the J-Space card renders. ══ */}
        <SectionLabel>PI · Stream of Consciousness 🌱</SectionLabel>
        <PiStreamPanel />

        <SectionLabel>TTP v4 · App × Band Pricing Matrix</SectionLabel>
        <TtpMatrixPanel />

        {/* ══ FOCUS 1 — Dual J-Space ══
             One home's numbers as two intertwined strands (the force multiplier), the
             engine loop that computes them, and a door into the value-chain library. */}
        <SectionLabel>Dual J-Space · Collective Consciousness 🧬</SectionLabel>
        <Text className="text-[#6B7280] text-[11px] mb-3 -mt-1 leading-snug">
          One input. Two strands. One force multiplier — the same numbers draw the blueprint,
          finance the loan, and schedule the build.
        </Text>
        <View className="rounded-2xl p-3.5 mb-3" style={glass}>
          <DualStrandHelix
            width={Dimensions.get("window").width - 32 - 28}
            facts={home?.sqft ? { grossSF: home.sqft, cycle: 1 } : undefined}
          />
        </View>
        <View className="rounded-2xl p-3.5 mb-3" style={glass}>
          <Text style={{ fontFamily: MONO }} className="text-[#4B5563] text-[9px] font-bold uppercase tracking-[0.18em] mb-2.5">
            Engine flow · minimum viable expense
          </Text>
          <View className="flex-row flex-wrap items-center" style={{ gap: 6 }}>
            {ENGINE_LOOP.map((step, i) => (
              <Fragment key={step.label}>
                <View className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: `${step.color}18`, borderColor: `${step.color}44`, borderWidth: 1 }}>
                  <Text style={{ fontFamily: MONO, color: step.color }} className="text-[8px] font-bold">{String(i).padStart(2, "0")}</Text>
                  <Text className="text-[#E5E7EB] text-[10px] font-semibold">{step.label}</Text>
                </View>
                {i < ENGINE_LOOP.length - 1 ? <Text className="text-[#374151] text-[10px]">→</Text> : null}
              </Fragment>
            ))}
            <Text className="text-[#FFE500]/60 text-[11px]">↩</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/collective-consciousness")}
          activeOpacity={0.85}
          className="rounded-2xl px-4 py-3.5 mb-7 flex-row items-center"
          style={{ backgroundColor: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.35)", borderWidth: 1 }}
        >
          <Text>🧬</Text>
          <Text className="text-[#22C55E] text-[12.5px] font-bold ml-2">Open the Collective Consciousness</Text>
          <Text className="text-[#22C55E] text-[13px] ml-auto">→</Text>
        </TouchableOpacity>

        {/* ══ FOCUS 2 — Collective ontology compression ══
             MVE as a control loop: run 1 discovers each mind's floor, run 2 starts on
             it; mint → confirm → reuse grows the iron-clad coverage while the bill holds. */}
        <SectionLabel>Collective ontology compression</SectionLabel>
        <View className="rounded-2xl border p-4 mb-3" style={{ borderColor: "#A78BFA33", backgroundColor: "#A78BFA0A" }}>
          <View className="flex-row items-center gap-2 mb-1">
            <View className="rounded-full" style={{ width: 8, height: 8, backgroundColor: "#A78BFA" }} />
            <Text className="text-[#F9FAFB] text-[14px] font-bold">Mint once · confirm · reuse</Text>
          </View>
          <Text className="text-[#9CA3AF] text-[11px] mb-3">
            Run 1 discovers each mind's cheapest sufficient model; run 2 starts on it. The ontology
            grows more iron-clad every cycle — the bill doesn&apos;t move.
          </Text>

          <View className="flex-row items-baseline gap-2 mb-3">
            <Text style={{ color: "#22C55E" }} className="text-[26px] font-black">{COMPRESSION.savedPct}%</Text>
            <Text className="text-[#6B7280] text-[11px] flex-1">cheaper on run 2 · same 2 calls, no quality lost</Text>
          </View>

          <View className="gap-2 mb-4">
            <View className="flex-row items-center gap-2">
              <Text style={{ fontFamily: MONO }} className="text-[#6B7280] text-[9px] uppercase tracking-wider w-11">Run 1</Text>
              <View className="flex-1 rounded-full overflow-hidden" style={{ height: 8, backgroundColor: "rgba(148,163,184,0.12)" }}>
                <View style={{ height: 8, width: "100%", backgroundColor: "#F59E0B", borderRadius: 999 }} />
              </View>
              <Text style={{ fontFamily: MONO }} className="text-[#9CA3AF] text-[9px] w-14 text-right tabular-nums">{COMPRESSION.run1Mc}mc</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text style={{ fontFamily: MONO }} className="text-[#6B7280] text-[9px] uppercase tracking-wider w-11">Run 2</Text>
              <View className="flex-1 rounded-full overflow-hidden" style={{ height: 8, backgroundColor: "rgba(148,163,184,0.12)" }}>
                <View style={{ height: 8, width: COMPRESSION.run2Width, backgroundColor: "#22C55E", borderRadius: 999 }} />
              </View>
              <Text style={{ fontFamily: MONO }} className="text-[#9CA3AF] text-[9px] w-14 text-right tabular-nums">{COMPRESSION.run2Mc}mc</Text>
            </View>
          </View>

          <Text className="text-[#4B5563] text-[9px] font-bold uppercase tracking-[0.18em] mb-1.5">
            Escalation · pi · bar 90 stress run
          </Text>
          <View className="flex-row flex-wrap items-center gap-1.5">
            {COMPRESSION.ladder.map((r, i) => (
              <Fragment key={r.model}>
                {i === COMPRESSION.widenAt && <Text className="text-[#4B5563] text-[12px]">▸</Text>}
                <View
                  className="rounded-md px-2 py-1 flex-row items-center gap-1"
                  style={{ borderWidth: 1, borderColor: `${r.color}40`, backgroundColor: `${r.color}12` }}
                >
                  <Text style={{ color: r.color, fontFamily: MONO }} className="text-[9.5px] font-bold">{r.model}</Text>
                  <Text
                    style={{ color: r.pass ? "#22C55E" : "#6B7280", fontFamily: MONO }}
                    className="text-[9.5px] tabular-nums"
                  >
                    {r.vera}{r.pass ? "✓" : ""}
                  </Text>
                </View>
              </Fragment>
            ))}
          </View>
          <View className="flex-row flex-wrap items-center gap-1.5 mt-2.5">
            <Text className="text-[#6B7280] text-[10px]">floor folded</Text>
            <View className="rounded-md px-2 py-0.5" style={{ borderWidth: 1, borderColor: "#22C55E55", backgroundColor: "#22C55E12" }}>
              <Text style={{ color: "#22C55E", fontFamily: MONO }} className="text-[9.5px] font-bold">pi:gemini#1</Text>
            </View>
            <Text className="text-[#6B7280] text-[10px]">· next run starts here</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/collective-consciousness", params: { doc: "ontology-compression-map" } })}
          activeOpacity={0.85}
          className="rounded-2xl px-4 py-3.5 mb-7 flex-row items-center"
          style={{ backgroundColor: `${GOLD}10`, borderColor: `${GOLD}44`, borderWidth: 1 }}
        >
          <Text>🗺️</Text>
          <Text style={{ color: GOLD }} className="text-[12.5px] font-bold ml-2">Read the ontology out — the compression map</Text>
          <Text style={{ color: GOLD }} className="text-[13px] ml-auto">→</Text>
        </TouchableOpacity>

        {/* ── Ontological compression · live readout ── */}
        <SectionLabel>Ontological compression · live</SectionLabel>
        <OntologyReadoutPanel />

        {/* ══ Apps & Ecosystems (the primary view) ══ */}
        <SectionLabel>Apps &amp; Ecosystems</SectionLabel>

        {/* Domain wiring — PI runs through the 7 governed ecosystems (Custodian apex
             excluded) and confirms each one actually serves its app. */}
        <View className="flex-row items-center mb-2">
          <Text style={{ fontFamily: MONO }} className="text-[#4B5563] text-[9px] font-bold uppercase tracking-[0.18em]">
            PI run · {swarmWired}/{swarmRows.length} feeding an app
          </Text>
          <TouchableOpacity
            onPress={() => void runProbe()}
            disabled={probing}
            activeOpacity={0.85}
            className="ml-auto rounded-full px-3 py-1"
            style={{ backgroundColor: `${GOLD}18`, borderWidth: 1, borderColor: `${GOLD}55` }}
          >
            <Text style={{ fontFamily: MONO, color: GOLD }} className="text-[9px] font-bold uppercase tracking-[0.12em]">
              {probing ? "running…" : "▸ PI: run through all"}
            </Text>
          </TouchableOpacity>
        </View>
        <View className="gap-1.5 mb-2">
          {swarmRows.map((r) => {
            const live = rowLive(r);
            const p = probe[r.host];
            const checking = !probed(r.host) && probing;
            const route = DOMAIN_ROUTE[r.host];
            const status = p?.webBlocked ? "roster" : p?.status != null ? `http ${p.status}` : p ? "no route" : "";
            return (
              <TouchableOpacity
                key={r.key}
                activeOpacity={0.7}
                onPress={() => Linking.openURL(`https://${r.host}`)}
                className="flex-row items-center gap-2 rounded-lg px-2.5 py-1.5"
                style={
                  live
                    ? { backgroundColor: `${r.color}14`, borderColor: `${r.color}44`, borderWidth: 1 }
                    : { backgroundColor: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderStyle: "dashed" }
                }
              >
                <View className="rounded-full" style={{ width: 7, height: 7, backgroundColor: r.color, opacity: live ? 1 : 0.4 }} />
                {r.name ? <Text style={{ color: r.color }} className="text-[10px] font-bold">{r.name}</Text> : null}
                <Text style={{ fontFamily: MONO, color: live ? "#E5E7EB" : "#9CA3AF" }} className="text-[11px] font-bold">{r.host}</Text>
                <View className="flex-1">
                  <Text className="text-[#6B7280] text-[10px]" numberOfLines={1}>
                    {live && r.governed != null ? `governing ${r.governed} row${r.governed === 1 ? "" : "s"}` : r.purpose}
                  </Text>
                  {route ? (
                    <Text style={{ fontFamily: MONO }} className="text-[#4B5563] text-[8px]" numberOfLines={1}>feeds → mobile {route}</Text>
                  ) : null}
                </View>
                <Text style={{ fontFamily: MONO, color: live ? r.color : "#4B5563" }} className="text-[8px] font-bold uppercase tracking-[0.12em]">
                  {checking ? "⟳ checking" : live ? "● live" : "✗ down"}
                </Text>
                {status ? <Text style={{ fontFamily: MONO }} className="text-[#4B5563] text-[8px]">{status}</Text> : null}
                <Text style={{ color: r.color }} className="text-[10px]">↗</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={{ fontFamily: MONO }} className="text-[#4B5563] text-[8.5px] mb-4">
          {WEB_PROBE_BLOCKED
            ? "web export can't cross-origin probe — showing roster wiring"
            : "PI probes each domain directly · ● live = it serves its app right now"}
        </Text>

        {/* Apps — every compartment each mind has wired, grouped by mind (tier + phone dot). */}
        <Text style={{ fontFamily: MONO }} className="text-[#4B5563] text-[9px] font-bold uppercase tracking-[0.18em] mb-2">
          {WIRED_APP_COUNT} apps · {MIND_COUNT} minds · {PHONE_WIRED} phone-wired
        </Text>
        <View className="gap-3 mb-4">
          {APPS_BY_AGENT.map((g) => (
            <View key={g.agent} className="gap-1.5">
              <View className="flex-row items-center gap-2 ml-0.5">
                <Text style={{ fontFamily: MONO, color: g.color }} className="text-[9px] font-bold uppercase tracking-[0.16em]">
                  {g.agent}
                </Text>
                <Text style={{ fontFamily: MONO }} className="text-[#4B5563] text-[8px] font-bold">{g.tier}</Text>
                {g.phoneWired ? (
                  <View className="flex-row items-center gap-1">
                    <View className="rounded-full" style={{ width: 5, height: 5, backgroundColor: g.color }} />
                    <Text style={{ fontFamily: MONO, color: g.color }} className="text-[8px] font-bold uppercase tracking-[0.1em]">phone</Text>
                  </View>
                ) : null}
              </View>
              {g.apps.map((a) => (
                <TouchableOpacity
                  key={a.route}
                  activeOpacity={0.7}
                  onPress={() => router.push(a.route as never)}
                  className="rounded-xl px-3.5 py-2.5 flex-row items-center gap-3"
                  style={glass}
                >
                  <View className="rounded-full" style={{ width: 8, height: 8, backgroundColor: g.color }} />
                  <Text className="text-[#F9FAFB] text-[12.5px] font-semibold flex-1">{a.name}</Text>
                  <Text style={{ fontFamily: MONO }} className="text-[#4B5563] text-[10px]">{a.route}</Text>
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: `${DATA_BADGE[a.data]}1A`, borderColor: `${DATA_BADGE[a.data]}40`, borderWidth: 1 }}
                  >
                    <Text style={{ fontFamily: MONO, color: DATA_BADGE[a.data] }} className="text-[8px] font-bold tracking-[0.1em]">
                      {a.data}
                    </Text>
                  </View>
                  <Text style={{ color: g.color }} className="text-[10px]">›</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
        <Text style={{ fontFamily: MONO }} className="text-[#4B5563] text-[9px] text-center mb-6">
          LIVE = tRPC + DB · DEMO = seeded data · STATIC = in-app model
        </Text>

        {/* .net professional layer — BC + LP (compact) */}
        <View className="flex-row items-baseline gap-2 mb-1">
          <Text style={{ color: NET_LAYER.color }} className="text-[13px] font-black">{NET_LAYER.ext}</Text>
          <Text style={{ fontFamily: MONO }} className="text-[#6B7280] text-[11px] uppercase tracking-[0.14em]">
            {NET_LAYER.purpose} — professional layer
          </Text>
        </View>
        <Text className="text-[#4B5563] text-[11px] mb-3">{NET_LAYER.tagline}</Text>
        <View className="gap-2 mb-7">
          {NET_LAYER.apps.map((app) => (
            <TouchableOpacity
              key={app.abbr}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(app.href)}
              className="rounded-2xl border p-3.5 flex-row items-center gap-3"
              style={{ borderColor: `${app.color}33`, backgroundColor: `${app.color}0A` }}
            >
              <View className="rounded-lg border px-2 py-1" style={{ borderColor: `${app.color}40`, backgroundColor: `${app.color}12` }}>
                <Text style={{ color: app.color }} className="text-[12px] font-black">{app.abbr}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[#F9FAFB] text-[13px] font-bold">{app.name}</Text>
                <Text className="text-[#9CA3AF] text-[11px] leading-snug mt-0.5" numberOfLines={2}>{app.desc}</Text>
              </View>
              <Text className="text-[#6B7280] text-[10px]">{app.domain} <Text style={{ color: app.color }}>↗</Text></Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ══ Mainframe · Homeowners (the user base) ══ */}
        <SectionLabel>Mainframe · {homeownerRows.length} homeowner{homeownerRows.length === 1 ? "" : "s"}</SectionLabel>
        {homeownerRows.length === 0 ? (
          <View className="rounded-2xl px-3.5 py-3 mb-7" style={glass}>
            {homeowners.isError ? (
              <Text className="text-[#F59E0B] text-[11px] leading-snug">
                Can&apos;t reach PI&apos;s roster — the API (app.mlsystemsri.com) needs a redeploy to serve the
                latest wiring + PI router. The domains above are probed live on-device and are unaffected.
              </Text>
            ) : (
              <Text className="text-[#6B7280] text-[11px] leading-snug">
                No homeowners on the mainframe yet. Seed the founder home
                (<Text style={{ fontFamily: MONO }} className="text-[#9CA3AF] text-[10px]">seed-first-homeowner</Text>) or load a home to enter the loop.
              </Text>
            )}
          </View>
        ) : (
          <View className="gap-1.5 mb-7">
            {homeownerRows.slice(0, 8).map((h) => (
              <View key={h.projectId} className="flex-row items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ backgroundColor: "rgba(34,197,94,0.06)", borderColor: "rgba(34,197,94,0.22)", borderWidth: 1 }}>
                <View className="rounded-full" style={{ width: 6, height: 6, backgroundColor: "#22C55E" }} />
                <Text className="text-[#E5E7EB] text-[11px] font-semibold flex-1" numberOfLines={1}>{h.address}, {h.city}</Text>
                <Text style={{ fontFamily: MONO }} className="text-[#6B7280] text-[9px]">cycle {h.cycleNumber}</Text>
                {h.latestEquity != null ? (
                  <Text style={{ color: "#22C55E" }} className="text-[10px] font-bold">{formatEquity(h.latestEquity)}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* ── Journey checklists — each mind's role in the multidimensional value chain,
             the same auto/manual grammar. Autos compute from the record VERA landed. ── */}
        <SectionLabel>Journey checklists</SectionLabel>
        <ChecklistCard kind="vera" title="VERA" emoji="🦉" color="#34D399" />
        <ChecklistCard kind="cda" title="CDA" emoji="◇" color="#60A5FA" />
        <ChecklistCard kind="reaper" title="REAPER" emoji="⛏" color="#F97316" />
        <ChecklistCard kind="pit-lord" title="PIT LORD" emoji="◆" color="#EF4444" />
        <ChecklistCard kind="custodian" title="Custodian" emoji="◆" color={GOLD} />
        <View className="mb-4" />

        {/* ── Seats & Bond Holders (Single Star Bond) — retained, secondary ── */}
        <SectionLabel>Seats &amp; Bond Holders</SectionLabel>
        <View className="rounded-2xl border p-4 mb-7" style={{ borderColor: `${GOLD}33`, backgroundColor: `${GOLD}0A` }}>
          <View className="flex-row items-center gap-2 mb-3">
            <Text style={{ color: GOLD }} className="text-[13px]">★</Text>
            <Text style={{ color: GOLD }} className="text-[10px] font-bold uppercase tracking-widest">{BOND.rating}</Text>
            <View className="flex-1" />
            <Text style={{ fontFamily: MONO }} className="text-[#6B7280] text-[9px]">{BOND.serial}</Text>
          </View>

          <View className="flex-row gap-2 mb-3">
            {[
              { label: "Seat Cap", value: usdShort(BOND.perSeatCap) },
              { label: "Ceiling", value: usdShort(BOND.ceiling) },
              { label: "Output", value: "+$1/day" },
            ].map((m) => (
              <View key={m.label} className="flex-1 rounded-xl px-2.5 py-2" style={glass}>
                <Text style={{ fontFamily: MONO }} className="text-[#6B7280] text-[8px] uppercase tracking-wider mb-0.5">{m.label}</Text>
                <Text style={{ color: GOLD }} className="text-[13px] font-black tabular-nums">{m.value}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row items-center justify-between mb-1.5">
            <Text style={{ fontFamily: MONO }} className="text-[#4B5563] text-[9px] font-bold uppercase tracking-[0.18em]">
              {BOND.seatsTotal} seats
            </Text>
            <Text style={{ color: GOLD, fontFamily: MONO }} className="text-[9px] font-bold">
              {SEATS_HELD} held · {SEATS_OPEN} open
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-1">
            {SEATS.map((s) => (
              <View
                key={s.n}
                className="items-center justify-center rounded"
                style={{
                  width: 26, height: 22,
                  backgroundColor: s.held ? `${GOLD}26` : "rgba(255,255,255,0.02)",
                  borderWidth: 1,
                  borderColor: s.held ? `${GOLD}80` : "rgba(255,255,255,0.08)",
                  borderStyle: s.partial ? "dashed" : "solid",
                }}
              >
                <Text style={{ color: s.held ? GOLD : "#4B5563", fontFamily: MONO }} className="text-[8px] font-bold">
                  {s.partial ? ".64" : String(s.n).padStart(2, "0")}
                </Text>
              </View>
            ))}
          </View>
          <Text className="text-[#6B7280] text-[10.5px] leading-snug mt-3">
            24 full seats + one fractional partner, tier-isolated under TTA § 4. Seat 01 is the Custodian's anchor
            line. Each seat redeems in {BOND.termDays.toLocaleString()} days of Day-N output.
          </Text>
        </View>

        <Text style={{ fontFamily: MONO }} className="text-[#374151] text-[10px] text-center mt-1">
          Two ecosystems · {WIRED_APP_COUNT} apps wired · {swarmWired}/{swarmRows.length} domains wired · wrapped by the TTP moat
        </Text>
      </ScrollView>
    </View>
  );
}

/* ── Journey checklist card — one mind's to-dos across the value chain. Auto items
 *    compute live from on-phone state (badge "auto"); manual items toggle + persist. ── */
function ChecklistCard({ kind, title, emoji, color }: { kind: ChecklistKind; title: string; emoji: string; color: string }) {
  const { items, doneCount } = useJourneyChecklist(kind);
  return (
    <View className="rounded-2xl border p-3.5 mb-2.5" style={{ borderColor: `${color}33`, backgroundColor: `${color}0A` }}>
      <View className="flex-row items-center gap-2 mb-2">
        <Text style={{ fontSize: 13 }}>{emoji}</Text>
        <Text className="text-[#F9FAFB] text-[13px] font-bold">{title}</Text>
        <Text style={{ fontFamily: MONO, color }} className="text-[9px] font-bold ml-auto">
          {doneCount}/{items.length}
        </Text>
      </View>
      <View className="gap-1.5">
        {items.map((it) => (
          <TouchableOpacity
            key={it.id}
            disabled={it.isAuto}
            onPress={() => toggleChecklistItem(kind, it.id)}
            activeOpacity={0.7}
            className="flex-row items-center gap-2"
          >
            <Text style={{ color: it.done ? color : "#4B5563" }} className="text-[12px]">
              {it.done ? "☑" : "☐"}
            </Text>
            <Text
              className="text-[11px] flex-1"
              style={{ color: it.done ? "#9CA3AF" : "#E5E7EB", textDecorationLine: it.done ? "line-through" : "none" }}
            >
              {it.label}
            </Text>
            <Text style={{ fontFamily: MONO }} className="text-[#4B5563] text-[8px] w-12" numberOfLines={1}>
              {it.phase}
            </Text>
            {it.isAuto ? (
              <Text style={{ fontFamily: MONO, color: `${color}AA` }} className="text-[7.5px] font-bold uppercase">auto</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
