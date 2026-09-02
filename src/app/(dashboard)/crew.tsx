import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDrawer } from "@/lib/drawer";
import { LucentIcon } from "@/components/mind-icons";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/format";
import { DeconSchedule } from "@/components/decon-schedule";
import { PayrollCalc } from "@/components/payroll-calc";

// The "Path" (road to operate) moved to Decon Lab › Operating Credentials (/credentials).
type CrewView = "schedule" | "clock" | "pay";
const VIEW_LABELS: Record<CrewView, string> = { schedule: "Shifts", clock: "Clock", pay: "Pay" };

const ACCENT = "#F97316";

/** Minutes → "2h 15m" / "45m". */
function fmtDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function CrewScreen() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  const utils = trpc.useUtils();
  const [view, setView] = useState<CrewView>("schedule");

  const activeShift = trpc.crew.getActiveShift.useQuery(undefined, { retry: 0 });
  const shifts = trpc.crew.getMyShifts.useQuery(undefined, { retry: 0 });

  const refresh = () => {
    utils.crew.getActiveShift.invalidate();
    utils.crew.getMyShifts.invalidate();
  };
  const clockIn = trpc.crew.clockIn.useMutation({
    onSuccess: refresh,
    onError: (e: any) => Alert.alert("Couldn't clock in", e.message),
  });
  const clockOut = trpc.crew.clockOut.useMutation({
    onSuccess: refresh,
    onError: (e: any) => Alert.alert("Couldn't clock out", e.message),
  });

  const busy = clockIn.isPending || clockOut.isPending;
  const active = activeShift.data ?? null;
  // crewRouter is role-gated (crew/manager/admin) — non-crew users get FORBIDDEN.
  const gated = activeShift.isError || shifts.isError;

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 16 }}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-6">
        <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <LucentIcon size={22} color="#22C55E" />
        </TouchableOpacity>
        <Text className="text-[#F9FAFB] text-xl font-extrabold">Crew</Text>
      </View>

      {/* Shifts · Clock · Pay — Shifts (the 2-day cadence) is the default. */}
      <View className="flex-row bg-[#111111] border border-[#262626] rounded-xl p-0.5 mb-5">
        {(["schedule", "clock", "pay"] as CrewView[]).map((v) => {
          const on = view === v;
          return (
            <TouchableOpacity
              key={v}
              onPress={() => setView(v)}
              activeOpacity={0.8}
              className="flex-1 rounded-lg py-2 items-center"
              style={on ? { backgroundColor: ACCENT } : undefined}
            >
              <Text style={{ color: on ? "#0A0A0A" : "#9CA3AF" }} className="text-[11px] font-bold">
                {VIEW_LABELS[v]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {view === "schedule" ? (
        <DeconSchedule />
      ) : view === "pay" ? (
        <PayrollCalc />
      ) : activeShift.isLoading ? (
        <View className="items-center justify-center py-16">
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : gated ? (
        // Genuine, informative state — not a placeholder.
        <View className="bg-[#111111] border border-[#262626] rounded-2xl p-5">
          <Text style={{ color: ACCENT }} className="text-[11px] font-bold uppercase tracking-wider mb-2">
            Crew Tools
          </Text>
          <Text className="text-[#F9FAFB] text-[15px] font-bold mb-1">Time clock &amp; field docs</Text>
          <Text className="text-[#6B7280] text-[13px] leading-snug">
            Clock in/out and shift history are available to ML Systems crew members. Ask an admin to
            enable crew access on your account.
          </Text>
        </View>
      ) : (
        <>
          {/* Shift status + clock action */}
          <View
            className="rounded-2xl p-4 mb-6"
            style={{
              backgroundColor: active ? `${ACCENT}0D` : "#111111",
              borderWidth: 1,
              borderColor: active ? `${ACCENT}40` : "#262626",
            }}
          >
            <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1">Current Shift</Text>
            {active ? (
              <>
                <Text style={{ color: ACCENT }} className="text-[16px] font-extrabold">On shift</Text>
                <Text className="text-[#6B7280] text-[12px] mt-0.5">
                  Since {formatDate(active.clockIn)}
                </Text>
              </>
            ) : (
              <Text className="text-[#9CA3AF] text-[15px] font-semibold">Not clocked in</Text>
            )}
            <TouchableOpacity
              onPress={() => (active ? clockOut.mutate({}) : clockIn.mutate())}
              disabled={busy}
              activeOpacity={0.85}
              className="rounded-xl py-3 items-center mt-3"
              style={{
                backgroundColor: active ? "#EF444414" : `${ACCENT}1A`,
                borderWidth: 1,
                borderColor: active ? "#EF444440" : `${ACCENT}40`,
                opacity: busy ? 0.5 : 1,
              }}
            >
              <Text style={{ color: active ? "#EF4444" : ACCENT }} className="text-[13px] font-bold">
                {busy ? "…" : active ? "Clock out" : "Clock in"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Recent shifts */}
          <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-3">Recent Shifts</Text>
          {shifts.isLoading ? (
            <ActivityIndicator color={ACCENT} />
          ) : (shifts.data?.length ?? 0) === 0 ? (
            <Text className="text-[#6B7280] text-[13px]">No completed shifts yet.</Text>
          ) : (
            shifts.data!.map((s: any) => (
              <View
                key={s.id}
                className="bg-[#111111] border border-[#262626] rounded-xl p-3.5 mb-2.5 flex-row items-center justify-between"
              >
                <Text className="text-[#F9FAFB] text-[13px] font-semibold">{formatDate(s.clockIn)}</Text>
                <Text style={{ color: ACCENT }} className="text-[13px] font-bold">
                  {fmtDuration(s.durationMinutes)}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}
