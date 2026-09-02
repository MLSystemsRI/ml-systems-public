import { View, Text, Image } from "react-native";
import type { ReactNode } from "react";
import { EmberMark, BridgeMark, TrussLine, BridgeSpan } from "@/components/mind-icons";
import { isBridge, BRIDGE } from "@/lib/pit-bridge";

const FIRE_ORB = require("../../assets/avatars/scenes/pit-lord/fire-orb.png");
const FIRE_LINE = require("../../assets/avatars/scenes/pit-lord/fire-line.png");

/**
 * FlameCard — PIT LORD's signature card: an ember watermark behind, a line of fire
 * across the top edge, and a fire orb bursting up through the center. The `mt-6`
 * leaves room for the orb to sit above the card (it deliberately overflows up).
 * Children paint above the overlays.
 *
 * A BRIDGE (decon) loan gets the steel-span counterpart instead of fire: a slate
 * truss line + a suspension-bridge orb, so a decon loan reads as a connection, not fire.
 */
export function FlameCard({ children, style, loanType }: { children: ReactNode; style?: object; loanType?: string }) {
  const bridge = isBridge(loanType);
  return (
    <View
      className="bg-[#111111] border rounded-2xl p-4 mb-3 mt-6"
      style={[{ borderColor: bridge ? `${BRIDGE.color}55` : "#262626" }, style]}
    >
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        {bridge ? <BridgeMark opacity={0.07} /> : <EmberMark opacity={0.06} />}
      </View>
      <View pointerEvents="none" style={{ position: "absolute", top: -15, left: 0, right: 0 }}>
        {bridge ? <TrussLine height={24} /> : <Image source={FIRE_LINE} resizeMode="cover" style={{ width: "100%", height: 24 }} />}
      </View>
      <View pointerEvents="none" style={{ position: "absolute", top: -42, left: 0, right: 0, alignItems: "center" }}>
        {bridge ? <BridgeSpan size={44} /> : <Image source={FIRE_ORB} resizeMode="contain" style={{ width: 44, height: 78 }} />}
      </View>
      {children}
    </View>
  );
}

/** A stat card with an arbitrary value color (the custodian/officer stat grids).
 *  No `width` → flex-1 (equal row); `width` (number or "31.5%") → fixed for grids. */
export function PitStat({ label, value, color, width }: { label: string; value: ReactNode; color: string; width?: number | string }) {
  return (
    <View
      className={`bg-[#111111] border border-[#262626] rounded-xl p-3 ${width == null ? "flex-1" : ""}`}
      style={width != null ? { width: width as never } : undefined}
    >
      <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider mb-1">{label}</Text>
      <Text style={{ color }} className="text-lg font-extrabold">{value}</Text>
    </View>
  );
}

/** Tier label pill (outlined in the tier color). */
export function TierBadge({ label, color }: { label: string; color: string }) {
  return (
    <View className="rounded-full px-2 py-0.5" style={{ borderWidth: 1, borderColor: `${color}80` }}>
      <Text style={{ color }} className="text-[9px] font-bold uppercase tracking-widest">{label}</Text>
    </View>
  );
}

const SOURCE_COLOR: Record<string, string> = { api: "#60A5FA", white_label: "#A78BFA", manual: "#6B7280" };

/** Bid-source badge (api = blue, white_label = purple, manual = gray). */
export function SourceBadge({ source }: { source: string }) {
  const c = SOURCE_COLOR[source] ?? "#6B7280";
  return (
    <View className="rounded px-1.5 py-0.5" style={{ borderWidth: 1, borderColor: `${c}40` }}>
      <Text style={{ color: c }} className="text-[8px] font-bold uppercase tracking-wider">{source}</Text>
    </View>
  );
}

export const sourceColor = (source: string) => SOURCE_COLOR[source] ?? "#6B7280";
