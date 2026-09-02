import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState } from "react";
import { useMode } from "@/lib/view-mode";
import { trpc } from "@/lib/trpc";
import { TakeoffCard } from "@/components/takeoff-card";
import { useLocalHome } from "@/lib/home-store";
import { CompartmentChrome } from "@/components/compartment-chrome";
import { AppHeader } from "@/components/app-header";
import { InvestorPointer } from "@/components/investor-pointer";

/**
 * Construction (Phase 03) — MURPHY's compartment, the detailed-cost home. Lens-aware:
 * homeowner sees THEIR build (TakeoffCard off their local home + what happens next);
 * custodian gets the build-ops framing (phases · QA · AI efficiency score); investor
 * gets a light Single Star Bond pointer. Surfaces the shared TakeoffCard and links out
 * to the Design Studio swarm engine + the cost/equity surface.
 */

const LIME = "#84CC16";

// Build-ops phase sequence — the 8-month cycle, custodian-facing.
const BUILD_PHASES: { label: string; note: string }[] = [
  { label: "Decon handoff", note: "Recovered materials in · site cleared" },
  { label: "Foundation & frame", note: "Footprint +10% · new level staged" },
  { label: "Envelope & systems", note: "Roof, walls, MEP rough-in" },
  { label: "Finish & QA", note: "AI efficiency score 0–100 · punch list" },
];

