import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import type { TraceStage } from "@/lib/build-trace";
import type { SwarmReport } from "@/lib/plan-swarm";
import { MIND_COLOR } from "./build-trace-card";

/**
 * SwarmRebuildCard — Build Logic · Layer 2: CDA's cost-effective swarm rebuild.
 *
 * After VERA lays the foundation, seven discipline lenses critique the tiled plan
 * and the layout converges (commonalities) / resolves (conflicts) into a rebuilt
 * interior — the 49-lens Claude swarm's technique, run deterministically at 0¢.
 * Mirrors the Layer-1 BuildTraceCard design (same stage rows, glyph + mind color,
 * expand/collapse) so Layer 2 reads as clean stages, not a different surface.
 */

const CDA = "#60A5FA";

export function SwarmRebuildCard({ stages, report }: { stages: TraceStage[]; report: SwarmReport }) {
  const [open, setOpen] = useState(false);
  const [openStage, setOpenStage] = useState<string | null>(null);
  if (!stages.length) return null;

  return (
    <View className="rounded-xl border mb-4" style={{ borderColor: `${CDA}33`, backgroundColor: `${CDA}0A` }}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        className="flex-row items-center px-3 py-2.5 gap-2"
      >
        <Text style={{ color: CDA }} className="text-[9px] tracking-wider flex-1" numberOfLines={1}>
          ◈ BUILD LOGIC · LAYER 2 — CDA SWARM REBUILD
        </Text>
        <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="px-3 pb-2.5">
          {/* The swarm's convergence at a glance — the technique, priced at 0¢. */}
          <View className="flex-row flex-wrap gap-x-3 gap-y-0.5 mb-1.5">
            <Text style={{ color: CDA }} className="text-[8.5px] font-bold">{report.lensCount} lenses</Text>
            <Text className="text-[#9CA3AF] text-[8.5px]">{report.commonalities.length} commonalit{report.commonalities.length === 1 ? "y" : "ies"}</Text>
            <Text className="text-[#9CA3AF] text-[8.5px]">{report.conflicts.length} conflict{report.conflicts.length === 1 ? "" : "s"}</Text>
            <Text className="text-[#9CA3AF] text-[8.5px]">{report.opsApplied} op{report.opsApplied === 1 ? "" : "s"}</Text>
            <Text style={{ color: "#34D399" }} className="text-[8.5px] font-bold">0¢</Text>
          </View>

          {stages.map((s, i) => {
            const col = MIND_COLOR[s.mind];
            const on = openStage === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setOpenStage(on ? null : s.id);
                }}
                className="py-1.5 border-t"
                style={{ borderColor: "#14171c" }}
              >
                <View className="flex-row items-center gap-2">
                  <Text className="text-[#4B5563] text-[9px] w-3">{i + 1}</Text>
                  <Text style={{ color: col }} className="text-[10px]">{s.glyph}</Text>
                  <Text className="text-[#E5E7EB] text-[11px] font-semibold flex-1" numberOfLines={1}>{s.title}</Text>
                  <Text style={{ color: col }} className="text-[8px] tracking-wider">{s.mind.toUpperCase()}</Text>
                  <Text className="text-[#4B5563] text-[9px]">{on ? "▾" : "▸"}</Text>
                </View>
                {on ? (
                  <View className="ml-5 mt-1">
                    <Text className="text-[#9CA3AF] text-[10px] leading-4">{s.method}</Text>
                    {s.result.map((r, j) => (
                      <Text key={j} style={{ color: col }} className="text-[9.5px] mt-1">· {r}</Text>
                    ))}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          <Text className="text-[#4B5563] text-[8.5px] mt-1.5">
            the 49-lens swarm's technique, deterministic on-device — same inputs always rebuild the same plan · MODELED
          </Text>
        </View>
      ) : null}
    </View>
  );
}
