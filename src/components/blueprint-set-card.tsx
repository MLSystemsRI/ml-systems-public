import { View, Text, Pressable } from "react-native";

/**
 * BlueprintSetCard — the app's first value, made visible and one tap (Sal 9/1).
 *
 * The loop already runs end-to-end backend: the homeowner's existing home → the public
 * record collected → PI populates the master ledger → the design engine generates the
 * full plan set from that ledger (the stateless genome handoff to the Design Studio).
 * This card IS the deliverable's face: your blueprints, drafted from your ledger, truer
 * with every entry claimed. No new data paths — it renders state the J-Space already
 * holds and fires the handoff the chat already wired.
 */

const AURORA = "#14B8A6";
const AURORA_BRIGHT = "#2DD4BF";
const GOLD = "#F5D060";

export function BlueprintSetCard({
  claimed,
  templateTotal,
  saved,
  onOpen,
  onCustomize,
}: {
  /** Ledger fill — the claim count drives the "truer as it fills" line. */
  claimed: number;
  templateTotal: number;
  /** True once this address's plan is persisted (the set is standing). */
  saved?: boolean;
  /** Open the full plan set — the master-ledger genome handoff (openPlanSet). */
  onOpen?: (() => void) | undefined;
  /** Open the Plan Builder — the homeowner's no-CAD customizer. */
  onCustomize?: (() => void) | undefined;
}) {
  const fill = templateTotal > 0 ? claimed / templateTotal : 0;

  return (
    <View className="rounded-xl border mb-2 px-3 py-2.5" style={{ borderColor: `${AURORA}55`, backgroundColor: "rgba(20,184,166,0.06)" }}>
      <View className="flex-row items-center gap-2">
        <Text style={{ color: AURORA_BRIGHT }} className="text-[12px]">📐</Text>
        <Text style={{ color: AURORA_BRIGHT }} className="text-[9px] font-bold tracking-widest flex-1" numberOfLines={1}>
          YOUR BLUEPRINTS
        </Text>
        {saved ? (
          <Text style={{ color: GOLD, borderColor: `${GOLD}44`, backgroundColor: `${GOLD}12` }} className="text-[7.5px] font-bold rounded-full px-1.5 py-0.5 border">
            FROM YOUR LEDGER · SAVED ✓
          </Text>
        ) : null}
      </View>

      <Text className="text-[#D1D5DB] text-[10.5px] leading-4 mt-1">
        Your blueprint set drafts from your master ledger —{" "}
        <Text style={{ color: AURORA_BRIGHT }}>{claimed} of {templateTotal}</Text> entries claimed.
        The more we verify together, the truer the set.
      </Text>

      {/* The fill — how much of the ledger the set is drawn on. */}
      <View className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ backgroundColor: "#132622" }}>
        <View className="h-full rounded-full" style={{ width: `${Math.max(4, Math.round(fill * 100))}%`, backgroundColor: AURORA }} />
      </View>

      <View className="flex-row items-center gap-2 mt-2">
        {onOpen ? (
          <Pressable
            onPress={onOpen}
            className="flex-1 rounded-lg py-2 items-center border"
            style={{ borderColor: `${AURORA}66`, backgroundColor: `${AURORA}1A` }}
          >
            <Text style={{ color: AURORA_BRIGHT }} className="text-[11px] font-bold">Open your blueprint set →</Text>
          </Pressable>
        ) : null}
        {onCustomize ? (
          <Pressable onPress={onCustomize} className="rounded-lg py-2 px-3 items-center border" style={{ borderColor: "#26433d" }}>
            <Text className="text-[#9CA3AF] text-[11px] font-semibold">Customize →</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
