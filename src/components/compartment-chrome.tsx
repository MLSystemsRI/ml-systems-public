import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, Image, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Defs, LinearGradient, RadialGradient, Stop, Line, Circle, Ellipse, Rect } from "react-native-svg";
import { LensSkiaFX, type ParticleCfg } from "@/components/mind-fx";
import { AuroraWeaveBorder } from "@/components/aurora-weave-border";
import { AGENT_MINDS, mindForRoute, type AgentMind } from "@/lib/agents";

/**
 * CompartmentChrome — the presiding mind personalizes its own compartment app.
 * Each mind draws its OWN signature (backdrop + border) from its job — no shared
 * REAPER motifs. Tabs / information layout are never touched (absolute,
 * pointer-transparent overlays only).
 *   slash (REAPER) — scythe arc + border-weave
 *   swarm (CDA)    — blueprint grid + drafting crop-mark corners
 *   pit  (PIT LORD)— descending bid-orbs over pit tiers + tiered/molten border
 */

function useFramePulse() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] });
}

// zIndex 2 keeps the border above the content (which sits at 1), so the room is
// framed rather than framed-then-covered. Layer order: mind 0 -> content 1 -> frame 2.
function frameRect(insets: { top: number }) {
  return { position: "absolute" as const, top: insets.top + 2, left: 6, right: 6, bottom: 6, zIndex: 2 };
}

// ── Signature backdrops ────────────────────────────────────────────────────
function SlashArc({ mind }: { mind: AgentMind }) {
  const { width: W, height: H } = Dimensions.get("window");
  const c = mind.color;
  const bright = mind.lens_theme?.bright ?? c;
  const d = `M ${-30} ${H * 0.6} C ${W * 0.32} ${H * 0.4}, ${W * 0.68} ${H * 0.72}, ${W + 30} ${H * 0.46}`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`slash-${mind.slug}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={c} stopOpacity={0} />
            <Stop offset="0.5" stopColor={bright} stopOpacity={0.32} />
            <Stop offset="1" stopColor={c} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={d} stroke={`url(#slash-${mind.slug})`} strokeWidth={3} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function BlueprintGrid({ mind }: { mind: AgentMind }) {
  const { width: W, height: H } = Dimensions.get("window");
  const c = mind.color;
  const step = 46;
  const vs: number[] = [];
  for (let x = step; x < W; x += step) vs.push(x);
  const hs: number[] = [];
  for (let y = step; y < H; y += step) hs.push(y);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        {vs.map((x, i) => (
          <Line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} stroke={c} strokeWidth={0.5} opacity={0.06} />
        ))}
        {hs.map((y, i) => (
          <Line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} stroke={c} strokeWidth={0.5} opacity={0.06} />
        ))}
      </Svg>
    </View>
  );
}

function PitTiers({ mind }: { mind: AgentMind }) {
  const { width: W, height: H } = Dimensions.get("window");
  const c = mind.color;
  const tiers = [0.3, 0.46, 0.62, 0.78];
  const orbs: [number, number][] = [
    [0.2, 0.16], [0.52, 0.26], [0.76, 0.2], [0.36, 0.4], [0.66, 0.5],
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        {tiers.map((t, i) => (
          <Path key={`t${i}`} d={`M ${-20} ${H * t} Q ${W / 2} ${H * t + 42} ${W + 20} ${H * t}`} stroke={c} strokeWidth={1} opacity={0.09} fill="none" />
        ))}
        {orbs.map((o, i) => (
          <Circle key={`o${i}`} cx={o[0] * W} cy={o[1] * H} r={5} fill={c} opacity={0.1} />
        ))}
      </Svg>
    </View>
  );
}

// MIA — aurora mesh (drifting teal/cyan/emerald blobs) + blue-weave wind-streaks.
const AURORA_CYAN = "#06B6D4";
const AURORA_EMERALD = "#10B981";

