import { useRef } from "react";
import { View, Image } from "react-native";
import Svg, { Path, Circle, Defs, RadialGradient, LinearGradient, Stop, G } from "react-native-svg";

/**
 * Per-mind glyph icons — small, crisp, themeable SVGs a mind uses to personalize
 * its own compartment (e.g. REAPER's scythe in place of the ☰ hamburger). Sized
 * + colored via props so any screen can drop one in. Clickable behavior is up to
 * the caller (wrap in the existing TouchableOpacity).
 */

// REAPER — a scythe mid-SLICE (dynamic, "in full effect"): snath swung from
// lower-right up to center, crescent blade cutting down-left, with motion arcs.
export function ScytheIcon({ size = 22, color = "#F97316" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* motion / slash arcs — the active cut */}
      <Path d="M2.5 15.5 Q 9 20.5 16.5 16.5" stroke={color} strokeWidth={1.3} strokeLinecap="round" opacity={0.32} />
      <Path d="M4.5 18 Q 10 21 15 18.6" stroke={color} strokeWidth={1} strokeLinecap="round" opacity={0.18} />
      {/* snath (handle) — dynamic diagonal */}
      <Path d="M18 20.5 L10.5 7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* grip wraps */}
      <Path d="M15.2 15.2 l2 1.1 M13.4 12 l2 1.1" stroke={color} strokeWidth={1.15} strokeLinecap="round" opacity={0.85} />
      {/* blade — crescent slicing down-left, double edge for detail */}
      <Path d="M10.5 7 C 5 2.5 1.8 6 2 11.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10.5 7 C 6.5 4.7 4.3 6.6 4.2 10" stroke={color} strokeWidth={1.15} strokeLinecap="round" opacity={0.5} />
      {/* sharp tip */}
      <Path d="M2 11.5 l-0.6 1.6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

// CDA — a drafting compass (Design Studio)
export function CompassIcon({ size = 22, color = "#60A5FA" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={4.5} r={1.7} stroke={color} strokeWidth={1.6} />
      <Path d="M11.2 5.9 L6 20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12.8 5.9 L18 20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M9.4 12 H14.6" stroke={color} strokeWidth={1.3} strokeLinecap="round" opacity={0.55} />
      <Path d="M6 20 l-0.8 2 l2 -0.9 Z" fill={color} />
      <Path d="M18 20 l0.8 2 l-2 -0.9 Z" fill={color} />
    </Svg>
  );
}

// PIT LORD — a bid-orb descending into the tiered Loan Pit
export function PitIcon({ size = 22, color = "#EF4444" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={5} r={2.3} fill={color} />
      <Path d="M3 9 Q 12 13.5 21 9" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M5 13 Q 12 16.8 19 13" stroke={color} strokeWidth={1.6} strokeLinecap="round" opacity={0.65} />
      <Path d="M7.5 17 Q 12 19.8 16.5 17" stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={0.4} />
    </Svg>
  );
}

// PI — the Lucent Lens: a glowing orb (his lens-eye) with a bright inner core, roots
// grounding down + out below it (his warm, rooted, "glow within" identity in miniature).
export function LucentIcon({ size = 22, color = "#22C55E" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* the lucent orb + its glow-within core */}
      <Circle cx={12} cy={6.4} r={3.3} stroke={color} strokeWidth={1.6} />
      <Circle cx={12} cy={6.4} r={1.15} fill={color} />
      {/* roots grounding down — a taproot, two mains, two finer (fading like the pit tiers) */}
      <Path d="M12 9.7 L12 21" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M12 13 Q 8 15.6 6.4 21" stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
      <Path d="M12 13 Q 16 15.6 17.6 21" stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
      <Path d="M12 16.6 Q 9.9 18.2 9.3 21" stroke={color} strokeWidth={1.1} strokeLinecap="round" opacity={0.42} />
      <Path d="M12 16.6 Q 14.1 18.2 14.7 21" stroke={color} strokeWidth={1.1} strokeLinecap="round" opacity={0.42} />
    </Svg>
  );
}

