import { useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import {
  HOME_REBUILD_MULTIPLIER,
  EXPANSION_ADDED_VALUE_DOLLARS,
  buildChain,
  type Home,
  type HomeStep,
} from "@ml-systems/types";
import { StatCard } from "@/components/stat-card";
import { usd } from "@/lib/example-chain";
import { useLocalHome } from "@/lib/home-store";

/**
 * ValueChain — the homeowner's equity journey across homes (rollup + home-by-home
 * chain + methodology). Extracted from the Value Chain screen so it can render both
 * on its own (equity.tsx) and beneath the orbital on the combined "Value Chain
 * Portfolio" (portfolio.tsx). Each home = acquire → rebuild → expansion; math comes
 * from the shared @ml-systems/types model, seeded by EXAMPLE_CHAIN until the backend
 * surfaces real multi-home + expansion data.
 */

const HOME_ACCENTS = ["#22C55E", "#14B8A6", "#60A5FA"];
const STEP_COLOR: Record<HomeStep["kind"], string> = {
  acquire: "#6B7280",
  rebuild: "#22C55E",
  expansion: "#14B8A6",
};

function StepRow({ step, accent, first }: { step: HomeStep; accent: string; first: boolean }) {
  const color = STEP_COLOR[step.kind];
  return (
    <View className="flex-row">
      {/* connector rail */}
      <View className="items-center mr-3" style={{ width: 16 }}>
        {!first && <View style={{ width: 2, height: 10, backgroundColor: "#262626" }} />}
        <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: color }} />
        <View className="flex-1" style={{ width: 2, backgroundColor: "#262626" }} />
      </View>
      {/* content */}
      <View className="flex-1 pb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-[#F9FAFB] text-[13px] font-bold">{step.label}</Text>
          {step.multiplier != null && (
            <Text style={{ color }} className="text-[10px] font-bold">
              {step.multiplier.toFixed(step.kind === "rebuild" ? 3 : 2)}×
            </Text>
          )}
          <Text className="text-[#4B5563] text-[10px] ml-auto font-mono">{step.monthsElapsed} mo</Text>
        </View>
        <View className="flex-row gap-4 mt-1">
          <View>
            <Text className="text-[#4B5563] text-[9px] uppercase tracking-wider">Value</Text>
            <Text className="text-[#cbd2da] text-[12px] font-mono">{usd(step.value)}</Text>
          </View>
          <View>
            <Text className="text-[#4B5563] text-[9px] uppercase tracking-wider">Equity</Text>
            <Text style={{ color: accent }} className="text-[12px] font-mono font-bold">{usd(step.equity)}</Text>
          </View>
          {step.equityDelta > 0 && (
            <View>
              <Text className="text-[#4B5563] text-[9px] uppercase tracking-wider">Gain</Text>
              <Text className="text-[#22C55E] text-[12px] font-mono">+{usd(step.equityDelta)}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function HomeCard({ home, accent }: { home: Home; accent: string }) {
  return (
    <View className="bg-[#111111] border border-[#262626] rounded-2xl p-4">
      <View className="flex-row items-center gap-2.5 mb-1">
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: accent }} />
        <Text className="text-[#F9FAFB] text-[14px] font-bold flex-1" numberOfLines={1}>
          {home.address}
        </Text>
        <View className="rounded-full border px-2 py-0.5" style={{ borderColor: `${accent}55`, backgroundColor: `${accent}14` }}>
          <Text style={{ color: accent }} className="text-[9px] font-black uppercase tracking-wider">Cycle {home.index}</Text>
        </View>
      </View>
      <Text className="text-[#4B5563] text-[11px] font-mono mb-3">
        Acquired {usd(home.acquisitionPrice)} · current equity{" "}
        <Text style={{ color: accent }}>{usd(home.current.equity)}</Text>
      </Text>
      <View>
        {home.steps.map((step, i) => (
          <StepRow key={step.label} step={step} accent={accent} first={i === 0} />
        ))}
      </View>
    </View>
  );
}

/**
 * The full Value Chain body: rollup stats, home-by-home chain, and methodology.
 *
 * REAL-ONLY (Sal 9/1): with a loaded home, the chain is built from THE homeowner's
 * home (their address + est. value → acquire → rebuild → expansion, MODELED). With
 * nothing real, the chain starts EMPTY — a CTA into "Let's build" — and NOTHING
 * else. The example journey is gone entirely; the chain never shows a number it
 * can't ground in this homeowner's record.
 */
export function ValueChain({ home }: { home?: { address?: string; acquisitionPrice?: number; expansions?: number } } = {}) {
  const local = useLocalHome();

  // A resolved home from the parent (the portfolio passes the SAME HomeInput its
  // orbital runs on — VERA's assessed value included) beats the local fallback.
  const realChain = useMemo(
    () =>
      home?.acquisitionPrice != null
        ? buildChain([home])
        : local && local.estValueDollars != null
          ? buildChain([
              {
                address: [local.address, local.city].filter(Boolean).join(" · "),
                acquisitionPrice: local.estValueDollars,
                expansions: 1,
              },
            ])
          : null,
    [home, local],
  );
  // Nothing real → the empty checkpoint, full stop. The example journey is GONE
  // (Sal 9/1: remove everywhere) — the chain shows nothing it can't ground, and the
  // only door forward is telling the collective about the real home.
  if (!realChain) {
    return (
      <View>
        <TouchableOpacity
          onPress={() => router.push("/collective-chat" as any)}
          activeOpacity={0.85}
          className="rounded-2xl px-4 py-5 border border-dashed mb-3"
          style={{ borderColor: "#22C55E44", backgroundColor: "#22C55E0A" }}
        >
          <Text className="text-[#F9FAFB] text-[14px] font-extrabold mb-1">Your value chain starts here</Text>
          <Text className="text-[#9CA3AF] text-[12px] leading-relaxed">
            Tell the collective about your home — the plans start building, the records get verified, and your
            chain grows from what's real. Nothing here is pre-filled.
          </Text>
          <Text style={{ color: "#22C55E" }} className="text-[12px] font-bold mt-2">Let's build →</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const chain = realChain;

  const r = chain.rollup;
  return (
    <View>
      {/* Learn more — opens the value-chain explainer. */}
      <TouchableOpacity
        onPress={() => router.push("/value-chain-explainer" as any)}
        activeOpacity={0.8}
        className="self-start flex-row items-center rounded-full px-3 py-1.5 mb-4"
        style={{ backgroundColor: "#7aa0ff14", borderWidth: 1, borderColor: "#7aa0ff40" }}
      >
        <Text style={{ color: "#7aa0ff" }} className="text-[11px] font-bold">What is the Value Chain? →</Text>
      </TouchableOpacity>

      {/* Rollup */}
      <View className="flex-row gap-3 mb-3">
        <StatCard label="Chain Equity" value={usd(r.totalEquity)} sub={`${r.equityMultiple.toFixed(1)}× capital deployed`} accent />
        <StatCard label="Property Value" value={usd(r.totalValue)} sub={`${r.homes} homes`} />
      </View>
      <View className="flex-row gap-3 mb-6">
        <StatCard label="Debt" value={usd(r.totalPrincipal)} sub={`+${usd(r.totalDeferredInterest)} deferred int.`} />
        <StatCard label="Materials Banked" value={usd(r.totalRecovered)} sub={`${r.homes} cycles`} />
      </View>

      {/* Homes — always the homeowner's own; the chain doesn't render otherwise. */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-3">
        Your Chain · home by home
      </Text>
      <View className="gap-3 mb-6">
        {chain.homes.map((home, i) => (
          <HomeCard key={home.index} home={home} accent={HOME_ACCENTS[i % HOME_ACCENTS.length]!} />
        ))}
      </View>

      {/* Methodology */}
      <View className="border-t border-[#262626] pt-4">
        <Text className="text-[#6B7280] text-[11px] leading-relaxed">
          Each home gets <Text className="text-[#22C55E]">one rebuild</Text> (acquire →{" "}
          {HOME_REBUILD_MULTIPLIER.toFixed(2)}×, new sound foundation), then an{" "}
          <Text className="text-[#14B8A6]">expansion</Text> that adds square footage (+${Math.round(EXPANSION_ADDED_VALUE_DOLLARS / 1000)}K, no decon).
          The next cycle is a different home. Equity = value − principal + recovered materials; financing runs
          through the Loan Pit.
        </Text>
        <Text className="text-[#374151] text-[10px] mt-3">
          MODELED projection from your home's numbers — not a forecast or an appraisal.
        </Text>
      </View>
    </View>
  );
}
