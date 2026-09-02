import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import { router } from "expo-router";
import type { TraceStage } from "@/lib/build-trace";
import { mindLabel } from "@/lib/mind-display";

/**
 * BuildTraceCard — read the plan's construction logic, stage by stage.
 *
 * Collapsed: one line. Open: the chain as it ran — each stage expandable to its
 * METHOD (the real rule/formula) and the RESULT it produced on this home. The
 * transparency layer for "how did it draw this?" — zero model calls, it only
 * narrates artifacts the pipeline already computed.
 */

const CDA = "#60A5FA";
export const MIND_COLOR: Record<TraceStage["mind"], string> = {
  Custodian: "#F5D060",
  VERA: "#34D399",
  CDA: "#60A5FA",
  REAPER: "#F97316",
  MIA: "#14B8A6",
  MURPHY: "#84CC16",
  "PIT LORD": "#EF4444",
};

export function BuildTraceCard({ trace, studioMatched }: { trace: TraceStage[]; studioMatched?: boolean }) {
  const [open, setOpen] = useState(false);
  const [openStage, setOpenStage] = useState<string | null>(null);

  return (
    <View className="rounded-xl border mb-4" style={{ borderColor: `${CDA}33`, backgroundColor: `${CDA}0A` }}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        className="flex-row items-center px-3 py-2.5 gap-2"
      >
        <Text style={{ color: CDA }} className="text-[9px] tracking-wider flex-1">
          ◇ THE BUILD LOGIC — HOW THIS PLAN WAS CONSTRUCTED, STAGE BY STAGE
        </Text>
        {/* MIA's attestation: the trace and the Design Studio blueprint derive from
            the SAME facts — when the studio plan is live, the logic matches it. */}
        {studioMatched ? (
          <Text
            style={{ color: CDA, backgroundColor: `${CDA}14`, borderColor: `${CDA}44`, borderWidth: 1 }}
            className="text-[8px] font-bold rounded-full px-1.5 py-0.5"
          >
            ◇ Design Studio ✓
          </Text>
        ) : null}
        <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="px-3 pb-2.5">
          {trace.map((s, i) => {
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
                  <Text className="text-[#E5E7EB] text-[11px] font-semibold flex-1">{s.title}</Text>
                  {/* Capability, not the mind's name — the agents stay backend (Sal 9/1). */}
                  <Text style={{ color: col }} className="text-[8px] tracking-wider">{mindLabel(s.mind)}</Text>
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
            deterministic — the same inputs always construct the same plan · MODELED
          </Text>
          {/* The flow-back: the build logic follows into the Custodian's value chain
              entry, and the entry feeds the Value Chain Portfolio. */}
          <Pressable
            onPress={() => router.push("/portfolio" as any)}
            className="mt-2 rounded-lg px-2.5 py-2 border flex-row items-center"
            style={{ borderColor: "#8B5CF644", backgroundColor: "#8B5CF60D" }}
          >
            <Text className="text-[9px] flex-1">
              <Text style={{ color: "#9CA3AF" }}>build logic → </Text>
              <Text style={{ color: "#F5D060" }}>value chain entry</Text>
              <Text style={{ color: "#9CA3AF" }}> → </Text>
              <Text style={{ color: "#22C55E" }} className="font-bold">The Value Chain Portfolio</Text>
            </Text>
            <Text style={{ color: "#8B5CF6" }} className="text-[11px]">→</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
