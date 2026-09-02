import { View, Text, Pressable, ScrollView } from "react-native";
import { generation, type HomeGenome } from "@ml-systems/types";
import { computeStrands, moneyShort } from "@/lib/strands";

/**
 * GenomeLineage — generational compression, visible.
 *
 * The home's whole lineage is one origin genome + the equity-loop delta applied
 * per cycle (+10% footprint area, +1 level, from the calibrated constants). Each
 * chip IS `generation(origin, n)` — regenerable, never stored — with the strand
 * value computed from the same constants as everywhere else. Tapping a cycle asks
 * the parent to re-tile the j-space at that generation.
 */

const VERA = "#34D399";
const CYCLE = "#84CC16";
const MAX_CYCLE = 5;

export function GenomeLineage({
  genome,
  currentCycle,
  onSelect,
}: {
  genome: HomeGenome;
  currentCycle: number;
  onSelect?: (n: number) => void;
}) {
  const cycles = [];
  for (let n = genome.cycle; n <= MAX_CYCLE; n++) cycles.push(n);

  return (
    <View className="mb-4">
      <Text className="text-[#6B7280] text-[10px] uppercase tracking-[0.16em] mb-2">
        Generations <Text className="text-[#4B5563] normal-case tracking-normal">· one genome, compounded</Text>
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {cycles.map((n) => {
          const gen = generation(genome, n);
          const on = n === currentCycle;
          const sf = gen.grossSF?.v;
          const value = sf
            ? computeStrands({ grossSF: sf, levels: gen.levels.v, cycle: n }).financial?.marketValue
            : undefined;
          return (
            <Pressable
              key={n}
              onPress={onSelect ? () => onSelect(n) : undefined}
              className="rounded-xl px-3 py-2 border"
              style={{
                borderColor: on ? CYCLE : n === genome.cycle ? `${VERA}55` : "#262626",
                backgroundColor: on ? `${CYCLE}14` : "#111111",
              }}
            >
              <View className="flex-row items-baseline gap-1.5">
                <Text style={{ color: on ? CYCLE : "#9CA3AF" }} className="text-[11px] font-extrabold">#{n}</Text>
                {n === genome.cycle ? (
                  <Text style={{ color: VERA }} className="text-[7.5px] tracking-wider">ORIGIN · RECORDS</Text>
                ) : (
                  <Text className="text-[#4B5563] text-[7.5px] tracking-wider">DERIVED</Text>
                )}
              </View>
              <Text className="text-[#E5E7EB] text-[10px] font-semibold mt-0.5">
                {sf ? `${sf.toLocaleString()} SF` : "—"} · {gen.levels.v} lvl
              </Text>
              {value ? (
                <Text style={{ color: on ? CYCLE : "#6B7280" }} className="text-[9.5px] mt-0.5">{moneyShort(value)}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