function WindStreak({ id, y, W, color, dur, delay }: { id: string; y: number; W: number; color: string; dur: number; delay: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, dur, delay]);
  const sw = W * 0.55;
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-sw, W + sw] });
  const opacity = t.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.5, 0.5, 0] });
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: y, left: 0, width: sw, height: 2, opacity, transform: [{ translateX }] }}>
      <Svg width={sw} height={2}>
        <Defs>
          <LinearGradient id={`ws-${id}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset="0.5" stopColor={color} stopOpacity={0.9} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Line x1={0} y1={1} x2={sw} y2={1} stroke={`url(#ws-${id})`} strokeWidth={2} />
      </Svg>
    </Animated.View>
  );
}

function AuroraWeave({ mind }: { mind: AgentMind }) {
  const { width: W, height: H } = Dimensions.get("window");
  const c = mind.color;
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 22000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 22000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);
  const tx = drift.interpolate({ inputRange: [0, 1], outputRange: [-10, 14] });
  const ty = drift.interpolate({ inputRange: [0, 1], outputRange: [8, -10] });
  const s = mind.slug;
  const streaks = [
    { y: H * 0.24, dur: 9000, delay: 0, color: c },
    { y: H * 0.5, dur: 12000, delay: 1600, color: AURORA_CYAN },
    { y: H * 0.71, dur: 10500, delay: 3200, color: c },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* aurora mesh — three soft radial blobs drifting together */}
      <Animated.View style={{ ...StyleSheet.absoluteFillObject, transform: [{ translateX: tx }, { translateY: ty }] }}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={`ab-${s}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c} stopOpacity={0.16} />
              <Stop offset="1" stopColor={c} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`ac-${s}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={AURORA_CYAN} stopOpacity={0.13} />
              <Stop offset="1" stopColor={AURORA_CYAN} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`ae-${s}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={AURORA_EMERALD} stopOpacity={0.11} />
              <Stop offset="1" stopColor={AURORA_EMERALD} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={W * 0.22} cy={H * 0.38} rx={W * 0.55} ry={H * 0.34} fill={`url(#ab-${s})`} />
          <Ellipse cx={W * 0.82} cy={H * 0.22} rx={W * 0.5} ry={H * 0.3} fill={`url(#ac-${s})`} />
          <Ellipse cx={W * 0.5} cy={H * 0.82} rx={W * 0.55} ry={H * 0.3} fill={`url(#ae-${s})`} />
        </Svg>
      </Animated.View>
      {/* blue-weave wind-streaks */}
      {streaks.map((st, i) => (
        <WindStreak key={i} id={`${s}-${i}`} y={st.y} W={W} color={st.color} dur={st.dur} delay={st.delay} />
      ))}
    </View>
  );
}

// PI — a grounded, warm lucent field: a soft "glow-within" bloom high-center, a warm
// soil glow along the bottom, and green root-veins climbing up from the ground (drifting).
function LucentField({ mind }: { mind: AgentMind }) {
  const { width: W, height: H } = Dimensions.get("window");
  const c = mind.color;
  const bright = mind.lens_theme?.bright ?? c;
  const deep = mind.lens_theme?.deep ?? c;
  const s = mind.slug;
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 20000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 20000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);
  const ty = drift.interpolate({ inputRange: [0, 1], outputRange: [6, -6] });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* glow-within bloom high-center + warm soil glow along the ground */}
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={`lb-${s}`} cx="50%" cy="34%" r="55%">
            <Stop offset="0" stopColor={bright} stopOpacity={0.1} />
            <Stop offset="0.6" stopColor={c} stopOpacity={0.05} />
            <Stop offset="1" stopColor={c} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`lg-${s}`} cx="50%" cy="100%" r="70%">
            <Stop offset="0" stopColor={deep} stopOpacity={0.16} />
            <Stop offset="1" stopColor={deep} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={W * 0.5} cy={H * 0.34} rx={W * 0.6} ry={H * 0.34} fill={`url(#lb-${s})`} />
        <Ellipse cx={W * 0.5} cy={H} rx={W * 0.85} ry={H * 0.22} fill={`url(#lg-${s})`} />
      </Svg>
      {/* a real rooted-depth render rising from the ground — subtle, slowly drifting */}
      <Animated.Image
        source={require("../assets/avatars/scenes/pi/lucent-roots.png")}
        resizeMode="cover"
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "82%", opacity: 0.18, transform: [{ translateY: ty }] }}
      />
    </View>
  );
}

