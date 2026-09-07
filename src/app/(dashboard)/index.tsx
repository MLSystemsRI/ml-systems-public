import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@/lib/clerk-shim";
import { router } from "expo-router";
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useDrawer } from "@/lib/drawer";
import { MLMark } from "@/components/ml-mark";
import { StatCard } from "@/components/stat-card";
import { formatEquity } from "@/lib/format";
import { useViewMode, toggleViewMode, MODE_META, useAdminUnlocked, useLeanHomeowner } from "@/lib/view-mode";
import { isPreview } from "@/lib/preview";
import { APPS } from "@/lib/ecosystem";
import { MindGlyph } from "@/components/mind-icons";
import { HubGlyph } from "@/components/hub-glyph";
import { AuroraWeaveBorder } from "@/components/aurora-weave-border";
import { FeatherEdges } from "@/components/feather-edges";
import { CompartmentChrome } from "@/components/compartment-chrome";
import { mindForRoute } from "@/lib/agents";
import { VALUE_CHAIN_PHASES, usd } from "@/lib/example-chain";
import { useLocalHome } from "@/lib/home-store";
import { useLocalUploads } from "@/lib/uploads-store";
import { CollectivePortal } from "@/components/collective-portal";
import { OntologyReadoutPanel } from "@/components/ontology-readout-panel";
import { ValueChainHomesCard } from "@/components/value-chain-homes-card";

const HOME_ACCENTS = ["#22C55E", "#14B8A6", "#60A5FA"];
/** Append an alpha byte to a #rrggbb color (a in 0..1). */
const hexA = (hex: string, a: number) =>
  hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");

