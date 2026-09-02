import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useMode } from "@/lib/view-mode";
import { isPreview } from "@/lib/preview";
import { StatCard } from "@/components/stat-card";
import { VerificationBoard } from "@/components/verification-board";
import { AppHeader } from "@/components/app-header";
import { InvestorPointer } from "@/components/investor-pointer";
import { CompartmentChrome } from "@/components/compartment-chrome";
import { DEMO_BOARD } from "@/lib/demo-collective";

/** Builders Collective — .net peer plan-verification network, presided over by VERA.
 *  Custodian layout = the full verification board (shared component).
 *  Homeowner layout = curated verification-confidence view (our addition; the
 *  source BC app is professional-only). Toggle = layout; server tier = data. */

// VERA's lens — emerald 10-of-10 gate (was the generic gold BC brand).
const VERA = "#34D399";
const VERA_DEEP = "#059669";

type Plan = { id: string; city: string; state: string; status: string };
type Board = {
  stats?: { architects: number; verified: number; totalReviews: number };
  queue?: Plan[];
};

export default function CollectiveScreen() {
  const { isHome, isInvestor, isCustodian } = useMode();
  const board = trpc.collective.getBoard.useQuery(undefined, { retry: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await board.refetch();
    setRefreshing(false);
  }, [board]);

  // Guest web build can't reach the API cross-origin — fall back to the demo board
  // so the curated stat cards / recently-verified list populate too.
  const live = board.data as Board | undefined;
  const data = live ?? (isPreview() ? (DEMO_BOARD as Board) : undefined);
  const verified = (data?.queue ?? []).filter((p) => p.status === "verified");

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <AppHeader
        href="/collective"
        title="Builders Collective"
        subtitle={isHome ? "Peer-verified plans · .net" : "Plan verification network · .net"}
      />
      <ScrollView
        className="flex-1"
        style={{ zIndex: 1 }}
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VERA} />}
      >
        {isInvestor ? (
          <View className="mb-4 mt-1">
            <InvestorPointer line="Verification throughput is the trust engine — quality gates protect every dollar." />
          </View>
        ) : null}

        {isHome ? (
          /* ─── Homeowner (curated) ─── */
          <View>
            <View className="rounded-2xl p-5 mb-4" style={{ backgroundColor: `${VERA}12`, borderWidth: 1, borderColor: `${VERA}40` }}>
              <View className="flex-row items-center gap-2 mb-2">
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: "#22C55E1A", borderWidth: 1, borderColor: "#22C55E40" }}>
                  <Text className="text-[#22C55E] text-[9px] font-bold uppercase tracking-widest">✓ Verified</Text>
                </View>
                <Text style={{ color: VERA }} className="text-[10px] font-bold uppercase tracking-widest">Peer-reviewed</Text>
              </View>
              <Text className="text-[#F9FAFB] text-[17px] font-extrabold leading-tight mb-1">Your plans, checked by licensed architects</Text>
              <Text className="text-[#9CA3AF] text-[12.5px] leading-snug">
                Every ML Systems design is independently peer-reviewed and signed off before you break ground —
                structural, mechanical, electrical, and civil.
              </Text>
            </View>

            <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-3">How verification works</Text>
            <View className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-5">
              {[
                { n: "1", t: "Submit", d: "Your design stack enters the review queue." },
                { n: "2", t: "Peer review", d: "Licensed architects check every discipline." },
                { n: "3", t: "Credentialed sign-off", d: "Verified plans are stamped and cleared to build." },
              ].map((s, i) => (
                <View key={s.n} className={`flex-row items-start gap-3 ${i < 2 ? "mb-3" : ""}`}>
                  <View className="rounded-full items-center justify-center" style={{ width: 22, height: 22, backgroundColor: `${VERA}1A` }}>
                    <Text style={{ color: VERA }} className="text-[11px] font-bold">{s.n}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#F9FAFB] text-[13px] font-bold">{s.t}</Text>
                    <Text className="text-[#6B7280] text-[11px] leading-snug">{s.d}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View className="flex-row gap-3 mb-5">
              <StatCard label="Verified" value={String(data?.stats?.verified ?? "—")} sub="Plans cleared" />
              <StatCard label="Reviews" value={String(data?.stats?.totalReviews ?? "—")} sub="Completed" />
              <StatCard label="Architects" value={String(data?.stats?.architects ?? "—")} sub="On the network" />
            </View>

            {verified.length > 0 ? (
              <>
                <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-3">Recently verified</Text>
                {verified.map((p) => (
                  <View key={p.id} className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-3 flex-row items-center justify-between">
                    <Text className="text-[#F9FAFB] text-[13px] font-bold">{p.city}, {p.state}</Text>
                    <Text className="text-[#22C55E] text-[10px] font-bold uppercase tracking-wider">✓ Verified</Text>
                  </View>
                ))}
              </>
            ) : null}

            {/* Full verification board — same layout as the Loan Pit's Builders Collective tab */}
            <View className="mt-2 mb-3 pt-4 border-t border-[#262626]">
              <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider">Verification board</Text>
            </View>
            <VerificationBoard />
          </View>
        ) : (
          /* ─── Custodian: VERA's governance console + the full board ─── */
          <>
            {isCustodian ? <VeraConsole /> : null}
            <VerificationBoard />
          </>
        )}
      </ScrollView>
      <CompartmentChrome href="/collective" />
    </View>
  );
}

