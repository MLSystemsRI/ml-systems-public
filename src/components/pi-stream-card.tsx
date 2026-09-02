import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import type { PiStreamRead, PiStreamLane, PiNextStep } from "@/lib/pi-stream";
import type { PiCheck } from "@/lib/pi-checks";
import { piCheckSummary } from "@/lib/pi-checks";
import { BuildTraceCard } from "@/components/build-trace-card";
import { DeepSearchCard } from "@/components/deep-search-card";
import type { TraceStage } from "@/lib/build-trace";

/**
 * PiStreamCard — PI's stream of consciousness, ONE card (Sal 9/1).
 *
 * Merges the three surfaces that used to stack in the J-Space — the orchestration strip,
 * Build Logic Layer 1 (the trace) and Layer 2 (the deep read) — into one green PI card.
 * The stream (from lib/pi-stream.ts) narrates lane by lane when each agent runs or what
 * opens it; the two build-logic layers fold in underneath as collapsed rows, reusing the
 * SAME cards the Portfolio renders so the surfaces never drift. LL rides the header;
 * MVE closes the stream. CDA's lane is the live action — the master-ledger plan set.
 */

const PI = "#22C55E";
const PI_BRIGHT = "#86EFAC";

const STATUS_META: Record<PiStreamLane["status"], { label: string; color: string }> = {
  ran: { label: "RAN", color: "#34D399" },
  ready: { label: "READY", color: "#60A5FA" },
  "needs-data": { label: "WAITING", color: "#6B7280" },
  "tier-locked": { label: "TIER", color: "#F59E0B" },
};

function Lane({ lane, onPlanSet }: { lane: PiStreamLane; onPlanSet?: (() => void) | undefined }) {
  const s = STATUS_META[lane.status];
  const runnable = lane.action === "plan-set" && onPlanSet;
  const body = (
    <View className="py-1.5">
      <View className="flex-row items-center gap-2">
        <Text style={{ color: lane.color }} className="text-[11px] w-4 text-center">{lane.glyph}</Text>
        <Text style={{ color: lane.color }} className="text-[8px] font-bold tracking-widest flex-1" numberOfLines={1}>
          {lane.title.toUpperCase()}
        </Text>
        <Text style={{ color: s.color, borderColor: `${s.color}55`, backgroundColor: `${s.color}12` }} className="text-[7px] font-bold rounded-full px-1.5 py-0.5 border">
          {s.label}
        </Text>
      </View>
      <Text className="text-[#D1D5DB] text-[10.5px] leading-4 mt-0.5 ml-6">{lane.thought}</Text>
      <View className="flex-row items-baseline ml-6 mt-0.5 gap-2">
        <Text className="text-[#6B7280] text-[8.5px] flex-1" numberOfLines={1}>✦ {lane.valueGain}</Text>
        <Text className="text-[#4B5563] text-[8px]" numberOfLines={1}>{lane.tierNote}</Text>
      </View>
      {runnable ? (
        <Text style={{ color: PI_BRIGHT }} className="text-[9px] font-semibold ml-6 mt-1">Open the plan set →</Text>
      ) : null}
    </View>
  );
  return runnable ? <Pressable onPress={onPlanSet}>{body}</Pressable> : body;
}

/**
 * PI's next step — the one move that carries the chain forward now, at the top of the
 * stream. PI is the single point of contact, so this is the plain "here's what to do".
 * Tappable only when the step is actually wired (plan set / customize / the ledger above).
 */
function NextStep({
  step,
  onPlanSet,
  onCustomize,
}: {
  step: PiNextStep;
  onPlanSet?: (() => void) | undefined;
  onCustomize?: (() => void) | undefined;
}) {
  const handler =
    step.action === "plan-set" ? onPlanSet : step.action === "customize" ? onCustomize : undefined;
  const body = (
    <View
      className="rounded-lg border px-2.5 py-2 mb-2 flex-row items-start gap-2"
      style={{ borderColor: `${step.color}44`, backgroundColor: `${step.color}0F` }}
    >
      <Text style={{ color: step.color }} className="text-[12px] mt-0.5 w-4 text-center">{step.glyph}</Text>
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text style={{ color: PI_BRIGHT }} className="text-[7px] font-bold tracking-widest">NEXT</Text>
          <Text style={{ color: step.color }} className="text-[11px] font-bold flex-1" numberOfLines={1}>
            {step.headline}
          </Text>
          {handler ? <Text style={{ color: step.color }} className="text-[11px] font-bold">→</Text> : null}
        </View>
        <Text className="text-[#D1D5DB] text-[9.5px] leading-4 mt-0.5">{step.why}</Text>
      </View>
    </View>
  );
  return handler ? <Pressable onPress={handler}>{body}</Pressable> : body;
}

