import { View, Text } from "react-native";
import { trpc } from "@/lib/trpc";
import { formatEquity, formatDate } from "@/lib/format";
import { isPreview } from "@/lib/preview";
import { DEMO_BOARD } from "@/lib/demo-collective";

/** Builders Collective — CDA plan-verification board.
 *  Faithful mobile port of the web "Builders Collective" view (single-column).
 *  Shared by the Pit "Builders Collective" tab and the standalone Collective screen.
 *  Individual architect-review pills render only for custodian tier (server-gated). */

const GOLD = "#D4AF37";

const STATUS: Record<string, { label: string; color: string }> = {
  verified:  { label: "Verified",  color: "#22C55E" },
  in_review: { label: "In Review", color: GOLD },
  queue:     { label: "Queued",    color: "#6B7280" },
};

type Review = { name: string; score: number; focus: string; type: string };
type Plan = {
  id: string; city: string; state: string; planPages: number; submittedAt: string;
  status: string; tier: string; feeCents: number; planCompletion: number;
  designScore: number | null; architectAvg: number | null; engineerAvg: number | null;
  reviewsCompleted: number; reviewsRequired: number; reviews: Review[];
};
type Board = {
  tier?: string;
  stats?: { architects: number; active: number; verified: number; inReview: number; queued: number; totalReviews: number };
  economics?: { formula: string; clientFeeCents: number; architectPayoutCents: number; reviewsRequired: number; maxPerDay: number };
  queue?: Plan[];
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minWidth: 74 }} className="mb-2">
      <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider">{label}</Text>
      <Text className="text-[#F9FAFB] text-[13px] font-bold">{value}</Text>
    </View>
  );
}

