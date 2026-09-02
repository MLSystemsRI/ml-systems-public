import { View, Text, TouchableOpacity } from "react-native";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatEquity } from "@/lib/format";
import { isPreview } from "@/lib/preview";
import { DEMO_OFFER_DATA } from "@/lib/demo-pit";
import { PitTabs } from "./pit-tabs";
import { FlameCard, PitStat, TierBadge } from "./pit-bits";
import type { TierRow } from "@/lib/pit-compute";
import { isBridge, BRIDGE } from "@/lib/pit-bridge";

const RED = "#EF4444";
const AMBER = "#F59E0B";
const PURPLE = "#8B5CF6";

type OfficerTab = "offerings" | "my-bids" | "tiers" | "rcm";
const TABS = ["offerings", "my-bids", "tiers", "rcm"] as const;
const LABELS: Record<OfficerTab, string> = {
  offerings: "Open Offerings",
  "my-bids": "My Bids",
  tiers: "Tier Guide",
  rcm: "RCM Variants",
};

type Offering = { id: string; address: string; city: string; state: string; loanType: string; cycle: number; amountCents: number; pages: number; pagesRequired: number; reviews: number; reviewsRequired: number; architectScore: number | null; verified: boolean; subsidyEligible: boolean };
type OfferData = { stats?: { openOfferings: number; activeBids: number; avgBidFeeCents: number }; offerings?: Offering[] };

/** The Loan Officer lens — 3 stat cards + 4 sub-tabs, wired to live tRPC. */
export function OfficerView() {
  const [tab, setTab] = useState<OfficerTab>("offerings");
  const [showExamples, setShowExamples] = useState(false);
  const offerings = trpc.pit.getOfferings.useQuery(undefined, { retry: 0 });
  const myBids = trpc.pit.listMyBids.useQuery(undefined, { retry: 0, enabled: tab === "my-bids" });
  const tiers = trpc.pit.getTiers.useQuery(undefined, { retry: 0, enabled: tab === "tiers" });

  const oData = offerings.data as OfferData | undefined;
  const hasLive = !!oData?.stats;
  const s = (hasLive ? oData!.stats : (DEMO_OFFER_DATA as OfferData).stats) ?? { openOfferings: 0, activeBids: 0, avgBidFeeCents: 0 };
  const liveOfferings = hasLive ? (oData!.offerings ?? []) : [];
  const demoOfferings = (DEMO_OFFER_DATA as OfferData).offerings ?? [];

  type Offering = (typeof demoOfferings)[number];
  const offeringCard = (o: Offering, dim?: boolean) => (
    <FlameCard key={o.id} loanType={o.loanType} style={dim ? { opacity: 0.55 } : undefined}>
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 pr-2">
          <Text className="text-[#F9FAFB] text-[15px] font-bold">{o.address}</Text>
          <Text className="text-[#6B7280] text-[11px]">{o.city}, {o.state} · <Text className="uppercase">{o.loanType}</Text> · Cycle {o.cycle}</Text>
        </View>
        <View className="items-end">
          <Text className="text-[#F9FAFB] text-[15px] font-extrabold">{formatEquity(o.amountCents)}</Text>
          {o.verified ? <Text className="text-[#22C55E] text-[8px] font-bold uppercase tracking-widest mt-0.5">✓ Verified</Text> : null}
        </View>
      </View>
      <View className="flex-row items-center gap-3">
        <Text className="text-[#6B7280] text-[10px] font-mono"><Text style={{ color: RED }}>{o.pages}</Text>/{o.pagesRequired} pages</Text>
        <Text className="text-[#6B7280] text-[10px] font-mono">{o.reviews}/{o.reviewsRequired} reviews</Text>
        {o.architectScore != null ? <Text className="text-[#6B7280] text-[10px] font-mono">Architect Score <Text className="text-[#F9FAFB] font-bold">{o.architectScore}</Text></Text> : null}
        {o.subsidyEligible ? <Text className="text-[#22C55E] text-[9px] font-bold uppercase">· Subsidy</Text> : null}
      </View>
    </FlameCard>
  );

  return (
    <View>
      {/* Stats */}
      <View className="flex-row gap-3 mb-5">
        <PitStat label="Open Offerings" value={s.openOfferings} color={RED} />
        <PitStat label="Your Active Bids" value={s.activeBids} color={AMBER} />
        <PitStat label="Avg Bid Fee" value={`$${(s.avgBidFeeCents / 100).toFixed(2)}`} color="#F9FAFB" />
      </View>

      <PitTabs tabs={TABS} active={tab} onChange={setTab} color={RED} labels={LABELS} accents={{ rcm: PURPLE }} />

      {tab === "offerings" ? (
        offerings.isLoading ? (
          <Text className="text-[#6B7280] text-sm text-center mt-8">Loading offerings…</Text>
        ) : (
          <>
            {liveOfferings.length === 0 ? (
              <Text className="text-[#6B7280] text-[11px] mb-2">No live offerings open right now.</Text>
            ) : null}
            {liveOfferings.map((o) => offeringCard(o))}
            {demoOfferings.length ? (
              <>
                <TouchableOpacity onPress={() => setShowExamples((v) => !v)} activeOpacity={0.7} className="flex-row items-center gap-1 mb-2 mt-3 py-1">
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">{showExamples ? "Hide" : "Show"} example offerings · illustrative</Text>
                  <Text className="text-[#6B7280] text-[10px]">{showExamples ? "▾" : "▸"}</Text>
                </TouchableOpacity>
                {showExamples ? demoOfferings.map((o) => offeringCard(o, true)) : null}
              </>
            ) : null}
          </>
        )
      ) : null}

      {tab === "my-bids" ? <MyBidsTab query={myBids} /> : null}
      {tab === "tiers" ? <TierGuideTab query={tiers} /> : null}
      {tab === "rcm" ? <RCMVariantsTab /> : null}
    </View>
  );
}

