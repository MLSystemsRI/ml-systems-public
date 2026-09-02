import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

/**
 * Investor-lens pointer — on most agent apps the investor view is a light nudge
 * to the Single Star Bond rather than a full dashboard (only the Hub + Pit get a
 * real investor surface). Pass a one-line, app-specific reason.
 */
export function InvestorPointer({ line }: { line: string }) {
  return (
    <TouchableOpacity
      onPress={() => router.push("/investor" as any)}
      activeOpacity={0.85}
      className="rounded-2xl px-4 py-4 flex-row items-center justify-between"
      style={{ backgroundColor: "#FFE5000F", borderWidth: 1, borderColor: "#FFE50040" }}
    >
      <View className="flex-row items-center gap-3 flex-1">
        <Text style={{ color: "#FFE500", fontSize: 20 }}>★</Text>
        <View className="flex-1">
          <Text className="text-[#F9FAFB] text-[13px] font-bold leading-tight">Single Star Bond</Text>
          <Text className="text-[#6B7280] text-[11px]">{line}</Text>
        </View>
      </View>
      <Text style={{ color: "#FFE500" }} className="text-lg">→</Text>
    </TouchableOpacity>
  );
}