function SignatureBackdrop({ mind }: { mind: AgentMind }) {
  const sig = mind.lens_theme?.signature;
  if (sig === "swarm") return <BlueprintGrid mind={mind} />;
  if (sig === "pit") return <PitTiers mind={mind} />;
  if (sig === "aurora") return <AuroraWeave mind={mind} />;
  if (sig === "slash") return <SlashArc mind={mind} />;
  if (sig === "lucent") return <LucentField mind={mind} />;
  return null;
}

/**
 * The mind itself, watching over its own compartment.
 *
 * The signature backdrops give each room its texture, but only PI's `lucent` field
 * ever drew an actual figure — so VERA and MURPHY, who have no signature at all,
 * showed nothing, and the rest were abstract pattern with nobody home. This puts
 * every mind in its own room: its sprite low in the corner, feathered into the
 * background, behind everything and untouchable.
 */
function MindPresence({ mind }: { mind: AgentMind }) {
  if (!mind.hubBackdrop) return null;
  // PI already has a full-width rooted render; a second figure would crowd him.
  if (mind.lens_theme?.signature === "lucent") return null;

  // The mind watches from the WHOLE background — its scene fills the screen behind the
  // content as a faint backdrop (most minds have wide establishing-shot art), not a
  // corner sprite. A vertical dark scrim (heavier top + bottom, softer through the
  // middle) keeps text legible over it. Sits at zIndex 0, under the screen content.
  const s = `presence-${mind.slug}`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={mind.hubBackdrop}
        resizeMode="cover"
        style={{ ...StyleSheet.absoluteFillObject, opacity: 0.16 }}
      />
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`scrim-${s}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0A0A0A" stopOpacity={0.58} />
            <Stop offset="0.42" stopColor="#0A0A0A" stopOpacity={0.22} />
            <Stop offset="0.72" stopColor="#0A0A0A" stopOpacity={0.3} />
            <Stop offset="1" stopColor="#0A0A0A" stopOpacity={0.62} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill={`url(#scrim-${s})`} />
      </Svg>
    </View>
  );
}

// ── Signature borders ──────────────────────────────────────────────────────
function WeaveFrame({ mind }: { mind: AgentMind }) {
  const insets = useSafeAreaInsets();
  const c = mind.color;
  const opacity = useFramePulse();
  return (
    <Animated.View pointerEvents="none" style={{ ...frameRect(insets), opacity }}>
      <View style={{ ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: `${c}2E`, borderRadius: 18 }} />
      <View style={{ position: "absolute", top: 0, left: 16, right: 16 }}>
        <View style={{ height: 2, backgroundColor: c, opacity: 0.9, borderRadius: 2 }} />
        <View style={{ height: 1.5, marginTop: 2, backgroundColor: c, opacity: 0.4 }} />
        <View style={{ height: 1, marginTop: 2, backgroundColor: c, opacity: 0.15 }} />
      </View>
    </Animated.View>
  );
}

