import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { useDrawer } from "@/lib/drawer";
import { LucentIcon } from "@/components/mind-icons";

/** Homeowner QR — a custodian surface. Present this to a prospect to scan; it
 *  opens the live, no-login homeowner app preview. The QR image is bundled so
 *  it renders offline. */

const PREVIEW_URL = "https://ml-systems-homeowner.vercel.app";

export default function HomeownerQrScreen() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40, paddingHorizontal: 16, minHeight: "100%" }}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-1">
        <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <LucentIcon size={22} color="#22C55E" />
        </TouchableOpacity>
        <Text className="text-[#F9FAFB] text-xl font-extrabold">Homeowner QR</Text>
      </View>
      <Text className="text-[#6B7280] text-[12px] mb-8 ml-6">Hand the phone over — they scan, they're in.</Text>

      <View className="items-center">
        {/* Badge */}
        <View className="flex-row items-center gap-2 border border-white/10 bg-white/5 rounded-full px-4 py-1.5 mb-6">
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" }} />
          <Text className="text-white/50 text-[11px] font-semibold tracking-wider uppercase">ML Systems</Text>
        </View>

        <Text className="text-[#F9FAFB] text-2xl font-extrabold text-center leading-tight mb-1">Scan to open</Text>
        <Text className="text-center text-[16px] font-extrabold mb-3">
          <Text style={{ color: "#22C55E" }}>the homeowner </Text>
          <Text style={{ color: "#14B8A6" }}>app</Text>
        </Text>
        <Text className="text-white/45 text-[13px] text-center max-w-[280px] leading-snug mb-7">
          Build real wealth through your home — finance, deconstruct, design, and build in one closed loop.
        </Text>

        {/* QR card */}
        <View className="rounded-3xl bg-white p-6" style={{ shadowColor: "#22C55E", shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: 0 } }}>
          <Image
            source={require("../../assets/preview-qr.png")}
            style={{ width: 260, height: 260 }}
            resizeMode="contain"
            accessibilityLabel="QR code linking to the live homeowner app"
          />
        </View>

        <Text className="text-white/30 text-[12px] font-mono mt-5 tracking-wide">ml-systems-homeowner.vercel.app</Text>

        {/* Open in browser */}
        <TouchableOpacity
          onPress={() => WebBrowser.openBrowserAsync(PREVIEW_URL, { toolbarColor: "#0A0A0A", controlsColor: "#22C55E" })}
          activeOpacity={0.85}
          className="mt-8 rounded-xl px-5 py-3 border"
          style={{ borderColor: "#22C55E55", backgroundColor: "#22C55E14" }}
        >
          <Text style={{ color: "#22C55E" }} className="text-[13px] font-bold">Open the preview →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
