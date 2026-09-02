import { PlansHero } from "@/components/plans-hero";
import { planSetParamsFor, openStudioPlanSet, openStudioDeepPlan } from "@/lib/plan-set-index";
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
  const params = planSetParamsFor({ genome, facts, footprintW, footprintD });
  return (
    <PlansHero
      genome={genome}
      currentCycle={cycle}
      onSelectCycle={onSelectCycle}
      planSetParams={params}
      onOpenFull={() => openStudioPlanSet(params)}
      onOpenDeep={() => openStudioDeepPlan(params)}
    />
  );
}