// CDA — a dashed blueprint frame with crop-mark corner brackets.
function DraftingFrame({ mind }: { mind: AgentMind }) {
  const insets = useSafeAreaInsets();
  const c = mind.color;
  const bright = mind.lens_theme?.bright ?? c;
  const opacity = useFramePulse();
  const bracket = (pos: "tl" | "tr" | "bl" | "br") => {
    const L = 16;
    const m: any = {
      tl: { top: 6, left: 6, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
      tr: { top: 6, right: 6, borderTopWidth: 1.5, borderRightWidth: 1.5 },
      bl: { bottom: 6, left: 6, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
      br: { bottom: 6, right: 6, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
    };
    return <View style={{ position: "absolute", width: L, height: L, borderColor: bright, ...m[pos] }} />;
  };
  return (
    <Animated.View pointerEvents="none" style={{ ...frameRect(insets), opacity }}>
      <View style={{ ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: `${c}30`, borderStyle: "dashed", borderRadius: 4 }} />
      {bracket("tl")}
      {bracket("tr")}
      {bracket("bl")}
      {bracket("br")}
    </Animated.View>
  );
}

// PIT LORD — a molten hairline with fee-tier ticks down the sides.
function TierFrame({ mind }: { mind: AgentMind }) {
  const insets = useSafeAreaInsets();
  const c = mind.color;
  const opacity = useFramePulse();
  const ticks = [0.2, 0.34, 0.48, 0.62, 0.76]; // fee tiers
  return (
    <Animated.View pointerEvents="none" style={{ ...frameRect(insets), opacity }}>
      <View style={{ ...StyleSheet.absoluteFillObject, borderWidth: 1.2, borderColor: `${c}40`, borderRadius: 12 }} />
      {ticks.map((t, i) => (
        <React.Fragment key={i}>
          <View style={{ position: "absolute", left: 0, top: `${t * 100}%`, width: 7, height: 2, backgroundColor: c, opacity: 0.8 }} />
          <View style={{ position: "absolute", right: 0, top: `${t * 100}%`, width: 7, height: 2, backgroundColor: c, opacity: 0.8 }} />
        </React.Fragment>
      ))}
    </Animated.View>
  );
}

// MIA — a flowing woven aurora border (the reusable AuroraWeaveBorder).
function AuroraFrame({ mind }: { mind: AgentMind }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={frameRect(insets)}>
      <AuroraWeaveBorder color={mind.color} bright={mind.lens_theme?.bright} radius={20} both idKey={`app-${mind.slug}`} />
    </View>
  );
}

// PI — a warm hairline with a grounded base line + root-tendrils creeping in from the
// two bottom corners (he's rooted in the ground).
function LucentFrame({ mind }: { mind: AgentMind }) {
  const insets = useSafeAreaInsets();
  const c = mind.color;
  const bright = mind.lens_theme?.bright ?? c;
  const opacity = useFramePulse();
  const tendril = (side: "l" | "r") => {
    const pos = side === "l" ? { left: 4 } : { right: 4 };
    return (
      <View style={{ position: "absolute", bottom: 4, width: 42, height: 58, ...pos }}>
        <Svg width={42} height={58} style={side === "r" ? { transform: [{ scaleX: -1 }] } : undefined}>
          <Path d="M6 58 C 14 42, 8 26, 22 10" stroke={bright} strokeWidth={1.2} opacity={0.55} fill="none" strokeLinecap="round" />
          <Path d="M6 58 C 18 48, 26 44, 38 36" stroke={c} strokeWidth={0.9} opacity={0.3} fill="none" strokeLinecap="round" />
          <Path d="M6 58 C 2 46, 5 36, 1 26" stroke={c} strokeWidth={0.8} opacity={0.24} fill="none" strokeLinecap="round" />
        </Svg>
      </View>
    );
  };
  return (
    <Animated.View pointerEvents="none" style={{ ...frameRect(insets), opacity }}>
      <View style={{ ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: `${c}33`, borderRadius: 16 }} />
      {/* grounded base line */}
      <View style={{ position: "absolute", bottom: 0, left: 18, right: 18, height: 1.5, backgroundColor: c, opacity: 0.45, borderRadius: 2 }} />
      {tendril("l")}
      {tendril("r")}
    </Animated.View>
  );
}

function AppFrame({ mind }: { mind: AgentMind }) {
  const sig = mind.lens_theme?.signature;
  if (sig === "swarm") return <DraftingFrame mind={mind} />;
  if (sig === "pit") return <TierFrame mind={mind} />;
  if (sig === "aurora") return <AuroraFrame mind={mind} />;
  if (sig === "lucent") return <LucentFrame mind={mind} />;
  return <WeaveFrame mind={mind} />; // slash (REAPER) / default
}

// ── Pet: detailed drifting sprite (bg feel) or a small emoji buddy ─────────
function PetSpriteDrift({ mind }: { mind: AgentMind }) {
  const { width: W } = Dimensions.get("window");
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(drift, { toValue: 1, duration: 17000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-160, W + 40] });
  const translateY = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -22, 0] });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.Image
        source={mind.petSprite}
        resizeMode="contain"
        style={{ position: "absolute", top: "40%", left: 0, width: 150, height: 62, opacity: 0.16, transform: [{ translateX }, { translateY }] }}
      />
    </View>
  );
}

