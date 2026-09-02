import { View, Text } from "react-native";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
}

export function StatCard({ label, value, sub, accent = false }: StatCardProps) {
  if (accent) {
    return (
      <View className="bg-[#111111] border border-[#22C55E]/10 rounded-xl p-4 flex-1">
        <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1">{label}</Text>
        <Text className="text-[#22C55E] text-xl font-extrabold">{value}</Text>
        {sub && <Text className="text-[#374151] text-[10px] mt-0.5">{sub}</Text>}
      </View>
    );
  }

  return (
    <View className="bg-[#111111] border border-[#262626] rounded-xl p-4 flex-1">
      <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1">{label}</Text>
      <Text className="text-[#F9FAFB] text-xl font-extrabold">{value}</Text>
      {sub && <Text className="text-[#6B7280] text-[10px] mt-0.5">{sub}</Text>}
    </View>
  );
}
