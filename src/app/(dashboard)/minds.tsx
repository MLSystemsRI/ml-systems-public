import { useEffect, useRef, useState, type ReactNode } from "react";
import { View, Text, ScrollView, TouchableOpacity, Pressable, Image, Animated, StyleSheet, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Circle, Rect, Path } from "react-native-svg";
import { router } from "expo-router";
import { useDrawer } from "@/lib/drawer";
import { usePulse, TIER_PULSE } from "@/lib/pulse";
import { useHeartbeat } from "@/lib/heartbeat";
import { MLMark } from "@/components/ml-mark";
import { LensSkiaFX, type ParticleCfg } from "@/components/mind-fx";
import { AuroraWeaveBorder } from "@/components/aurora-weave-border";
import {
  MINDS_BY_TIER,
  TIER_META,
  TIER_GRANDEUR,
  firstTaskFor,
  type AgentMind,
  type Grandeur,
  type LensTheme,
} from "@/lib/agents";

/**
 * Agent Minds — each mind's card is its own canvas, "designed" through the
 * agent's lens (lens_theme tokens) and scaled by tier grandeur. The avatar
 * render expands into a full-bleed hero; copy sits in a glass panel below.
 * One parameterized component: MindCard(mind) reads only mind.color,
 * TIER_GRANDEUR[mind.tier], and mind.lens_theme. Custodian-only screen.
 */

const GOLD = "#FFE500";
const has = (lens: LensTheme | undefined, m: LensTheme["motifs"][number]) => !!lens?.motifs?.includes(m);

// ── Tier ribbon glyph (crown / chevron / dot) ──────────────────────────────
function RibbonGlyph({ kind, color }: { kind: Grandeur["ribbon"]; color: string }) {
  if (kind === "dot") return <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />;
  if (kind === "chevron")
    return (
      <Svg width={11} height={9}>
        <Path d="M2,7 L5.5,3 L9,7" stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  return (
    <Svg width={13} height={10}>
      <Path d="M1,9 L2,3 L4.5,6 L6.5,2 L8.5,6 L11,3 L12,9 Z" fill={color} />
    </Svg>
  );
}

function TierRibbon({ mind, g }: { mind: AgentMind; g: Grandeur }) {
  return (
    <View
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "#07100C",
        borderColor: `${mind.color}55`,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        opacity: 0.96,
      }}
    >
      <RibbonGlyph kind={g.ribbon} color={mind.color} />
      <Text style={{ color: mind.color, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }}>{mind.tier}</Text>
    </View>
  );
}

// ── Verification seal (dashed ring + checkmark), gently floating ───────────
function SealBadge({ mind, lens }: { mind: AgentMind; lens: LensTheme }) {
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);
  const ty = float.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: 10, right: 10, transform: [{ translateY: ty }] }}>
      <Svg width={34} height={34}>
        <Circle cx={17} cy={17} r={15} fill="#07100C" fillOpacity={0.8} stroke={mind.color} strokeWidth={1.5} strokeDasharray="3 3" />
        <Path d="M11,17.5 L15,21.5 L23,12.5" stroke={lens.bright ?? "#ECFDF5"} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

// ── Owl-eye / balance crescents (vigilance whisper) ────────────────────────
function OwlArc({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", bottom: 8, left: 12 }}>
      <Svg width={28} height={14}>
        <Path d="M2,11 Q7,2 12,11" stroke={color} strokeOpacity={0.35} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        <Path d="M15,11 Q20,2 25,11" stroke={color} strokeOpacity={0.35} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

// ── Scan-line sweep across the hero (VERA's signature motion) ──────────────
function ScanBar({ mind, lens, heroH }: { mind: AgentMind; lens: LensTheme; heroH: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const { durMs = 4200, gapMs = 2600 } = lens.motion?.scan ?? {};
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: durMs, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(gapMs),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y, durMs, gapMs, heroH]);
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [-10, heroH + 10] });
  const opacity = y.interpolate({ inputRange: [0, 0.08, 0.92, 1], outputRange: [0, 0.55, 0.55, 0] });
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 26, transform: [{ translateY }], opacity }}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill as any}>
        <Defs>
          <RadialGradient id={`scan-${mind.slug}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={mind.color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={mind.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#scan-${mind.slug})`} />
        <Rect x="0" y="12" width="100%" height="2" fill={lens.bright ?? "#ECFDF5"} opacity={0.5} />
      </Svg>
    </Animated.View>
  );
}