// PIT LORD's Ember — a glowing bid-orb with a little dragon tail trailing off it.
// A faint watermark for the pit cards (hints at his orb-dragon). 🐲
let _emberSeq = 0;
export function EmberMark({
  width = 132,
  color = "#EF4444",
  bright = "#FCA5A5",
  opacity = 0.12,
}: {
  width?: number;
  color?: string;
  bright?: string;
  opacity?: number;
}) {
  const gid = useRef(`emberOrb${_emberSeq++}`).current;
  const h = width * 0.66;
  return (
    <Svg width={width} height={h} viewBox="0 0 132 88" fill="none">
      <Defs>
        <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={bright} stopOpacity={0.95} />
          <Stop offset="0.55" stopColor={color} stopOpacity={0.6} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <G opacity={opacity}>
        {/* dragon tail trailing off the orb, curling to the lower-right */}
        <Path d="M 60 45 C 88 38, 108 47, 106 65 C 105 75, 95 78, 91 70" stroke={color} strokeWidth={5} strokeLinecap="round" fill="none" />
        {/* dorsal spikes */}
        <Path d="M 74 40 l 3 -7 l 3 6 Z" fill={color} />
        <Path d="M 90 42 l 3 -7 l 3 6 Z" fill={color} />
        <Path d="M 103 53 l 5 -4 l 1 6 Z" fill={color} />
        {/* forked spade tail tip */}
        <Path d="M 91 70 l -7 6 l 3 -8 l 6 3 Z" fill={color} />
        {/* the glowing bid-orb, center */}
        <Circle cx={46} cy={45} r={18} fill={`url(#${gid})`} />
        <Circle cx={46} cy={45} r={9} fill={bright} opacity={0.5} />
      </G>
    </Svg>
  );
}

// A big red glowing bid-orb bursting through PIT LORD's pit-card top line:
// layered fire licks rising above, fire lines dripping down into the card.
let _fireSeq = 0;
export function FireOrb({ size = 42 }: { size?: number }) {
  const id = useRef(`fire${_fireSeq++}`).current;
  return (
    <Svg width={size} height={size * (100 / 60)} viewBox="0 0 60 100" fill="none">
      <Defs>
        <RadialGradient id={`${id}o`} cx="50%" cy="45%" r="55%">
          <Stop offset="0" stopColor="#FFF6EE" />
          <Stop offset="0.45" stopColor="#EF4444" />
          <Stop offset="1" stopColor="#7F1D1D" />
        </RadialGradient>
        <RadialGradient id={`${id}g`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#EF4444" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#EF4444" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}fo`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#F97316" />
          <Stop offset="0.55" stopColor="#EF4444" />
          <Stop offset="1" stopColor="#B91C1C" />
        </LinearGradient>
        <LinearGradient id={`${id}fi`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.5" stopColor="#FDBA74" />
          <Stop offset="1" stopColor="#F97316" />
        </LinearGradient>
        <LinearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F97316" stopOpacity={0.85} />
          <Stop offset="1" stopColor="#EF4444" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* glow halo */}
      <Circle cx={30} cy={52} r={28} fill={`url(#${id}g)`} />

      {/* fire lines dripping down into the card (fade out) */}
      <Path d="M30 56 C 27 68, 32 80, 29 96" stroke={`url(#${id}s)`} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d="M22 58 C 20 70, 23 80, 21 92" stroke={`url(#${id}s)`} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M38 58 C 40 70, 37 80, 39 92" stroke={`url(#${id}s)`} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M15 60 C 14 68, 16 76, 14 84" stroke={`url(#${id}s)`} strokeWidth={1.5} strokeLinecap="round" fill="none" opacity={0.8} />
      <Path d="M45 60 C 46 68, 44 76, 46 84" stroke={`url(#${id}s)`} strokeWidth={1.5} strokeLinecap="round" fill="none" opacity={0.8} />

      {/* outer flames rising */}
      <Path d="M30 52 C 18 40, 24 20, 30 5 C 36 20, 42 40, 30 52 Z" fill={`url(#${id}fo)`} />
      <Path d="M19 51 C 13 43, 15 30, 21 22 C 22 32, 25 44, 19 51 Z" fill={`url(#${id}fo)`} opacity={0.9} />
      <Path d="M41 51 C 47 43, 45 30, 39 22 C 38 32, 35 44, 41 51 Z" fill={`url(#${id}fo)`} opacity={0.9} />

      {/* inner bright core flames */}
      <Path d="M30 50 C 24 42, 27 28, 30 16 C 33 28, 36 42, 30 50 Z" fill={`url(#${id}fi)`} />
      <Path d="M24 50 C 21 44, 22 36, 26 30 C 26 38, 28 45, 24 50 Z" fill={`url(#${id}fi)`} opacity={0.8} />

      {/* embers */}
      <Circle cx={26} cy={14} r={1.3} fill="#FDBA74" opacity={0.9} />
      <Circle cx={35} cy={10} r={1} fill="#FCA5A5" opacity={0.8} />
      <Circle cx={31} cy={22} r={1.1} fill="#FEF3C7" opacity={0.9} />

      {/* the big orb */}
      <Circle cx={30} cy={52} r={13} fill={`url(#${id}o)`} />
      <Circle cx={30} cy={50} r={5.5} fill="#FFF6EE" opacity={0.75} />
    </Svg>
  );
}

// A single small flame — the building block of the fiery top border line.
export function FlameLick({ h = 12 }: { h?: number }) {
  const id = useRef(`flk${_fireSeq++}`).current;
  return (
    <Svg width={h * 0.55} height={h} viewBox="0 0 12 22" fill="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="0.5" stopColor="#F97316" />
          <Stop offset="1" stopColor="#EF4444" />
        </LinearGradient>
      </Defs>
      <Path d="M6 22 C 1 15, 3 8, 6 1 C 9 8, 11 15, 6 22 Z" fill={`url(#${id})`} />
    </Svg>
  );
}

// The card's top border rendered "on fire" — a molten glow base line with a row
// of flame licks (fire strings) of varied height licking up. Full-width, tiles.
export function FireLine({ height = 15 }: { height?: number }) {
  const hs = [0.5, 0.85, 0.6, 1, 0.7, 0.95, 0.55, 1, 0.75, 0.6, 0.9, 0.65, 0.85, 0.5, 0.8, 0.6];
  return (
    <View style={{ height, width: "100%", justifyContent: "flex-end" }}>
      {/* molten glow base line */}
      <View
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 2.5, borderRadius: 2,
          backgroundColor: "#F97316", shadowColor: "#EF4444", shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 4,
        }}
      />
      {/* flame strings along the line */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height }}>
        {hs.map((f, i) => (
          <FlameLick key={i} h={4 + f * (height - 3)} />
        ))}
      </View>
    </View>
  );
}

