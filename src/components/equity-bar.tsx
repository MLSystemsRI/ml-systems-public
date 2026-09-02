import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { formatEquity } from "@/lib/format";
import { MLMark } from "./ml-mark";

export function EquityBar() {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = trpc.equity.getMine.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const equity      = data?.snapshot?.totalEquity;
  const cycleNumber = data?.project?.cycleNumber ?? 1;

  return (
    <View
      className="bg-[#0A0A0A] border-b border-[#262626] px-5 pb-3 flex-row items-end justify-between"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="flex-row items-center gap-2">
        <View style={{
          shadowColor: "#22C55E",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.75,
          shadowRadius: 8,
        }}>
          <MLMark size={20} color="#22C55E" />
        </View>
        <Text className="text-[#F9FAFB] text-sm font-bold tracking-tight">ML Systems</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Text className="text-[#6B7280] text-xs">
          C{cycleNumber}
        </Text>
        <Text className="text-[#22C55E] font-bold text-sm tabular-nums">
          {isLoading
            ? "—"
            : equity != null
            ? formatEquity(equity)
            : "—"}
        </Text>
      </View>
    </View>
  );
}
