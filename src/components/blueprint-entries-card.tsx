import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import { router } from "expo-router";
import type { BlueprintEntryPlan, RequiredEntry, EntryCapture } from "@ml-systems/types";
import { DISCIPLINE_LABELS, PASS_META } from "@ml-systems/types";
import { ledgerLabel } from "@/lib/ledger-label";

/**
 * BlueprintEntriesCard — CDA's minimum-entries manifest, the actionable companion to the
 * BlueprintReadinessCard. The readiness gate reads the ledger by SHEET ("A-200 needs
 * DES:heights", scattered across 75 rows); this reads it the other way — one flat,
 * deduplicated list of the distinct inputs the set still needs, ranked by how many sheets
 * each unlocks. It answers the one question the sheet view can't: "what do I add next?"
 *
 * Deterministic — renders only what `requiredEntries` computed off the same compiled
 * ontology the ledger shows. Each actionable row opens that entry's door at /entry-input,
 * the same route the ledger spine uses. MODELED.
 */

const CDA = "#60A5FA"; // blueprint blue — CDA's color
const HAVE = "#34D399";
const PARTIAL = "#F59E0B";
const MISSING = "#F87171";

const statusColor = (s: RequiredEntry["status"]): string =>
  s === "have" ? HAVE : s === "partial" ? PARTIAL : MISSING;
const statusMark = (s: RequiredEntry["status"]): string =>
  s === "have" ? "✓" : s === "partial" ? "◐" : "✕";

/** A friendly noun for the row — reuse the ledger's own labels for codes; a small map for genome fields. */
const GENOME_LABEL: Record<string, string> = {
  address: "Address",
  yearBuilt: "Year built",
  lotSF: "Lot size",
  levels: "Levels",
  grossSF: "Gross floor area",
  enclosedSF: "Enclosed area",
  finishedBasementSF: "Finished basement",
  "attributes.interiorWall": "Interior wall finish",
};
const entryLabel = (e: RequiredEntry): string =>
  e.kind === "genome" ? (GENOME_LABEL[e.key] ?? e.key) : ledgerLabel({ code: e.key });

/** How the homeowner answers it — a hint, in CDA's plain voice. */
const captureHint = (c: EntryCapture, actionable: boolean): string =>
  c === "chip"
    ? "tap to answer"
    : c === "measure"
      ? "needs a tape"
      : c === "record"
        ? actionable
          ? "from the record — tap to add"
          : "from the record"
        : c === "custodian"
          // A standoff between credible sources — no chip, tape or record read settles it.
          ? "disputed — the Custodian settles it"
          : "CDA derives it";

export function BlueprintEntriesCard({
  plan,
  address,
}: {
  plan: BlueprintEntryPlan;
  address?: string | undefined;
}) {
  const [open, setOpen] = useState(false);

  const openEntry = (e: RequiredEntry) => {
    if (!e.actionable || !address) return;
    router.push(
      `/entry-input?code=${encodeURIComponent(e.key)}&address=${encodeURIComponent(address)}` as never,
    );
  };

  return (
    <View className="rounded-xl border mb-2" style={{ borderColor: `${CDA}33`, backgroundColor: `${CDA}0A` }}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        className="px-2.5 py-2"
      >
        <View className="flex-row items-center gap-2">
          <Text style={{ color: CDA }} className="text-[9px] tracking-wider">CDA · MINIMUM ENTRIES</Text>
          <View className="flex-1" />
          {plan.needCount > 0 ? (
            <Text style={{ color: MISSING }} className="text-[9px] font-bold">{plan.needCount} to add</Text>
          ) : (
            <Text style={{ color: HAVE }} className="text-[9px] font-bold">complete</Text>
          )}
          <Text className="text-[#6B7280] text-[9px]">{plan.haveCount}/{plan.totalInputs} on file</Text>
          <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
        </View>

        {/* CDA's lead line — the shortest path, stated. */}
        {plan.notes[0] ? (
          <Text className="text-[#9CA3AF] text-[9.5px] leading-4 mt-1">{plan.notes[0]}</Text>
        ) : null}
      </Pressable>

      {open ? (
        <View className="px-2.5 pb-2.5">
          {plan.entries.map((e) => {
            const tappable = e.actionable && !!address;
            const Row = tappable ? Pressable : View;
            return (
              <Row
                key={`${e.kind}:${e.key}`}
                {...(tappable ? { onPress: () => openEntry(e) } : {})}
                className="mt-1.5 pt-1.5 border-t"
                style={{ borderColor: `${CDA}1A` }}
              >
                <View className="flex-row items-center gap-2">
                  <Text style={{ color: statusColor(e.status) }} className="text-[10px] w-3">{statusMark(e.status)}</Text>
                  <Text className="text-[#E5E7EB] text-[10px] font-semibold flex-1" numberOfLines={1}>
                    {entryLabel(e)}
                  </Text>
                  {e.leverage > 0 ? (
                    <Text style={{ color: CDA }} className="text-[9px]">
                      unlocks {e.leverage} sheet{e.leverage === 1 ? "" : "s"}
                    </Text>
                  ) : (
                    <Text className="text-[#4B5563] text-[9px]">on file</Text>
                  )}
                  {tappable ? <Text style={{ color: CDA }} className="text-[10px]">→</Text> : null}
                </View>

                {/* Which disciplines lean on it + how it's answered. */}
                <View className="flex-row items-center gap-1.5 mt-1 ml-5 flex-wrap">
                  {e.disciplines.map((d) => (
                    <View key={d} className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: `${CDA}12` }}>
                      <Text style={{ color: CDA }} className="text-[8px]">{DISCIPLINE_LABELS[d]}</Text>
                    </View>
                  ))}
                  <Text className="text-[#6B7280] text-[8px]">· {captureHint(e.capture, e.actionable)}</Text>
                  {/* Which of the four gather-passes owes this input — "what do I add next" read as "whose turn". */}
                  {e.owedPass ? (
                    <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: e.owedPass === "custodian-input" ? "#F5D06022" : "#1F2937" }}>
                      <Text style={{ color: e.owedPass === "custodian-input" ? "#F5D060" : "#9CA3AF" }} className="text-[8px]">
                        owes: {PASS_META[e.owedPass].label}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Row>
            );
          })}

          {plan.notes[1] ? (
            <Text className="text-[#6B7280] text-[8.5px] leading-4 mt-2">{plan.notes[1]}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
