import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { AuroraWeaveBorder } from "@/components/aurora-weave-border";
import { useValueChainHomes, portfolioHref, type FeedHome } from "@/lib/use-value-chain-homes";

/**
 * Your Value Chain Homes — the Hub's canonical home record.
 *
 * The Hub holds the data every agent pulls from: VERA verifies records in,
 * REAPER stages the harvest, MIA's marketplace reads it back out — this card
 * IS that record, surfaced. ONE entry per home (dedupeAddressKey collapses
 * spellings), no pit chrome (financing lives on the portfolio page), and the
 * Custodian's verification state rides each entry.
 *
 * Lens split: the homeowner sees ONLY their own home(s); the Custodian (the
 * orchestrator) sees the full record + the family portfolio.
 *
 * Frame matches the "Let's build." Collective Portal card exactly — same violet
 * + silver, glow shadow → 1px border + radius 24 clip → flowing weave streaks.
 */

const VIOLET = "#8B5CF6";
const SILVER = "#DCE2EE";
const RADIUS = 24;


export function ValueChainHomesCard() {
  // The list itself lives in `use-value-chain-homes` so the hamburger opens exactly
  // this home — same merge, same dedupe, same own-first sort — instead of a second
  // implementation that agreed until it didn't.
  const { homes: sorted, myProjectId, loading } = useValueChainHomes();

  // The ledger readout — the homeowner's own compressed record (fail-soft null).
  const ontQ = trpc.vc.myOntology.useQuery(undefined, { retry: 0 });
  const ontTotals = (ontQ.data as { ontology?: { totals?: { codes?: number; confirmed?: number } } } | null | undefined)?.ontology?.totals ?? null;

  return (
    // shadow wrapper (no clip — the violet glow needs to escape), same as the portal
    <View
      className="mb-6"
      style={{ borderRadius: RADIUS, shadowColor: VIOLET, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } }}
    >
      <View
        style={{
          width: "100%",
          borderRadius: RADIUS,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: VIOLET,
          backgroundColor: "#0A0A0A",
        }}
      >
        <View className="px-4 pt-4 pb-3.5">
          {/* Header */}
          <View className="flex-row items-center gap-2 mb-1">
            <Text style={{ color: VIOLET, fontSize: 15 }}>⬡</Text>
            <Text className="text-[#F9FAFB] text-[15px] font-extrabold flex-1">Your Value Chain Ledger</Text>
            <Text style={{ color: VIOLET }} className="text-[9px] font-bold uppercase tracking-wider">
              The Ledger
            </Text>
          </View>
          <Text className="text-[#6B7280] text-[10.5px] leading-snug mb-3">
            The verified record every agent builds on — the more we verify, the more value each one returns to you.
          </Text>
          {/* The ledger is not a card-level readout any more — it belongs TO a home, and
              is shown on that home's own row below, opening the Portfolio where it lives. */}

          {/* Home rows — pure record display, no link-outs */}
          {loading && sorted.length === 0 ? (
            <Text className="text-[#6B7280] text-[11px]">Reading the record…</Text>
          ) : sorted.length === 0 ? (
            <TouchableOpacity
              onPress={() => router.push("/add-home" as any)}
              activeOpacity={0.85}
              className="rounded-2xl px-3.5 py-3.5 flex-row items-center justify-between"
              style={{ backgroundColor: `${VIOLET}0D`, borderWidth: 1, borderColor: `${VIOLET}33` }}
            >
              <Text className="text-[#9CA3AF] text-[12px] flex-1 pr-3">
                No homes in the chain yet — load your home to start the record.
              </Text>
              <Text style={{ color: VIOLET }} className="text-lg">→</Text>
            </TouchableOpacity>
          ) : (
            sorted.map((h) => {
              const isOwn = h.projectId === myProjectId;
              const verified = h.vcVerificationStatus === "verified";
              return (
                <View key={h.projectId} className="mb-2">
                {/* Tap → this home's Value Chain Portfolio (the journey's output —
                    the same page as the drawer's "The Value Chain Portfolio").
                    ONE clean entry per home; financing lives on the portfolio. */}
                <TouchableOpacity
                  onPress={() => router.push(portfolioHref(h) as never)}
                  activeOpacity={0.85}
                  className="rounded-2xl px-3.5 py-3"
                  style={{
                    backgroundColor: isOwn ? `${VIOLET}0D` : "#111111",
                    borderWidth: 1,
                    borderColor: isOwn ? `${VIOLET}44` : "#262626",
                  }}
                >
                  <View className="flex-row items-center gap-2">
                    <View className="flex-1">
                      {h.label ? (
                        <Text style={{ color: VIOLET }} className="text-[9px] font-bold uppercase tracking-wider" numberOfLines={1}>
                          {h.label}
                        </Text>
                      ) : null}
                      <Text className="text-[#F9FAFB] text-[13px] font-bold" numberOfLines={1}>
                        {h.address ?? "Unknown address"}
                      </Text>
                    </View>
                    {/* The Custodian's gate — a verified entry wears his mark. */}
                    {verified ? (
                      <Text
                        style={{ color: "#F5D060", borderColor: "#F5D06055", backgroundColor: "#F5D06014" }}
                        className="text-[8px] font-bold rounded-full px-1.5 py-0.5 border"
                      >
                        ◆ Custodian-verified
                      </Text>
                    ) : isOwn ? (
                      <Text style={{ color: "#34D399" }} className="text-[9px] font-bold">✓ VERA</Text>
                    ) : null}
                    <Text style={{ color: VIOLET }} className="text-[13px]">→</Text>
                  </View>
                  <Text className="text-[#6B7280] text-[10.5px] mt-0.5">
                    {[h.city, h.state].filter(Boolean).join(", ")}
                    {h.status ? ` · ${String(h.status).replace(/_/g, " ")}` : ""}
                    {h.cycleNumber != null ? ` · cycle ${h.cycleNumber}` : ""}
                    {h.vcVerificationStatus === "in_progress" ? " · verification in progress" : ""}
                  </Text>
                  <Text style={{ color: SILVER }} className="text-[10.5px] mt-1">
                    {h.materialsCount} material{h.materialsCount === 1 ? "" : "s"}
                    {h.activeListingCount ? ` · ${h.activeListingCount} live on .store` : " · harvest staged"}
                  </Text>
                  {/* The ledger, attached to THIS entry. Tapping the row opens the
                      Portfolio, which now leads with it. */}
                  {isOwn && ontTotals?.codes ? (
                    <View
                      className="flex-row items-center gap-1.5 mt-2 pt-2 border-t"
                      style={{ borderColor: "#ffffff10" }}
                    >
                      <Text style={{ color: "#F5D060" }} className="text-[10px]">⚖</Text>
                      <Text className="text-[#D1D5DB] text-[10px] flex-1" numberOfLines={1}>
                        Value Chain Ledger — {ontTotals.codes} entries · {ontTotals.confirmed ?? 0} verified
                        
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Thin silver + purple streaks flowing around the whole card — the portal's border */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <AuroraWeaveBorder color={VIOLET} bright={SILVER} radius={RADIUS} both={false} frame={false} full weight={2} idKey="vc-homes" />
        </View>
      </View>
    </View>
  );
}
