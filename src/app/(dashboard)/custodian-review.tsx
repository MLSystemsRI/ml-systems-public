import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, LayoutAnimation } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { AppHeader } from "@/components/app-header";
import { CustodianEntryCard } from "@/components/custodian-entry-card";
import { trpc } from "@/lib/trpc";
import {
  buildCustodianQueue,
  coverageLine,
  type CustodianHomeRow,
  type CustodianOntologyRow,
  type CustodianReviewRow,
} from "@/lib/custodian-queue";
import type { VcCode, AgentRun } from "@ml-systems/types";

/**
 * The Custodian's oversight console — every value-chain home, every account.
 *
 * `vc.reviewQueue` can only return review rows that already exist, so a home nobody has
 * touched would never reach him. This screen instead COMPOSES three admin reads that
 * already span accounts — `vc.list` (every home), `vc.ontologyFor` (its ledger) and
 * `vc.reviewQueue` (the rows that do exist) — and derives what still needs his stamp.
 * Coverage costs no backfill and no new writes because it is computed, not stored.
 *
 * His verdict is ADVISORY: nothing here blocks a homeowner. It records what the
 * Custodian has actually looked at, one entry at a time, bound to the entry's contents.
 */

const GOLD = "#F5D060";

export default function CustodianReviewScreen() {
  const utils = trpc.useUtils();
  const listQ = trpc.vc.list.useQuery(undefined, { retry: 0 });
  const queueQ = trpc.vc.reviewQueue.useQuery(undefined, { retry: 0 });

  const allHomes: CustodianHomeRow[] = Array.isArray(listQ.data?.homes)
    ? (listQ.data.homes as CustodianHomeRow[])
    : [];
  // One home up at a time while the template stabilizes (Sal 9/1). Saved homes keep
  // every row and stamp — they simply wait off the queue; restore from the VC Ledger.
  const homes = allHomes.filter((h) => !h.vcArchivedAt);
  const savedCount = allHomes.length - homes.length;
  const reviews: CustodianReviewRow[] = Array.isArray(queueQ.data?.rows)
    ? (queueQ.data.rows as CustodianReviewRow[])
    : [];

  // One home open at a time — its ledger is fetched only when he opens it, so the
  // console doesn't pull every ontology on load. The VC Ledger hub deep-links a home in
  // (`?propertyId=`), so a tap on "N need you" lands on THAT home, open.
  const params = useLocalSearchParams<{ propertyId?: string }>();
  const [openProperty, setOpenProperty] = useState<string | null>(
    typeof params.propertyId === "string" && params.propertyId ? params.propertyId : null,
  );
  const ontQ = trpc.vc.ontologyFor.useQuery(
    { propertyId: openProperty ?? "" },
    { enabled: !!openProperty, retry: 0 },
  );
  // The open home's run record — what actually RAN — for the strip on every entry card.
  const runsQ = trpc.vc.runsForHomes.useQuery(
    { propertyIds: [openProperty ?? ""] },
    { enabled: !!openProperty, retry: 0 },
  );
  const openRuns: AgentRun[] = useMemo(() => {
    type Row = { agent: string; task: string; code: string | null; outcome: string; reason: string | null; startedAt: string | Date; finishedAt: string | Date | null };
    const by = runsQ.data?.byProperty as Record<string, Row[]> | undefined;
    const rows = openProperty ? by?.[openProperty] : undefined;
    return (rows ?? []).map((r) => ({
      agent: r.agent, task: r.task, code: r.code, outcome: r.outcome, reason: r.reason,
      startedAt: new Date(r.startedAt).toISOString(),
      ...(r.finishedAt ? { finishedAt: new Date(r.finishedAt).toISOString() } : {}),
    }));
  }, [runsQ.data, openProperty]);

  const ontologies: CustodianOntologyRow[] = useMemo(() => {
    const rows = ontQ.data?.rows;
    if (!openProperty || !Array.isArray(rows)) return [];
    return rows
      .map((r) => {
        const ont = r.ontology as { codes?: Record<string, VcCode> } | null;
        return ont?.codes
          ? { propertyId: openProperty, cycle: r.cycle, codes: ont.codes }
          : null;
      })
      .filter((r): r is CustodianOntologyRow => r !== null);
  }, [ontQ.data, openProperty]);

  const compiled = useMemo(
    () => buildCustodianQueue({ homes, ontologies, reviews }),
    [homes, ontologies, reviews],
  );

  // The open home's era, so the correction options lead with what it probably is and a
  // pick that fights its record can be flagged.
  const specCtx = useMemo(() => {
    const g = ontQ.data?.rows?.[0]?.genome as { yearBuilt?: { v?: number } } | null | undefined;
    const y = g?.yearBuilt?.v;
    return typeof y === "number" ? { yearBuilt: y } : {};
  }, [ontQ.data]);

  const stamp = trpc.vc.stampEntry.useMutation({
    onSuccess: () => {
      void utils.vc.reviewQueue.invalidate();
      void utils.vc.runsForHomes.invalidate();
      void utils.vc.hubSummary.invalidate();
      if (openProperty) void utils.vc.ontologyFor.invalidate({ propertyId: openProperty });
    },
  });

  const toggle = (propertyId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenProperty((cur) => (cur === propertyId ? null : propertyId));
  };

  const openHome = compiled.find((h) => h.home.propertyId === openProperty);

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <AppHeader href="/vc-homes" title="Ledger Review Queue" subtitle="The Custodian's counter-stamp" />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="rounded-2xl border px-4 py-3.5 mb-3" style={{ borderColor: `${GOLD}33`, backgroundColor: `${GOLD}0A` }}>
          <Text style={{ color: GOLD }} className="text-[9px] font-bold tracking-widest mb-1">⚖ THE SECOND KEY</Text>
          <Text className="text-[#D1D5DB] text-[11.5px] leading-4">
            The homeowner signs what they know; you record it. A stamp binds to the entry&apos;s exact
            contents — if a number changes afterwards, the signature lapses and the entry comes back
            here. Nothing reaches the file on one signature alone.
          </Text>
          <Text className="text-[#9CA3AF] text-[9.5px] mt-2">
            Every home in the chain, across every account — including ones nobody has opened yet.
          </Text>
          {savedCount ? (
            <Text className="text-[#6B7280] text-[9px] mt-1">
              ▣ {savedCount} home{savedCount === 1 ? "" : "s"} saved for later — nothing deleted; restore from the VC Ledger console.
            </Text>
          ) : null}
        </View>

        {listQ.isLoading ? (
          <Text className="text-[#6B7280] text-[11px] px-1">Reading the chain…</Text>
        ) : listQ.error ? (
          <View className="rounded-2xl border px-4 py-5" style={{ borderColor: "#262626", backgroundColor: "#111111" }}>
            <Text className="text-[#9CA3AF] text-[12px] leading-5">
              This console is the Custodian&apos;s. Turn the admin lens on to read it.
            </Text>
          </View>
        ) : !compiled.length ? (
          <View className="rounded-2xl border px-4 py-5" style={{ borderColor: "#262626", backgroundColor: "#111111" }}>
            <Text className="text-[#9CA3AF] text-[12px] leading-5">
              No homes in the value chain yet. They appear here the moment one is created — no backfill needed.
            </Text>
          </View>
        ) : (
          compiled.map((h) => {
            const isOpen = h.home.propertyId === openProperty;
            const needs = h.counts.quarantined > 0 || h.counts.lapsed > 0;
            return (
              <View
                key={h.home.propertyId}
                className="mb-2 rounded-xl border"
                style={{ borderColor: needs ? "#EF444455" : "#1f2937", backgroundColor: "#0B0F16" }}
              >
                <Pressable onPress={() => toggle(h.home.propertyId)} className="px-3 py-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[#E5E7EB] text-[12.5px] font-semibold flex-1" numberOfLines={1}>
                      {h.home.address ?? "Unnamed property"}
                    </Text>
                    {h.openCount > 0 ? (
                      <Text style={{ color: needs ? "#EF4444" : GOLD }} className="text-[9px] font-bold">
                        {h.openCount} open
                      </Text>
                    ) : (
                      <Text style={{ color: "#34D399" }} className="text-[9px] font-bold">clear</Text>
                    )}
                    <Text className="text-[#4B5563] text-[9px]">{isOpen ? "▾" : "▸"}</Text>
                  </View>
                  <Text className="text-[#6B7280] text-[9.5px] mt-0.5" numberOfLines={1}>
                    {h.home.ownerName ?? h.home.ownerEmail ?? "—"}
                    {h.home.city ? ` · ${h.home.city}` : ""}
                    {` · cycle ${h.cycle}`}
                  </Text>
                  <Text
                    style={{ color: needs ? "#F59E0B" : "#9CA3AF" }}
                    className="text-[10px] mt-1"
                    numberOfLines={1}
                  >
                    {isOpen ? coverageLine(h) : h.hasOntology ? coverageLine(h) : "Not yet compressed"}
                  </Text>
                </Pressable>

                {isOpen ? (
                  <View className="px-3 pb-3">
                    {ontQ.isLoading ? (
                      <View className="flex-row items-center gap-2 py-3">
                        <ActivityIndicator size="small" color={GOLD} />
                        <Text className="text-[#6B7280] text-[10.5px]">Opening the record…</Text>
                      </View>
                    ) : !h.hasOntology ? (
                      <Text className="text-[#9CA3AF] text-[10.5px] leading-4 py-1">
                        This home has no compressed ledger yet — the homeowner hasn&apos;t taken it far enough
                        for the agents to write one. Nothing to stamp until they do.
                      </Text>
                    ) : !h.entries.length ? (
                      <Text className="text-[#9CA3AF] text-[10.5px] py-1">The ledger is empty for this cycle.</Text>
                    ) : (
                      h.entries.map((e) => (
                        <CustodianEntryCard
                          key={e.code}
                          entry={e}
                          busy={stamp.isPending}
                          specCtx={specCtx}
                          runs={openRuns}
                          onStamp={(verdict, opts) =>
                            stamp.mutate({
                              propertyId: e.propertyId,
                              cycle: e.cycle,
                              code: e.code,
                              // Bind the signature to what is on screen RIGHT NOW.
                              entryHash: e.hash,
                              verdict,
                              ...(opts.correction ? { correction: opts.correction } : {}),
                              ...(opts.note ? { note: opts.note } : {}),
                            })
                          }
                        />
                      ))
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        {stamp.error ? (
          <Text style={{ color: "#EF4444" }} className="text-[10px] mt-2 px-1">
            {stamp.error.message}
          </Text>
        ) : null}
        {openHome && openHome.hasOntology && !openHome.openCount ? (
          <Text style={{ color: "#34D399" }} className="text-[10px] mt-2 px-1">
            Every entry on this home carries both keys and still matches its signature.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
