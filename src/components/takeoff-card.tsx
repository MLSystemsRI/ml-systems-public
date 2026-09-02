import { View, Text, TouchableOpacity } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { demoTakeoff, type TakeoffSummary } from "@/lib/takeoff-types";
import { usd } from "@/lib/example-chain";

/**
 * Detailed construction takeoff — the "connected" cost surface. Renders a
 * representative Design Studio takeoff (6 CSI divisions, $/SF, convergence) and
 * links out to the full swarm engine at design.mlsystemsri.com (the WebBrowser
 * pattern from design.tsx). Shared by the Cost and Construction screens.
 */

const DESIGN = "#60A5FA";
const STUDIO_URL = "https://design.mlsystemsri.com";

export function TakeoffCard({
  totalSF,
  address,
  summary,
  zeroed,
}: {
  totalSF?: number;
  address?: string;
  summary?: TakeoffSummary;
  /**
   * ZEROED BUT OPEN (Sal 9/1) — the homeowner lens with no real takeoff shows the
   * STRUCTURE (the six divisions, the door into the Design Studio) with every number
   * unearned: $—, empty bars, 0% converged. The representative demo figures are the
   * Custodian's preview, never the homeowner's first read.
   */
  zeroed?: boolean;
}) {
  const zero = !!zeroed && !summary;
  const t = summary ?? demoTakeoff(totalSF ?? 3300);
  const maxDiv = Math.max(...t.divisions.map((d) => d.totalCost));

  const openStudio = () => {
    const q = new URLSearchParams();
    if (address) q.set("address", address);
    q.set("sf", String(t.totalSF));
    WebBrowser.openBrowserAsync(`${STUDIO_URL}?${q.toString()}`, {
      toolbarColor: "#0A0A0A",
      controlsColor: DESIGN,
    });
  };

  return (
    <View className="bg-[#111111] border rounded-2xl p-4" style={{ borderColor: `${DESIGN}26` }}>
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-[#F9FAFB] text-[15px] font-bold">Construction Takeoff</Text>
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${DESIGN}1A`, borderWidth: 1, borderColor: `${DESIGN}40` }}>
          <Text style={{ color: DESIGN }} className="text-[9px] font-bold uppercase tracking-wider">
            {zero ? "0% converged" : `${t.convergedPct}% converged`}
          </Text>
        </View>
      </View>
      <Text className="text-[#6B7280] text-[11px] mb-4">
        {zero ? "builds from your ledger — every number earned, none pre-filled" : `${t.totalSF.toLocaleString()} SF · ${usd(t.totalCost)} all-in · $${t.costPerSF}/SF`}
      </Text>

      {/* Division bars — the structure ships either way; zeroed = unearned. */}
      <View className="gap-2.5 mb-4">
        {t.divisions.map((d) => (
          <View key={d.division}>
            <View className="flex-row justify-between mb-1">
              <Text className="text-[#cbd2da] text-[11px]">{d.label}</Text>
              <Text className="text-[#9CA3AF] text-[11px] font-mono">{zero ? "$—" : usd(d.totalCost)}</Text>
            </View>
            <View className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#1A1A1A" }}>
              <View
                className="h-full rounded-full"
                style={{ width: zero ? "2%" : `${Math.max(6, (d.totalCost / maxDiv) * 100)}%`, backgroundColor: zero ? "#374151" : d.color }}
              />
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={openStudio}
        activeOpacity={0.85}
        className="rounded-xl py-3 items-center border"
        style={{ borderColor: `${DESIGN}55`, backgroundColor: `${DESIGN}14` }}
      >
        <Text style={{ color: DESIGN }} className="text-[13px] font-bold">
          Generate full takeoff in Design Studio →
        </Text>
      </TouchableOpacity>
      <Text className="text-[#374151] text-[10px] text-center mt-2">
        {zero ? "Your numbers land here as the design generates." : "Representative figures until your design is generated."}
      </Text>
    </View>
  );
}
