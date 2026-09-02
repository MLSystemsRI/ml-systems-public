import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, TouchableOpacity, LayoutAnimation } from "react-native";
import type { ReverseTakeoff, ReverseTonnageGeo, QuantityKind } from "@ml-systems/types";
import { homeEnvelope, validateQuantity, buildTakeoff } from "@ml-systems/types";
import { trpc } from "@/lib/trpc";
import { assessRebuild, usd } from "@/lib/rebuild-assessment";
import { setMeasurement, type Measurements } from "@/lib/measurements-store";
import { useMilestones, setMilestoneStatus, advanceStatus, type MilestoneStatus } from "@/lib/murphy-tracker-store";

/**
 * MurphyTrackerCard — MURPHY's project tracker, on the home's value-chain entry.
 *
 * Two modes:
 *  · LOCAL (no backend project): the demo tracker — milestones derive from
 *    MURPHY's assembly stack, the homeowner taps to advance, statuses persist
 *    on-device. MODELED.
 *  · SERVER (real project, custodian-verified): MURPHY's construction entry —
 *    the real milestones rows (vc.myMilestones). The homeowner SCHEDULES here:
 *    a start point + per-stage weeks cascade into plannedDates
 *    (foundation → roof) and save to the backend (vc.schedule). VERA oversees
 *    the scope numbers: stated LF / SF / ft³ must be in bounds with the home
 *    (homeEnvelope + validateQuantity — typical ✓ / uncommon ⚠ / unusual 🚨,
 *    unusual needs an explicit "Use anyway"). In-bounds tape also lands in the
 *    measurements store, so REAPER's tonnage sharpens from the same numbers.
 */

const MURPHY = "#84CC16";
const VERA = "#34D399";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const STATUS: Record<MilestoneStatus, { glyph: string; label: string; color: string }> = {
  pending: { glyph: "○", label: "pending", color: "#6B7280" },
  in_progress: { glyph: "◐", label: "in progress", color: AMBER },
  done: { glyph: "●", label: "done", color: MURPHY },
};
const SERVER_STATUS: Record<string, { glyph: string; label: string; color: string }> = {
  pending: STATUS.pending,
  in_progress: STATUS.in_progress,
  complete: { glyph: "●", label: "complete", color: MURPHY },
  blocked: { glyph: "✕", label: "blocked", color: RED },
};

/** The honest fallback when the reverse takeoff hasn't resolved yet. */
const FALLBACK: { id: string; label: string; members: string[] }[] = [
  { id: "m1-foundation", label: "Foundation", members: [] },
  { id: "m2-framing", label: "Framing & envelope", members: [] },
  { id: "m3-interior", label: "Interior walls", members: [] },
  { id: "m4-floor", label: "Floor framing", members: [] },
  { id: "m5-roof", label: "Roof", members: [] },
  { id: "m6-finishes", label: "Finishes", members: [] },
];

/** VERA's scope gate per stage — which envelope bound a stated quantity checks
 *  against, and which measurement it grounds when it passes. */
const SCOPE: Record<string, { kind: QuantityKind; measKey?: keyof Measurements; hint: string }> = {
  Foundation: { kind: "sf_floor", hint: "slab / footprint SF" },
  "Framing & envelope": { kind: "lf_ext", measKey: "extWallLF", hint: "exterior wall LF" },
  "Interior walls": { kind: "lf_int", measKey: "intWallLF", hint: "interior wall LF" },
  "Floor framing": { kind: "sf_floor", measKey: "floorSF", hint: "floor SF" },
  Roof: { kind: "sf_roof", measKey: "roofSF", hint: "roof SF" },
  Insulation: { kind: "cu_ft", hint: "insulated volume ft³" },
};

const dateAfterWeeks = (weeks: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + Math.round(weeks * 7));
  return d.toISOString().slice(0, 10);
};