export default function ConstructionScreen() {
  const insets = useSafeAreaInsets();
  const { isHome, isInvestor, isCustodian } = useMode();
  const home = useLocalHome();

  const totalSF = home?.sqft ? Math.round(home.sqft * 1.1 * 1.5) : 3300;

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <AppHeader
        href="/construction"
        title="Construction"
        subtitle="7-month rebuild · +10% SF · +1 level"
      />
      <ScrollView
        className="flex-1"
        style={{ zIndex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
      >
        {/* MURPHY Console — Custodian governs the Build phase (milestones + QA pulse). */}
        {isCustodian ? <MurphyConsole /> : null}

        {/* Homeowner: what the rebuild does for them. Custodian: build-ops. Investor: pointer. */}
        {isHome ? (
          <Text className="text-[#9CA3AF] text-[12.5px] leading-5 mb-4 mt-1">
            This is your rebuild — a full 7-month cycle that adds {"+10% square footage"} and a new
            level to your home. Recovered materials carry over from deconstruction, so you build
            more equity for less. Here's the takeoff for your home.
          </Text>
        ) : null}

        {isInvestor ? (
          <View className="mb-4 mt-1">
            <InvestorPointer line="Construction throughput (3.4 homes/yr/crew) is the revenue engine." />
          </View>
        ) : null}

        {isCustodian ? (
          <Text className="text-[#9CA3AF] text-[12.5px] leading-5 mb-4 mt-1">
            Build-ops for the active cycle — phase sequencing, QA, and the AI efficiency score
            (0–100) that grades every job.
          </Text>
        ) : null}

        {/* Homeowner → ZEROED BUT OPEN: the six divisions ship with $— and empty bars,
            earned from the ledger as the design generates (a real TakeoffSummary would
            un-zero it). The representative demo stays a Custodian preview. */}
        <TakeoffCard totalSF={totalSF} address={home?.address} zeroed={isHome} />

        {/* Custodian: lightweight build-ops phase list, data-driven off the local home. */}
        {isCustodian ? (
          <View className="bg-[#111111] border rounded-2xl p-4 mt-4" style={{ borderColor: `${LIME}26` }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#F9FAFB] text-[14px] font-bold">Build Ops</Text>
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: `${LIME}1A`, borderWidth: 1, borderColor: `${LIME}40` }}
              >
                <Text style={{ color: LIME }} className="text-[9px] font-bold uppercase tracking-wider">
                  8-month cycle
                </Text>
              </View>
            </View>

            {BUILD_PHASES.map((p, i) => (
              <View key={p.label} className="flex-row items-start gap-3 mb-2.5">
                <Text style={{ color: LIME }} className="text-[11px] font-mono mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </Text>
                <View className="flex-1">
                  <Text className="text-[#cbd2da] text-[12.5px] font-semibold">{p.label}</Text>
                  <Text className="text-[#6B7280] text-[11px] leading-snug">{p.note}</Text>
                </View>
              </View>
            ))}

            <View className="mt-2 pt-3 border-t border-[#262626]">
              <Text className="text-[#9CA3AF] text-[11px] leading-snug">
                <Text style={{ color: LIME }} className="font-bold">AI efficiency score · </Text>
                every job is scored 0–100 on schedule, material yield, and rework —
                {home?.sqft ? ` ${totalSF.toLocaleString()} SF target for this home.` : " feeds the crew throughput model."}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Homeowner: what happens next, then out to cost & equity. */}
        {isHome ? (
          <Text className="text-[#6B7280] text-[11.5px] leading-5 mt-4 mb-1">
            Next: your design converges into a full takeoff, then you'll see the cost and the equity
            this cycle creates.
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={() => router.push("/cost" as any)}
          activeOpacity={0.85}
          className="rounded-xl py-3 items-center mt-4 border"
          style={{ borderColor: "#22C55E55", backgroundColor: "#22C55E14" }}
        >
          <Text style={{ color: "#22C55E" }} className="text-[13px] font-bold">See cost & equity →</Text>
        </TouchableOpacity>
      </ScrollView>
      <CompartmentChrome href="/construction" />
    </View>
  );
}

/* ─────────────────────── MURPHY Console (Custodian only) ─────────────────────
 * MURPHY's swarm governance surface: the Custodian advances the Build phase's
 * milestones (pending → in progress → complete, or blocked) and records the QA
 * pulse (efficiency score) on the shared tables the client tracker reads.
 * Mirrors the CDA Console pattern. Lime #84CC16 / sawdust — MURPHY's identity. */

const NEXT_STATUS: Record<string, "in_progress" | "complete"> = {
  pending: "in_progress",
  in_progress: "complete",
};

const MILESTONE_COLOR: Record<string, string> = {
  complete: "#22C55E",
  in_progress: LIME,
  blocked: "#EF4444",
  pending: "#6B7280",
};

const QA_PRESETS = [65, 75, 85, 95];

type MurphyMilestone = {
  id: string;
  name: string;
  status: string;
  plannedDate: string | null;
  blockerNotes: string | null;
};

type MurphyPhase = {
  phaseId: string;
  phaseStatus: string;
  projectId: string;
  cycleNumber: number;
  address: string;
  city: string;
  milestones: MurphyMilestone[];
};

function MurphyConsole() {
  const listQ = trpc.murphy.listBuildPhases.useQuery(undefined, { retry: 0 });
  const setStatus = trpc.murphy.setMilestoneStatus.useMutation({
    onSuccess: () => listQ.refetch(),
  });
  const recordQa = trpc.murphy.recordEfficiency.useMutation();
  const [busy, setBusy] = useState<string | null>(null);
  const [qaFor, setQaFor] = useState<string | null>(null); // projectId with the QA chips open

  const buildPhases = (listQ.data?.phases ?? []) as MurphyPhase[];

  const advance = (m: MurphyMilestone) => {
    const next = NEXT_STATUS[m.status];
    if (!next) return;
    setBusy(m.id);
    setStatus.mutate({ milestoneId: m.id, status: next });
  };
  const block = (m: MurphyMilestone) => {
    setBusy(m.id);
    setStatus.mutate(
      m.status === "blocked"
        ? { milestoneId: m.id, status: "in_progress" }
        : { milestoneId: m.id, status: "blocked", blockerNotes: "Flagged from MURPHY Console" },
    );
  };
  const pulse = (projectId: string, score: number) => {
    recordQa.mutate({
      projectId,
      score,
      timelineScore: score,
      materialUtilizationScore: score,
      costVarianceScore: score,
      laborEfficiencyScore: score,
      explanation: "Custodian QA pulse from MURPHY Console",
    });
    setQaFor(null);
  };

  return (
    <View className="mb-4 mt-1 rounded-2xl" style={{ backgroundColor: "#0e1407", borderWidth: 1, borderColor: `${LIME}44` }}>
      <View className="px-3.5 py-3 flex-row items-center gap-2">
        <Text style={{ fontSize: 15 }}>🐕</Text>
        <Text className="text-[#F9FAFB] text-[13px] font-bold">MURPHY Console</Text>
        <Text className="text-[#7d9a4b] text-[10px] ml-auto">
          {buildPhases.length} build{buildPhases.length === 1 ? "" : "s"} in phase
        </Text>
      </View>
      <View className="px-3.5 pb-3.5">
        <Text className="text-[#7d9a4b] text-[10px] mb-2 leading-snug">
          Advance each build's milestones and record the QA pulse — MURPHY frames, the shared tracker follows. Chip 🐿️ hauls the offcuts.
        </Text>

        {listQ.isLoading ? (
          <Text className="text-[#6B7280] text-[11px]">Loading…</Text>
        ) : listQ.isError ? (
          <Text className="text-[#EF4444] text-[10px]">
            {String(listQ.error?.message ?? "").includes("FORBIDDEN") ? "Operator account required." : "Couldn't reach MURPHY — pull to retry."}
          </Text>
        ) : buildPhases.length === 0 ? (
          <Text className="text-[#6B7280] text-[11px]">No builds in the construction phase yet. MURPHY's bench is clear.</Text>
        ) : (
          <View className="gap-2.5">
            {buildPhases.map((p) => (
              <View key={p.phaseId} className="rounded-xl p-3" style={{ backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#1d2a10" }}>
                <View className="flex-row items-center justify-between mb-0.5">
                  <Text className="text-[#F9FAFB] text-[12.5px] font-bold flex-1" numberOfLines={1}>
                    {p.address}, {p.city}
                  </Text>
                  <Text style={{ color: LIME }} className="text-[9px] font-bold uppercase tracking-wider">
                    cycle {p.cycleNumber}
                  </Text>
                </View>
                {p.milestones.length === 0 ? (
                  <Text className="text-[#6B7280] text-[10px] mt-1">No milestones on this build yet.</Text>
                ) : (
                  <View className="gap-1.5 mt-1.5">
                    {p.milestones.map((m) => {
                      const pending = setStatus.isPending && busy === m.id;
                      const advTo = NEXT_STATUS[m.status];
                      return (
                        <View key={m.id} className="flex-row items-center gap-2">
                          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${MILESTONE_COLOR[m.status] ?? "#6B7280"}1A` }}>
                            <Text style={{ color: MILESTONE_COLOR[m.status] ?? "#6B7280" }} className="text-[9px] font-bold uppercase tracking-wider">
                              {m.status.replace("_", " ")}
                            </Text>
                          </View>
                          <Text className="text-[#9CA3AF] text-[11px] flex-1" numberOfLines={1}>{m.name}</Text>
                          <View className="flex-row gap-1.5">
                            {advTo ? (
                              <TouchableOpacity
                                onPress={() => advance(m)}
                                disabled={pending}
                                activeOpacity={0.85}
                                className="rounded-lg px-2.5 py-1"
                                style={{ backgroundColor: LIME, opacity: pending ? 0.6 : 1 }}
                              >
                                <Text className="text-[#0A0A0A] text-[10px] font-extrabold">
                                  {pending ? "…" : advTo === "complete" ? "complete" : "start"}
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                            {m.status !== "complete" ? (
                              <TouchableOpacity
                                onPress={() => block(m)}
                                disabled={pending}
                                activeOpacity={0.85}
                                className="rounded-lg px-2.5 py-1"
                                style={{ backgroundColor: "#1a0d0d", borderWidth: 1, borderColor: "#EF444455", opacity: pending ? 0.6 : 1 }}
                              >
                                <Text className="text-[#EF4444] text-[10px] font-bold">{m.status === "blocked" ? "unblock" : "block"}</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* QA pulse — the efficiency score, recorded against the project. */}
                <View className="mt-2.5 pt-2 border-t border-[#1d2a10]">
                  {qaFor === p.projectId ? (
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-[#7d9a4b] text-[10px]">QA pulse:</Text>
                      {QA_PRESETS.map((s) => (
                        <TouchableOpacity
                          key={s}
                          onPress={() => pulse(p.projectId, s)}
                          disabled={recordQa.isPending}
                          activeOpacity={0.85}
                          className="rounded-lg px-2.5 py-1"
                          style={{ backgroundColor: `${LIME}1A`, borderWidth: 1, borderColor: `${LIME}40` }}
                        >
                          <Text style={{ color: LIME }} className="text-[10px] font-bold">{s}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity onPress={() => setQaFor(null)} className="ml-auto px-1">
                        <Text className="text-[#6B7280] text-[10px]">cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => setQaFor(p.projectId)} activeOpacity={0.85}>
                      <Text style={{ color: LIME }} className="text-[10px] font-bold">Record QA pulse →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {setStatus.isError ? (
          <Text className="text-[#EF4444] text-[10px] mt-2">
            {String(setStatus.error?.message ?? "").includes("FORBIDDEN") ? "Operator account required." : "Couldn't update — try again."}
          </Text>
        ) : recordQa.isSuccess ? (
          <Text style={{ color: LIME }} className="text-[10px] mt-2">✓ QA pulse recorded.</Text>
        ) : setStatus.isSuccess ? (
          <Text style={{ color: LIME }} className="text-[10px] mt-2">✓ Milestone updated.</Text>
        ) : null}
      </View>
    </View>
  );
}