// ── Cinemagraph: cross-fade matched pose frames so the mind performs an action ─
// Two stacked images (idle base + action on top); the top's opacity eases in and
// out on a loop. Because the frames share framing/lighting, only what moved (the
// owl's wing, VERA's raised hand) reads as motion — the rest stays locked.
function Cinemagraph({
  frames,
  fadeMs = 2200,
  holdInMs = 900,
  holdOutMs = 1600,
}: {
  frames: number[];
  fadeMs?: number;
  holdInMs?: number;
  holdOutMs?: number;
}) {
  const t = useRef(new Animated.Value(0)).current; // 0 = idle, 1 = action
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: fadeMs, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(holdInMs),
        Animated.timing(t, { toValue: 0, duration: fadeMs, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(holdOutMs),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, fadeMs, holdInMs, holdOutMs]);
  // Explicit width/height + `contain` (not absoluteFill + cover): a contained
  // bitmap can never zoom-and-shift off-frame, so the figure always sits fully
  // visible and centered regardless of device / transform / measurement races.
  const fill = { position: "absolute" as const, width: "100%" as const, height: "100%" as const };
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
      <Image source={frames[0]} resizeMode="contain" style={fill} />
      <Animated.Image source={frames[1]} resizeMode="contain" style={[fill, { opacity: t }]} />
    </View>
  );
}

// ── Ken-Burns drift: slow scale + pan so a still scene feels alive ─────────
function KenBurns({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const tx = v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
  return <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }, { translateX: tx }, { translateY: ty }] }]}>{children}</Animated.View>;
}

// ── Living eyes: pulsing glows that blink over a baked creature ────────────
// The scene is one flat image; these ride on top of the character's eyes so
// the owl reads as awake. Rendered inside KenBurns → they track the pan/zoom.
function EyeGlow({
  eyes,
  color,
  bright,
  blinkEvery = [2800, 6300],
}: {
  eyes: NonNullable<LensTheme["eyeGlow"]>;
  color: string;
  bright: string;
  blinkEvery?: [number, number];
}) {
  const pulse = useRef(new Animated.Value(0)).current; // slow breathing glow
  const blink = useRef(new Animated.Value(1)).current; // 1 = open, 0 = lids shut
  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    glow.start();

    // Blink on a randomised cadence, with an occasional double-blink — the
    // irregularity is what sells "alive" rather than a metronome.
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const [lo, hi] = blinkEvery;
    const oneBlink = () =>
      Animated.sequence([
        Animated.timing(blink, { toValue: 0, duration: 90, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 130, useNativeDriver: true }),
      ]);
    const schedule = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        const seq = Math.random() < 0.2 ? Animated.sequence([oneBlink(), Animated.delay(120), oneBlink()]) : oneBlink();
        seq.start(({ finished }) => finished && schedule());
      }, lo + Math.random() * (hi - lo));
    };
    schedule();

    return () => {
      alive = false;
      clearTimeout(timer);
      glow.stop();
    };
  }, [pulse, blink, blinkEvery]);

  const opacity = Animated.multiply(pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }), blink);
  const scaleY = blink.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }); // lids squash the glow
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.12] });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {eyes.map((e, i) => {
        const r = e.r ?? 6;
        return (
          <Animated.View
            key={i}
            // zero-size anchor at the eye; every ring below is centered on it via
            // negative-half margins, so the whole glow sits exactly on (e.x, e.y).
            style={{
              position: "absolute",
              left: `${e.x * 100}%`,
              top: `${e.y * 100}%`,
              width: 0,
              height: 0,
              opacity,
              transform: [{ scale }, { scaleY }],
            }}
          >
            {/* wide soft halo — the radiate */}
            <View style={{ position: "absolute", width: r * 5, height: r * 5, marginLeft: -r * 2.5, marginTop: -r * 2.5, borderRadius: r * 2.5, backgroundColor: color, opacity: 0.16 }} />
            {/* mid glow */}
            <View style={{ position: "absolute", width: r * 2.8, height: r * 2.8, marginLeft: -r * 1.4, marginTop: -r * 1.4, borderRadius: r * 1.4, backgroundColor: color, opacity: 0.4 }} />
            {/* tight concentrated bright core */}
            <View style={{ position: "absolute", width: r * 1.2, height: r * 1.2, marginLeft: -r * 0.6, marginTop: -r * 0.6, borderRadius: r * 0.6, backgroundColor: bright, opacity: 1 }} />
          </Animated.View>
        );
      })}
    </View>
  );
}

