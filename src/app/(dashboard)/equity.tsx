import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { MLMark } from "@/components/ml-mark";
import { useViewMode, useMode } from "@/lib/view-mode";
import { useDrawer } from "@/lib/drawer";
import { trpc } from "@/lib/trpc";
import { ValueChain } from "@/components/value-chain";
import { CompartmentChrome } from "@/components/compartment-chrome";
import { LucentIcon } from "@/components/mind-icons";

/**
 * Value Chain — the homeowner's equity journey across homes. The body is the shared
 * <ValueChain /> component (also rendered beneath the orbital on the combined "Value
 * Chain Portfolio" screen). This route stays for the Hub's "Open Value Chain" link.
 *
 * PI's governance seat: the Custodian gets the PI Console at the top — scoring each
 * value-chain handoff with the Lucent Lens (his swarm write path).
 */
export default function EquityScreen() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  const mode = useViewMode();
  const { isCustodian } = useMode();

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <ScrollView
        className="flex-1"
        style={{ zIndex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40, paddingHorizontal: 16 }}
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 mb-5">
          <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <LucentIcon size={22} color="#22C55E" />
          </TouchableOpacity>
          <MLMark size={22} color="#22C55E" />
          <View className="flex-1">
            <Text className="text-[#F9FAFB] text-lg font-extrabold leading-tight">Value Chain</Text>
            <Text className="text-[#6B7280] text-[11px]">Finance · Decon · Design · Build · Loop</Text>
          </View>
          <View className="bg-[#22C55E]/10 border border-[#22C55E]/25 rounded-full px-3 py-1">
            <Text className="text-[#22C55E] text-[10px] font-bold uppercase tracking-wider">
              {mode === "custodian" ? "Portfolio" : "Value Chain"}
            </Text>
          </View>
        </View>

        {/* PI Console — Custodian scores the value chain with the Lucent Lens. */}
        {isCustodian ? <PIConsole /> : null}

        <ValueChain />
      </ScrollView>

      {/* PI presides over the Value Chain — his grounded lucent chrome */}
      <CompartmentChrome href="/equity" />
    </View>
  );
}

/* ─────────────────────── PI Console (Custodian only) ─────────────────────
 * PI's swarm governance surface: the orchestrator scores each home's value-chain
 * handoff with the Lucent Lens (0–100). Recording a score logs a piObservations
 * row (his ledger) AND stamps the project's live Lucent Score — the light staying
 * on the human. Mirrors MURPHY's QA pulse. Emerald #22C55E / Sprout 🌱 — PI's identity. */

const LUCENT = "#22C55E";
const LUCENT_DEEP = "#14532D";
const LENS_PRESETS = [70, 80, 90, 100];

const PHASE_COLOR: Record<string, string> = {
  construction: LUCENT,
  deconstruction: "#F97316",
  loan_origination: "#EF4444",
  design: "#60A5FA",
  loop: "#86EFAC",
};

type PIProject = {
  projectId: string;
  cycleNumber: number;
  status: string;
  currentPhase: string | null;
  aiEfficiencyScore: number | null;
  address: string;
  city: string;
  latestEquity: number | null; // cents
};

