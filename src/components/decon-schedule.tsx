import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { trpc } from "@/lib/trpc";
import {
  SHIFTS,
  DECON_PHASES,
  CADENCES,
  THE_45_FEEDS,
  SHIFT_MODEL,
  currentShiftFor,
  type Shift,
} from "@/lib/decon-schedule";
import { formatEquity } from "@/lib/format";

const ACCENT = "#F97316";

/**
 * Deconstruction Schedule — the canonical 2-day / 6-shift / 90-45 cadence, live-bound
 * to the active decon job when one exists (else the template renders unbound). Rendered
 * inside the Crew tab's Schedule view. No native deps; pure RN + tRPC (null-safe).
 */
export function DeconSchedule() {
  const isFocused = useIsFocused();
  // Live decon-job context. The procedure may not be deployed yet → null-safe: the
  // template renders unbound. Refetches only while the screen is focused.
  const active = trpc.deconSchedule.getActive.useQuery(undefined, {
    retry: 0,
    enabled: isFocused,
  });
  const job = active.data ?? null;

  // Track the wall-clock so the "now" highlight advances; tick each minute on-screen.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!isFocused) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [isFocused]);

  const slot = currentShiftFor(now); // daily slot 1–6 + labor/solve
  // Current-time phase — derived from the shift schedule + wall-clock (the DB only
  // tracks coarse loan/decon/construction, not the 6 decon sub-phases).
  const nowShift = slot.slot != null ? SHIFTS.find((s) => s.shift === slot.slot) : null;
  const currentPhaseCode = nowShift
    ? DECON_PHASES.find((p) => nowShift.phase.toUpperCase().includes(p.code))?.code ?? null
    : null;
  // If bound to a job with a known day, the active shift number is exact; otherwise
  // the "now" marker lights the matching slot in both days.
  const boundDay: 1 | 2 | null = job?.day ?? null;
  const isNow = (s: Shift) => {
    if (slot.slot == null) return false;
    if (boundDay) return s.day === boundDay && s.shift === slot.slot + (boundDay === 2 ? 6 : 0);
    return s.shift === slot.slot || s.shift === slot.slot + 6;
  };

  const day1 = SHIFTS.filter((s) => s.day === 1);
  const day2 = SHIFTS.filter((s) => s.day === 2);

  return (
    <View>
      {/* Bound-job header (or unbound template note) */}
      <View
        className="rounded-2xl p-4 mb-4"
        style={{ backgroundColor: job ? `${ACCENT}0D` : "#111111", borderWidth: 1, borderColor: job ? `${ACCENT}40` : "#262626" }}
      >
        {job ? (
          <>
            <Text style={{ color: ACCENT }} className="text-[10px] font-bold uppercase tracking-wider mb-1">Active Job</Text>
            <Text className="text-[#F9FAFB] text-[15px] font-bold" numberOfLines={1}>{job.address ?? "Deconstruction in progress"}</Text>
            <View className="flex-row gap-4 mt-2">
              <HeaderStat label="Now" value={currentPhaseCode ?? "Off-site"} accent={ACCENT} />
              <HeaderStat label="Recovered" value={job.recovery?.valueCents != null ? formatEquity(job.recovery.valueCents) : "—"} />
              <HeaderStat label="Materials" value={job.recovery?.materialCount != null ? String(job.recovery.materialCount) : "—"} />
            </View>
          </>
        ) : (
          <>
            <Text style={{ color: ACCENT }} className="text-[10px] font-bold uppercase tracking-wider mb-1">Schedule Template</Text>
            <Text className="text-[#F9FAFB] text-[14px] font-bold">2-Day Deconstruction Cadence</Text>
            <Text className="text-[#6B7280] text-[12px] mt-0.5">
              6 shifts/day · 90 min labor + 45 min solve · no active job bound yet
            </Text>
          </>
        )}
      </View>

      {/* 6-phase decon sequence — live status when bound */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-2">Phase Sequence</Text>
      <View className="flex-row flex-wrap gap-1.5 mb-5">
        {DECON_PHASES.map((p) => {
          const activeP = currentPhaseCode === p.code;
          return (
            <View
              key={p.code}
              className="rounded-lg px-2.5 py-1.5"
              style={{
                backgroundColor: activeP ? `${p.color}22` : "#111111",
                borderWidth: 1,
                borderColor: activeP ? p.color : "#262626",
              }}
            >
              <Text style={{ color: p.color }} className="text-[10px] font-bold">{p.code}</Text>
              <Text className="text-[#6B7280] text-[8px]">{p.duration}</Text>
            </View>
          );
        })}
      </View>

      {/* Shift schedule — Day 1 / Day 2 */}
      <DayBlock label="Day 1" shifts={day1} isNow={isNow} />
      <DayBlock label="Day 2" shifts={day2} isNow={isNow} />

      {/* The two cadences */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-2 mt-2">Two Cadences</Text>
      <View className="flex-row gap-3 mb-5">
        {CADENCES.map((c) => (
          <View key={c.key} className="flex-1 bg-[#111111] border border-[#262626] rounded-xl p-3" style={{ borderColor: `${c.accent}33` }}>
            <Text style={{ color: c.accent }} className="text-[12px] font-bold">{c.label}</Text>
            <Text className="text-[#9CA3AF] text-[10px] mt-0.5">{c.who}</Text>
            <Text style={{ color: c.accent }} className="text-[9px] font-semibold mt-1 uppercase tracking-wider">{c.pay}</Text>
            <Text className="text-[#6B7280] text-[10px] leading-snug mt-1.5">{c.role}</Text>
          </View>
        ))}
      </View>

      {/* What the 45 feeds */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-2">The 45 Feeds</Text>
      <View className="flex-row flex-wrap gap-2 mb-2">
        {THE_45_FEEDS.map((f) => (
          <View key={f.platform} className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: `${f.accent}12`, borderWidth: 1, borderColor: `${f.accent}33` }}>
            <Text style={{ color: f.accent }} className="text-[10px] font-bold">{f.platform}</Text>
            <Text className="text-[#6B7280] text-[9px]">{f.activity}</Text>
          </View>
        ))}
      </View>
      <Text className="text-[#374151] text-[9px] mt-1">
        Source: Decon Lab ontology · {SHIFT_MODEL.totalShifts} shifts across 2 days
      </Text>
    </View>
  );
}

function DayBlock({ label, shifts, isNow }: { label: string; shifts: readonly Shift[]; isNow: (s: Shift) => boolean }) {
  return (
    <View className="mb-4">
      <Text className="text-[#9CA3AF] text-[12px] font-bold mb-2">{label}</Text>
      {shifts.map((s) => {
        const now = isNow(s);
        return (
          <View
            key={s.shift}
            className="rounded-xl p-3 mb-2"
            style={{
              backgroundColor: now ? `${ACCENT}12` : "#111111",
              borderWidth: 1,
              borderColor: now ? ACCENT : "#262626",
            }}
          >
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center gap-2">
                <View className="rounded-full items-center justify-center" style={{ width: 20, height: 20, backgroundColor: now ? ACCENT : "#262626" }}>
                  <Text style={{ color: now ? "#0A0A0A" : "#9CA3AF" }} className="text-[10px] font-extrabold">{s.shift}</Text>
                </View>
                <Text className="text-[#F9FAFB] text-[12px] font-bold">{s.time}</Text>
                {now ? <Text style={{ color: ACCENT }} className="text-[9px] font-bold uppercase">· now</Text> : null}
              </View>
              <Text className="text-[#6B7280] text-[10px]">{s.shiftCrew} crew</Text>
            </View>

            {/* 90 / 45 labor·solve mini-bar */}
            <View className="flex-row rounded-full overflow-hidden mb-1.5" style={{ height: 5 }}>
              <View style={{ flex: SHIFT_MODEL.laborMin, backgroundColor: ACCENT }} />
              <View style={{ flex: SHIFT_MODEL.solveMin, backgroundColor: "#4EA0F5" }} />
            </View>

            <Text className="text-[#cbd2da] text-[12px] font-semibold">{s.phase}</Text>
            <Text className="text-[#6B7280] text-[10px] mt-0.5">{s.crewFocus}</Text>
            <Text className="text-[#4B5563] text-[9px] mt-1 leading-snug">{s.constantsDoing}</Text>
          </View>
        );
      })}
    </View>
  );
}

function HeaderStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View>
      <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider">{label}</Text>
      <Text style={accent ? { color: accent } : undefined} className={`text-[14px] font-extrabold ${accent ? "" : "text-[#F9FAFB]"}`}>{value}</Text>
    </View>
  );
}