// ── Visor / sensor bar: a slow pulse across the character's face slit ──────
function VisorGlow({ v, color, bright }: { v: NonNullable<LensTheme["visorGlow"]>; color: string; bright: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const w = v.w ?? 0.12;
  const h = v.h ?? 8;
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });
  const scaleX = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.05] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: `${(v.x - w / 2) * 100}%`,
        top: `${v.y * 100}%`,
        width: `${w * 100}%`,
        height: h,
        marginTop: -h / 2,
        borderRadius: h / 2,
        backgroundColor: bright,
        opacity,
        transform: [{ scaleX }],
        shadowColor: color,
        shadowOpacity: 0.9,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

// ── Familiar: the mind's pet-sprite drifting into a hero corner (its "detail") ──
function PetFamiliar({ src }: { src: number }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [2, -8] });
  const rotate = bob.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "4deg"] });
  return (
    <Animated.Image
      source={src}
      resizeMode="contain"
      style={{ position: "absolute", right: 2, bottom: 2, width: 108, height: 108, opacity: 0.95, transform: [{ translateY }, { rotate }] }}
    />
  );
}

// ── Hero: the avatar render expanded into a full-bleed, living canvas ──────
function HeroAvatar({ mind, g, lens }: { mind: AgentMind; g: Grandeur; lens?: LensTheme }) {
  const [heroH, setHeroH] = useState(0);
  const scrimId = `scrim-${mind.slug}`;
  const frames = lens?.sceneFrames;
  const isCinemagraph = !!frames && frames.length > 1;
  const heroSrc = frames?.[0] ?? lens?.scene ?? mind.avatar; // cinemagraph base, else scene, else avatar
  const heroAspect = lens?.heroAspect ?? g.heroAspect; // a mind can design its own framing
  const kenBurns = !!heroSrc && (lens?.kenBurns ?? true);
  const particleCfg: ParticleCfg = lens?.particles ?? { color: mind.color, count: 9, kind: "motes" };
  return (
    <View
      onLayout={(e) => setHeroH(e.nativeEvent.layout.height)}
      style={{ width: "100%", aspectRatio: heroAspect, overflow: "hidden", backgroundColor: "#0B0F0D" }}
    >
      {isCinemagraph ? (
        // Cinemagraph path: image + glows live in ONE plain, untransformed space
        // (no native-driver transform over the bitmap) so they stay locked
        // together and the contained figure can never zoom/shift off-frame.
        <View style={StyleSheet.absoluteFill}>
          <Cinemagraph frames={frames!} {...lens?.motion?.cinemagraph} />
          {lens?.eyeGlow ? (
            <EyeGlow eyes={lens.eyeGlow} color={mind.color} bright={lens.bright ?? "#ECFDF5"} blinkEvery={lens.motion?.blinkEveryMs} />
          ) : null}
          {lens?.visorGlow ? <VisorGlow v={lens.visorGlow} color={mind.color} bright={lens.bright ?? "#ECFDF5"} /> : null}
        </View>
      ) : (
        <KenBurns enabled={kenBurns}>
          {heroSrc ? (
            <Image source={heroSrc} resizeMode="cover" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", backgroundColor: `${mind.color}14` }]}>
              <Text style={{ fontSize: 68, color: mind.color, fontWeight: "800" }}>{mind.name.charAt(0)}</Text>
            </View>
          )}
          {/* Living glows ride inside the ken-burns transform so they stay pinned
              to the character's eyes / visor as the scene slowly drifts. */}
          {lens?.eyeGlow ? (
            <EyeGlow eyes={lens.eyeGlow} color={mind.color} bright={lens.bright ?? "#ECFDF5"} blinkEvery={lens.motion?.blinkEveryMs} />
          ) : null}
          {lens?.visorGlow ? <VisorGlow v={lens.visorGlow} color={mind.color} bright={lens.bright ?? "#ECFDF5"} /> : null}
        </KenBurns>
      )}

      <LensSkiaFX cfg={particleCfg} />

      {/* scrim: keep face clear up top, bleed the mind color, fade into the panel */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill as any}>
        <Defs>
          <LinearGradient id={scrimId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0B0F0D" stopOpacity={0} />
            <Stop offset="0.46" stopColor="#0B0F0D" stopOpacity={0} />
            <Stop offset="0.64" stopColor={mind.color} stopOpacity={g.scrimAccent} />
            <Stop offset="0.82" stopColor="#07100C" stopOpacity={0.86} />
            <Stop offset="1" stopColor="#07100C" stopOpacity={0.99} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${scrimId})`} />
      </Svg>

      <TierRibbon mind={mind} g={g} />
      {has(lens, "seal") && lens ? <SealBadge mind={mind} lens={lens} /> : null}
      {has(lens, "owlArc") ? <OwlArc color={mind.color} /> : null}
      {has(lens, "scan") && lens && heroH > 0 ? <ScanBar mind={mind} lens={lens} heroH={heroH} /> : null}
      {mind.petSprite ? <PetFamiliar src={mind.petSprite} /> : null}
    </View>
  );
}

// ── Tier-signature strip: VERA's 10-of-10 gate rail ────────────────────────
function GateRail({ mind, lens, delayMs }: { mind: AgentMind; lens: LensTheme; delayMs: number }) {
  const strip = lens.strip!;
  const emph = strip.emphasizeIndex ?? strip.count - 1;
  const opac = useRef(Array.from({ length: strip.count }, () => new Animated.Value(0))).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const fills = opac.map((v) => Animated.timing(v, { toValue: 1, duration: 200, useNativeDriver: true }));
    Animated.sequence([
      Animated.delay(delayMs),
      Animated.stagger(90, fills),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 150, useNativeDriver: true }),
    ]).start();
  }, [opac, scale, delayMs]);

  return (
    <View style={{ backgroundColor: "#07100C", alignItems: "center", paddingTop: 4, paddingBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        {Array.from({ length: strip.count }).map((_, i) => {
          const isEmph = i === emph;
          return (
            <Animated.View
              key={i}
              style={{
                width: isEmph ? 9 : 6,
                height: isEmph ? 9 : 6,
                borderRadius: 5,
                backgroundColor: isEmph ? lens.bright ?? mind.color : mind.color,
                borderWidth: isEmph ? 1.5 : 0,
                borderColor: mind.color,
                opacity: opac[i],
                transform: isEmph ? [{ scale }] : undefined,
              }}
            />
          );
        })}
      </View>
      <Text style={{ color: mind.color, fontSize: 9, fontWeight: "800", letterSpacing: 2, marginTop: 5 }}>
        {strip.label}
      </Text>
    </View>
  );
}

// ── Glass copy panel ───────────────────────────────────────────────────────
type HeartLine = { drifted: boolean; origin8: string; bpm: number };
function GlassPanel({
  mind,
  heart,
  onHeartLongPress,
}: {
  mind: AgentMind;
  heart?: HeartLine;
  onHeartLongPress?: () => void;
}) {
  return (
    <View style={{ backgroundColor: "#07100C", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
      <Text className="text-[#F9FAFB] text-[20px] font-extrabold">{mind.name}</Text>
      <View
        className="rounded-full px-2.5 py-0.5 mt-1.5 self-start"
        style={{ backgroundColor: `${mind.color}22`, borderWidth: 1, borderColor: `${mind.color}55` }}
      >
        <Text style={{ color: mind.color }} className="text-[10px] font-bold uppercase tracking-wider">
          {mind.tier} · {mind.lens}
        </Text>
      </View>
      {heart ? (
        // The autonomic line — this mind's beat, attested against its origin card.
        // (Dev builds: long-press to preview the arrhythmia alarm.)
        <Pressable {...(__DEV__ && onHeartLongPress ? { onLongPress: onHeartLongPress } : {})}>
          {heart.drifted ? (
            <Text className="text-[10px] mt-1.5" style={{ color: "#EF4444", fontWeight: "700" }}>
              ♥ arrhythmia · drifted from origin card
            </Text>
          ) : (
            <Text className="text-[10px] mt-1.5" style={{ color: mind.color, opacity: 0.85 }}>
              ♥ {heart.bpm} · grounded to origin · {heart.origin8}
            </Text>
          )}
        </Pressable>
      ) : null}
      <Text className="text-[#9CA3AF] text-[12px] mt-2">{mind.role}</Text>
      <View className="flex-row items-center gap-1.5 mt-2.5">
        <Text className="text-[#6B7280] text-[10px] uppercase tracking-widest">First task</Text>
        <Text style={{ color: mind.color }} className="text-[12px] font-bold">· {firstTaskFor(mind)}</Text>
      </View>
      <View className="flex-row gap-2 mt-3.5">
        {mind.compartment.map((c) => (
          <TouchableOpacity
            key={c.href}
            onPress={() => router.push(c.href as any)}
            activeOpacity={0.85}
            className="flex-1 rounded-xl items-center border"
            style={{ borderColor: `${mind.color}66`, backgroundColor: `${mind.color}1A`, paddingVertical: 11 }}
          >
            <Text style={{ color: mind.color }} className="text-[12px] font-bold">{c.label} →</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Card: hero + (strip) + panel, scaled by tier, wearing its lens ─────────
export function MindCard({ mind, index }: { mind: AgentMind; index: number }) {
  const g = TIER_GRANDEUR[mind.tier];
  const lens = mind.lens_theme;
  const anim = useRef(new Animated.Value(0)).current;
  // The autonomic layer: the beat is an attestation against the mind's origin
  // card (assets/heartbeat/baseline.json). Drift → arrhythmia, not obedience.
  const { grounded, origin8 } = useHeartbeat(mind);
  const [simDrift, setSimDrift] = useState(false); // __DEV__ long-press preview
  const drifted = simDrift || grounded === false;
  const bpm = TIER_PULSE[mind.tier] ?? 46;
  // The mind's pulse — its beat originates here, on the card it built (tier = tempo).
  const pulse = usePulse(bpm, { arrhythmia: drifted });
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 340, delay: index * 80, useNativeDriver: true }).start();
  }, [anim, index]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const beatScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] });

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY }, { scale: beatScale }],
        backgroundColor: "#0B0F0D",
        borderRadius: 24,
        overflow: "hidden",
        marginBottom: 16,
        borderWidth: g.border,
        borderColor: `${mind.color}66`,
        shadowColor: mind.color,
        shadowOpacity: g.glowOpacity,
        shadowRadius: g.glowRadius,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6,
      }}
    >
      {/* top edge — aurora minds get the flowing woven border (overlay below); firewall
          border-weave (VERA) or a single accent line for the rest */}
      {lens?.signature === "aurora" ? null : has(lens, "borderWeave") ? (
        <View>
          <View style={{ height: 1, backgroundColor: mind.color, opacity: 0.9 }} />
          <View style={{ height: 1, backgroundColor: mind.color, opacity: 0.4 }} />
          <View style={{ height: 1, backgroundColor: mind.color, opacity: 0.15 }} />
        </View>
      ) : (
        <View style={{ height: 3, backgroundColor: mind.color, opacity: 0.9 }} />
      )}

      <HeroAvatar mind={mind} g={g} lens={lens} />
      {g.showStrip && lens?.strip ? <GateRail mind={mind} lens={lens} delayMs={index * 80 + 380} /> : null}
      <GlassPanel
        mind={mind}
        heart={{ drifted, origin8, bpm }}
        onHeartLongPress={__DEV__ ? () => setSimDrift((s) => !s) : undefined}
      />
      {/* MIA's flowing aurora weave, over the whole card */}
      {lens?.signature === "aurora" ? (
        <AuroraWeaveBorder color={mind.color} bright={lens.bright} radius={22} both frame={false} idKey={`card-${mind.slug}`} />
      ) : null}
      {/* The heartbeat made visible — the card's edge glows on each beat.
          Red when the mind has drifted from its origin (arrhythmia). */}
      <Animated.View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          borderRadius: 24,
          borderWidth: drifted ? 2 : 1.5,
          borderColor: drifted ? "#EF4444" : mind.color,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, drifted ? 0.75 : 0.4] }),
        }}
      />
    </Animated.View>
  );
}

export default function MindsScreen() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  let cardIndex = 0;

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-1">
        <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text className="text-[#93a89b] text-2xl leading-none">☰</Text>
        </TouchableOpacity>
        <MLMark size={22} color={GOLD} />
        <Text className="text-[#F9FAFB] text-xl font-extrabold">Agent Minds</Text>
      </View>
      <Text className="text-[#6B7280] text-[12px] mb-6 ml-8">
        8 minds · 3 tiers · each designs its own card.
      </Text>

      {MINDS_BY_TIER.map(({ tier, minds }) => (
        <View key={tier} className="mb-5">
          <View className="flex-row items-center gap-2 mb-3">
            <Text style={{ color: TIER_META[tier].accent }} className="text-[11px] font-black uppercase tracking-widest">
              {tier}
            </Text>
            <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider">{TIER_META[tier].label}</Text>
            <View className="flex-1 h-px" style={{ backgroundColor: "#1F1F1F" }} />
          </View>
          {minds.map((m) => (
            <MindCard key={m.slug} mind={m} index={cardIndex++} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
