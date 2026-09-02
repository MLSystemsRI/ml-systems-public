import { View, Text, TouchableOpacity } from "react-native";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatEquity } from "@/lib/format";
import { PitTabs } from "./pit-tabs";
import { FlameCard, PitStat, TierBadge, SourceBadge, sourceColor } from "./pit-bits";
import { computeCustodianStats, computeRevenueByTier, dollarsFromCents, daysLeft } from "@/lib/pit-compute";
import type { CustodianData, PitRow, BidRow, TierRow } from "@/lib/pit-compute";
import { isBridge, BRIDGE } from "@/lib/pit-bridge";

const RED = "#EF4444";
const GOLD = "#D4AF37";
const AMBER = "#F59E0B";

type CTab = "all-pits" | "all-bids" | "lenders" | "revenue";
const TABS = ["all-pits", "all-bids", "lenders", "revenue"] as const;
const LABELS: Record<CTab, string> = { "all-pits": "All Pits", "all-bids": "All Bids", lenders: "Lender Pipeline", revenue: "Revenue" };

/** The Custodian lens — live PIT LORD Console + 6 stat cards + 4 oversight sub-tabs.
 *  `isAdmin` is server-truth (pit.getViewer): only a genuine non-admin ever sees the
 *  access-required gate; a real admin sees loading → data, and a transient failure
 *  reads as "couldn't load", not "access required". */
