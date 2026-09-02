import { View, Text } from "react-native";
import { FlameCard } from "@/components/pit/pit-bits";
import { BRIDGE, BRIDGE_LABEL, isBridge } from "@/lib/pit-bridge";

/**
 * The LP (Loan Pit) card — one loan the homeowner holds, rendered as PIT LORD's
 * flame/steel card. This is the single definition reused everywhere the pit
 * "communicates": the homeowner marketplace (ClientTab), under each value-chain
 * home on the Hub, and on the Value Chain Portfolio page. Bridge/decon loans
 * carry the slate steel-bridge look; construction (RCM/conventional) burns fire.
 */

const RED = "#EF4444";

export type MyLoan = {
  loan: {
    id: string;
    loanType: string;
    principalAmount: number;
    termMonths: number;
    status: string;
    interestRate: string;
  };
  pit: { id: string; status: string; closesAt: string; bidCount: number; bestRateBps: number | null } | null;
  projectId?: string;
  address: string | null;
};

export function loanLabel(t: string) {
  return t === "bridge"
    ? BRIDGE_LABEL
    : t === "RCM"
      ? "Construction · RCM"
      : t === "conventional"
        ? "Construction · conventional"
        : t;
}

const loanPurpose = (t: string) =>
  t === "bridge" ? "to take the home apart before the rebuild." : "your first construction-cycle build.";

/** `compact` drops the purpose line — used under a value-chain home where space is tight. */
export function LoanPitCard({ m, compact }: { m: MyLoan; compact?: boolean }) {
  const steel = isBridge(m.loan.loanType);
  const accent = steel ? BRIDGE.color : RED;
  return (
    <FlameCard loanType={m.loan.loanType} style={{ borderColor: `${accent}55` }}>
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-[#F9FAFB] text-[14px] font-bold">{loanLabel(m.loan.loanType)}</Text>
        <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: `${accent}1A`, borderWidth: 1, borderColor: `${accent}40` }}>
          <Text style={{ color: steel ? BRIDGE.bright : "#FCA5A5" }} className="text-[8px] font-bold uppercase tracking-wider">{m.loan.loanType}</Text>
        </View>
      </View>
      <Text className="text-[#F9FAFB] text-[18px] font-extrabold">
        ${(m.loan.principalAmount / 100).toLocaleString("en-US")}{" "}
        <Text className="text-[#6B7280] text-[12px] font-normal">· {m.loan.termMonths} mo · {(Number(m.loan.interestRate) * 100).toFixed(1)}%</Text>
      </Text>
      {compact ? null : (
        <Text className="text-[#6B7280] text-[11px] mt-0.5">{m.address ?? "Your project"} — {loanPurpose(m.loan.loanType)}</Text>
      )}
      {m.pit ? (
        <Text className="text-[11px] mt-1.5 font-semibold" style={{ color: accent }}>
          Pit {m.pit.status} · {m.pit.bidCount} bid{m.pit.bidCount === 1 ? "" : "s"}
          {m.pit.bestRateBps != null ? ` · best ${(m.pit.bestRateBps / 100).toFixed(2)}%` : ""}
        </Text>
      ) : (
        <Text className="text-[#6B7280] text-[11px] mt-1.5">Ready to open — lenders will compete for it.</Text>
      )}
    </FlameCard>
  );
}