function fmtEquity(cents: number | null): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(dollars >= 100000 ? 0 : 1)}k`;
  return `$${Math.round(dollars)}`;
}

function PIConsole() {
  const listQ = trpc.pi.listOrchestration.useQuery(undefined, { retry: 0 });
  const recordScore = trpc.pi.recordLucentScore.useMutation({
    onSuccess: () => listQ.refetch(),
  });
  const [lensFor, setLensFor] = useState<string | null>(null); // projectId with the lens chips open

  const projects = (listQ.data?.projects ?? []) as PIProject[];

  const score = (projectId: string, lucentScore: number) => {
    recordScore.mutate({
      projectId,
      lucentScore,
      note: "Lucent Lens score from PI Console",
    });
    setLensFor(null);
  };

  return (
    <View className="mb-5 rounded-2xl" style={{ backgroundColor: "#07140b", borderWidth: 1, borderColor: `${LUCENT}44` }}>
      <View className="px-3.5 py-3 flex-row items-center gap-2">
        <Text style={{ fontSize: 15 }}>🌱</Text>
        <Text className="text-[#F9FAFB] text-[13px] font-bold">PI Console</Text>
        <Text style={{ color: LUCENT_DEEP }} className="text-[10px] font-bold ml-1">LUCENT · LENS</Text>
        <Text className="text-[#4f7d5e] text-[10px] ml-auto">
          {projects.length} at the lens
        </Text>
      </View>
      <View className="px-3.5 pb-3.5">
        <Text className="text-[#4f7d5e] text-[10px] mb-2 leading-snug">
          Score each home's value-chain handoff with the Lucent Lens (0–100) — PI decomposes the request across the swarm and keeps the light on the human. Sprout 🌱 roots the score in the ledger.
        </Text>

        {listQ.isLoading ? (
          <Text className="text-[#6B7280] text-[11px]">Loading…</Text>
        ) : listQ.isError ? (
          <Text className="text-[#EF4444] text-[10px]">
            {String(listQ.error?.message ?? "").includes("FORBIDDEN") ? "Operator account required." : "Couldn't reach PI — pull to retry."}
          </Text>
        ) : projects.length === 0 ? (
          <Text className="text-[#6B7280] text-[11px]">No projects in the value chain yet. PI's lens is clear.</Text>
        ) : (
          <View className="gap-2.5">
            {projects.map((p) => {
              const phaseColor = p.currentPhase ? PHASE_COLOR[p.currentPhase] ?? "#6B7280" : "#6B7280";
              return (
                <View key={p.projectId} className="rounded-xl p-3" style={{ backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#132a1c" }}>
                  <View className="flex-row items-center justify-between mb-0.5">
                    <Text className="text-[#F9FAFB] text-[12.5px] font-bold flex-1" numberOfLines={1}>
                      {p.address}, {p.city}
                    </Text>
                    <Text style={{ color: LUCENT }} className="text-[9px] font-bold uppercase tracking-wider">
                      cycle {p.cycleNumber}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2 mt-1">
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${phaseColor}1A` }}>
                      <Text style={{ color: phaseColor }} className="text-[9px] font-bold uppercase tracking-wider">
                        {(p.currentPhase ?? "lead").replace(/_/g, " ")}
                      </Text>
                    </View>
                    <Text className="text-[#6B7280] text-[10px]">equity {fmtEquity(p.latestEquity)}</Text>
                    <Text className="text-[#4f7d5e] text-[10px] ml-auto">
                      lens {p.aiEfficiencyScore != null ? p.aiEfficiencyScore : "—"}
                    </Text>
                  </View>

                  {/* Lucent Lens score — the handoff pulse, stamped on the project. */}
                  <View className="mt-2.5 pt-2 border-t border-[#132a1c]">
                    {lensFor === p.projectId ? (
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-[#4f7d5e] text-[10px]">Lucent Lens:</Text>
                        {LENS_PRESETS.map((s) => (
                          <TouchableOpacity
                            key={s}
                            onPress={() => score(p.projectId, s)}
                            disabled={recordScore.isPending}
                            activeOpacity={0.85}
                            className="rounded-lg px-2.5 py-1"
                            style={{ backgroundColor: `${LUCENT}1A`, borderWidth: 1, borderColor: `${LUCENT}40` }}
                          >
                            <Text style={{ color: LUCENT }} className="text-[10px] font-bold">{s}</Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => setLensFor(null)} className="ml-auto px-1">
                          <Text className="text-[#6B7280] text-[10px]">cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => setLensFor(p.projectId)} activeOpacity={0.85}>
                        <Text style={{ color: LUCENT }} className="text-[10px] font-bold">Score with the Lucent Lens →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {recordScore.isError ? (
          <Text className="text-[#EF4444] text-[10px] mt-2">
            {String(recordScore.error?.message ?? "").includes("FORBIDDEN") ? "Operator account required." : "Couldn't record — try again."}
          </Text>
        ) : recordScore.isSuccess ? (
          <Text style={{ color: LUCENT }} className="text-[10px] mt-2">✓ Lucent Lens score recorded.</Text>
        ) : null}
      </View>
    </View>
  );
}
