import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDrawer } from "@/lib/drawer";
import { trpc } from "@/lib/trpc";
import { BANDS, APPS, MATRIX } from "@/lib/app-pricing";
import { openAccount, openAppSurface, openPricing } from "@/lib/billing";
import { isPreview } from "@/lib/preview";

/**
 * Credits & Billing — WEB-FIRST companion surface.
 * Shows the account's advisory/compute balance, sends users to the ML Systems RI
 * web to manage/purchase, and renders the App × Band pricing matrix as an
 * awareness layer (each app badged with its presiding mind). No in-app purchase.
 */
export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  const balance = trpc.tokens.getBalance.useQuery(undefined, { retry: 0 });

  const tokenBalance: number | null = balance.data?.tokenBalance ?? null;
  const computeBalance: number | null = balance.data?.computeBalance ?? null;

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40, paddingHorizontal: 16 }}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-6">
        <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text className="text-[#93a89b] text-2xl leading-none">☰</Text>
        </TouchableOpacity>
        <Text className="text-[#F9FAFB] text-xl font-extrabold">Credits & Billing</Text>
      </View>

      {/* Balance */}
      <View className="flex-row gap-3 mb-4">
        <View className="bg-[#111111] border border-[#22C55E]/10 rounded-xl p-4 flex-1">
          <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1">Advisory Credits</Text>
          <Text className="text-[#22C55E] text-xl font-extrabold">
            {balance.isLoading ? "…" : tokenBalance ?? (isPreview() ? "—" : "0")}
          </Text>
          <Text className="text-[#374151] text-[10px] mt-0.5">1 credit · 1 AI session</Text>
        </View>
        <View className="bg-[#111111] border border-[#262626] rounded-xl p-4 flex-1">
          <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1">Compute Credits</Text>
          <Text className="text-[#F9FAFB] text-xl font-extrabold">
            {balance.isLoading ? "…" : computeBalance ?? (isPreview() ? "—" : "0")}
          </Text>
          <Text className="text-[#6B7280] text-[10px] mt-0.5">1 credit · 1 file analysis</Text>
        </View>
      </View>

      {/* Manage on web — companion model: purchasing lives on ML Systems RI. */}
      <TouchableOpacity
        onPress={openAccount}
        activeOpacity={0.85}
        className="rounded-2xl py-3.5 items-center mb-2"
        style={{ backgroundColor: "#22C55E14", borderWidth: 1, borderColor: "#22C55E40" }}
      >
        <Text style={{ color: "#22C55E" }} className="text-[13px] font-bold">Manage credits & billing on the web →</Text>
      </TouchableOpacity>
      <Text className="text-[#4B5563] text-[11px] text-center mb-7">
        Plans & credits are purchased on mlsystemsri.com. Your balance syncs back here.
      </Text>

      {/* Plans & Pricing — App × Band matrix, one card per app surface. */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-3">Plans & Pricing</Text>
      {APPS.map((app) => (
        <View key={app.key} className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-3">
          {/* App header + presiding mind badge + open-on-web */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2 flex-1">
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: app.color }} />
              <Text className="text-[#F9FAFB] text-[14px] font-bold" numberOfLines={1}>{app.name}</Text>
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: `${app.color}1A`, borderWidth: 1, borderColor: `${app.color}40` }}
              >
                <Text style={{ color: app.color }} className="text-[9px] font-bold uppercase tracking-wider">{app.agent}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => openAppSurface(app.href)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: app.color }} className="text-[11px] font-semibold">Web →</Text>
            </TouchableOpacity>
          </View>

          {/* Band rows */}
          {BANDS.map((b) => {
            const cell = MATRIX[app.key][b.key];
            return (
              <View key={b.key} className="flex-row items-start py-1.5 border-t border-[#1a1a1a]">
                <Text style={{ color: b.color, width: 34 }} className="text-[10px] font-bold">{b.key}</Text>
                <View className="flex-1 pr-2">
                  <Text className="text-[#9CA3AF] text-[11px]">{b.name}</Text>
                  <Text className="text-[#4B5563] text-[9px] leading-tight">{cell.desc}</Text>
                </View>
                <Text className="text-[#F9FAFB] text-[11px] font-bold text-right" style={{ maxWidth: 96 }}>{cell.tag}</Text>
              </View>
            );
          })}
        </View>
      ))}

      <TouchableOpacity onPress={openPricing} activeOpacity={0.7} className="items-center mt-2">
        <Text className="text-[#6B7280] text-[11px]">See full pricing →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