export function CustodianView({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<CTab>("all-pits");

  // Live oversight data (admin-only aggregate) — only fire it for a real admin.
  const dataQ = trpc.pit.getCustodianData.useQuery(undefined, { retry: 0, enabled: isAdmin });
  const cData = dataQ.data as CustodianData | undefined;
  const pits = cData?.pits ?? [];
  const allBids = cData?.allBids ?? {};
  const tierTable = cData?.tierTable ?? [];
  const stats = computeCustodianStats(pits, allBids);
  const revenue = computeRevenueByTier(pits, allBids);

  // PIT LORD Console — open a loan application into a reverse-auction pit (live).
  const openableQ = trpc.pit.listOpenable.useQuery(undefined, { retry: 0, enabled: isAdmin });
  const openM = trpc.pit.open.useMutation({ onSuccess: () => { openableQ.refetch(); dataQ.refetch(); } });
  const [openingId, setOpeningId] = useState<string | null>(null);
  const openable = (openableQ.data?.loans ?? []) as { id: string; loanType: string; principalAmount: string | number; termMonths: number }[];
  const openPit = (loanId: string) => {
    setOpeningId(loanId);
    openM.mutate({ loanId, closesAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(), minBidders: 2 });
  };

  return (
    <View>
      {/* Oversight banner */}
      <View className="mt-3 mb-4 rounded-2xl p-3" style={{ backgroundColor: "#22C55E0D", borderWidth: 1, borderColor: "#22C55E33" }}>
        <Text className="text-[#22C55E] text-[10px] font-bold uppercase tracking-wider mb-0.5">Custodian oversight</Text>
        <Text className="text-[#9CA3AF] text-[11px]">Full-pit visibility across offerings, bids, and lender integration health.</Text>
      </View>

      {/* PIT LORD Console — open pits (live governance) */}
      <View className="mb-4 rounded-2xl" style={{ backgroundColor: "#150a0a", borderWidth: 1, borderColor: `${RED}44` }}>
        <View className="px-3.5 py-3 flex-row items-center gap-2">
          <Text style={{ fontSize: 15 }}>🐉</Text>
          <Text className="text-[#F9FAFB] text-[13px] font-bold">PIT LORD Console</Text>
          <Text className="text-[#9a5f5f] text-[10px] ml-auto">{openable.length} ready to open</Text>
        </View>
        <View className="px-3.5 pb-3.5">
          <Text className="text-[#9a5f5f] text-[10px] mb-2 leading-snug">
            Open a loan application into a reverse-auction pit — lenders compete, the homeowner picks the winner.
          </Text>
          {openableQ.isLoading ? (
            <Text className="text-[#6B7280] text-[11px]">Loading…</Text>
          ) : openable.length === 0 ? (
            <Text className="text-[#6B7280] text-[11px]">No loan applications waiting. Submit one from Loan Origination.</Text>
          ) : (
            <View className="gap-2">
              {openable.map((l) => (
                <View key={l.id} className="rounded-xl p-3 flex-row items-center gap-2" style={{ backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: isBridge(l.loanType) ? `${BRIDGE.color}55` : "#2a1616" }}>
                  <View className="flex-1">
                    <Text className="text-[#F9FAFB] text-[12.5px] font-bold" numberOfLines={1}>
                      ${Number(l.principalAmount).toLocaleString("en-US")} · <Text className="uppercase">{l.loanType}</Text>
                    </Text>
                    <Text className="text-[#6B7280] text-[10px]">{l.termMonths} mo · application</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => openPit(l.id)}
                    disabled={openM.isPending && openingId === l.id}
                    activeOpacity={0.85}
                    className="rounded-lg px-3.5 py-2"
                    style={{ backgroundColor: RED, opacity: openM.isPending && openingId === l.id ? 0.6 : 1 }}
                  >
                    <Text className="text-[#1a0606] text-[12px] font-extrabold">{openM.isPending && openingId === l.id ? "…" : "Open pit"}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          {openM.isError ? (
            <Text className="text-[#EF4444] text-[10px] mt-2">
              {String(openM.error?.message ?? "").includes("FORBIDDEN") ? "Operator account required." : "Couldn't open — try again."}
            </Text>
          ) : openM.isSuccess ? (
            <Text style={{ color: RED }} className="text-[10px] mt-2">✓ Pit opened — lenders can now bid.</Text>
          ) : null}
        </View>
      </View>

      {/* 6 stat cards (2 rows of 3) */}
      <View className="flex-row gap-2 mb-2">
        <PitStat label="Total Pits" value={stats.totalPits} color={GOLD} />
        <PitStat label="Total Bids" value={stats.totalBidCount} color={RED} />
        <PitStat label="Fee Revenue" value={dollarsFromCents(stats.totalFeeRevenue)} color={AMBER} />
      </View>
      <View className="flex-row gap-2 mb-4">
        <PitStat label="Active Lenders" value={stats.activeLenders} color="#22C55E" />
        <PitStat label="Verified Plans" value={stats.verifiedPits} color="#60A5FA" />
        <PitStat label="Avg Bids/Pit" value={stats.avgBidCount} color="#9CA3AF" />
      </View>

      <PitTabs tabs={TABS} active={tab} onChange={setTab} color={GOLD} labels={LABELS} />

      {!isAdmin ? (
        <Text className="text-[#6B7280] text-sm text-center mt-8">Custodian (admin) access required for live oversight.</Text>
      ) : dataQ.isLoading ? (
        <Text className="text-[#6B7280] text-sm text-center mt-8">Loading oversight…</Text>
      ) : dataQ.isError ? (
        <Text className="text-[#6B7280] text-sm text-center mt-8">Couldn't load oversight — pull to retry.</Text>
      ) : (
        <>
          {tab === "all-pits" ? <AllPitsTab pits={pits} allBids={allBids} /> : null}
          {tab === "all-bids" ? <AllBidsTab pits={pits} allBids={allBids} /> : null}
          {tab === "lenders" ? <LenderPipelineTab stats={stats} /> : null}
          {tab === "revenue" ? <RevenueTab stats={stats} revenue={revenue} tierTable={tierTable} /> : null}
        </>
      )}
    </View>
  );
}

/* ── All Pits ── */
function AllPitsTab({ pits, allBids }: { pits: PitRow[]; allBids: Record<string, BidRow[]> }) {
  if (pits.length === 0) return <Text className="text-[#6B7280] text-sm text-center mt-8">The Pit is silent. No pits opened yet.</Text>;
  return (
    <View>
      {pits.map((pit) => {
        const d = pit.anonymizedData;
        const tier = pit.tierInfo;
        const pitBids = allBids[pit.id] ?? [];
        return (
          <FlameCard key={pit.id} loanType={d.loanType} style={{ borderColor: isBridge(d.loanType) ? `${BRIDGE.color}55` : `${tier.color}40` }}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2 flex-1 pr-2">
                <Text className="text-[13px] font-bold text-[#F9FAFB]" numberOfLines={1}>{d.address}</Text>
                <TierBadge label={tier.label} color={tier.color} />
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-[10px] text-[#6B7280]">{daysLeft(pit.closesAt)}d</Text>
                <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: pit.status === "open" ? "#22C55E1A" : "#6B72801A" }}>
                  <Text style={{ color: pit.status === "open" ? "#22C55E" : "#6B7280" }} className="text-[8px] font-bold uppercase">{pit.status}</Text>
                </View>
              </View>
            </View>
            <Text className="text-[#6B7280] text-[10px] mb-1.5">{d.city}, {d.state}</Text>
            <View className="flex-row flex-wrap gap-x-4 gap-y-1">
              <Text className="text-[10px] text-[#6B7280]">Loan <Text className="text-[#F9FAFB] font-mono">{formatEquity(d.loanAmount)}</Text></Text>
              <Text className="text-[10px] text-[#6B7280]">Type <Text className="text-[#F9FAFB] uppercase">{d.loanType}</Text></Text>
              <Text className="text-[10px] text-[#6B7280]">Cycle <Text className="text-[#F9FAFB]">{d.cycleNumber}</Text></Text>
              <Text className="text-[10px] text-[#6B7280]">Bids <Text style={{ color: tier.color }}>{pit.bidCount}</Text></Text>
              <Text className="text-[10px] text-[#6B7280]">FICO <Text className="text-[#F9FAFB] font-mono">{d.creditScore ?? "—"}</Text></Text>
              <Text className="text-[10px] text-[#6B7280]">Fee/bid <Text style={{ color: AMBER }} className="font-mono">${(pit.bidFee / 100).toLocaleString()}</Text></Text>
              <Text className="text-[10px] text-[#6B7280]">Design <Text style={{ color: pit.designScore.status === "verified" ? "#60A5FA" : "#6B7280" }} className="font-bold">{pit.designScore.status === "verified" && pit.designScore.score != null ? pit.designScore.score : pit.designScore.status}</Text></Text>
              {pit.subsidyEligible ? <Text className="text-[#22C55E] text-[9px] font-bold uppercase">Subsidy</Text> : null}
            </View>
            {pitBids.length > 0 ? (
              <View className="flex-row flex-wrap gap-1.5 mt-2 pt-2" style={{ borderTopWidth: 1, borderTopColor: "#1A1A1A" }}>
                {pitBids.map((bid) => (
                  <View key={bid.id} className="rounded px-2 py-0.5" style={{ borderWidth: 1, borderColor: "#26262640" }}>
                    <Text className="text-[9px] text-[#9CA3AF]">{bid.lenderName} · <Text className="font-mono">{(Number(bid.interestRate) * 100).toFixed(2)}%</Text></Text>
                  </View>
                ))}
              </View>
            ) : null}
          </FlameCard>
        );
      })}
    </View>
  );
}

/* ── All Bids ── */
function AllBidsTab({ pits, allBids }: { pits: PitRow[]; allBids: Record<string, BidRow[]> }) {
  const entries = Object.entries(allBids).filter(([, b]) => b.length > 0);
  if (entries.length === 0) return <Text className="text-[#6B7280] text-sm text-center mt-8">No bids placed yet.</Text>;
  return (
    <View className="gap-2">
      {entries.map(([pitId, bids]) => {
        const pit = pits.find((p) => p.id === pitId);
        if (!pit) return null;
        return (
          <View key={pitId} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-4 py-3">
            <Text className="text-xs font-bold text-[#F9FAFB] mb-2">
              {pit.anonymizedData.address}, {pit.anonymizedData.city}
              <Text className="text-[#6B7280] font-normal">  {bids.length} bids</Text>
            </Text>
            <View className="gap-1.5">
              {bids.map((bid) => (
                <View key={bid.id} className="flex-row items-center justify-between py-1" style={{ borderBottomWidth: 1, borderBottomColor: "#1A1A1A" }}>
                  <View className="flex-row items-center gap-2 flex-1">
                    <Text className="text-[11px] text-[#F9FAFB]" numberOfLines={1}>{bid.lenderName}</Text>
                    <SourceBadge source={bid.bidSource} />
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-[10px] text-[#9CA3AF] font-mono">{(Number(bid.interestRate) * 100).toFixed(2)}%</Text>
                    <Text className="text-[10px] text-[#9CA3AF]">{bid.termMonths / 12}yr</Text>
                    <Text className="text-[10px] font-mono" style={{ color: AMBER }}>${(bid.bidFeePaid / 100).toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ── Lender Pipeline ── */
type OnboardedLender = { id: string; name: string; type: string; integrationMode: string; providers: string[] };

function LenderPipelineTab({ stats }: { stats: ReturnType<typeof computeCustodianStats> }) {
  const onboardedQ = trpc.pit.getOnboardedLenders.useQuery(undefined, { retry: 0 });
  const onboarded = (onboardedQ.data ?? []) as OnboardedLender[];
  return (
    <View className="gap-4">
      {/* The real onboarded roster (partner_lenders active) + API integrations */}
      <View>
        <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#22C55E]">Onboarded lenders</Text>
        {onboarded.length === 0 ? (
          <Text className="text-[#6B7280] text-[11px]">No lenders onboarded yet — the .net on-ramp feeds this.</Text>
        ) : (
          onboarded.map((o) => {
            const hasApi = o.providers.length > 0;
            const c = hasApi ? "#60A5FA" : "#22C55E";
            return (
              <View key={o.id} className="bg-[#0A0A0A] border rounded-lg px-4 py-3 mb-2 flex-row items-center justify-between" style={{ borderColor: `${c}2E` }}>
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-bold text-[#F9FAFB]" numberOfLines={1}>{o.name}</Text>
                  <Text className="text-[#6B7280] text-[10px]">{o.type.replace(/_/g, " ")} · {o.integrationMode}</Text>
                </View>
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${c}1A`, borderWidth: 1, borderColor: `${c}40` }}>
                  <Text style={{ color: c }} className="text-[8px] font-bold uppercase">{hasApi ? `API · ${o.providers.join(", ")}` : "Onboarded"}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Who's actually bidding right now (derived from live bids) */}
      {stats.lenders.length ? (
        <View>
          <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#6B7280]">Bidding now</Text>
          {stats.lenders.map((info) => (
            <View key={info.id} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-4 py-3 mb-2 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1">
                <Text className="text-sm font-bold text-[#F9FAFB]" numberOfLines={1}>{info.name}</Text>
                <View className="flex-row gap-1">{info.sources.map((src) => <SourceBadge key={src} source={src} />)}</View>
              </View>
              <View className="flex-row items-center gap-4">
                <Text className="text-[10px] text-[#6B7280]">Bids <Text className="text-[#F9FAFB] font-mono">{info.bids}</Text></Text>
                <Text className="text-[10px] text-[#6B7280]">Fees <Text style={{ color: AMBER }} className="font-mono">${(info.feePaid / 100).toLocaleString()}</Text></Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ── Revenue ── */
function RevenueTab({
  stats,
  revenue,
  tierTable,
}: {
  stats: ReturnType<typeof computeCustodianStats>;
  revenue: { label: string; count: number; revenue: number }[];
  tierTable: TierRow[];
}) {
  return (
    <View className="gap-4">
      <View className="rounded-xl p-4" style={{ borderWidth: 1, borderColor: "#D4AF3733", backgroundColor: "#D4AF370A" }}>
        <Text className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-3">Revenue Overview</Text>
        <View className="flex-row gap-6">
          <View className="flex-1">
            <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider">Total Bid Fees</Text>
            <Text style={{ color: AMBER }} className="text-xl font-mono font-bold">{dollarsFromCents(stats.totalFeeRevenue)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider">Subsidy-Eligible</Text>
            <Text className="text-[#22C55E] text-xl font-mono font-bold">{stats.subsidyEligible}/{stats.totalPits}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider">Avg/Pit</Text>
            <Text className="text-[#9CA3AF] text-xl font-mono font-bold">${stats.totalPits > 0 ? Math.round(stats.totalFeeRevenue / stats.totalPits / 100) : 0}</Text>
          </View>
        </View>
      </View>

      {revenue.length === 0 ? (
        <Text className="text-[#6B7280] text-sm text-center mt-2">No revenue yet.</Text>
      ) : (
        <View className="gap-1.5">
          {revenue.map((r) => {
            const color = tierTable.find((t) => t.label === r.label)?.color ?? "#6B7280";
            return (
              <View key={r.label} className="bg-[#0A0A0A] rounded-lg px-4 py-2.5 flex-row items-center justify-between" style={{ borderWidth: 1, borderColor: `${color}25` }}>
                <View className="flex-row items-center gap-3">
                  <TierBadge label={r.label} color={color} />
                  <Text className="text-xs text-[#6B7280]">{r.count} bids</Text>
                </View>
                <Text style={{ color: AMBER }} className="font-mono font-bold text-sm">${(r.revenue / 100).toLocaleString()}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
