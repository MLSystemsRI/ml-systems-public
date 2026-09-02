import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Image, LayoutAnimation, Platform, UIManager, useWindowDimensions } from "react-native";
import Svg, { Rect, Line, Polygon, Text as SvgText, Defs, RadialGradient, Stop, G } from "react-native-svg";
import { tileHome, applySwaps, applyRoomTypes, applyResize, applyRoomNames, sharedEdge, sketchExtents, type JSpaceHome, type JRoom } from "@/lib/jspace";
import { rebuildWithSwarm } from "@/lib/plan-swarm";
import { hasBones, normalizeAddress, type BuilderFacts } from "@/lib/jspace-facts";
import { computeStrands, moneyShort } from "@/lib/strands";
import type { FidelityReport, HomeConfirmation, WallInventory } from "@ml-systems/types";
import { custodianOverlook } from "@ml-systems/types";
import { CustodianBuildGuideCard } from "@/components/custodian-build-guide-card";
import { BlueprintSetCard } from "@/components/blueprint-set-card";
import { PiStreamCard } from "@/components/pi-stream-card";
import { piStream, piNextStep, type PiAgentReads } from "@/lib/pi-stream";
import { piCollectionChecks } from "@/lib/pi-checks";
import { LedgerSpine } from "@/components/ledger-spine";
import { CollectionReceipt } from "@/components/collection-receipt";
import { useDeepSearchRunning } from "@/lib/auto-deep-search";
import { AuroraWeaveBorder } from "@/components/aurora-weave-border";
import type { VeraRow } from "@/lib/vera-extract";
import type { LedgerView } from "@/lib/ledger-view";
import type { TraceStage } from "@/lib/build-trace";
import { swarmRebuildStages, custodianOverlookStage } from "@/lib/build-trace";
import type { VeraCheck } from "@/lib/vera-checks";
import type { VeraCapability } from "@/lib/vera-capabilities";
import type { LocalRecovery } from "@/lib/recovery";

/**
 * JSpaceBuilder — "Value Chain · J-Space Builder", ONE unit above the chat.
 *
 * As the homeowner discusses their home, the collective j-space visibly forms: VERA
 * gathers the property's bones (the facts), CDA tiles the rooms in one by one, and the
 * two value-chain strands (physical ◇ / financial ◆) compute beneath the sketch — all
 * on-device, deterministic, MODELED. The staged reveal choreographs REAL computation
 * (the tiler + strand math), never fake progress. A fetched Design-Studio blueprint
 * upgrades the sketch when available (bundled-first, live-refined).
 */

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CDA = "#60A5FA";
const FIN = "#22C55E";
const VERA = "#34D399";
// Aurora — the Builder Open House palette, now the J-Space chrome (teal · cyan · emerald).
const AURORA = "#14B8A6";
const AURORA_CYAN = "#06B6D4";
// The blueprint — bluer ground with a hint of glow so the white pops (Sal's spec).
export const BP_BG = "#0A3D91";
export const BP_LINE = "#FFFFFF";
export const BP_DIM = "#AECBF5";
export const BP_FILL = "rgba(255,255,255,0.08)";
// Fake glow (RN SVG has no reliable blur): a wide soft under-stroke beneath crisp lines.
export const BP_GLOW = "rgba(255,255,255,0.20)";

// Blueprint variant — the studio floor-plan palette (light sheet, colored rooms by
// kind), mirrored from design-studio home-model ROOM_FILL so the phone's editable
// plan reads like the studio blueprint. Keyed by RoomKind; fallback for any stray.
const ROOM_FILL_K: Record<string, string> = {
  living: "#f3f0ff", kitchen: "#fff4e6", dining: "#fdf0f5",
  bed: "#eef4ff", bath: "#e9f7f3", hall: "#fafafa", stair: "#f0f0f0",
  office: "#eefaf0", utility: "#f5f5f2", garage: "#f2f2f2",
};

/** Feet (decimal) → architect's feet-inches string, e.g. 19.25 → 19'-3" (studio dims). */
function ftIn(ft: number): string {
  const totalIn = Math.max(0, Math.round(ft * 12));
  const f = Math.floor(totalIn / 12);
  const inch = totalIn % 12;
  return `${f}'-${inch}"`;
}

