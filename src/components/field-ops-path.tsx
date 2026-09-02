import { useState } from "react";
import { View, Text, Pressable, TouchableOpacity } from "react-native";
import {
  CRITICAL_PATH,
  CATEGORY_META,
  type CriticalStep,
  type StepStatus,
} from "@/lib/field-ops-path";
import { useChecklistOverrides, setStatus } from "@/lib/credentials-store";

const STATUS_META: Record<StepStatus, { icon: string; color: string }> = {
  done: { icon: "✓", color: "#22C55E" },
  in_progress: { icon: "◎", color: "#F59E0B" },
  pending: { icon: "○", color: "#6B7280" },
  blocked: { icon: "✕", color: "#EF4444" },
};

// Tap the status node to advance: pending → in_progress → done → pending. A blocked
// step advances straight to in_progress (it's been unblocked).
function nextStatus(current: StepStatus): StepStatus {
  switch (current) {
    case "blocked":
    case "pending":
      return "in_progress";
    case "in_progress":
      return "done";
    default:
      return "pending";
  }
}

/**
 * Operating path — the critical path to legal field access (the "Road to Operate").
 * Vertical timeline w/ status icons + category badges; the status node is tap-to-advance
 * and persisted (lib/credentials-store.ts). Steps with an open sourcing choice carry an
 * expandable decision node (currently the GL placement question).
 */
export function FieldOpsPath() {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const overrides = useChecklistOverrides();

  const steps = CRITICAL_PATH.map((s) => ({
    ...s,
    status: (overrides[s.id] as StepStatus) ?? s.status,
  }));
  const done = steps.filter((s) => s.status === "done").length;
  const inProgress = steps.filter((s) => s.status === "in_progress").length;
  const blocked = steps.filter((s) => s.status === "blocked").length;
  const progress = steps.length > 0 ? done / steps.length : 0;

  return (
    <View>
      {/* Progress header */}
      <View className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-[#F9FAFB] text-[14px] font-bold">Road to First Job</Text>
          <Text className="text-[#9CA3AF] text-[12px] font-mono">
            {done}/{steps.length} ready
          </Text>
        </View>
        <View className="h-[6px] rounded-full overflow-hidden bg-[#262626]">
          <View className="h-full rounded-full" style={{ width: `${Math.max(3, progress * 100)}%`, backgroundColor: "#22C55E" }} />
        </View>
        <Text className="text-[#6B7280] text-[10px] mt-1.5">
          {inProgress} in progress · {blocked} blocked on insurance · tap a status to update
        </Text>
      </View>

      {/* Timeline */}
      {steps.map((step, i) => (
        <StepRow key={step.id} step={step} last={i === steps.length - 1} expanded={!!open[step.id]} onToggle={() => toggle(step.id)} />
      ))}
    </View>
  );
}

function StepRow({ step, last, expanded, onToggle }: { step: CriticalStep; last: boolean; expanded: boolean; onToggle: () => void }) {
  const s = STATUS_META[step.status];
  const cat = CATEGORY_META[step.category];
  const hasDecision = !!step.decision;

  return (
    <View className="flex-row">
      {/* Rail — the status node is a tap target that advances + persists the status. */}
      <View className="items-center mr-3" style={{ width: 22 }}>
        <TouchableOpacity
          onPress={() => setStatus(step.id, nextStatus(step.status))}
          activeOpacity={0.6}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          className="items-center justify-center rounded-full"
          style={{ width: 22, height: 22, borderWidth: 1.5, borderColor: s.color, backgroundColor: `${s.color}1A` }}
        >
          <Text style={{ color: s.color, fontSize: 11, lineHeight: 13 }}>{s.icon}</Text>
        </TouchableOpacity>
        {!last ? <View className="flex-1" style={{ width: 2, backgroundColor: "#262626", marginTop: 2 }} /> : null}
      </View>

      {/* Content */}
      <View className="flex-1 pb-3">
        <Pressable onPress={hasDecision ? onToggle : undefined} disabled={!hasDecision}>
          <View className="flex-row items-center gap-2">
            <Text className="text-[#F9FAFB] text-[13px] font-bold flex-shrink" numberOfLines={1}>{step.label}</Text>
            <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: `${cat.color}1A`, borderWidth: 1, borderColor: `${cat.color}40` }}>
              <Text style={{ color: cat.color }} className="text-[8px] font-bold uppercase tracking-wider">{cat.label}</Text>
            </View>
            {hasDecision ? <Text style={{ color: "#6B7280" }} className="text-[11px] ml-auto">{expanded ? "▾" : "▸"}</Text> : null}
          </View>
          <Text className="text-[#6B7280] text-[11px] leading-snug mt-0.5">{step.detail}</Text>
        </Pressable>

        {/* Rent-vs-buy decision */}
        {hasDecision && expanded ? (
          <View className="mt-2 bg-[#0D0D0D] border border-[#262626] rounded-xl p-3">
            <Text className="text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-2">{step.decision!.title}</Text>
            {step.decision!.options.map((o) => (
              <View key={o.label} className="flex-row items-center justify-between py-1">
                <View className="flex-1">
                  <Text className="text-[#cbd2da] text-[12px] font-semibold">{o.label}</Text>
                  {o.note ? <Text className="text-[#4B5563] text-[9px]">{o.note}</Text> : null}
                </View>
                <Text style={{ color: "#F59E0B" }} className="text-[12px] font-mono font-bold">{o.cost}</Text>
              </View>
            ))}
            {step.decision!.note ? (
              <Text className="text-[#4B5563] text-[9px] mt-1.5 leading-snug">{step.decision!.note}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
