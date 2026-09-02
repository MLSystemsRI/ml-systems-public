import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDrawer } from "@/lib/drawer";

export default function PayrollScreen() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <View className="flex-row items-center gap-3 px-4" style={{ paddingTop: insets.top + 12 }}>
        <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text className="text-[#93a89b] text-2xl leading-none">☰</Text>
        </TouchableOpacity>
        <Text className="text-[#F9FAFB] text-xl font-extrabold">Payroll</Text>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#6B7280", fontSize: 14 }}>Coming soon</Text>
      </View>
    </View>
  );
}