/** Sorted, de-duplicated boundary values within [0, max] (dimension-chain grid lines). */
function uniqBounds(vals: number[], max: number): number[] {
  const out: number[] = [];
  for (const v of [...vals, 0, max].sort((a, b) => a - b)) {
    if (v < -0.01 || v > max + 0.01) continue;
    if (!out.length || Math.abs(v - out[out.length - 1]!) > 0.25) out.push(v);
  }
  return out;
}

/** The sketch — a true blueprint: bluer ground, glowing white linework, the j-space
 *  forming. Rooms are tappable (tap one, tap another → they swap). Exported: the Plan
 *  Builder screen reuses it as the offline/fallback stage.
 *  `variant="studio"` = the read-only, dimension-annotated studio render, drawn from the
 *  SAME tiled model as the editable plan so the two always match (massing + facts). */
export function FloorPlanSketch({
  home,
  level,
  width,
  revealed,
  selectedId,
  onRoomPress,
  levelName,
  variant = "sketch",
}: {
  home: JSpaceHome;
  level: number;
  width: number;
  revealed: number;
  /** Tap-to-swap: the currently selected room (highlighted + waiting for its partner). */
  selectedId?: string | null;
  onRoomPress?: (id: string) => void;
  /** Footer name for this level ("Lower"/"Main" with record massing; "Level n" default). */
  levelName?: string;
  /** "sketch" = the blue blueprint (chat); "blueprint" = the light studio-styled editable
   *  plan; "studio" = the read-only, dimension-annotated studio render (same tiled model). */
  variant?: "sketch" | "blueprint" | "studio";
}) {
  const rooms = home.rooms.filter((r) => r.level === level);
  const shown = rooms.slice(0, Math.max(0, revealed));
  const studio = variant === "studio";
  // The ring only draws when it hugs the footprint (a true "real footprint").
  // When the record outline includes the deck/patio wing (beyond the house),
  // drawing it just confuses the plan (Sal, field report) — the data still
  // powers VERA's verification; the canvas stays the HOUSE.
  const ext = sketchExtents(home);
  const showRing = !!home.outline && !ext.outlineBeyond;
  const drawW = showRing ? ext.w : home.footprintW;
  const drawHft = showRing ? ext.d : home.footprintD; // depth in FEET
  // Studio adds a dimension chain up top + down the left, so it needs extra margins there.
  const padL = studio ? 34 : 20;
  const padT = studio ? 34 : 20;
  const padR = 20;
  const s = (width - padL - padR) / drawW;
  const drawD = drawHft * s;
  const H = drawD + padT + 44; // two clean footer rows below the drawing
  const X = (ft: number) => padL + ft * s;
  const Y = (ft: number) => padT + ft * s;
  const byId = new Map(home.rooms.map((r) => [r.id, r]));
  const shownIds = new Set(shown.map((r) => r.id));
  // Footer rows: dims line, then scale bar (left) + attribution (right).
  const footY1 = drawD + padT + 13;
  const footY2 = drawD + padT + 30;
  const seg = 10 * s;
  // Studio dimension chains — the column/band boundaries of the tiled rooms this level.
  const colBounds = studio ? uniqBounds(shown.flatMap((r) => [r.x, r.x + r.w]), drawW) : [];
  const rowBounds = studio ? uniqBounds(shown.flatMap((r) => [r.y, r.y + r.d]), drawHft) : [];

  // Theme — the blue sketch (chat) vs the light studio-styled blueprint (editable + studio).
  const bp = variant === "blueprint" || studio;
  const bg = bp ? "#FFFFFF" : BP_BG;
  const wall = bp ? "#111827" : BP_LINE;
  const dim = bp ? "#6b7280" : BP_DIM;
  const roomStroke = bp ? "#94a3b8" : "rgba(255,255,255,0.62)";
  const labelCol = bp ? "#111827" : BP_LINE;
  const selStroke = bp ? "#2563eb" : "#FFFFFF";
  const selFill = bp ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.18)";

  return (
    <View style={{ width, height: H }}>
      <Svg width={width} height={H}>
      <Defs>
        {/* The hint of glow — a soft white bloom behind the plan so linework pops. */}
        <RadialGradient id="bpBloom" cx="50%" cy="42%" r="65%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.10} />
          <Stop offset="55%" stopColor="#FFFFFF" stopOpacity={0.03} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={H} fill={bg} />
      {bp ? null : <Rect x={0} y={0} width={width} height={H} fill="url(#bpBloom)" />}
      {/* Rooms tile in one by one. Sketch: white-on-blue with a soft glow. Blueprint:
          colored fills by room kind (studio palette), thin gray strokes. */}
      {bp ? null : shown.map((r) => (
        <Rect key={`g-${r.id}`} x={X(r.x)} y={Y(r.y)} width={r.w * s} height={r.d * s}
          fill="none" stroke={BP_GLOW} strokeWidth={3} />
      ))}
      {shown.map((r) => {
        const sel = r.id === selectedId;
        return (
          <Rect
            key={r.id}
            x={X(r.x)} y={Y(r.y)} width={r.w * s} height={r.d * s}
            fill={sel ? selFill : bp ? (ROOM_FILL_K[r.kind] ?? "#f5f5f5") : BP_FILL}
            stroke={sel ? selStroke : roomStroke}
            strokeWidth={sel ? 2.2 : bp ? 0.6 : 0.9}
          />
        );
      })}
      {shown.map((r) =>
        r.w * s > 34 && r.d * s > 22 ? (
          <SvgText key={`t-${r.id}`} x={X(r.x + r.w / 2)} y={Y(r.y + r.d / 2) + (bp ? -1 : 1)} textAnchor="middle" fontSize={Math.min(9, r.w * s * 0.16)} fill={labelCol} fontWeight="600">
            {r.name}
          </SvgText>
        ) : null,
      )}
      {shown.map((r) =>
        r.w * s > 34 && r.d * s > 34 ? (
          <SvgText key={`a-${r.id}`} x={X(r.x + r.w / 2)} y={Y(r.y + r.d / 2) + (bp ? 9 : 11)} textAnchor="middle" fontSize={7} fill={dim}>
            {`${Math.round(r.w * r.d)} SF`}
          </SvgText>
        ) : null,
      )}
      {/* Room number (blueprint only) — matches the studio schedule (level+1)*100+i. */}
      {bp
        ? shown.map((r, i) =>
            r.w * s > 34 && r.d * s > 44 ? (
              <SvgText key={`no-${r.id}`} x={X(r.x + r.w / 2)} y={Y(r.y + r.d / 2) + 20} textAnchor="middle" fontSize={7} fontWeight="700" fill="#2563eb">
                {`${(level + 1) * 100 + (i + 1)}`}
              </SvgText>
            ) : null,
          )
        : null}
      {/* Door gaps on shared walls (both rooms revealed) — punched in the ground color. */}
      {home.adjacency.map(([ai, bi], i) => {
        const a = byId.get(ai), b = byId.get(bi);
        if (!a || !b || a.level !== level || b.level !== level) return null;
        if (!shownIds.has(ai) || !shownIds.has(bi)) return null;
        const e = sharedEdge(a as JRoom, b as JRoom);
        if (!e) return null;
        const mx = (e.x1 + e.x2) / 2, my = (e.y1 + e.y2) / 2, door = 3;
        return e.x1 === e.x2 ? (
          <Line key={i} x1={X(mx)} y1={Y(my - door / 2)} x2={X(mx)} y2={Y(my + door / 2)} stroke={bg} strokeWidth={3.5} />
        ) : (
          <Line key={i} x1={X(mx - door / 2)} y1={Y(my)} x2={X(mx + door / 2)} y2={Y(my)} stroke={bg} strokeWidth={3.5} />
        );
      })}
      {/* The REAL outline from public records — drawn ONLY when it hugs the
          footprint (a true "real footprint" ring). A beyond-footprint parcel
          ring (deck/patio wing) never draws; the house is the drawing. */}
      {home.outline && level === 0 && showRing ? (
        <>
          <Polygon
            points={home.outline.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ")}
            fill="none" stroke={VERA} strokeWidth={2}
          />
          {bp ? null : <Rect x={X(0)} y={Y(0)} width={home.footprintW * s} height={home.footprintD * s} fill="none" stroke={BP_GLOW} strokeWidth={4} />}
          <Rect x={X(0)} y={Y(0)} width={home.footprintW * s} height={home.footprintD * s} fill="none" stroke={wall} strokeWidth={bp ? 2.4 : 1.4} />
        </>
      ) : (
        <>
          {bp ? null : <Rect x={X(0)} y={Y(0)} width={home.footprintW * s} height={home.footprintD * s} fill="none" stroke={BP_GLOW} strokeWidth={5.5} />}
          <Rect x={X(0)} y={Y(0)} width={home.footprintW * s} height={home.footprintD * s} fill="none" stroke={wall} strokeWidth={bp ? 2.6 : 1.8} />
        </>
      )}
      {/* Studio dimension chains — top (columns) + left (bands), read from the tiled rooms,
          so the studio render's dimensions equal the editable plan's exactly. */}
      {studio ? (
        <>
          <Line x1={X(0)} y1={padT - 24} x2={X(drawW)} y2={padT - 24} stroke={dim} strokeWidth={0.7} />
          <Line x1={X(0)} y1={padT - 27} x2={X(0)} y2={padT - 21} stroke={dim} strokeWidth={0.7} />
          <Line x1={X(drawW)} y1={padT - 27} x2={X(drawW)} y2={padT - 21} stroke={dim} strokeWidth={0.7} />
          <SvgText x={X(drawW / 2)} y={padT - 26} textAnchor="middle" fontSize={6.5} fill={wall} fontWeight="700">{ftIn(drawW)}</SvgText>
          {colBounds.slice(0, -1).map((b0, i) => {
            const b1 = colBounds[i + 1]!;
            return (
              <G key={`cx-${i}`}>
                <Line x1={X(b0)} y1={padT - 11} x2={X(b1)} y2={padT - 11} stroke={dim} strokeWidth={0.6} />
                <Line x1={X(b0)} y1={padT - 13} x2={X(b0)} y2={padT - 9} stroke={dim} strokeWidth={0.6} />
                {(b1 - b0) * s > 16 ? (
                  <SvgText x={X((b0 + b1) / 2)} y={padT - 13.5} textAnchor="middle" fontSize={5.5} fill={dim}>{ftIn(b1 - b0)}</SvgText>
                ) : null}
              </G>
            );
          })}
          <Line x1={X(drawW)} y1={padT - 13} x2={X(drawW)} y2={padT - 9} stroke={dim} strokeWidth={0.6} />

          <Line x1={padL - 22} y1={Y(0)} x2={padL - 22} y2={Y(drawHft)} stroke={dim} strokeWidth={0.7} />
          <Line x1={padL - 25} y1={Y(0)} x2={padL - 19} y2={Y(0)} stroke={dim} strokeWidth={0.7} />
          <Line x1={padL - 25} y1={Y(drawHft)} x2={padL - 19} y2={Y(drawHft)} stroke={dim} strokeWidth={0.7} />
          <SvgText x={padL - 24} y={Y(drawHft / 2)} textAnchor="middle" fontSize={6.5} fill={wall} fontWeight="700" rotation={-90} originX={padL - 24} originY={Y(drawHft / 2)}>{ftIn(drawHft)}</SvgText>
          {rowBounds.slice(0, -1).map((b0, i) => {
            const b1 = rowBounds[i + 1]!;
            return (
              <G key={`ry-${i}`}>
                <Line x1={padL - 11} y1={Y(b0)} x2={padL - 11} y2={Y(b1)} stroke={dim} strokeWidth={0.6} />
                <Line x1={padL - 13} y1={Y(b0)} x2={padL - 9} y2={Y(b0)} stroke={dim} strokeWidth={0.6} />
                {(b1 - b0) * s > 16 ? (
                  <SvgText x={padL - 13.5} y={Y((b0 + b1) / 2)} textAnchor="middle" fontSize={5.5} fill={dim} rotation={-90} originX={padL - 13.5} originY={Y((b0 + b1) / 2)}>{ftIn(b1 - b0)}</SvgText>
                ) : null}
              </G>
            );
          })}
          <Line x1={padL - 13} y1={Y(drawHft)} x2={padL - 9} y2={Y(drawHft)} stroke={dim} strokeWidth={0.6} />
        </>
      ) : null}

      {/* Footer row 1 — overall dims / studio title block. ONE string child: react-native-svg
          renders multiple JSX children as stacked tspans at the same anchor (the garble). */}
      <SvgText x={X(drawW / 2)} y={footY1} textAnchor="middle" fontSize={studio ? 7.5 : 8} fill={wall} fontWeight={studio ? "700" : "400"}>
        {studio
          ? `${home.archetype.replace(/^\w/, (c) => c.toUpperCase())} — ${levelName ?? `Level ${level}`} · ${home.footprintW}'×${home.footprintD}' · ${Math.round(home.footprintW * home.footprintD)} SF/floor · ${shown.length} rooms`
          : `${home.footprintW}' × ${home.footprintD}' · ${levelName ?? `level ${level}`} · ${home.archetype}${home.outline ? " · real footprint" : ""}`}
      </SvgText>
      {/* Footer row 2 — scale bar (0–10–20 ft, real scaling) + attribution / scale note. */}
      <Rect x={padL} y={footY2} width={seg} height={4.5} fill={wall} />
      <Rect x={padL + seg} y={footY2} width={seg} height={4.5} fill="none" stroke={wall} strokeWidth={0.8} />
      <SvgText x={padL} y={footY2 - 2.5} fontSize={6.5} fill={dim}>0</SvgText>
      <SvgText x={padL + seg} y={footY2 - 2.5} textAnchor="middle" fontSize={6.5} fill={dim}>10</SvgText>
      <SvgText x={padL + 2 * seg} y={footY2 - 2.5} textAnchor="middle" fontSize={6.5} fill={dim}>20 ft</SvgText>
      {studio ? (
        <SvgText x={width - padR} y={footY2 + 4} textAnchor="end" fontSize={6} fill={dim}>MODELED · not to scale</SvgText>
      ) : null}
      {home.outline && home.source ? (
        <SvgText x={width - padR} y={footY2 + 4} textAnchor="end" fontSize={5.5} fill={dim}>
          © OpenStreetMap contributors
        </SvgText>
      ) : null}
      </Svg>
      {/* Touch layer — react-native-svg <Rect onPress> is unreliable on Android inside a
          ScrollView (the scroll responder swallows it), so absolutely-positioned Pressables
          on the SAME X/Y/s mapping capture the taps. The SVG above still draws selection. */}
      {onRoomPress ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, top: 0, width, height: H }}>
          {shown.map((r) => (
            <Pressable
              key={`hit-${r.id}`}
              onPress={() => onRoomPress(r.id)}
              hitSlop={2}
              style={{ position: "absolute", left: X(r.x), top: Y(r.y), width: r.w * s, height: r.d * s }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function StrandRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View className="flex-row justify-between items-baseline py-0.5">
      <Text className="text-[#9CA3AF] text-[10px]">{label}</Text>
      <Text className="text-[11px] font-semibold" style={{ color: accent ?? "#E5E7EB" }}>{value}</Text>
    </View>
  );
}

export type BonesStatus = "idle" | "fetching" | "found" | "miss";

export function JSpaceBuilder({
  facts,
  blueprint,
  bonesStatus = "idle",
  saved = false,
  veraChecks,
  capabilities,
  fidelity,
  confirmation,
  recovery,
  walls,
  trace,
  deepPass,
  ledgerExtract,
  ledgerView,
  ledgerAddress,
  financingOpen,
  onCycleChange,
  onViewPlan,
  onCustomize,
}: {
  facts: BuilderFacts;
  blueprint?: { floorPlanSvg: string; sectionSvg?: string } | null;
  /** VERA's public-records lookup state — drives the background-thinking line. */
  bonesStatus?: BonesStatus;
  /** True once this address's plan is persisted to the Design Studio tab. */
  saved?: boolean;
  /** VERA's continuous verification of the current facts (recomputed as CDA builds). */
  veraChecks?: VeraCheck[];
  /** VERA's capability checklist with live per-home statuses (tap her strip to expand). */
  capabilities?: VeraCapability[];
  /** VERA's plan-vs-record score — the CDA MVE read (how close from records alone). */
  fidelity?: FidelityReport | null;
  /** Stage-1 field verifications — sources cross-confirmed before the build. */
  confirmation?: HomeConfirmation | null;
  /** REAPER's recovery takeoff — present once deconstruction enters the conversation. */
  recovery?: LocalRecovery | null;
  /** REAPER's wall-resolved envelope inventory — tonnage + decon routing per class. */
  walls?: WallInventory | null;
  /** The build logic, stage by stage — methodology at every stage (build-trace). */
  trace?: TraceStage[] | null;
  /** Layer 2 — the minds' deep read (deepPassStages), shown above the owl's sources. */
  deepPass?: TraceStage[] | null;
  /** VERA's extraction rows for the inline general ledger (the readable top of the spine). */
  ledgerExtract?: VeraRow[] | null;
  /** The compiled ledger, shaped for rendering — the centerpiece of the J-Space. */
  ledgerView?: LedgerView | null;
  /** The home's address — every ledger entry files its input against it. */
  ledgerAddress?: string | undefined;
  /** True once the record is signed AND the homeowner is ready to build — gates PIT LORD's numbers. */
  financingOpen?: boolean;
  onCycleChange: (cycle: number) => void;
  onViewPlan?: () => void;
  /** Opens the Plan Builder — the homeowner's simple customizer (no CAD). */
  onCustomize?: () => void;
}) {
  const { width: winW, height: winH } = useWindowDimensions();
  const [expanded, setExpanded] = useState(true);

  const bones = hasBones(facts);
  // VERA tiles the foundation; CDA's cost-effective swarm rebuilds the interior
  // (0¢, deterministic); then the homeowner's edits apply LAST (they always win).
  const swarm = useMemo(() => (bones ? rebuildWithSwarm(tileHome(facts)) : null), [facts, bones]);
  const home = useMemo(
    () => (swarm ? applyRoomNames(applyResize(applyRoomTypes(applySwaps(swarm.home, facts.swaps), facts.roomTypes), facts.roomEdgeAdj), facts.roomNames) : null),
    [facts, swarm],
  );
  const swarmStages = useMemo(
    () => (swarm && home ? swarmRebuildStages({ facts, tiled: home, report: swarm.report }) : null),
    [facts, swarm, home],
  );
  // The Custodian's third-party read of the VERA × CDA handshake — leads the build
  // logic (the guide card) AND opens the merged Layer 2.
  const overlook = useMemo(
    () =>
      custodianOverlook({
        genome: facts.genome,
        fidelity,
        swarm: swarm ? { commonalities: swarm.report.commonalities.length, conflicts: swarm.report.conflicts.length, opsApplied: swarm.report.opsApplied } : null,
      }),
    [facts.genome, fidelity, swarm],
  );
  // Layer 2, merged by the Custodian — his overlook opens, then the symbiosis (swarm)
  // just built, then the deep pass the parent passed in. One panel, not two.
  const layer2 = useMemo(() => {
    const overlookStage = custodianOverlookStage({ genome: facts.genome, fidelity, report: swarm?.report });
    const merged = [...(overlookStage ? [overlookStage] : []), ...(swarmStages ?? []), ...(deepPass ?? [])];
    return merged.length ? merged : undefined;
  }, [facts.genome, fidelity, swarm, swarmStages, deepPass]);

  const strands = useMemo(
    () => computeStrands({ ...facts, grossSF: facts.grossSF ?? home?.grossSF }),
    [facts, home],
  );
  const cycle = Math.max(1, Math.round(facts.cycle ?? 1));

  // The thinking line — the only live feedback while the collection runs. PI's voice,
  // no agent names (the minds stay backend — Sal 9/1).
  const gathering = useDeepSearchRunning(facts.address);
  const thinking =
    bonesStatus === "fetching"
      ? `Reading the public record${facts.address ? ` for ${facts.address}` : ""}…`
      : gathering
        ? "Gathering everything public — your ledger compiles as sources land…"
        : !home && bonesStatus === "miss"
          ? `No public record found — describe the home and I'll draw it`
          : null;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  const p = strands.physical;
  const f = strands.financial;
  // The ◇/◆ number panels are parked (Sal 8/11) — PI now narrates the same numbers as the
  // orchestration strip, so the twin panel stays off.
  const SHOW_STRAND_NUMBERS = false;

  // The hero's box, in HARD numbers. `width:"100%" + aspectRatio` let RN fall back to the
  // PNG's intrinsic size inside the ScrollView (a giant zoomed corner — Sal 9/1 ×2), so the
  // banner is sized explicitly from the window: full card width, exact 16:9, never taller
  // than ~200pt. Numeric width+height cannot misbehave.
  // winW − card mx-3 (24) − card border (2) − ScrollView paddingHorizontal (28).
  const heroW = Math.max(200, winW - 54);
  const heroH = Math.min(200, Math.round((heroW * 9) / 16));

  // PI's read of the four V2 agents, off the SAME deterministic numbers the strands +
  // recovery already computed — the stream narrates them, one lane each.
  const piReads: PiAgentReads = useMemo(
    () => ({
      cda: home
        ? { grossSF: facts.genome?.grossSF?.v ?? facts.grossSF ?? home.grossSF, levels: home.levels, rooms: home.rooms.length }
        : null,
      pit: f ? { marketValue: f.marketValue, equityAtClose: f.equityAtClose, monthlyPayment: f.monthlyPayment } : null,
      financingOpen: !!financingOpen,
      reaper: recovery ? { recoveryPct: recovery.recoveryScore, salvage: recovery.estSalvageValue } : null,
      murphy: p ? { nextCycleSF: p.nextCycleSF, nextCycleN: p.cycle + 1, nextLevels: p.levels + 1 } : null,
    }),
    [home, facts, f, p, recovery, financingOpen],
  );
  // PI's check layer — his cross-source verdicts over VERA's collection (0¢, pure).
  const piChecks = useMemo(() => piCollectionChecks(facts, facts.genome), [facts]);
  // The stream of consciousness — PI's orchestration read, shared with the cockpit panel.
  const stream = useMemo(
    () =>
      piStream({
        reads: piReads,
        overlook,
        claimed: ledgerView ? ledgerView.templateTotal - ledgerView.missing.length : 0,
        templateTotal: ledgerView?.templateTotal ?? 0,
      }),
    [piReads, overlook, ledgerView],
  );
  // PI's single next move — his one instruction as the homeowner's point of contact,
  // distilled from the same stream (0¢). `saved` proxies "the plan's been opened before".
  const nextStep = useMemo(
    () =>
      piNextStep(stream, {
        claimed: ledgerView ? ledgerView.templateTotal - ledgerView.missing.length : 0,
        templateTotal: ledgerView?.templateTotal ?? 0,
        planOpened: saved,
      }),
    [stream, ledgerView, saved],
  );

  return (
    <View className="mx-3 mt-1 mb-1 rounded-2xl border" style={{ borderColor: `${AURORA}44`, backgroundColor: "#0B0F16", overflow: "hidden" }}>
      {/* Aurora chrome — the Builder Open House ribbon, woven around the whole J-Space. */}
      <AuroraWeaveBorder color={AURORA} bright={AURORA_CYAN} radius={16} frame={false} idKey="jspace" />
      {/* ── Collapsed strip / header ── */}
      <Pressable onPress={toggle} className="flex-row items-center px-3.5 py-2.5 gap-2">
        <Text style={{ color: AURORA_CYAN }} className="text-[11px]">◇</Text>
        <Text style={{ color: FIN }} className="text-[11px] -ml-1">◆</Text>
        <Text className="text-[#F9FAFB] text-[12px] font-bold flex-1" numberOfLines={1}>
          Value Chain · J-Space Builder
        </Text>
        {home ? (
          <Text className="text-[#9CA3AF] text-[10px]" numberOfLines={1}>
            {/* Record SF first — the assessor living area (genome.grossSF), the SAME number
                the assessor/record panel and PI's context use. Falls back to stated / tiled. */}
            {home.archetype} · {(facts.genome?.grossSF?.v ?? facts.grossSF ?? home.grossSF).toLocaleString()} SF
            {saved ? <Text style={{ color: FIN }}> · saved ✓</Text> : null}
          </Text>
        ) : (
          <Text className="text-[#6B7280] text-[10px]">tell me about your home</Text>
        )}
        <Text className="text-[#4B5563] text-[11px]">{expanded ? "▾" : "▸"}</Text>
      </Pressable>

      {expanded ? (
        // Bounded + internally scrollable — the build logic can run long (record →
        // VERA checks → REAPER → build trace → reverse takeoff); cap at ~62% of the
        // screen so it never runs off the bottom, and scroll within instead of clipping.
        <ScrollView
          style={{ maxHeight: Math.round(winH * 0.62) }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 12 }}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Thinking line — VERA bones → CDA tiling (real stages). */}
          {thinking ? (
            <Text style={{ color: VERA }} className="text-[10px] mb-1.5">{thinking}</Text>
          ) : null}

          {home ? (
            <>
              {/* The hero — the aurora writing the home's ledger in light. Replaces the
                  blueprint sketch (VERA's footprint reconstruction, out — Sal 8/31); the
                  plan itself lives on in the Plan Builder + full plan set. */}
              <View className="rounded-xl overflow-hidden items-center" style={{ borderWidth: 1, borderColor: "#0f2a26", backgroundColor: "#0A0A0A" }}>
                <Image
                  source={require("../assets/jspace-hero.png")}
                  resizeMode="cover"
                  style={{ width: heroW, height: heroH }}
                />
              </View>
              {facts.address ? (
                <Text className="text-[#6B7280] text-[9px] mt-1" numberOfLines={1}>
                  {facts.address} · the aurora writes your record below
                </Text>
              ) : null}

              {/* The two strands — the value chain, under the render. */}
              {SHOW_STRAND_NUMBERS ? (
                <View className="flex-row gap-2 mt-2">
                  {p ? (
                    <View className="flex-1 rounded-xl p-2.5 border" style={{ borderColor: "#1E3A5F", backgroundColor: "#0B1220" }}>
                      <Text style={{ color: CDA }} className="text-[9px] tracking-wider mb-1">◇ PHYSICAL</Text>
                      <StrandRow label="Gross" value={`${p.grossSF.toLocaleString()} SF`} />
                      <StrandRow label="Levels" value={String(p.levels)} />
                      {p.footprintW && p.footprintD ? <StrandRow label="Footprint" value={`${p.footprintW}×${p.footprintD}'`} /> : null}
                      <StrandRow label={`Cycle ${p.cycle + 1}`} value={`~${p.nextCycleSF.toLocaleString()} SF`} accent={CDA} />
                    </View>
                  ) : null}
                  {f ? (
                    <View className="flex-1 rounded-xl p-2.5 border" style={{ borderColor: "#14532D", backgroundColor: "#0A1410" }}>
                      <Text style={{ color: FIN }} className="text-[9px] tracking-wider mb-1">◆ FINANCIAL</Text>
                      <StrandRow label="Value" value={moneyShort(f.marketValue)} />
                      <StrandRow label="Equity" value={moneyShort(f.equityAtClose)} accent={FIN} />
                      <StrandRow label="Monthly" value={moneyShort(f.monthlyPayment)} />
                      <StrandRow label={`Cycle ${f.nextCycleN}`} value={`~${moneyShort(f.nextCycleValue)}`} accent={FIN} />
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* ── PI leads — the homeowner's one guide, centered on the home + ledger. ── */}
              <View className="mt-2">
                <CustodianBuildGuideCard overlook={overlook} stageCount={trace?.length} hasHome />
              </View>

              {/* The collection receipt — which source landed, which didn't, how full the
                  ledger stands. Pure read of the findings store; the gather's debug window. */}
              {facts.address ? (
                <CollectionReceipt
                  addressKey={normalizeAddress(facts.address)}
                  bonesStatus={bonesStatus}
                  cardSource={facts.attributesSource}
                  claimed={ledgerView ? ledgerView.templateTotal - ledgerView.missing.length : 0}
                  templateTotal={ledgerView?.templateTotal ?? 0}
                />
              ) : null}

              {/* THE GENERAL LEDGER — the centerpiece. The one verified record every part of
                  the value chain builds on; each entry opens its own input door. Same spine
                  the Portfolio draws (shared useHomeLedger), so the two never diverge. Shows
                  the blank scaffold too — the template IS the production empty state. */}
              {ledgerView && ledgerExtract?.length ? (
                <LedgerSpine
                  extract={ledgerExtract}
                  view={ledgerView}
                  revealed={ledgerExtract.length + 99}
                  showLink
                  address={ledgerAddress}
                />
              ) : null}

              {/* YOUR BLUEPRINTS — the first value, one tap (Sal 9/1): the plan set drafts
                  from the master ledger (the genome handoff the chat already wired), truer
                  as entries claim. Absorbs the old Customize / View-full-set footer links. */}
              <BlueprintSetCard
                claimed={ledgerView ? ledgerView.templateTotal - ledgerView.missing.length : 0}
                templateTotal={ledgerView?.templateTotal ?? 0}
                saved={saved}
                onOpen={onViewPlan}
                onCustomize={onCustomize}
              />

              {/* PI's STREAM OF CONSCIOUSNESS — one card (Sal 9/1): the orchestration
                  lanes (when each capability runs, its max value gain, its tier ladder)
                  with Build Logic Layer 1 + the Layer 2 deep read folded in underneath.
                  The Design lane is live — the master-ledger plan set (openPlanSet). */}
              <PiStreamCard
                stream={stream}
                nextStep={nextStep}
                checks={piChecks}
                trace={trace}
                studioMatched={!!blueprint}
                layer2={layer2}
                address={facts.address}
                addressKey={facts.address ? normalizeAddress(facts.address) : undefined}
                onPlanSet={onViewPlan}
                onCustomize={onCustomize}
              />
            </>
          ) : (
            <Text className="text-[#6B7280] text-[11px] leading-4 pb-1">
              Start with your address — or describe the home ("3 bed 2 bath ranch, about 50x30") —
              and your value chain starts here: the record, the ledger, and the money, one unit.
            </Text>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}
