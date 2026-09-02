import { View, Text, TouchableOpacity } from "react-native";
import { GenomeLineage } from "@/components/genome-lineage";
import { PlanSetCard } from "@/components/plan-set-card";
import type { PlanSetIndexParams } from "@/lib/plan-set-index";
import type { HomeGenome } from "@ml-systems/types";

/**
 * PlansHero — the Plan Builder's blueprint OUTPUT, merged into one surface.
 *
 * Everything CDA compiles from the value-chain ledger + the genome, in one place:
 * the genome's generations (the cycles the blueprint can re-tile at), the full
 * ~45-sheet NCS plan-set index on the phone, and the two doors to the studio's
 * hi-fi render. This is the hero — the "what did the ledger draw" — so it leads,
 * and the build-logic narration collapses below it. Presentational.
 */

const CDA = "#60A5FA";

export function PlansHero({
  genome,
  currentCycle,
  onSelectCycle,
  planSetParams,
  onOpenFull,
  onOpenDeep,
}: {
  genome?: HomeGenome | null;
  currentCycle: number;
  onSelectCycle: (n: number) => void;
  planSetParams: PlanSetIndexParams;
  onOpenFull: () => void;
  onOpenDeep: () => void;
}) {
  return (
    <View className="rounded-2xl border mb-6" style={{ borderColor: `${CDA}33`, backgroundColor: `${CDA}0A` }}>
      <View className="px-3 pt-3 pb-1">
        <Text style={{ color: CDA }} className="text-[9px] tracking-widest" numberOfLines={1}>
          ◈ YOUR BLUEPRINTS — compiled from the value-chain ledger + genome
        </Text>
      </View>
      <View className="px-3 pb-3">
        {genome ? (
          <GenomeLineage genome={genome} currentCycle={currentCycle} onSelect={onSelectCycle} />
        ) : null}

        <PlanSetCard params={planSetParams} onOpenFull={onOpenFull} />

        <TouchableOpacity
          onPress={onOpenFull}
          activeOpacity={0.85}
          className="rounded-2xl py-3.5 items-center mt-2.5"
          style={{ backgroundColor: `${CDA}14`, borderWidth: 1, borderColor: `${CDA}40` }}
        >
          <Text style={{ color: CDA }} className="text-[13px] font-bold">View full plan set ↗</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onOpenDeep}
          activeOpacity={0.85}
          className="rounded-2xl py-3.5 items-center mt-2.5"
          style={{ backgroundColor: "#7C3AED14", borderWidth: 1, borderColor: "#7C3AED55" }}
        >
          <Text style={{ color: "#A78BFA" }} className="text-[13px] font-bold">🔍 Deep plan — zoom to the studs ↗</Text>
        </TouchableOpacity>

        <Text className="text-[#374151] text-[9.5px] text-center mt-3">
          Your customizations ride into the chat and the full plan set automatically.
        </Text>
      </View>
    </View>
  );
}
