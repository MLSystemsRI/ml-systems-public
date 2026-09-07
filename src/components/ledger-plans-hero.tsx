import { PlansHero } from "@/components/plans-hero";
import { planSetParamsFor, openStudioPlanSet, openStudioDeepPlan, openStudioPlanSetDocument } from "@/lib/plan-set-index";
import { trpc } from "@/lib/trpc";
import type { BuilderFacts } from "@/lib/jspace-facts";
import type { HomeGenome } from "@ml-systems/types";

/**
 * LedgerPlansHero — the one wired blueprint OUTPUT, rendered on both the Plan Builder
 * and the VC Portfolio. Neither screen re-wires the studio doors: the shared
 * planSetParamsFor / openStudioPlanSet / openStudioDeepPlan helpers do, so the two
 * surfaces open BYTE-IDENTICAL studio renders and cannot drift.
 *
 * `genome` is already resolved (resolvePlanGenome) by the caller — this component just
 * builds the params and hands PlansHero the two doors.
 */
export function LedgerPlansHero({
  genome,
  facts,
  footprintW,
  footprintD,
  cycle,
  onSelectCycle,
}: {
  genome?: HomeGenome | null;
  facts: BuilderFacts;
  footprintW?: number;
  footprintD?: number;
  cycle: number;
  onSelectCycle: (n: number) => void;
}) {
  // The home's entitlement rides every studio door, so a granted tier opens its sheets
  // here and in the printed copy alike. `myHome` is the caller's own entry (a homeowner
  // holds one); absent or Free, nothing is sent and the server assumes Free.
  const home = trpc.vc.myHome.useQuery(undefined, { retry: 0 });
  const tier = (home.data as { planTier?: number } | null | undefined)?.planTier ?? null;
  const params = planSetParamsFor({ genome, facts, footprintW, footprintD, tier });
  return (
    <PlansHero
      genome={genome}
      currentCycle={cycle}
      onSelectCycle={onSelectCycle}
      planSetParams={params}
      onOpenFull={() => openStudioPlanSet(params)}
      onOpenDeep={() => openStudioDeepPlan(params)}
      onKeepCopy={() => openStudioPlanSetDocument(params)}
    />
  );
}
