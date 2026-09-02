import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { MLMark } from "@/components/ml-mark";
import { useDrawer } from "@/lib/drawer";
import { useLocalHome } from "@/lib/home-store";
import { VALUE_CHAIN_PHASES } from "@/lib/example-chain";

/**
 * The bottom "AI" tab — the "Let's build" landing page. The old persona switcher
 * is gone: one chat everyone uses (routes to the collective-chat screen), and the
 * Custodian Cockpit is its own tab. This page explains what powers that chat — the
 * Value Chain and the j-space builder — and funnels into it.
 */

const AURORA = "#14B8A6"; // Builder's Open House teal
const CYAN = "#06B6D4";
const DESIGN = "#60A5FA"; // CDA / Design Studio
const STUDIO_URL = process.env.EXPO_PUBLIC_DESIGN_URL ?? "https://design.mlsystemsri.com";

const PHASE_COLORS: Record<string, string> = {
  Finance: "#EF4444",
  Decon: "#F97316",
  Design: "#60A5FA",
  Build: "#84CC16",
  Loop: "#22C55E",
};

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  const home = useLocalHome();

  // The j-space builder is the Design Studio — open it carrying the loaded home
  // so it picks up where the homeowner is (same pattern as collective-chat's
  // openPlanSet).
  const openStudio = () => {
    const q = new URLSearchParams();
    if (home?.address) q.set("address", home.address);
    if (home?.sqft) q.set("sf", String(Math.round(home.sqft)));
    if (home?.beds != null) q.set("beds", String(home.beds));
    if (home?.baths != null) q.set("baths", String(home.baths));
    const qs = q.toString();
    WebBrowser.openBrowserAsync(`${STUDIO_URL}${qs ? `?${qs}` : ""}`, {
      toolbarColor: "#0A0A0A",
      controlsColor: DESIGN,
    }).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 10 }} className="px-4 pb-3 border-b border-[#262626]">
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text className="text-[#93a89b] text-2xl leading-none">☰</Text>
          </TouchableOpacity>
          <MLMark size={22} color="#22C55E" />
          <View className="flex-1">
            <Text className="text-[#F9FAFB] text-[15px] font-extrabold leading-tight">AI</Text>
            <Text style={{ color: AURORA }} className="text-[10px] font-semibold tracking-wider">
              Let&apos;s build
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* ── Hero — the aurora + the one chat ── */}
        <View className="items-center pt-4 pb-2">
          <Image
            source={require("../../assets/aurora-glyph.png")}
            resizeMode="contain"
            style={{ width: 96, height: 96, borderRadius: 48 }}
          />
          <Text className="text-[#F9FAFB] text-[22px] font-extrabold mt-4">Let&apos;s build.</Text>
          <Text className="text-[#9CA3AF] text-[13px] text-center leading-5 mt-2 px-3">
            One conversation. Every phase of your project.
          </Text>
        </View>

        {/* Primary CTA — into the one chat */}
        <TouchableOpacity
          onPress={() => router.push("/collective-chat" as never)}
          activeOpacity={0.85}
          className="rounded-2xl py-4 items-center mt-4 mb-7"
          style={{ backgroundColor: `${AURORA}1F`, borderWidth: 1.5, borderColor: `${AURORA}66` }}
        >
          <Text style={{ color: AURORA }} className="text-[15px] font-extrabold">
            Let&apos;s build →
          </Text>
        </TouchableOpacity>

        {/* ── The Value Chain ── */}
        <Text className="text-[#6B7280] text-[11px] uppercase tracking-[0.16em] mb-3">The Value Chain</Text>
        <View className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-3">
          <View className="flex-row items-center flex-wrap mb-3">
            {VALUE_CHAIN_PHASES.map((step, i) => (
              <View key={step} className="flex-row items-center">
                <Text style={{ color: PHASE_COLORS[step] ?? "#22C55E" }} className="text-[11px] font-bold">
                  {step}
                </Text>
                {i < VALUE_CHAIN_PHASES.length - 1 ? (
                  <Text className="text-[#374151] text-[11px] mx-1.5">→</Text>
                ) : null}
              </View>
            ))}
          </View>
          <Text className="text-[#9CA3AF] text-[12.5px] leading-5">
            Fund it. Take it down. Rebuild it bigger. Every cycle grows your equity.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/value-chain-explainer" as never)}
            activeOpacity={0.7}
            className="mt-3"
          >
            <Text style={{ color: "#22C55E" }} className="text-[12px] font-bold">
              What is the Value Chain? →
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── The j-space builder ── */}
        <Text className="text-[#6B7280] text-[11px] uppercase tracking-[0.16em] mb-3 mt-4">
          j-space builder
        </Text>
        <View
          className="rounded-2xl p-4"
          style={{ backgroundColor: `${CYAN}0A`, borderWidth: 1, borderColor: `${CYAN}33` }}
        >
          <Text className="text-[#F9FAFB] text-[13.5px] font-bold leading-snug">
            Your home, as numbers your whole project shares.
          </Text>
          <Text className="text-[#9CA3AF] text-[12.5px] leading-5 mt-2">
            Your home, encoded once — every phase works the same numbers.
          </Text>
          <TouchableOpacity
            onPress={openStudio}
            activeOpacity={0.85}
            className="rounded-xl py-3 items-center mt-3.5"
            style={{ backgroundColor: `${DESIGN}14`, borderWidth: 1, borderColor: `${DESIGN}40` }}
          >
            <Text style={{ color: DESIGN }} className="text-[12.5px] font-bold">
              Open the Design Studio ↗
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