/** One collapsed fold — a build-logic layer tucked inside the stream. */
function Fold({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="mt-1.5 pt-1.5 border-t" style={{ borderColor: "#14231c" }}>
      <Pressable
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen((o) => !o); }}
        className="flex-row items-center gap-2"
      >
        <Text style={{ color: PI }} className="text-[8px] font-bold tracking-widest flex-1">{label}</Text>
        <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
      </Pressable>
      {open ? <View className="mt-1.5">{children}</View> : null}
    </View>
  );
}

export function PiStreamCard({
  stream,
  nextStep,
  checks,
  trace,
  studioMatched,
  layer2,
  address,
  addressKey,
  onPlanSet,
  onCustomize,
}: {
  stream: PiStreamRead;
  /** PI's single prioritized next move (lib/pi-stream piNextStep) — the top of the stream. */
  nextStep?: PiNextStep | undefined;
  /** PI's check layer over the collected record (lib/pi-checks) — summarized under the opening. */
  checks?: PiCheck[];
  /** Layer 1 — the build logic, stage by stage (folded in, collapsed). */
  trace?: TraceStage[] | null;
  studioMatched?: boolean;
  /** Layer 2 — the merged deep read (folded in, collapsed). */
  layer2?: TraceStage[] | undefined;
  address?: string | undefined;
  addressKey?: string | undefined;
  /** CDA's live action — the master-ledger → Design Studio plan set. */
  onPlanSet?: (() => void) | undefined;
  /** The Plan Builder — the homeowner's simple customizer (PI's "refine your plan" step). */
  onCustomize?: (() => void) | undefined;
}) {
  const [open, setOpen] = useState(true);
  const ll = stream.lucent;

  return (
    <View className="rounded-xl border mb-2" style={{ borderColor: `${PI}33`, backgroundColor: "rgba(20,184,166,0.04)" }}>
      <Pressable
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen((o) => !o); }}
        className="flex-row items-center px-3 py-2.5 gap-2"
      >
        <Text style={{ color: PI }} className="text-[12px]">🌱</Text>
        <Text style={{ color: PI }} className="text-[9px] font-bold tracking-widest flex-1" numberOfLines={1}>
          PI — STREAM OF CONSCIOUSNESS
        </Text>
        {ll ? (
          <Text style={{ color: PI_BRIGHT, borderColor: `${PI}44`, backgroundColor: `${PI}12` }} className="text-[7.5px] font-bold rounded-full px-1.5 py-0.5 border">
            LL {ll.total}/100
          </Text>
        ) : null}
        <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="px-3 pb-2.5">
          <Text className="text-[#9CA3AF] text-[10px] leading-4 mb-1">{stream.opening}</Text>
          {/* PI's next step — the single move that carries the chain forward now. */}
          {nextStep ? <NextStep step={nextStep} onPlanSet={onPlanSet} onCustomize={onCustomize} /> : null}
          {/* PI's check layer — his verdict over VERA's collection, one line. */}
          {checks?.length ? (() => {
            const flagged = checks.filter((c) => c.level === "flag");
            const summary = piCheckSummary(checks);
            return summary ? (
              <View className="mb-1">
                <Text style={{ color: flagged.length ? "#F59E0B" : PI_BRIGHT }} className="text-[9.5px] leading-4">
                  ⚖ {summary}
                </Text>
                {flagged.slice(0, 2).map((c) => (
                  <Text key={c.code} className="text-[#9CA3AF] text-[9px] leading-4 ml-3" numberOfLines={2}>
                    · {c.note}
                  </Text>
                ))}
              </View>
            ) : null;
          })() : null}

          {/* The stream — one lane per agent, in PI's voice. */}
          {stream.lanes.map((lane) => (
            <Lane key={lane.agent} lane={lane} onPlanSet={lane.action === "plan-set" ? onPlanSet : undefined} />
          ))}

          {/* The build logic, folded into the stream — same cards as the Portfolio. */}
          {trace?.length ? (
            <Fold label="LAYER 1 — THE BUILD LOGIC, STAGE BY STAGE">
              <BuildTraceCard trace={trace} studioMatched={!!studioMatched} />
            </Fold>
          ) : null}
          {address && addressKey ? (
            <Fold label="LAYER 2 — THE DEEP READ">
              <DeepSearchCard address={address} addressKey={addressKey} deepPass={layer2} />
            </Fold>
          ) : null}

          <Text style={{ color: PI_BRIGHT }} className="text-[8px] mt-1.5">
            ✦ MVE {stream.mve} · Lucent Lens keeps every handoff scored to your value.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