// ── Bridge (decon) loan glyphs — the steel-span counterpart to the fire orb/line.
// A bridge loan reads as a cool slate span (a connection), not flames. Slate palette
// mirrors lib/pit-bridge.ts (#94A3B8 steel · #CBD5E1 bright · #64748B glow).
let _bridgeSeq = 0;

// The orb replacement: a small suspension-bridge span with a glowing central node.
export function BridgeSpan({ size = 42 }: { size?: number }) {
  const id = useRef(`bridge${_bridgeSeq++}`).current;
  const C = "#94A3B8", B = "#CBD5E1", G = "#64748B";
  return (
    <Svg width={size} height={size * (100 / 60)} viewBox="0 0 60 100" fill="none">
      <Defs>
        <RadialGradient id={`${id}g`} cx="50%" cy="52%" r="52%">
          <Stop offset="0" stopColor={G} stopOpacity={0.5} />
          <Stop offset="1" stopColor={G} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* glow halo */}
      <Circle cx={30} cy={54} r={26} fill={`url(#${id}g)`} />
      {/* deck */}
      <Path d="M6 60 H54" stroke={C} strokeWidth={2.6} strokeLinecap="round" />
      {/* towers */}
      <Path d="M18 60 V30" stroke={B} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M42 60 V30" stroke={B} strokeWidth={2.4} strokeLinecap="round" />
      {/* main suspension cable — anchors up over the towers, sagging at center */}
      <Path d="M6 58 C 12 34, 15 30, 18 30 C 24 30, 26 44, 30 44 C 34 44, 36 30, 42 30 C 45 30, 48 34, 54 58" stroke={C} strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* suspenders */}
      <Path d="M12 46 V60 M24 44 V60 M30 44 V60 M36 44 V60 M48 46 V60" stroke={G} strokeWidth={1} opacity={0.7} />
      {/* reflection lines dripping into the card (fade) */}
      <Path d="M30 62 V78 M20 62 V72 M40 62 V72" stroke={G} strokeWidth={1.2} opacity={0.35} strokeLinecap="round" />
      {/* central node — the steel "orb" */}
      <Circle cx={30} cy={44} r={4.5} fill={B} />
      <Circle cx={30} cy={44} r={2} fill="#F8FAFC" opacity={0.85} />
    </Svg>
  );
}

// A single truss chevron — the building block of the steel top-border line.
function TrussTick({ h = 12 }: { h?: number }) {
  return (
    <Svg width={h * 0.6} height={h} viewBox="0 0 12 20" fill="none">
      <Path d="M1 19 L6 3 L11 19" stroke="#94A3B8" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// The card's top border as a steel truss: a slate girder base line with a row of
// truss chevrons of varied height. Full-width, tiles. (The FireLine counterpart.)
export function TrussLine({ height = 15 }: { height?: number }) {
  const hs = [0.6, 0.9, 0.7, 1, 0.65, 0.85, 0.6, 1, 0.7, 0.9, 0.6, 0.8, 0.7, 0.95, 0.6, 0.85];
  return (
    <View style={{ height, width: "100%", justifyContent: "flex-end" }}>
      {/* steel girder base line */}
      <View
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 2, borderRadius: 2,
          backgroundColor: "#94A3B8", shadowColor: "#64748B", shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 3,
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height }}>
        {hs.map((f, i) => (
          <TrussTick key={i} h={4 + f * (height - 3)} />
        ))}
      </View>
    </View>
  );
}

