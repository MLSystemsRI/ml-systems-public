import { View, Text, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDrawer } from "@/lib/drawer";
import {
  BOND,
  SEATS,
  SEATS_HELD,
  SEATS_OPEN,
  LIFECYCLE,
  GOLD,
  usdShort,
} from "@/lib/investor-data";

/** Investor lens — the capital surface. The ML Systems Single Star Bond ★, the
 *  24.638-seat pool, the investor lifecycle, and the TTA tier architecture.
 *  Fully static (works on the no-login guest demo); links out to the full
 *  investor portal at investor.mlsystemsri.com. */

const PORTAL = "https://investor.mlsystemsri.com";

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View className="bg-[#111111] border rounded-2xl p-3.5 mb-2.5" style={{ width: "48.5%", borderColor: `${GOLD}26` }}>
      <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider mb-1">{label}</Text>
      <Text style={{ color: GOLD }} className="text-[18px] font-black tabular-nums">{value}</Text>
      {sub ? <Text className="text-[#6B7280] text-[10px] mt-0.5">{sub}</Text> : null}
    </View>
  );
}

export default function InvestorScreen() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-1">
        <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text className="text-[#93a89b] text-2xl leading-none">☰</Text>
        </TouchableOpacity>
        <Text style={{ color: GOLD }} className="text-xl font-extrabold">Investor</Text>
      </View>
      <Text className="text-[#6B7280] text-[12px] mb-4 ml-8">
        The Custodian's perpetual labor instrument.
      </Text>

      {/* Bond hero */}
      <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: `${GOLD}0F`, borderWidth: 1, borderColor: `${GOLD}33` }}>
        <View className="flex-row items-center gap-2 mb-1.5">
          <Text style={{ color: GOLD }} className="text-[13px]">★</Text>
          <Text style={{ color: GOLD }} className="text-[10px] font-bold uppercase tracking-widest">{BOND.rating} Rated</Text>
          <View className="flex-1" />
          <Text className="text-[#6B7280] text-[9px] font-mono">{BOND.serial}</Text>
        </View>
        <Text className="text-[#F9FAFB] text-[17px] font-extrabold leading-tight mb-1">{BOND.name}</Text>
        <Text className="text-[#9CA3AF] text-[12px] leading-snug">
          A trust-graduated subscription bond capped at {usdShort(BOND.perSeatCap)} per investor. When the cap is
          transferred, the Custodian's daily output activates: +$1 per day, every day, for {BOND.termDays.toLocaleString()} days.
        </Text>
      </View>

      {/* Metrics */}
      <View className="flex-row flex-wrap justify-between mb-3">
        <Metric label="Per-Investor Cap" value={usdShort(BOND.perSeatCap)} sub="Hard ceiling per seat" />
        <Metric label="Portfolio Ceiling" value={usdShort(BOND.ceiling)} sub={`Σ Day 1…${BOND.dailyEnd.toLocaleString()}`} />
        <Metric label="Seats at Cap" value={String(BOND.seatsTotal)} sub="24 full + 1 partial" />
        <Metric label="Daily Output" value="+$1 / day" sub={`Day N = $N · ${BOND.termYears} yrs`} />
      </View>

      {/* Day-N one-liner */}
      <View className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-5">
        <Text className="text-[#6B7280] text-[10px] uppercase tracking-widest mb-1.5">Day-N Arithmetic</Text>
        <Text className="text-[#cbd2da] text-[12px] leading-snug">
          The engine compounds linearly. Day 1 pays $1; Day {BOND.dailyEnd.toLocaleString()} pays ${BOND.dailyEnd.toLocaleString()}.
          The triangular sum of every day equals the portfolio ceiling — {usdShort(BOND.ceiling)}. The bond is the area under the line.
        </Text>
      </View>

      {/* Seat pool */}
      <View className="flex-row items-baseline justify-between mb-2.5">
        <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider">The Investor Pool</Text>
        <Text style={{ color: GOLD }} className="text-[10px] font-bold">{SEATS_HELD} held · {SEATS_OPEN} open</Text>
      </View>
      <View className="bg-[#111111] border rounded-2xl p-4 mb-5" style={{ borderColor: `${GOLD}26` }}>
        <View className="flex-row flex-wrap gap-1.5 mb-3">
          {SEATS.map((s) => (
            <View
              key={s.n}
              className="items-center justify-center rounded-md"
              style={{
                width: 30, height: 26,
                backgroundColor: s.held ? `${GOLD}26` : "#0A0A0A",
                borderWidth: 1,
                borderColor: s.held ? `${GOLD}80` : "#262626",
                borderStyle: s.partial ? "dashed" : "solid",
              }}
            >
              <Text style={{ color: s.held ? GOLD : "#4B5563" }} className="text-[9px] font-bold">
                {s.partial ? ".638" : String(s.n).padStart(2, "0")}
              </Text>
            </View>
          ))}
        </View>
        <Text className="text-[#6B7280] text-[11px] leading-snug">
          Each seat is a separate bond — individually capped at {usdShort(BOND.perSeatCap)}, individually paced.
          Tier-isolated under TTA § 4. Seat 01 is the Custodian's own anchor line.
        </Text>
      </View>

      {/* Lifecycle */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-3">Investor Lifecycle</Text>
      <View className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-5">
        {LIFECYCLE.map((s, i) => (
          <View key={s.stage} className={`flex-row items-start gap-3 ${i < LIFECYCLE.length - 1 ? "mb-3" : ""}`}>
            <View className="rounded-full items-center justify-center" style={{ width: 22, height: 22, backgroundColor: `${GOLD}1A` }}>
              <Text style={{ color: GOLD }} className="text-[11px] font-bold">{s.stage}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#F9FAFB] text-[13px] font-bold">{s.title}</Text>
              <Text className="text-[#6B7280] text-[11px] leading-snug">{s.blurb}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA → portal */}
      <TouchableOpacity
        onPress={() => Linking.openURL(PORTAL)}
        activeOpacity={0.85}
        className="rounded-xl py-3.5 items-center"
        style={{ backgroundColor: GOLD }}
      >
        <Text className="text-black font-bold text-[13px]">Open the Investor Portal →</Text>
      </TouchableOpacity>
      <Text className="text-center text-[#4B5563] text-[9.5px] font-mono tracking-wider mt-3">
        investor.mlsystemsri.com · LL · TT · MVE
      </Text>
      <Text className="text-center text-[#374151] text-[9px] mt-1">
        Illustrative — instrument issued {BOND.issued}.
      </Text>
    </ScrollView>
  );
}
