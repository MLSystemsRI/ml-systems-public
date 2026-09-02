import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import { BuildTraceCard } from "@/components/build-trace-card";
import { DeepSearchCard } from "@/components/deep-search-card";
import type { TraceStage } from "@/lib/build-trace";

/**
 * BuildLogicGroup — the "how CDA drew this" narration, folded into one collapsed
 * group so the blueprint OUTPUT leads and the build logic stays available but out of
 * the way. Layer 1 (buildTrace) and Layer 2 (the deep pass + the owl's sources) live
 * inside; collapsed by default. Presentational — the cards are unchanged.
 */

const DIM = "#6B7280";

export function BuildLogicGroup({
  trace,
  deepPass,
  address,
  addressKey,
  onListingShot,
}: {
  trace: TraceStage[];
  deepPass: TraceStage[];
  address?: string;
  addressKey: string;
  onListingShot: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View className="mb-6">
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        className="flex-row items-center rounded-xl px-3 py-2.5 border"
        style={{ borderColor: "#1f2937", backgroundColor: "#0B0F14" }}
      >
        <Text style={{ color: DIM }} className="text-[9px] tracking-widest flex-1" numberOfLines={1}>
          ⚙ BUILD LOGIC — how CDA drew this (Layer 1 + 2)
        </Text>
        <Text style={{ color: DIM }} className="text-[9px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="mt-2">
          <BuildTraceCard trace={trace} />
          <DeepSearchCard
            address={address}
            addressKey={addressKey}
            deepPass={deepPass}
            onListingShot={onListingShot}
          />
        </View>
      ) : null}
    </View>
  );
}