export default function Hub() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { open } = useDrawer();
  const mode = useViewMode();
  const adminUnlocked = useAdminUnlocked();
  const localHome = useLocalHome();
  const uploads = useLocalUploads();
  const equity = trpc.equity.getMine.useQuery(undefined, { retry: 0 });
  const listings = trpc.store.activeCount.useQuery(undefined, { retry: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([equity.refetch(), listings.refetch()]);
    setRefreshing(false);
  }, [equity, listings]);

  const firstName = user?.firstName ?? (mode === "homeowner" ? "there" : "Custodian");
  // The lean SANDBOX walks a fresh install — the account's real server data (his
  // own equity/project) stays out; the sandbox home surfaces via the homes card.
  const lean = useLeanHomeowner();
  const snapshot = lean ? null : equity.data?.snapshot ?? null;
  const project = lean ? null : equity.data?.project ?? null;
  const isHome = mode === "homeowner";
  const isInvestor = mode === "investor";
  const badge = MODE_META[mode] ?? MODE_META.custodian;
  const badgeColor = badge.color;

  // Value Chain: per-cycle glow (brightest at cycle 5). No project yet → cycle 1,
  // the honest starting point (the example chain is removed everywhere — Sal 9/1).
  const cycle = project?.cycleNumber ?? 1;
  const glow = Math.min(Math.max(cycle, 0), 5) / 5;

  // REAPER's Decon Lab profile for the homeowner's home — opened when the value chain
  // created the project. The Hub is where his output compiles (the app has the depth).
  const deconProfile = trpc.deconSessions.getProfileByProject.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id, retry: 0 },
  );
  // REAPER stages the material handoff for MIA — persists the modeled BOM to the ledger.
  const prepareHandoff = trpc.deconSessions.prepareHandoff.useMutation({
    onSuccess: () => deconProfile.refetch(),
  });
  const stageHandoff = () => {
    if (!project?.id) return;
    prepareHandoff.mutate({
      projectId: project.id,
      ...(localHome?.sqft ? { grossSF: localHome.sqft } : {}),
      ...(localHome?.beds != null ? { beds: localHome.beds } : {}),
      ...(localHome?.baths != null ? { baths: localHome.baths } : {}),
    });
  };
  // Custodian lens — the cumulative portfolio across every home in the value chain.
  const portfolio = trpc.pi.listOrchestration.useQuery(undefined, { enabled: !isHome, retry: 0 });
  // Guard: `listOrchestration` returns `{ projects: [...] }` (an object) — and can
  // also resolve to an error payload. `?? []` only catches null/undefined, so a
  // non-array slipped through and `.reduce` was undefined → the Hub crashed ~1s
  // after launch. Unwrap the projects array; coerce anything else to [].
  const portfolioHomes: any[] = Array.isArray(portfolio.data)
    ? portfolio.data
    : Array.isArray(portfolio.data?.projects)
      ? portfolio.data.projects
      : [];

  // The home's value-chain phase, from the project's status.
  const PHASE_BY_STATUS: Record<string, string> = {
    lead: "Finance", loan_origination: "Finance", deconstruction: "Decon",
    construction: "Build", complete: "Loop", resold: "Loop",
  };
  const homePhase = project ? (PHASE_BY_STATUS[project.status] ?? "Finance") : null;
  const homeAddr = localHome?.address ?? project?.property?.addressLine1 ?? null;

  return (
    <View className="flex-1 bg-[#0A0A0A]">
    <ScrollView
      className="flex-1"
      style={{ zIndex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center gap-3">
          {/* Hamburger — the universal drawer affordance (same ☰ as AppHeader). */}
          <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text className="text-[#E5E7EB] text-2xl leading-none">☰</Text>
          </TouchableOpacity>
          <MLMark size={26} color="#22C55E" />
          <View>
            <Text className="text-[#F9FAFB] text-lg font-extrabold leading-tight">ML Systems</Text>
            <Text className="text-[#6B7280] text-[11px]">Hi, {firstName}</Text>
          </View>
        </View>
        {/* Public web build is Homeowner-locked — no lens toggle; a spacer keeps the
            header layout. On native the toggle shows ONLY for a confirmed admin —
            the operator-lens unlock is admin-gated (private). */}
        {Platform.OS === "web" ? (
          <View style={{ width: 44, height: 44 }} />
        ) : adminUnlocked ? (
          <TouchableOpacity
            onPress={toggleViewMode}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: `${badgeColor}1A`, borderWidth: 1, borderColor: `${badgeColor}40` }}
          >
            <Text style={{ color: badgeColor }} className="text-[10px] font-bold tracking-wider uppercase">
              {badge.label}
            </Text>
          </TouchableOpacity>
        ) : (
          // Not an admin — no lens toggle; a spacer holds the slot. Once unlocked, the
          // real toggle takes it.
          <View style={{ width: 44, height: 44 }} />
        )}
      </View>

      {/* Investor lens keeps only the Single Star Bond card + Ecosystem below;
          the homeowner/custodian home + equity + value-chain sections are hidden. */}
      {!isInvestor ? (
      <>
      {/* The living front door — aurora hero + Collective chat. */}
      <CollectivePortal />

      {/* Your Value Chain Homes — the Hub record every agent pulls from (VERA in,
          MIA's marketplace out). Purple like the chat — the Hub's own voice. */}
      <ValueChainHomesCard />

      {/* Your Home — load-your-home CTA (empty) or a summary card (loaded). */}
      {localHome ? (
        <TouchableOpacity
          onPress={() => router.push("/portfolio" as any)}
          activeOpacity={0.85}
          className="rounded-2xl px-4 py-4 mb-4"
          style={{ backgroundColor: "#22C55E0D", borderWidth: 1, borderColor: "#22C55E33" }}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[#22C55E] text-[10px] font-bold uppercase tracking-wider">Your Home</Text>
            <Text className="text-[#22C55E] text-[11px] font-semibold">Value chain →</Text>
          </View>
          <Text className="text-[#F9FAFB] text-[15px] font-bold" numberOfLines={1}>{localHome.address}</Text>
          <Text className="text-[#6B7280] text-[12px] mt-0.5">
            {[localHome.city, localHome.state].filter(Boolean).join(", ")}{localHome.estValueDollars != null ? ` · est. ${usd(localHome.estValueDollars)}` : ""}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => router.push("/add-home" as any)}
          activeOpacity={0.85}
          className="rounded-2xl px-4 py-4 mb-4 flex-row items-center justify-between"
          style={{ backgroundColor: "#22C55E14", borderWidth: 1, borderColor: "#22C55E40" }}
        >
          <View className="flex-row items-center gap-3 flex-1">
            <View
              className="rounded-full items-center justify-center border-2 border-dashed"
              style={{ width: 40, height: 40, borderColor: "#22C55E66" }}
            >
              <Text style={{ color: "#22C55E", fontSize: 22, lineHeight: 24 }}>＋</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#F9FAFB] text-[14px] font-bold leading-tight">Load your home</Text>
              <Text className="text-[#6B7280] text-[11px]">Enter a property to unlock your equity loop.</Text>
            </View>
          </View>
          <Text style={{ color: "#22C55E" }} className="text-lg">→</Text>
        </TouchableOpacity>
      )}

      {/* Recent uploads — quick strip into the uploads screen. */}
      {uploads.length > 0 ? (
        <TouchableOpacity
          onPress={() => router.push("/uploads" as any)}
          activeOpacity={0.85}
          className="flex-row items-center gap-2 mb-5"
        >
          {uploads.slice(0, 3).map((u) => (
            <Image
              key={u.id}
              source={{ uri: u.uri }}
              style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: "#111111" }}
            />
          ))}
          <Text className="text-[#6B7280] text-[11px] ml-1">
            {uploads.length} upload{uploads.length === 1 ? "" : "s"} · view all →
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Equity snapshot */}
      <View className="flex-row gap-3 mb-3">
        <StatCard
          label="Total Equity"
          value={equity.isLoading ? "…" : snapshot ? formatEquity(snapshot.totalEquity) : "—"}
          sub={snapshot ? "Live snapshot" : "starts with your home"}
          accent
        />
        <StatCard
          label="Cycle"
          value={equity.isLoading ? "…" : `#${cycle}`}
          sub={project ? String(project.status).replace(/_/g, " ") : "Decon → Build → Equity"}
        />
      </View>
      <View className="flex-row gap-3 mb-7">
        <StatCard
          label="Open Listings"
          value={listings.isLoading ? "…" : String(listings.data ?? 0)}
          sub="Builder's Open House"
        />
        <StatCard
          label="Property Value"
          value={snapshot ? formatEquity(snapshot.propertyValueEstimate) : "—"}
          sub={snapshot ? "Est. current" : "starts with your home"}
        />
      </View>

      {/* Portfolio · Value Chain moved OFF the Hub — it's the page you land on when you
          tap a home (the purple card above, or "Your Home"). The Hub stays the record +
          launcher; the value-chain journey lives at /portfolio. */}
      </>
      ) : null}

      {/* Custodian lens — the Hub is where the cumulative data lives: the portfolio
          across every home + the Custodian's learned ontology/compression. */}
      {!isHome ? (
        <View className="mb-7">
          <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-3">Custodian · cumulative</Text>
          <View className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-3">
            <Text style={{ color: badgeColor }} className="text-[10px] font-bold uppercase tracking-wider mb-2.5">Portfolio</Text>
            <View className="flex-row justify-between">
              {[
                { label: "Homes", value: String(portfolioHomes.length) },
                { label: "Cycles", value: String(portfolioHomes.reduce((n: number, p: any) => n + (p.cycleNumber ?? 0), 0)) },
                { label: "Equity", value: formatEquity(portfolioHomes.reduce((n: number, p: any) => n + (p.latestEquity ?? 0), 0)) },
              ].map((s) => (
                <View key={s.label}>
                  <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider">{s.label}</Text>
                  <Text style={{ color: badgeColor }} className="text-[16px] font-bold mt-0.5">{s.value}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* The Custodian's learned ontology + run compression — cumulative across runs. */}
          <OntologyReadoutPanel />
        </View>
      ) : null}

      {/* Homeowner lens: the equity journey the client moves through. */}
      {isHome ? (
        <View className="mb-7">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider">Your Journey</Text>
            <Text style={{ color: badgeColor }} className="text-[10px] font-bold uppercase tracking-wider">
              Cycle {cycle} / 5
            </Text>
          </View>
          {/* Glows gradiently brighter each cycle, peaking at cycle 5. */}
          <View
            className="bg-[#111111] rounded-2xl px-4 py-4"
            style={{
              borderWidth: 1,
              borderColor: hexA(badgeColor, 0.2 + glow * 0.6),
              shadowColor: badgeColor,
              shadowOpacity: 0.15 + glow * 0.55,
              shadowRadius: 6 + glow * 16,
              shadowOffset: { width: 0, height: 0 },
              elevation: Math.round(2 + glow * 12),
            }}
          >
            <View className="flex-row items-center justify-between">
              {VALUE_CHAIN_PHASES.map((step, i) => (
                <View key={step} className="flex-row items-center">
                  <Text style={{ color: badgeColor }} className="text-[11px] font-semibold">{step}</Text>
                  {i < VALUE_CHAIN_PHASES.length - 1 ? <Text className="text-[#374151] text-[11px] mx-1">→</Text> : null}
                </View>
              ))}
            </View>
            {/* per-cycle glow meter — lit up to the current cycle, brightest at 5 */}
            <View className="flex-row gap-1.5 mt-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <View
                  key={n}
                  className="flex-1 rounded-full"
                  style={{ height: 3, backgroundColor: n <= cycle ? hexA(badgeColor, 0.5 + glow * 0.5) : "#262626" }}
                />
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {/* Investor lens: the Single Star Bond entry point (no drawer link). */}
      {mode === "investor" ? (
        <TouchableOpacity
          onPress={() => router.push("/investor" as any)}
          activeOpacity={0.85}
          className="rounded-2xl px-4 py-4 mb-7 flex-row items-center justify-between"
          style={{ backgroundColor: "#FFE5000F", borderWidth: 1, borderColor: "#FFE50040" }}
        >
          <View className="flex-row items-center gap-3">
            <Text style={{ color: "#FFE500", fontSize: 22 }}>★</Text>
            <View>
              <Text className="text-[#F9FAFB] text-[13px] font-bold leading-tight">Investor · Single Star Bond</Text>
              <Text className="text-[#6B7280] text-[11px]">Seats · Day-N · the bond</Text>
            </View>
          </View>
          <Text style={{ color: "#FFE500" }} className="text-lg">→</Text>
        </TouchableOpacity>
      ) : null}

      {/* Ecosystem apps */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-3">
        {isHome ? "Your Tools" : "The Ecosystem"}
      </Text>
      <View className="flex-row flex-wrap justify-between">
        {APPS.map((app) => {
          // Each stylized mind designs its own Hub card, like its compartment —
          // accent border-weave, its signature glyph, and a faint figure in the
          // corner. Data-driven: a card lights up once its mind has a hubBackdrop.
          const mind = mindForRoute(app.href);
          const styled = !!mind?.hubBackdrop;
          // PIT LORD's sprite is the darkest of the set — a near-black pit — so at the
          // shared opacity his card reads emptier than the rest. Give him more to land
          // at the same apparent strength.
          const presence = mind?.slug === "pit-lord" ? 0.85 : 0.55;
          return (
            <TouchableOpacity
              key={app.key}
              onPress={() => router.push(app.href as any)}
              activeOpacity={0.85}
              className="bg-[#111111] rounded-2xl p-4 mb-3 overflow-hidden"
              style={{ width: "48.5%", borderWidth: 1, borderColor: styled ? `${app.accent}66` : "#262626" }}
            >
              {styled && mind ? (
                <>
                  {/* aurora minds (MIA) get the flowing woven border; others a static weave */}
                  {mind.lens_theme?.signature === "aurora" ? (
                    <AuroraWeaveBorder color={app.accent} bright={mind.lens_theme?.bright} radius={16} both frame={false} idKey={`hub-${mind.slug}`} />
                  ) : (
                    <View style={{ position: "absolute", top: 0, left: 10, right: 10 }}>
                      <View style={{ height: 2, backgroundColor: app.accent, opacity: 0.9, borderRadius: 2 }} />
                      <View style={{ height: 1.5, marginTop: 2, backgroundColor: app.accent, opacity: 0.4 }} />
                      <View style={{ height: 1, marginTop: 2, backgroundColor: app.accent, opacity: 0.15 }} />
                    </View>
                  )}
                  {/* The mind fills its own card — a full-bleed background rather than a
                      corner figure, feathered hard on every edge so it dissolves into the
                      card instead of ending in a rectangle. zIndex 0 keeps it under the
                      icon and copy, so the words always win. */}
                  <View
                    pointerEvents="none"
                    style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 0 }}
                  >
                    <Image
                      source={mind.hubBackdrop}
                      resizeMode="cover"
                      style={{ width: "100%", height: "100%", opacity: presence }}
                    />
                    <FeatherEdges color="#111111" size={0.44} idKey={`hub-${mind.slug}`} />
                  </View>
                </>
              ) : null}
              <View
                className="rounded-xl items-center justify-center mb-3"
                style={{ width: 40, height: 40, backgroundColor: `${app.accent}1A` }}
              >
                {styled && mind ? (
                  // aurora minds (MIA) wear their rendered woven-orb glyph; others their SVG mark
                  mind.lens_theme?.signature === "aurora" ? (
                    <Image
                      source={mind.hubBackdrop}
                      resizeMode="cover"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        borderWidth: 1,
                        borderColor: `${app.accent}88`,
                      }}
                    />
                  ) : (
                    <MindGlyph slug={mind.slug} size={20} color={app.accent} />
                  )
                ) : (
                  <Text style={{ color: app.accent, fontSize: 20 }}>{app.glyph}</Text>
                )}
              </View>
              <Text style={{ zIndex: 1 }} className="text-[#F9FAFB] text-[13px] font-bold leading-tight mb-1">{app.title}</Text>
              <Text style={{ zIndex: 1 }} className="text-[#6B7280] text-[11px] leading-snug">{app.blurb}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {equity.isError && !isPreview() ? (
        <Text className="text-[#EF4444] text-[11px] text-center mt-2">
          Couldn't reach the hub — pull to retry.
        </Text>
      ) : null}
    </ScrollView>
    {/* PI presides over the Hub — his grounded lucent field behind the cards */}
    <CompartmentChrome href="/" frame={false} />
    </View>
  );
}