// A faint slate bridge watermark for bridge-loan cards (the EmberMark counterpart).
export function BridgeMark({ width = 132, opacity = 0.06 }: { width?: number; opacity?: number }) {
  const C = "#94A3B8";
  const h = width * 0.66;
  return (
    <Svg width={width} height={h} viewBox="0 0 132 88" fill="none">
      <G opacity={opacity}>
        {/* deck */}
        <Path d="M14 60 H118" stroke={C} strokeWidth={4} strokeLinecap="round" />
        {/* towers */}
        <Path d="M46 60 V26 M86 60 V26" stroke={C} strokeWidth={4} strokeLinecap="round" />
        {/* suspension cable */}
        <Path d="M14 58 C 30 26, 40 26, 46 26 C 60 26, 60 48, 66 48 C 72 48, 72 26, 86 26 C 92 26, 102 26, 118 58" stroke={C} strokeWidth={3} fill="none" strokeLinecap="round" />
        {/* suspenders */}
        <Path d="M30 42 V60 M58 48 V60 M66 48 V60 M74 48 V60 M102 42 V60" stroke={C} strokeWidth={2} />
      </G>
    </Svg>
  );
}

// VERA — her truth-seeking owl (verification · the 10/10 gate). Two wide eyes + ear tufts.
export function OwlIcon({ size = 22, color = "#34D399" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* ear tufts */}
      <Path d="M7 6.5 L8.4 3.6 L10 6" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 6.5 L15.6 3.6 L14 6" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      {/* head + body */}
      <Path d="M5 10 C 5 5.5, 19 5.5, 19 10 C 19 16.5, 14.5 20.5, 12 20.5 C 9.5 20.5, 5 16.5, 5 10 Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      {/* two big eyes with bright cores */}
      <Circle cx={9.2} cy={10.5} r={2.1} stroke={color} strokeWidth={1.3} />
      <Circle cx={14.8} cy={10.5} r={2.1} stroke={color} strokeWidth={1.3} />
      <Circle cx={9.2} cy={10.5} r={0.85} fill={color} />
      <Circle cx={14.8} cy={10.5} r={0.85} fill={color} />
      {/* beak */}
      <Path d="M12 12.2 L11 13.8 L13 13.8 Z" fill={color} />
    </Svg>
  );
}

// MURPHY — a carpenter's hammer striking a milestone QA checkmark (construction · build-ops).
export function HammerIcon({ size = 22, color = "#84CC16" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* hammer head (thick bar) + handle */}
      <Path d="M4.5 8.5 L11.5 5" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
      <Path d="M8 6.75 L16.5 18" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      {/* milestone QA check at the strike */}
      <Path d="M14.5 17.5 l1.9 1.6 l2.6 -3.6" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
    </Svg>
  );
}

// One place to fetch a mind's signature glyph by slug (hub card, drawer, headers).
export function MindGlyph({ slug, size = 22, color = "#FFFFFF" }: { slug: string; size?: number; color?: string }) {
  if (slug === "reaper") return <ScytheIcon size={size} color={color} />;
  if (slug === "cda") return <CompassIcon size={size} color={color} />;
  if (slug === "pit-lord") return <PitIcon size={size} color={color} />;
  if (slug === "pi") return <LucentIcon size={size} color={color} />;
  if (slug === "vera")
    return <Image source={require("../assets/avatars/scenes/vera/vera-owl.png")} style={{ width: size, height: size }} resizeMode="contain" />;
  if (slug === "murphy") return <HammerIcon size={size} color={color} />;
  return null;
}

// Decon R&D — an invention: a lightbulb (detail pass — glow rays, coiled
// filament, threaded screw base).
export function InventionIcon({ size = 22, color = "#F97316" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* glow rays — the idea is "on" */}
      <Path
        d="M12 1.4 V0.2 M5.4 3.9 L4.5 3 M18.6 3.9 L19.5 3 M4 8.8 H2.7 M20 8.8 H21.3"
        stroke={color}
        strokeWidth={1.1}
        strokeLinecap="round"
        opacity={0.5}
      />
      {/* glass bulb */}
      <Path
        d="M12 3 C 7.6 3 5 6.2 5 9.2 C 5 11.6 6.6 13.2 8 14.4 L8 16 L16 16 L16 14.4 C 17.4 13.2 19 11.6 19 9.2 C 19 6.2 16.4 3 12 3 Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      {/* coiled filament */}
      <Path
        d="M9.4 13 L10.1 9.6 C 10.1 8.7 10.95 8.7 10.95 9.6 C 10.95 10.5 11.8 10.5 11.8 9.6 C 11.8 8.7 12.65 8.7 12.65 9.6 L13.4 13"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      {/* threaded screw base */}
      <Path d="M9 18 H15 M9.6 20.2 H14.4 M11 22.2 H13" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
