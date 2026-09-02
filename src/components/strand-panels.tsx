import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SvgXml } from "react-native-svg";
import type { StrandFinancial, StrandPhysical } from "@/lib/ai";

/**
 * StrandPanels — the dual-perspective J-Space under a "Let's build" answer.
 *
 * One home, two strands, side by side: PHYSICAL (the home's geometry) and FINANCIAL
 * (real MODELED cost / value / equity). Both carry a next-cycle projection so the
 * homeowner sees their looped journey (cycle N → N+1). These are the homeowner's OWN
 * home numbers — the force multiplier — never the minds/cascade behind the answer.
 *
 * When the home's real j-space drawing is fetched (`floorPlanSvg`/`sectionSvg`, from the
 * Design Studio's /api/design/blueprint), it renders INLINE under the numbers — the
 * homeowner sees the actual blueprint, with a tap to flip floor-plan ↔ section. The
 * Design Studio still owns the FULL drawn set (`onViewPlan` links out to all 73 sheets).
 * Renders only the panel(s) that have data; nothing when neither strand fired.
 */

const money = (n: number): string =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${Math.round(n / 1_000)}k` : `$${Math.round(n)}`;
const sf = (n: number): string => `${Math.round(n).toLocaleString()} SF`;

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View className="flex-row justify-between items-baseline py-0.5">
      <Text className="text-[#9CA3AF] text-[10.5px]">{label}</Text>
      <Text className="text-[11.5px] font-semibold" style={{ color: accent ?? "#E5E7EB" }}>
        {value}
      </Text>
    </View>
  );
}

export function StrandPanels({
  financial,
  physical,
  cycle,
  floorPlanSvg,
  sectionSvg,
  onViewPlan,
}: {
  financial?: StrandFinancial;
  physical?: StrandPhysical;
  cycle?: number;
  /** The home's real j-space floor plan (raw <svg>), rendered inline when present. */
  floorPlanSvg?: string;
  /** The building section (raw <svg>) — enables the floor-plan ↔ section toggle. */
  sectionSvg?: string;
  /** Opens the Design Studio's full drawn plan set for this home. */
  onViewPlan?: () => void;
}) {
  const [view, setView] = useState<"plan" | "section">("plan");
  if (!financial && !physical) return null;
  const cy = cycle ?? financial?.cycle ?? physical?.cycle;
  const drawing = view === "section" && sectionSvg ? sectionSvg : floorPlanSvg;

  return (
    <View className="mt-2 max-w-[88%]">
      {/* Cycle + MODELED badge */}
      <View className="flex-row items-center gap-2 mb-1.5">
        {cy != null ? (
          <Text className="text-[9px] tracking-wider text-[#111111] bg-[#84CC16] rounded px-1.5 py-0.5 font-bold">
            CYCLE #{cy}
          </Text>
        ) : null}
        <Text className="text-[9px] tracking-wider text-[#F59E0B] border border-[#F59E0B]/40 rounded px-1.5 py-0.5">
          MODELED
        </Text>
      </View>

      <View className="flex-row gap-2">
        {/* Physical strand */}
        {physical ? (
          <View className="flex-1 border border-[#1E3A5F] rounded-xl p-2.5 bg-[#0B1220]">
            <Text className="text-[#60A5FA] text-[10px] tracking-wider mb-1">◇ PHYSICAL</Text>
            <Text className="text-[#E5E7EB] text-[15px] font-bold mb-1">{sf(physical.grossSF)}</Text>
            <Row label="Levels" value={String(physical.levels)} />
            {physical.footprintW && physical.footprintD ? (
              <Row label="Footprint" value={`${physical.footprintW}×${physical.footprintD} ft`} />
            ) : null}
            {physical.rooms ? <Row label="Rooms" value={String(physical.rooms)} /> : null}
            <Row label={`Cycle ${physical.cycle + 1}`} value={`~${sf(physical.nextCycleSF)}`} accent="#60A5FA" />
          </View>
        ) : null}

        {/* Financial strand */}
        {financial ? (
          <View className="flex-1 border border-[#14532D] rounded-xl p-2.5 bg-[#0A1410]">
            <Text className="text-[#22C55E] text-[10px] tracking-wider mb-1">◆ FINANCIAL</Text>
            <Text className="text-[#E5E7EB] text-[15px] font-bold mb-1">{money(financial.marketValue)}</Text>
            <Row label="Build cost" value={money(financial.buildCost)} />
            <Row label="Equity" value={money(financial.equityAtClose)} accent="#22C55E" />
            <Row label="Monthly" value={money(financial.monthlyPayment)} />
            <Row label={`Cycle ${financial.nextCycleN}`} value={`~${money(financial.nextCycleValue)}`} accent="#22C55E" />
          </View>
        ) : null}
      </View>

      {/* The home's real j-space drawing, inline — floor plan (or section), on white. */}
      {drawing ? (
        <View className="mt-2 border border-[#1E3A5F] rounded-xl bg-[#0A0F18] p-2">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-[#60A5FA] text-[9.5px] tracking-wider">
              ◇ {view === "section" ? "SECTION" : "FLOOR PLAN"} · j-space
            </Text>
            {floorPlanSvg && sectionSvg ? (
              <Pressable
                onPress={() => setView((v) => (v === "plan" ? "section" : "plan"))}
                className="border border-[#1E3A5F] rounded px-1.5 py-0.5"
              >
                <Text className="text-[#60A5FA] text-[9px]">{view === "plan" ? "section ⇄" : "plan ⇄"}</Text>
              </Pressable>
            ) : null}
          </View>
          <View className="bg-white rounded-lg overflow-hidden" style={{ height: 190 }}>
            <SvgXml xml={drawing} width="100%" height="100%" />
          </View>
        </View>
      ) : null}

      {/* Inline is the preview; the full drawn plan set lives in the Design Studio. */}
      {onViewPlan ? (
        <Pressable
          onPress={onViewPlan}
          className="mt-1.5 self-start flex-row items-center gap-1 border border-[#1E3A5F] rounded-lg px-2.5 py-1.5 bg-[#0B1220]"
        >
          <Text className="text-[#60A5FA] text-[10.5px] font-semibold">View full plan set →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