/* ── My Bids ── */
type MyBid = { id: string; status: string; pitStatus: string; interestRate: string; termMonths: number; bidFeePaid: number; loanType: string; city: string; state: string; cycleNumber: number; tierInfo: { label: string; color: string }; bidCount: number; rank: number | null; winningRate: string | null; successFeeCents: number };

function MyBidsTab({ query }: { query: { data?: unknown; isLoading: boolean; isError: boolean } }) {
  if (query.isLoading) return <Text className="text-[#6B7280] text-sm text-center mt-8">Loading your bids…</Text>;
  if (query.isError) return <Text className="text-[#6B7280] text-sm text-center mt-8">Sign in as a partner lender to see your bids.</Text>;
  const bids = (query.data as MyBid[] | undefined) ?? [];
  if (bids.length === 0) return <Text className="text-[#6B7280] text-sm text-center mt-8">You haven&apos;t cast any bids yet.</Text>;

  return (
    <View className="gap-2">
      {bids.map((b) => {
        const isWon = b.status === "awarded";
        const isActive = b.status === "active";
        const statusLabel = isWon ? "WON" : isActive ? "ACTIVE" : b.status.toUpperCase();
        const statusColor = isWon ? "#60A5FA" : isActive ? "#22C55E" : "#6B7280";
        const rankLabel = b.rank === 1 ? "1st" : b.rank === 2 ? "2nd" : b.rank === 3 ? "3rd" : b.rank ? `${b.rank}th` : null;
        return (
          <View key={b.id} className="bg-[#0A0A0A] border rounded-lg px-4 py-2.5" style={{ borderColor: isBridge(b.loanType) ? `${BRIDGE.color}40` : `${b.tierInfo.color}30`, opacity: isWon || isActive ? 1 : 0.5 }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1">
                <Text className="text-[#F9FAFB] text-[13px] font-bold">{b.city}, {b.state}</Text>
                <Text className="text-[#6B7280] text-[10px] uppercase">{b.loanType}</Text>
                <TierBadge label={b.tierInfo.label} color={b.tierInfo.color} />
              </View>
              <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: `${statusColor}1A` }}>
                <Text style={{ color: statusColor }} className="text-[9px] font-bold">{statusLabel}</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-4 mt-1.5">
              <Text className="text-[10px] text-[#6B7280]">Rate <Text className="text-[#F9FAFB] font-mono">{(Number(b.interestRate) * 100).toFixed(2)}%</Text></Text>
              <Text className="text-[10px] text-[#6B7280]">Fee <Text style={{ color: AMBER }} className="font-mono font-bold">${(b.bidFeePaid / 100).toLocaleString()}</Text></Text>
              <Text className="text-[10px] text-[#6B7280]">Term <Text className="text-[#F9FAFB]">{b.termMonths / 12}yr</Text></Text>
              {isActive && rankLabel ? <Text className="text-[10px] text-[#6B7280]">Rank <Text style={{ color: (b.rank ?? 9) <= 2 ? "#22C55E" : "#F97316" }}>{rankLabel}</Text></Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ── Tier Guide ── (port of tier-guide-tab.tsx) */
function TierGuideTab({ query }: { query: { data?: unknown; isLoading: boolean } }) {
  if (query.isLoading) return <Text className="text-[#6B7280] text-sm text-center mt-8">Loading tiers…</Text>;
  const tierTable = (query.data as TierRow[] | undefined) ?? [];

  return (
    <View className="gap-4">
      {/* Conventional / Bridge — flat */}
      <View>
        <View className="flex-row items-center gap-2 mb-2">
          <Text className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Conventional &amp; Bridge</Text>
          <View className="rounded-full px-1.5 py-0.5" style={{ borderWidth: 1, borderColor: "#22C55E4D" }}>
            <Text className="text-[#22C55E] text-[8px] font-bold uppercase tracking-wider">Low barrier</Text>
          </View>
        </View>
        <View className="rounded-lg p-3 bg-[#0A0A0A] border border-[#1A1A1A] flex-row gap-6">
          <View><Text className="text-[#6B7280] text-[10px]">Bid Fee</Text><Text className="text-[#22C55E] font-mono font-bold">$1.00</Text></View>
          <View><Text className="text-[#6B7280] text-[10px]">Success Fee</Text><Text className="text-[#F9FAFB] font-mono">0.10%</Text></View>
          <View className="flex-1"><Text className="text-[#6B7280] text-[10px]">Scaling</Text><Text className="text-[#9CA3AF] text-xs">Flat — all cycles</Text></View>
        </View>
      </View>

      {/* RCM — tiered */}
      <View>
        <View className="flex-row items-center gap-2 mb-2">
          <Text className="text-[10px] font-bold uppercase tracking-widest text-[#EF4444]">RCM Loans</Text>
          <View className="rounded-full px-1.5 py-0.5" style={{ borderWidth: 1, borderColor: "#EF44444D" }}>
            <Text className="text-[#EF4444] text-[8px] font-bold uppercase tracking-wider">Tiered</Text>
          </View>
        </View>
        <View className="gap-1.5">
          {tierTable.map((row) => (
            <View
              key={`${row.tier}-${row.cycle}`}
              className="rounded-lg px-3 py-2 bg-[#0A0A0A] flex-row items-center justify-between"
              style={{ borderWidth: 1, borderColor: row.comingSoon ? `${row.color}25` : `${row.color}30`, opacity: row.comingSoon ? 0.75 : 1 }}
            >
              <View className="flex-row items-center gap-2.5">
                <TierBadge label={row.label} color={row.color} />
                <Text className="text-[10px] text-[#6B7280]">Cycle {row.cycle}</Text>
                {row.comingSoon ? (
                  <View className="rounded-full px-1.5 py-0.5" style={{ borderWidth: 1, borderColor: `${row.color}40` }}>
                    <Text style={{ color: row.color }} className="text-[7px] font-bold uppercase tracking-widest">Soon</Text>
                  </View>
                ) : null}
              </View>
              <View className="flex-row items-center gap-5">
                <View className="items-end"><Text className="text-[9px] text-[#6B7280]">Bid Fee</Text><Text style={{ color: AMBER }} className="font-mono font-bold text-xs">${(row.fee / 100).toLocaleString()}</Text></View>
                <View className="items-end"><Text className="text-[9px] text-[#6B7280]">Success</Text><Text className="text-[#F9FAFB] font-mono text-xs">{(row.successFeeRate * 100).toFixed(2)}%</Text></View>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="rounded-lg p-3 bg-[#0A0A0A] border border-[#1A1A1A]">
        <Text className="text-[10px] text-[#4B5563] uppercase tracking-wider mb-1">Pricing Logic</Text>
        <Text className="text-xs text-[#6B7280] leading-snug">
          <Text className="text-[#22C55E] font-semibold">Conventional/Bridge:</Text> $1 flat bid fee, 0.10% success — all cycles.{" "}
          <Text className="text-[#EF4444] font-semibold">RCM:</Text> base fee $5.00, scales with cycle. Apex borrowers get a reduced 0.15% success fee.
        </Text>
      </View>
    </View>
  );
}

/* ── RCM Variants ── (condensed port of rcm-variants-tab.tsx — static) */
function RCMVariantsTab() {
  const stdTiers = [
    { name: "Entry", fico: "580–619", color: "#9CA3AF", mode: "Interest-First", alloc: "100% → Interest" },
    { name: "Standard", fico: "620–659", color: "#F97316", mode: "Split", alloc: "50% Int / 50% Prin" },
    { name: "Proven", fico: "660–699", color: "#EF4444", mode: "Principal-First", alloc: "100% → Principal" },
  ];
  const primeTiers = [
    { name: "Crucible", fico: "700–739", color: "#8B5CF6", streams: 1, day1: "$1", payoff: "2.2yr", deferred: "~$30K" },
    { name: "Meridian", fico: "740–779", color: "#C4B5FD", streams: 2, day1: "$2", payoff: "1.6yr", deferred: "~$21K" },
    { name: "Apex", fico: "780+", color: "#FBBF24", streams: 3, day1: "$3", payoff: "1.3yr", deferred: "~$17K" },
  ];

  return (
    <View className="gap-5">
      <View className="rounded-xl p-4" style={{ borderWidth: 1, borderColor: "#8B5CF64D", backgroundColor: "#8B5CF60D" }}>
        <View className="flex-row items-center gap-2 mb-2">
          <View className="rounded-full px-2.5 py-1" style={{ borderWidth: 1, borderColor: "#8B5CF680" }}>
            <Text className="text-[#8B5CF6] text-[10px] font-bold uppercase tracking-widest">ML Systems RCM</Text>
          </View>
          <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider">Reversed Conventional Mortgage</Text>
        </View>
        <Text className="text-sm text-[#9CA3AF] leading-relaxed">
          Two product classes. Six credit tiers. Every payment builds equity first — interest deferred as a separate liability. Your credit tier determines how overpayments are allocated.
        </Text>
      </View>

      {/* Standard RCM */}
      <View>
        <Text className="text-[10px] font-bold uppercase tracking-widest text-[#EF4444] mb-2">Standard RCM · Monthly Payments</Text>
        <View className="gap-2">
          {stdTiers.map((t, i) => (
            <View key={t.name} className="rounded-xl p-3 bg-[#0A0A0A]" style={{ borderWidth: 1, borderColor: `${t.color}30` }}>
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center gap-2">
                  <TierBadge label={t.name} color={t.color} />
                  <Text className="text-xs text-[#6B7280]">{t.fico} FICO</Text>
                </View>
                <Text className="text-[9px] font-mono text-[#6B7280]">TIER {i + 1}</Text>
              </View>
              <View className="flex-row gap-6">
                <View><Text className="text-[#4B5563] text-[9px] uppercase tracking-wider">Mode</Text><Text className="text-[#F9FAFB] text-xs font-semibold">{t.mode}</Text></View>
                <View><Text className="text-[#4B5563] text-[9px] uppercase tracking-wider">Excess</Text><Text className="text-[#F9FAFB] text-xs font-mono">{t.alloc}</Text></View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ML Prime */}
      <View>
        <Text className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6] mb-2">ML Prime · Daily Arithmetic (Day N = $N)</Text>
        <View className="gap-2">
          {primeTiers.map((t, i) => (
            <View key={t.name} className="rounded-xl p-3.5 bg-[#0A0A0A]" style={{ borderWidth: 1, borderColor: `${t.color}40` }}>
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <TierBadge label={t.name} color={t.color} />
                  <Text className="text-xs text-[#6B7280]">{t.fico} FICO</Text>
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${t.color}1A`, borderWidth: 1, borderColor: `${t.color}40` }}>
                    <Text style={{ color: t.color }} className="text-[8px] font-bold uppercase tracking-widest">{t.streams} Stream{t.streams > 1 ? "s" : ""}</Text>
                  </View>
                </View>
                <Text style={{ color: `${t.color}99` }} className="text-[9px] font-mono">TIER {i + 4}</Text>
              </View>
              <View className="flex-row gap-6">
                <View><Text className="text-[#4B5563] text-[9px] uppercase tracking-wider">Day 1</Text><Text style={{ color: t.color }} className="font-mono font-bold">{t.day1}</Text></View>
                <View><Text className="text-[#4B5563] text-[9px] uppercase tracking-wider">Payoff</Text><Text style={{ color: AMBER }} className="font-mono font-bold">{t.payoff}</Text></View>
                <View><Text className="text-[#4B5563] text-[9px] uppercase tracking-wider">Deferred Int</Text><Text className="text-[#9CA3AF] font-mono">{t.deferred}</Text></View>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="rounded-xl p-3" style={{ borderWidth: 1, borderColor: "#8B5CF61F", backgroundColor: "#8B5CF608" }}>
        <Text className="text-[10px] text-[#4B5563] uppercase tracking-wider mb-1">The Math</Text>
        <Text className="text-xs text-[#6B7280] leading-snug">Day N payment = streams × $1 × N. Cumulative = streams × N(N+1)/2. Paid off when cumulative = loan amount. Interest accrues monthly, fully deferred to end of loan.</Text>
      </View>
    </View>
  );
}
