import { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { getPlan, upsertPlan, usePlan } from "@/lib/plan-store";
import { normalizeAddress, type BuilderFacts } from "@/lib/jspace-facts";
import {
  specKindForCheck,
  specOptionsFor,
  statedFieldForKind,
  type SpecContext,
  type VcOpenTask,
} from "@ml-systems/types";

/**
 * What the ledger still needs from the HOMEOWNER — the one thing no agent can fetch.
 *
 * This is the homeowner's own layer inside the conformity system, and it is the only
 * part of the ledger they can write. Tapping an answer writes the matching `stated*`
 * fact, which is all it takes: `reverseTakeoff` flips that member from inferred to
 * STATED on the next compile, and `buildClaims` enters it as the homeowner's claim —
 * where, on interior members, they outrank every other source.
 *
 * Lifted out of the standalone `/value-chain-ledger` screen when that screen was
 * retired in favour of the portfolio's master ledger. The logic is unchanged; losing
 * it would have quietly removed the homeowner's only way to answer the ledger.
 */
/** The one ask no agent can ever close — the homeowner has to walk into the town hall. */
export const TOWN_PLANS_TASK = "plans-on-file";

export function LedgerOpenTasks({
  openTasks,
  address,
  only,
  title = "WHAT WE STILL NEED FROM YOU",
}: {
  openTasks: VcOpenTask[] | undefined;
  /** The home these answers belong to. Answers are stored per address. */
  address: string | undefined;
  /** "answerable" = everything the homeowner can settle here · "town" = the plans trip. */
  only?: "answerable" | "town";
  title?: string;
}) {
  const planKey = address ? normalizeAddress(address) : undefined;
  const plan = usePlan(planKey);
  const answered = (plan?.facts ?? {}) as Record<string, string | undefined>;
  const specCtx: SpecContext = plan?.facts?.genome?.yearBuilt?.v
    ? { yearBuilt: plan.facts.genome.yearBuilt.v }
    : {};

  const onAnswer = useCallback(
    (field: string, value: string) => {
      if (!address) return;
      const prev = getPlan(normalizeAddress(address))?.facts ?? {};
      // An empty value un-answers — the homeowner can take a pick back.
      upsertPlan(address, { ...prev, [field]: value || undefined } as BuilderFacts);
    },
    [address],
  );

  const tasks = (openTasks ?? []).filter((t) =>
    only === "town" ? t.id === TOWN_PLANS_TASK : only === "answerable" ? t.id !== TOWN_PLANS_TASK : true,
  );
  if (!tasks.length) return null;

  return (
    <View className="rounded-2xl border px-4 py-3.5 mb-3" style={{ borderColor: "#8B5CF633", backgroundColor: "#8B5CF60A" }}>
      <Text style={{ color: "#A78BFA" }} className="text-[9px] font-bold tracking-widest mb-2">
        {title}
      </Text>
      {tasks.map((t) => {
        const kind = specKindForCheck(t.id);
        const field = kind ? statedFieldForKind(kind) : null;
        // No field means the answer would be dropped, so no chips are offered.
        const answers = kind && field ? specOptionsFor(kind, specCtx) : [];
        return (
          <Pressable
            key={t.id}
            onPress={() => (answers.length ? undefined : router.push("/uploads" as never))}
            className="py-2 border-t"
            style={{ borderColor: "#14171c" }}
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-[#E5E7EB] text-[11.5px] font-semibold flex-1">{t.title}</Text>
              <Text
                style={{ color: t.status === "received" ? "#34D399" : t.status === "requested" ? "#F59E0B" : "#A78BFA" }}
                className="text-[8px] font-bold tracking-wider"
              >
                {t.status === "received" ? "RECEIVED" : t.status === "requested" ? "REQUESTED" : "YOU"}
              </Text>
            </View>
            <Text className="text-[#9CA3AF] text-[10.5px] leading-4 mt-1">{t.why}</Text>
            {answers.length ? (
              <View className="flex-row flex-wrap gap-1.5 mt-2">
                {answers.map((a) => {
                  const picked = field != null && answered[field] === a;
                  return (
                    <Pressable
                      key={a}
                      onPress={() => field && onAnswer(field, picked ? "" : a)}
                      className="rounded-full px-2.5 py-1.5"
                      style={{
                        backgroundColor: picked ? "#A78BFA22" : "#111827",
                        borderWidth: 1,
                        borderColor: picked ? "#A78BFA" : "#1f2937",
                      }}
                    >
                      <Text className="text-[10px]" style={{ color: picked ? "#A78BFA" : "#D1D5DB" }}>
                        {a}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : t.unlocks.length ? (
              <Text className="text-[#6B7280] text-[9px] mt-1">
                Would upgrade {t.unlocks.join(" · ")} — tap to add them
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