export function MurphyTrackerCard({
  addressKey,
  reverse,
  currentValueDollars,
  grossSF,
  serverProjectId,
  address,
  geo,
}: {
  /** The home this tracker belongs to (normalized address) — local milestones persist here. */
  addressKey?: string;
  /** MURPHY's assembly stack — local milestones derive from it, in construction order. */
  reverse?: ReverseTakeoff | null;
  currentValueDollars?: number | null;
  grossSF?: number | null;
  /** The caller's REAL backend project — flips to server milestones + scheduling. */
  serverProjectId?: string | null;
  /** The home's address — in-bounds tape lands in the measurements store under it. */
  address?: string | null;
  /** The home's geometry — VERA's envelope (bounds for LF / SF / ft³) derives from it. */
  geo?: ReverseTonnageGeo | null;
}) {
  const [open, setOpen] = useState(true);
  const [schedOpen, setSchedOpen] = useState(false);
  const statuses = useMilestones(addressKey);

  // ── SERVER MODE — MURPHY's real construction entry (custodian-verified homes).
  // The mobile trpc client is intentionally untyped (lib/trpc.ts) — type the rows here.
  type ServerMilestone = { id: string; name: string; description: string | null; status: string; plannedDate: string | null };
  const serverQ = trpc.vc.myMilestones.useQuery(undefined, { enabled: !!serverProjectId, retry: 0 });
  const utils = trpc.useUtils();
  const scheduleMut = trpc.vc.schedule.useMutation({ onSuccess: () => void utils.vc.myMilestones.invalidate() });
  const serverRows: ServerMilestone[] =
    serverQ.data?.projectId === serverProjectId && Array.isArray(serverQ.data?.milestones)
      ? (serverQ.data.milestones as ServerMilestone[])
      : [];
  const serverMode = !!serverProjectId && serverRows.length > 0;

  // VERA's envelope — the home's bounds, from the same geometry the tonnage runs on.
  const envelope = useMemo(() => (geo ? homeEnvelope(reverse ?? null, geo) : null), [reverse, geo]);

  // Schedule state: a start point + per-stage weeks, cascading foundation → roof.
  const [startWeeks, setStartWeeks] = useState(2);
  const [weeks, setWeeks] = useState<Record<string, number>>({});
  const [scope, setScope] = useState<Record<string, string>>({});
  const [useAnyway, setUseAnyway] = useState<Record<string, boolean>>({});

  // Local milestones = the reverse takeoff's assemblies, grouped in construction order.
  const localMilestones = useMemo(() => {
    const lines = reverse?.lines ?? [];
    if (!lines.length) return FALLBACK;
    const byAssembly = new Map<string, { id: string; label: string; members: string[] }>();
    for (const l of [...lines].sort((a, b) => a.order - b.order)) {
      const id = `a${l.order}-${l.assembly}`;
      if (!byAssembly.has(id)) byAssembly.set(id, { id, label: l.assembly, members: [] });
      byAssembly.get(id)!.members.push(`${l.member}: ${l.spec}`);
    }
    return [...byAssembly.values()];
  }, [reverse]);

  const ra = useMemo(
    () => assessRebuild({ currentValueDollars, grossSF }),
    [currentValueDollars, grossSF],
  );

  // MURPHY's MVE — the deterministic 7-month build takeoff. Its total weeks seed the
  // scheduler's default per-stage duration, so the dates the homeowner cascades are
  // MURPHY's schedule, not an arbitrary flat guess.
  const mve = useMemo(
    () => buildTakeoff({ ...(geo ?? {}), grossSF: grossSF ?? geo?.grossSF ?? undefined }),
    [geo, grossSF],
  );
  const defaultStageWeeks = useMemo(
    () => (mve && serverRows.length ? Math.max(1, Math.round(mve.totalWeeks / serverRows.length)) : 3),
    [mve, serverRows.length],
  );

  // Cascaded planned dates: start + Σ durations, per server milestone in order.
  const planned = useMemo(() => {
    let acc = startWeeks;
    const out: Record<string, string> = {};
    for (const m of serverRows) {
      acc += weeks[m.id] ?? defaultStageWeeks;
      out[m.id] = dateAfterWeeks(acc);
    }
    return out;
  }, [serverRows, weeks, startWeeks, defaultStageWeeks]);

  // VERA's verdicts on every stated scope quantity.
  const verdicts = useMemo(() => {
    const out: Record<string, ReturnType<typeof validateQuantity>> = {};
    if (!envelope) return out;
    for (const m of serverRows) {
      const sc = SCOPE[m.name];
      const raw = scope[m.id];
      if (!sc || !raw?.trim()) continue;
      const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
      out[m.id] = validateQuantity(sc.kind, n, envelope);
    }
    return out;
  }, [serverRows, scope, envelope]);
  const blockedByVera = serverRows.some((m) => verdicts[m.id]?.level === "unusual" && !useAnyway[m.id]);

  const saveSchedule = () => {
    if (!serverRows.length || blockedByVera) return;
    scheduleMut.mutate({
      milestones: serverRows.map((m) => ({ milestoneId: m.id, plannedDate: planned[m.id]! })),
    });
    // In-bounds tape grounds REAPER too — the same numbers sharpen the tonnage.
    if (address) {
      for (const m of serverRows) {
        const sc = SCOPE[m.name];
        const v = verdicts[m.id];
        if (!sc?.measKey || !v || (v.level === "unusual" && !useAnyway[m.id])) continue;
        const n = parseFloat((scope[m.id] ?? "").replace(/[^0-9.]/g, ""));
        if (Number.isFinite(n) && n > 0) setMeasurement(address, sc.measKey, n);
      }
    }
  };

  const rows = serverMode
    ? serverRows.map((m) => ({ id: m.id, label: m.name, members: m.description ? [m.description] : [], server: m as { status: string; plannedDate: string | null } | null }))
    : localMilestones.map((m) => ({ ...m, server: null as { status: string; plannedDate: string | null } | null }));

  const doneCount = serverMode
    ? serverRows.filter((m) => m.status === "complete").length
    : localMilestones.filter((m) => (statuses[m.id] ?? "pending") === "done").length;
  const pct = rows.length ? Math.round((doneCount / rows.length) * 100) : 0;

  return (
    <View className="rounded-xl border mb-2" style={{ borderColor: `${MURPHY}33`, backgroundColor: `${MURPHY}0A` }}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        className="flex-row items-center px-3 py-2.5 gap-2"
      >
        <Text style={{ color: MURPHY }} className="text-[9px] tracking-wider flex-1" numberOfLines={1}>
          🏗 {serverMode ? "CONSTRUCTION ENTRY" : "REBUILD TRACKER"} — {doneCount}/{rows.length} · {pct}%
        </Text>
        {serverMode ? (
          <Text style={{ color: "#F5D060", borderColor: "#F5D06044", backgroundColor: "#F5D06014" }} className="text-[8px] font-bold rounded-full px-1.5 py-0.5 border">
            ◆ live
          </Text>
        ) : null}
        <Text style={{ color: MURPHY, borderColor: `${MURPHY}44`, backgroundColor: `${MURPHY}14` }} className="text-[8px] font-bold rounded-full px-1.5 py-0.5 border">
          {ra.cycleMonths}-mo cycle
        </Text>
        <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="px-3 pb-2.5">
          {/* Progress bar */}
          <View className="h-1.5 rounded-full mb-2 overflow-hidden" style={{ backgroundColor: "#14171c" }}>
            <View style={{ width: `${pct}%`, backgroundColor: MURPHY, height: "100%" }} />
          </View>

          {rows.map((m, i) => {
            const s = m.server ? (SERVER_STATUS[m.server.status] ?? SERVER_STATUS.pending!) : STATUS[statuses[m.id] ?? "pending"];
            const row = (
              <View className="py-1.5 border-t flex-row items-start gap-2" style={{ borderColor: "#14171c" }}>
                <Text className="text-[#4B5563] text-[9px] w-3 mt-0.5">{i + 1}</Text>
                <Text style={{ color: s.color }} className="text-[11px] mt-0.5">{s.glyph}</Text>
                <View className="flex-1">
                  <Text className="text-[#E5E7EB] text-[11px] font-semibold">{m.label}</Text>
                  {m.members.length ? (
                    <Text className="text-[#6B7280] text-[8.5px] leading-3 mt-0.5" numberOfLines={2}>
                      {m.members.join(" · ")}
                    </Text>
                  ) : null}
                  {m.server?.plannedDate ? (
                    <Text style={{ color: MURPHY }} className="text-[8.5px] mt-0.5">target {m.server.plannedDate}</Text>
                  ) : null}
                </View>
                <Text style={{ color: s.color }} className="text-[8px] tracking-wider uppercase mt-0.5">{s.label}</Text>
              </View>
            );
            // Local mode: tap advances. Server mode: MURPHY's console governs status.
            return m.server ? (
              <View key={m.id}>{row}</View>
            ) : (
              <Pressable key={m.id} onPress={() => setMilestoneStatus(addressKey, m.id, advanceStatus(statuses[m.id] ?? "pending"))}>
                {row}
              </Pressable>
            );
          })}

          {/* ── Scheduling — server mode only: dates cascade, VERA bounds the scope. ── */}
          {serverMode ? (
            <View className="mt-2 rounded-lg border p-2.5" style={{ borderColor: `${MURPHY}33` }}>
              <Pressable
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSchedOpen((o) => !o);
                }}
                className="flex-row items-center gap-2"
              >
                <Text style={{ color: MURPHY }} className="text-[9px] font-bold tracking-wider flex-1">
                  📅 SCHEDULE THE BUILD — the numbers are verified live
                </Text>
                <Text className="text-[#4B5563] text-[9px]">{schedOpen ? "▾" : "▸"}</Text>
              </Pressable>

              {schedOpen ? (
                <View className="mt-2">
                  {/* Start point */}
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-[#9CA3AF] text-[10.5px] flex-1">Start in</Text>
                    <TouchableOpacity onPress={() => setStartWeeks((w) => Math.max(0, w - 1))} className="rounded-md w-6 h-6 items-center justify-center border" style={{ borderColor: "#374151" }}>
                      <Text className="text-[#9CA3AF] text-[12px]">−</Text>
                    </TouchableOpacity>
                    <Text style={{ color: MURPHY }} className="text-[11px] font-bold w-14 text-center">{startWeeks} wk</Text>
                    <TouchableOpacity onPress={() => setStartWeeks((w) => Math.min(52, w + 1))} className="rounded-md w-6 h-6 items-center justify-center border" style={{ borderColor: "#374151" }}>
                      <Text className="text-[#9CA3AF] text-[12px]">+</Text>
                    </TouchableOpacity>
                  </View>

                  {serverRows.map((m) => {
                    const sc = SCOPE[m.name];
                    const v = verdicts[m.id];
                    return (
                      <View key={m.id} className="py-1.5 border-t" style={{ borderColor: "#14171c" }}>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-[#E5E7EB] text-[10.5px] font-semibold flex-1" numberOfLines={1}>{m.name}</Text>
                          <TouchableOpacity onPress={() => setWeeks((w) => ({ ...w, [m.id]: Math.max(1, (w[m.id] ?? defaultStageWeeks) - 1) }))} className="rounded-md w-6 h-6 items-center justify-center border" style={{ borderColor: "#374151" }}>
                            <Text className="text-[#9CA3AF] text-[12px]">−</Text>
                          </TouchableOpacity>
                          <Text style={{ color: MURPHY }} className="text-[10px] font-bold w-10 text-center">{weeks[m.id] ?? defaultStageWeeks} wk</Text>
                          <TouchableOpacity onPress={() => setWeeks((w) => ({ ...w, [m.id]: Math.min(26, (w[m.id] ?? defaultStageWeeks) + 1) }))} className="rounded-md w-6 h-6 items-center justify-center border" style={{ borderColor: "#374151" }}>
                            <Text className="text-[#9CA3AF] text-[12px]">+</Text>
                          </TouchableOpacity>
                          <Text className="text-[#6B7280] text-[9px] w-[74px] text-right">{planned[m.id]}</Text>
                        </View>
                        {sc ? (
                          <View className="flex-row items-center gap-2 mt-1 ml-1">
                            <TextInput
                              value={scope[m.id] ?? ""}
                              onChangeText={(t) => {
                                setScope((sv) => ({ ...sv, [m.id]: t }));
                                setUseAnyway((u) => ({ ...u, [m.id]: false }));
                              }}
                              placeholder={sc.hint}
                              placeholderTextColor="#4B5563"
                              keyboardType="numeric"
                              className="flex-1 bg-[#14171c] border border-[#262626] rounded-md px-2 py-1 text-[10.5px] text-[#F9FAFB]"
                            />
                            {v ? (
                              <Text style={{ color: v.level === "typical" ? VERA : v.level === "uncommon" ? AMBER : RED }} className="text-[10px]">
                                {v.level === "typical" ? "🦉 ✓" : v.level === "uncommon" ? "🦉 ⚠" : "🦉 🚨"}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                        {v?.note ? (
                          <Text style={{ color: v.level === "unusual" ? RED : AMBER }} className="text-[8.5px] mt-0.5 ml-1">
                            {v.note}
                          </Text>
                        ) : null}
                        {v?.level === "unusual" ? (
                          <TouchableOpacity onPress={() => setUseAnyway((u) => ({ ...u, [m.id]: !u[m.id] }))} className="self-start mt-1 ml-1 rounded-md px-2 py-0.5 border" style={{ borderColor: useAnyway[m.id] ? RED : "#374151" }}>
                            <Text style={{ color: useAnyway[m.id] ? RED : "#9CA3AF" }} className="text-[8.5px] font-bold">
                              {useAnyway[m.id] ? "using anyway — on your word" : "Use anyway"}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })}

                  <TouchableOpacity
                    onPress={saveSchedule}
                    disabled={scheduleMut.isPending || blockedByVera}
                    activeOpacity={0.85}
                    className="rounded-lg py-2.5 items-center mt-2"
                    style={{ backgroundColor: blockedByVera ? "#37415155" : MURPHY }}
                  >
                    <Text className="text-black text-[11px] font-bold">
                      {scheduleMut.isPending
                        ? "Saving…"
                        : blockedByVera
                          ? "Held — a number is out of bounds"
                          : scheduleMut.isSuccess
                            ? "✓ Schedule saved — the build has the dates"
                            : "Save schedule"}
                    </Text>
                  </TouchableOpacity>
                  {envelope ? (
                    <Text className="text-[#4B5563] text-[8px] mt-1.5 leading-3">
                      Verified bounds for this home: ext {envelope.extWallLF.toLocaleString()} LF · int{" "}
                      {envelope.intWallLF.toLocaleString()} LF · roof {envelope.roofSF.toLocaleString()} SF · floor{" "}
                      {envelope.floorSF.toLocaleString()} SF · {envelope.volumeFt3.toLocaleString()} ft³
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          <Text className="text-[#4B5563] text-[8.5px] mt-2 leading-3">
            {serverMode
              ? `The live entry — statuses advance from the build console; your schedule and in-bounds tape feed the same record. The canonical schedule prices the ${usd(ra.avgCostDollars)} build across ${mve?.schedule.length ?? 5} phases (${mve?.totalWeeks ?? 30} wk).`
              : `Tap a stage to advance it (pending → in progress → done). MODELED · the build prices at ${usd(ra.avgCostDollars)} across ${mve?.schedule.length ?? 5} phases — the GC and inspector confirm the dates.`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
