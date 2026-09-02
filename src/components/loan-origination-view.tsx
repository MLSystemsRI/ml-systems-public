import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { StatCard } from "@/components/stat-card";
import { useLocalHome } from "@/lib/home-store";
import { estimateEquity } from "@/lib/home-estimate";
import { usd } from "@/lib/example-chain";

/**
 * Loan Origination body — the homeowner's RCM view (how-the-RCM-works, the
 * year-5 estimate, and the Loan Documents → Uploads hand-off). Header-less and
 * without its own ScrollView so it can be dropped into any scroll container:
 * the standalone `/loan` screen (loan.tsx) and The Loan Pit's "Loan Origination"
 * tab (pit.tsx) both render it, keeping the numbers in one place.
 */

const GREEN = "#22C55E";
const RATE = 0.065;

export function LoanOriginationView() {
  const home = useLocalHome();
  const est = home ? estimateEquity(home, { years: 5, rate: RATE }) : null;

  return (
    <View>
      {/* How RCM works */}
      <View className="bg-[#111111] border rounded-2xl p-4 mb-6" style={{ borderColor: `${GREEN}33` }}>
        <Text className="text-[#F9FAFB] text-[14px] font-bold mb-3">How the RCM works</Text>
        {[
          ["Same monthly payment", "Standard amortization formula — no surprises."],
          ["100% to principal", "Every dollar reduces principal; interest accrues separately as a deferred liability."],
          ["Equity grows faster", "Principal drops linearly — equity builds in years 1–5, not 20–30."],
        ].map(([t, d], i) => (
          <View key={t} className="flex-row gap-3 mb-2.5">
            <View
              className="w-5 h-5 rounded-full items-center justify-center mt-0.5"
              style={{ backgroundColor: i === 1 ? GREEN : "#1A1A1A", borderWidth: 1, borderColor: `${GREEN}33` }}
            >
              <Text style={{ color: i === 1 ? "#000" : "#6B7280" }} className="text-[10px] font-bold">{i + 1}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#F9FAFB] text-[13px] font-semibold">{t}</Text>
              <Text className="text-[#6B7280] text-[11px] mt-0.5">{d}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Estimate (needs a loaded home) */}
      {home && est ? (
        <>
          <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-2">Your Estimate · yr 5</Text>
          <View className="flex-row gap-3 mb-3">
            <StatCard label="Monthly Payment" value={`$${Math.round(est.monthlyPayment).toLocaleString()}`} sub="Same as conventional" />
            <StatCard label="RCM Equity" value={usd(est.rcmEquity)} sub={`+${usd(est.advantage)} vs conv.`} accent />
          </View>
          <TouchableOpacity
            onPress={() => router.push("/cost" as any)}
            activeOpacity={0.85}
            className="rounded-xl py-3 items-center mb-6 border"
            style={{ borderColor: `${GREEN}55`, backgroundColor: `${GREEN}14` }}
          >
            <Text style={{ color: GREEN }} className="text-[13px] font-bold">Full cost & equity breakdown →</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          onPress={() => router.push("/add-home" as any)}
          activeOpacity={0.85}
          className="rounded-xl py-3.5 items-center mb-6"
          style={{ backgroundColor: GREEN }}
        >
          <Text className="text-black font-bold text-[13px]">Load your home to see your numbers →</Text>
        </TouchableOpacity>
      )}

      {/* Loan documents → Uploads */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-2">Loan Documents</Text>
      <TouchableOpacity
        onPress={() => router.push("/uploads" as any)}
        activeOpacity={0.85}
        className="bg-[#111111] border border-[#262626] rounded-2xl p-4 flex-row items-center justify-between"
      >
        <View className="flex-1 pr-3">
          <Text className="text-[#F9FAFB] text-[13px] font-bold">Upload pay stubs, tax returns, ID</Text>
          <Text className="text-[#6B7280] text-[11px] mt-0.5">Attach the docs your lender requests.</Text>
        </View>
        <Text style={{ color: "#4EA0F5" }} className="text-lg">→</Text>
      </TouchableOpacity>
    </View>
  );
}
