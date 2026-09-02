import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useDrawer } from "@/lib/drawer";
import { MLMark } from "@/components/ml-mark";
import { StatCard } from "@/components/stat-card";
import { ToggleChip } from "@/components/toggle-chip";
import { TakeoffCard } from "@/components/takeoff-card";
import { useLocalHome } from "@/lib/home-store";
import { useMode } from "@/lib/view-mode";
import { estimateEquity } from "@/lib/home-estimate";
import { usd } from "@/lib/example-chain";

/**
 * Cost & Equity — the homeowner's up-front estimate. Simple RCM/1.43x numbers
 * (home-estimate.ts, same math as the agent's calculate_rcm tool, so the card
 * and PI never disagree) plus the connected Design Studio construction takeoff.
 */

const GREEN = "#22C55E";
const RATE = 0.065; // 6.5% baseline
const YEARS = [1, 3, 5, 10];

export default function CostScreen() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  const home = useLocalHome();
  const { isHome } = useMode();
  const [years, setYears] = useState(5);

  const Header = (
    <View className="flex-row items-center gap-3 mb-5">
      <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text className="text-[#93a89b] text-2xl leading-none">☰</Text>
      </TouchableOpacity>
      <MLMark size={22} color={GREEN} />
      <View className="flex-1">
        <Text className="text-[#F9FAFB] text-lg font-extrabold leading-tight">Cost & Equity</Text>
        <Text className="text-[#6B7280] text-[11px]">RCM estimate · construction takeoff</Text>
      </View>
    </View>
  );

  if (!home) {
    return (
      <ScrollView
        className="flex-1 bg-[#0A0A0A]"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {Header}
        <View className="items-center justify-center py-16 gap-4">
          <Text className="text-[#6B7280] text-[13px] text-center leading-5">
            Load your home first to see your cost & equity estimate.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/add-home" as any)}
            activeOpacity={0.85}
            className="rounded-xl px-5 py-3"
            style={{ backgroundColor: GREEN }}
          >
            <Text className="text-black font-bold text-[13px]">Load your home →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const est = estimateEquity(home, { years, rate: RATE });

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
    >
      {Header}

      {/* Home line */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-2">Your Home</Text>
      <View className="bg-[#111111] border border-[#262626] rounded-xl px-4 py-3 mb-5">
        <Text className="text-[#F9FAFB] text-[14px] font-bold" numberOfLines={1}>{home.address}</Text>
        <Text className="text-[#6B7280] text-[12px] mt-0.5">Est. value {home.estValueDollars != null ? usd(home.estValueDollars) : "— VERA pulling the public record"}</Text>
      </View>

      {/* Year selector */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-2">Project To</Text>
      <View className="flex-row mb-5">
        {YEARS.map((y) => (
          <ToggleChip key={y} label={`${y} yr`} accent={GREEN} active={y === years} onPress={() => setYears(y)} />
        ))}
      </View>

      {/* Estimate cards */}
      <View className="flex-row gap-3 mb-3">
        <StatCard label="Monthly Payment" value={`$${Math.round(est.monthlyPayment).toLocaleString()}`} sub="Same as conventional" />
        <StatCard label={`RCM Equity · yr ${years}`} value={usd(est.rcmEquity)} sub={`${est.cyclesCompleted} cycle${est.cyclesCompleted === 1 ? "" : "s"}`} accent />
      </View>
      <View className="flex-row gap-3 mb-3">
        <StatCard label="Conventional Equity" value={usd(est.convEquity)} sub="Same payment, flat value" />
        <StatCard label="RCM Advantage" value={`+${usd(est.advantage)}`} sub={`More equity by yr ${years}`} accent />
      </View>
      <Text className="text-[#374151] text-[10px] mb-7">
        RCM sends 100% of each payment to principal; interest defers separately. Property value compounds
        ~1.43× per 8-month rebuild cycle. Illustrative at {Math.round(RATE * 100)}% / 30-yr.
      </Text>

      {/* Connected construction takeoff */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-3">Detailed Construction Takeoff</Text>
      {/* Homeowner → zeroed but open: numbers earn in from the ledger, never demo'd. */}
      <TakeoffCard totalSF={home.sqft ? Math.round(home.sqft * 1.1 * 1.5) : 3300} address={home.address} zeroed={isHome} />
    </ScrollView>
  );
}