function PetBuddy({ mind }: { mind: AgentMind }) {
  const insets = useSafeAreaInsets();
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);
  if (!mind.pet) return null;
  const ty = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", right: 16, bottom: insets.bottom + 20, alignItems: "center", transform: [{ translateY: ty }] }}
    >
      <View
        style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: `${mind.color}22`, borderWidth: 1, borderColor: `${mind.color}66`,
          alignItems: "center", justifyContent: "center",
          shadowColor: mind.color, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6,
        }}
      >
        <Text style={{ fontSize: 23 }}>{mind.pet.emoji}</Text>
      </View>
    </Animated.View>
  );
}

function OverlapNote({ mind }: { mind: AgentMind }) {
  const insets = useSafeAreaInsets();
  const others = (mind.overlaps ?? [])
    .map((slug) => AGENT_MINDS.find((m) => m.slug === slug))
    .filter(Boolean) as AgentMind[];
  if (!others.length) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute", top: insets.top + 54, left: 16,
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: "rgba(11,15,13,0.82)", borderRadius: 999,
        borderWidth: 1, borderColor: `${mind.color}44`, paddingHorizontal: 9, paddingVertical: 4,
      }}
    >
      <Text style={{ color: mind.color, fontSize: 8.5, fontWeight: "800", letterSpacing: 0.5 }}>◇ WITH</Text>
      {others.map((o) => (
        <Text key={o.slug} style={{ fontSize: 12 }}>{o.pet?.emoji ?? o.avatarEmoji ?? "•"}</Text>
      ))}
    </View>
  );
}

function Ambient({ mind }: { mind: AgentMind }) {
  const cfg: ParticleCfg = { color: mind.color, count: 8, kind: mind.lens_theme?.particles?.kind ?? "motes" };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LensSkiaFX cfg={cfg} />
    </View>
  );
}

export function CompartmentChrome({
  mind: mindProp,
  href,
  ambient = true,
  frame = true,
  signature = true,
  showOverlap = false,
}: {
  mind?: AgentMind;
  href?: string;
  ambient?: boolean;
  frame?: boolean;
  signature?: boolean;
  showOverlap?: boolean;
}) {
  const mind = mindProp ?? (href ? mindForRoute(href) : undefined);
  if (!mind) return null;
  return (
    <>
      {/* Everything the mind paints INTO the room — its backdrop, its own figure, the
          ambient motes, its familiar — belongs behind the screen's content. Screens
          mount this chrome after their ScrollView, so paint order would put the mind
          over the UI; the content is lifted above it with zIndex 1 instead (see the
          screens' ScrollViews). NOT a negative zIndex: on Android that drops the layer
          behind the parent's own background and the mind disappears entirely. */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 0 }}
      >
        {signature ? <SignatureBackdrop mind={mind} /> : null}
        {signature ? <MindPresence mind={mind} /> : null}
        {ambient ? <Ambient mind={mind} /> : null}
        {mind.petSprite ? <PetSpriteDrift mind={mind} /> : null}
      </View>
      {frame ? <AppFrame mind={mind} /> : null}
      {showOverlap ? <OverlapNote mind={mind} /> : null}
    </>
  );
}