export function VerificationBoard() {
  const board = trpc.collective.getBoard.useQuery(undefined, { retry: 0 });
  const live = board.data as Board | undefined;

  if (board.isLoading) {
    return <Text className="text-[#6B7280] text-sm text-center mt-8">Loading the collective…</Text>;
  }
  // Guest web build (try.mlsystemsri.com) can't reach the API cross-origin — fall
  // back to the demo board so the collective renders. Native/authenticated builds
  // keep the real error state.
  if (!live?.stats && !isPreview()) {
    return <Text className="text-[#EF4444] text-sm text-center mt-8">Couldn't reach the collective — pull to retry.</Text>;
  }
  const data = (live?.stats ? live : (DEMO_BOARD as Board));
  const stats = data.stats!;
  const econ = data.economics;
  const queue = data.queue ?? [];

  const STAT_TILES = [
    { label: "Architects", value: stats.architects },
    { label: "Active", value: stats.active },
    { label: "Verified", value: stats.verified },
    { label: "In Review", value: stats.inReview },
    { label: "Queued", value: stats.queued },
    { label: "Total Reviews", value: stats.totalReviews },
  ];

  return (
    <View>
      <Text className="text-[#6B7280] text-[12px] mb-4">CDA plan verification · {stats.architects} architects · one Design Score</Text>

      {/* Stats grid */}
      <View className="flex-row flex-wrap justify-between mb-4">
        {STAT_TILES.map((t) => (
          <View key={t.label} className="bg-[#111111] border border-[#262626] rounded-xl p-3 mb-2" style={{ width: "31.5%" }}>
            <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider mb-1">{t.label}</Text>
            <Text style={{ color: GOLD }} className="text-lg font-extrabold">{t.value}</Text>
          </View>
        ))}
      </View>

      {/* CDA explainer */}
      {econ ? (
        <View className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-5">
          <Text style={{ color: GOLD }} className="text-[10px] font-bold uppercase tracking-widest mb-1.5">CDA Plan Verification</Text>
          <Text className="text-[#cbd2da] text-[12px] leading-snug mb-2">
            Every construction plan passes through the Builders Collective. Licensed architects and structural
            engineers review your 40+ page plan stack for structural integrity, code compliance, and constructability —
            producing a Design Score visible to every lender in The Loan Pit.
          </Text>
          <Text className="text-[#6B7280] text-[10.5px] italic mb-3">{econ.formula}</Text>
          <View className="flex-row flex-wrap gap-y-2">
            <View className="w-1/2"><Text className="text-[#6B7280] text-[9px] uppercase tracking-wider">Client Fee</Text><Text className="text-[#F9FAFB] text-[13px] font-bold">{formatEquity(econ.clientFeeCents)}</Text></View>
            <View className="w-1/2"><Text className="text-[#6B7280] text-[9px] uppercase tracking-wider">Architect Payout</Text><Text className="text-[#F9FAFB] text-[13px] font-bold">{formatEquity(econ.architectPayoutCents)} <Text className="text-[#6B7280] text-[10px]">/review</Text></Text></View>
            <View className="w-1/2"><Text className="text-[#6B7280] text-[9px] uppercase tracking-wider">Reviews Required</Text><Text className="text-[#F9FAFB] text-[13px] font-bold">{econ.reviewsRequired}</Text></View>
            <View className="w-1/2"><Text className="text-[#6B7280] text-[9px] uppercase tracking-wider">Max / Day</Text><Text className="text-[#F9FAFB] text-[13px] font-bold">{econ.maxPerDay}</Text></View>
          </View>
        </View>
      ) : null}

      {/* Verification queue */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-3">Verification Queue · {queue.length} plans</Text>
      {queue.map((p) => {
        const st = STATUS[p.status] ?? STATUS.queue;
        return (
          <View key={p.id} className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-3">
            <View className="flex-row items-start justify-between mb-1">
              <View className="flex-1 pr-2">
                <Text className="text-[#F9FAFB] text-[15px] font-bold">{p.city}, {p.state}</Text>
                <Text className="text-[#6B7280] text-[10.5px]">{p.planPages} pages · Submitted {formatDate(p.submittedAt)}</Text>
              </View>
              <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: `${st.color}1A`, borderWidth: 1, borderColor: `${st.color}40` }}>
                <Text style={{ color: st.color }} className="text-[9px] font-bold uppercase tracking-wider">{st.label}</Text>
              </View>
            </View>

            <View className="flex-row flex-wrap justify-between mt-2">
              <Metric label="Design Score" value={p.designScore != null ? `${p.designScore}/100` : "—"} />
              <Metric label="Architect" value={p.architectAvg != null ? `${p.architectAvg} avg` : "—"} />
              <Metric label="Engineer" value={p.engineerAvg != null ? `${p.engineerAvg} avg` : "—"} />
              <Metric label="Reviews" value={`${p.reviewsCompleted}/${p.reviewsRequired}`} />
              <Metric label="Fee" value={formatEquity(p.feeCents)} />
            </View>

            {/* CDA progress */}
            <View className="flex-row items-center gap-2 mt-1">
              <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider">CDA</Text>
              <View className="flex-1 h-[3px] rounded-full bg-[#262626] overflow-hidden">
                <View className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, p.planCompletion))}%`, backgroundColor: st.color }} />
              </View>
              <Text className="text-[#6B7280] text-[9px] font-mono">{p.planCompletion}%</Text>
            </View>

            {/* Architect review pills — custodian tier only */}
            {p.reviews.length > 0 ? (
              <View className="mt-3 pt-3 border-t border-[#262626]">
                <Text className="text-[#6B7280] text-[8px] font-bold uppercase tracking-widest mb-1.5">Architect Reviews</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {p.reviews.map((r, i) => (
                    <View key={i} className="flex-row items-center gap-1 bg-[#0A0A0A] border border-[#262626] rounded-full pl-1 pr-2 py-0.5">
                      <View className="rounded-full items-center justify-center" style={{ width: 14, height: 14, backgroundColor: r.type === "E" ? "#8B9DC322" : "#D4DDEF22" }}>
                        <Text style={{ color: r.type === "E" ? "#8B9DC3" : "#D4DDEF", fontSize: 7, fontWeight: "800" }}>{r.type}</Text>
                      </View>
                      <Text className="text-[#cbd2da] text-[10px]">{r.name} · {r.score} · {r.focus}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