/* ─────────────────────── VERA Console (Custodian only) ─────────────────────
 * VERA's swarm governance surface: the Custodian runs the real Builders
 * Collective queue (verification_plans) through her 10-of-10 gate — open a
 * queued plan into review, then PASS (verified, cleared to build) or FAIL
 * (a 9/10 is NOT a pass → back to CDA for the correction loop). Mirrors the CDA
 * Console. Emerald #34D399 / owl — VERA's identity. */

const PLAN_STATUS_COLOR: Record<string, string> = {
  queue:           "#6B7280",
  in_review:       "#34D399",
  redundancy_hold: "#F59E0B",
  verified:        "#22C55E",
  rejected:        "#EF4444",
};

type GovPlan = {
  id: string;
  city: string;
  state: string;
  status: string;
  tier: string;
  planPages: number;
  planCompletion: number;
  designScore: number | null;
  reviewsCompleted: number;
  reviewsRequired: number;
  redundancyStatus: string;
};

function VeraConsole() {
  const listQ = trpc.collective.governanceQueue.useQuery(undefined, { retry: 0 });
  const advance = trpc.collective.advancePlan.useMutation({ onSuccess: () => listQ.refetch() });
  const verify = trpc.collective.verifyPlan.useMutation({ onSuccess: () => listQ.refetch() });
  const [busy, setBusy] = useState<string | null>(null);

  const plans = (listQ.data?.plans ?? []) as GovPlan[];
  const pending = advance.isPending || verify.isPending;

  const open = (planId: string) => { setBusy(planId); advance.mutate({ planId }); };
  const decide = (planId: string, pass: boolean) => { setBusy(`${planId}:${pass}`); verify.mutate({ planId, pass }); };

  return (
    <View className="mb-6 rounded-2xl" style={{ backgroundColor: "#07130d", borderWidth: 1, borderColor: `${VERA}44` }}>
      <View className="px-3.5 py-3 flex-row items-center gap-2">
        <Text style={{ fontSize: 15 }}>🦉</Text>
        <Text className="text-[#F9FAFB] text-[13px] font-bold">VERA Console</Text>
        <Text style={{ color: VERA_DEEP }} className="text-[10px] font-bold ml-1">10 / 10 · GATE</Text>
        <Text className="text-[#4f7d68] text-[10px] ml-auto">{plans.length} at the gate</Text>
      </View>
      <View className="px-3.5 pb-3.5">
        <Text className="text-[#4f7d68] text-[10px] mb-2 leading-snug">
          Run each plan through the gate — open it into review, then PASS (verified) or FAIL (a 9/10 returns it to CDA).
        </Text>

        {listQ.isLoading ? (
          <Text className="text-[#6B7280] text-[11px]">Loading…</Text>
        ) : listQ.isError ? (
          <Text className="text-[#EF4444] text-[10px]">
            {String(listQ.error?.message ?? "").includes("FORBIDDEN") ? "Operator account required." : "Couldn't reach VERA — pull to retry."}
          </Text>
        ) : plans.length === 0 ? (
          <Text className="text-[#6B7280] text-[11px]">No plans at the gate. VERA is all caught up.</Text>
        ) : (
          <View className="gap-2.5">
            {plans.map((p) => {
              const sc = PLAN_STATUS_COLOR[p.status] ?? "#6B7280";
              const queued = p.status === "queue";
              const inReview = p.status === "in_review";
              return (
                <View key={p.id} className="rounded-xl p-3" style={{ backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#12261c" }}>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-[#F9FAFB] text-[12.5px] font-bold" numberOfLines={1}>{p.city}, {p.state}</Text>
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${sc}1A` }}>
                      <Text style={{ color: sc }} className="text-[9px] font-bold uppercase tracking-wider">{p.status.replace("_", " ")}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-3 mb-2">
                    <Text className="text-[#4B5563] text-[10px]">{p.tier}</Text>
                    <Text className="text-[#4B5563] text-[10px]">{p.reviewsCompleted}/{p.reviewsRequired} reviews</Text>
                    <Text className="text-[#4B5563] text-[10px]">{p.planPages}pp</Text>
                    {p.designScore != null ? <Text className="text-[#4B5563] text-[10px]">score {p.designScore}</Text> : null}
                    {p.redundancyStatus === "flagged" ? <Text className="text-[#F59E0B] text-[10px]">⚑ redundant</Text> : null}
                  </View>
                  <View className="flex-row gap-1.5">
                    {queued ? (
                      <TouchableOpacity
                        onPress={() => open(p.id)}
                        disabled={pending}
                        activeOpacity={0.85}
                        className="rounded-lg px-3 py-1.5"
                        style={{ backgroundColor: `${VERA}18`, borderWidth: 1, borderColor: `${VERA}55`, opacity: pending && busy === p.id ? 0.6 : 1 }}
                      >
                        <Text style={{ color: VERA }} className="text-[10px] font-extrabold">open review →</Text>
                      </TouchableOpacity>
                    ) : null}
                    {inReview ? (
                      <>
                        <TouchableOpacity
                          onPress={() => decide(p.id, true)}
                          disabled={pending}
                          activeOpacity={0.85}
                          className="rounded-lg px-3 py-1.5"
                          style={{ backgroundColor: VERA, opacity: pending && busy === `${p.id}:true` ? 0.6 : 1 }}
                        >
                          <Text className="text-[#04120b] text-[10px] font-extrabold">✓ pass 10/10</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => decide(p.id, false)}
                          disabled={pending}
                          activeOpacity={0.85}
                          className="rounded-lg px-3 py-1.5"
                          style={{ backgroundColor: "#1a0d0d", borderWidth: 1, borderColor: "#EF444455", opacity: pending && busy === `${p.id}:false` ? 0.6 : 1 }}
                        >
                          <Text className="text-[#EF4444] text-[10px] font-bold">fail → CDA</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {advance.isError || verify.isError ? (
          <Text className="text-[#EF4444] text-[10px] mt-2">
            {String((advance.error ?? verify.error)?.message ?? "").includes("FORBIDDEN") ? "Operator account required." : "Couldn't update — try again."}
          </Text>
        ) : verify.isSuccess ? (
          <Text style={{ color: VERA }} className="text-[10px] mt-2">✓ Gate decision recorded.</Text>
        ) : null}
      </View>
    </View>
  );
}
