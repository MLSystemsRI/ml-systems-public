import { View, Text, TouchableOpacity } from "react-native";
import { trpc } from "@/lib/trpc";
import type { MyLoan } from "@/components/pit/loan-pit-card";
import { assessRebuild, usd, CONSTRUCTION_RATE, CONSTRUCTION_TERM_MONTHS } from "@/lib/rebuild-assessment";
import { buildTakeoff, type ReverseTakeoff } from "@ml-systems/types";

/**
 * Rebuild assessment — PIT LORD × MURPHY on the Value Chain Portfolio (layer 2).
 *
 * Once decon is real (a bridge holds, or the homeowner answered yes), the next
 * link of the chain is the REBUILD — this card is PIT LORD assessing it against
 * MURPHY's canonical schedule: the calibrated build total distributed across the
 * 7-month phase bands (the same per-phase breakdown Layer 2's build-trace shows).
 * Draft lanes open the construction loan the same way the bridge was built: a real
 * loans.submit at the standing 6% · 30 yr terms — conventional or RCM — which
 * lands in the pit for the custodian to open and lenders to compete on.
 */

const RED = "#EF4444";
const MURPHY = "#84CC16";

export function RebuildAssessmentCard({
  address,
  projectId,
  homeLoans,
  currentValueDollars,
  geo,
  reverse,
}: {
  address?: string | null;
  projectId?: string | null;
  homeLoans: MyLoan[];
  currentValueDollars?: number | null;
  /** Current-home geometry so MURPHY's MVE can price the phases. */
  geo?: { grossSF?: number; levels?: number; footprintW?: number; footprintD?: number; cycle?: number };
  reverse?: ReverseTakeoff | null;
}) {
  const utils = trpc.useUtils();
  const submit = trpc.loans.submit.useMutation({
    onSuccess: () => utils.pit.getMyLoans.invalidate(),
  });
  const realProjectId = projectId && !projectId.startsWith("local:") ? projectId : null;
  const ra = assessRebuild({ currentValueDollars: currentValueDollars ?? undefined });
  // MURPHY's MVE — the SAME build total the draft rides on, distributed across the
  // phase bands (no divergence). Null when there's no geometry to price yet.
  const mve = buildTakeoff({ ...geo, allocateCost: ra.avgCostDollars, reverse: reverse ?? null });

  const hasLane = (t: string) => homeLoans.some((m) => m.loan.loanType === t && m.loan.status !== "paid_off");
  const lanes = (["conventional", "RCM"] as const).filter((t) => !hasLane(t));

  const draft = (loanType: "conventional" | "RCM") => {
    if (!realProjectId || submit.isPending) return;
    submit.mutate({
      projectId: realProjectId,
      loanType,
      principalAmount: ra.principalCents,
      interestRate: CONSTRUCTION_RATE,
      termMonths: CONSTRUCTION_TERM_MONTHS,
    });
  };

  return (
    <View className="rounded-xl px-3.5 py-3" style={{ backgroundColor: `${RED}0A`, borderWidth: 1, borderColor: `${RED}30` }}>
      <Text className="text-[9px] font-bold uppercase tracking-widest mb-1.5">
        <Text style={{ color: RED }}>🐉 Financing</Text>
        <Text className="text-[#4B5563]"> × </Text>
        <Text style={{ color: MURPHY }}>🏗 Build</Text>
        <Text className="text-[#4B5563]"> · rebuild assessment · modeled</Text>
      </Text>

      {/* The build total — calibrated model, honestly labeled */}
      <Text className="text-[#F9FAFB] text-[13px] font-bold">
        Build cost {usd(ra.avgCostDollars)}
        <Text className="text-[#6B7280] text-[10.5px] font-normal"> · calibrated{ra.basis === "sf" ? ` (${ra.postRebuildSF!.toLocaleString()} SF × $169/SF)` : ""}</Text>
      </Text>

      {/* MURPHY's canonical schedule — the build total priced phase by phase */}
      {mve ? (
        <View className="mt-1.5 mb-0.5">
          <Text style={{ color: MURPHY }} className="text-[9px] font-bold uppercase tracking-widest mb-1">
            🐕 7-month schedule · {mve.totalWeeks} wk
          </Text>
          {mve.schedule.map((b) => (
            <View key={b.phase} className="flex-row items-baseline justify-between">
              <Text className="text-[#9CA3AF] text-[10.5px] flex-1 pr-2" numberOfLines={1}>
                {b.phase}
                <Text className="text-[#4B5563]"> · ~{b.weeks}wk</Text>
              </Text>
              <Text className="text-[#D1D5DB] text-[10.5px] font-semibold">{usd(b.cost)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {ra.postValueDollars ? (
        <Text className="text-[#9CA3AF] text-[11px] mt-0.5">
          Value → <Text style={{ color: "#22C55E" }} className="font-bold">{usd(ra.postValueDollars)}</Text> (×1.43) · equity created {usd(ra.equityCreatedDollars!)}
        </Text>
      ) : null}
      <Text className="text-[#9CA3AF] text-[11px] mt-0.5">
        Draft {usd(ra.principalCents / 100)} @ 6% · 30 yr (−{usd(ra.salvageBankDollars)} salvage bank) · ~{usd(ra.monthlyDollars)}/mo · {ra.cycleMonths}-mo cycle
      </Text>

      {/* Draft lanes — a lane hides once that loan type is live on the home */}
      {lanes.length === 0 ? (
        <Text style={{ color: RED }} className="text-[10.5px] mt-2 font-semibold">Both construction lanes are already in the pit.</Text>
      ) : submit.isPending ? (
        <Text className="text-[#9CA3AF] text-[11px] mt-2">🐉 Drafting the construction loan…</Text>
      ) : submit.isError ? (
        <Text className="text-[#9CA3AF] text-[11px] mt-2">
          {String(submit.error?.message ?? "").includes("already exists")
            ? "That lane is already active on this home."
            : "Couldn't draft — try a lane again."}
        </Text>
      ) : realProjectId ? (
        <View className="flex-row gap-2 mt-2">
          {lanes.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => draft(t)}
              activeOpacity={0.85}
              className="rounded-lg px-3 py-1.5"
              style={{ backgroundColor: `${RED}1A`, borderWidth: 1, borderColor: `${RED}55` }}
            >
              <Text style={{ color: "#FCA5A5" }} className="text-[11px] font-bold">Draft {t === "RCM" ? "RCM" : "conventional"} →</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text className="text-[#6B7280] text-[10.5px] mt-2">Drafts when this home's record is live.</Text>
      )}
      {submit.isSuccess ? (
        <Text style={{ color: "#22C55E" }} className="text-[10.5px] mt-1.5">✓ Drafted — application in; the pit opens next.</Text>
      ) : null}

      <Text className="text-[#4B5563] text-[9.5px] mt-2">
        {mve
          ? "The canonical schedule prices the build phase by phase — MODELED, the GC and inspector confirm."
          : "Add this home's geometry (Plan Builder) and every phase gets priced."}
      </Text>
    </View>
  );
}
