import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, Platform } from "react-native";
import type { LensTheme } from "@/lib/agents";

/**
 * Shared FX primitives for the agent-mind cards (and, later, the compartment
 * chrome). `ParticleField` is the portable core-Animated particle layer; it is
 * also the guaranteed web / fallback renderer. `LensSkiaFX` upgrades it to a
 * GPU-composited additive-blur field on native when @shopify/react-native-skia
 * is present AND linked (dev-client rebuilt) — otherwise it renders exactly the
 * same `ParticleField`, so there is never a regression.
 */

export type ParticleCfg = NonNullable<LensTheme["particles"]>;

// ── Particle field: themed motes drifting over the scene (core Animated) ────
export function ParticleField({ cfg }: { cfg: ParticleCfg }) {
  const color = cfg.color ?? "#FFFFFF";
  const count = cfg.count ?? 10;
  const kind = cfg.kind ?? "motes";
  const parts = useRef(
    Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 2 + Math.random() * 3,
      dur: 3200 + Math.random() * 4200,
      delay: Math.random() * 3000,
      v: new Animated.Value(0),
    })),
  ).current;
  useEffect(() => {
    const loops = parts.map((p) => {
      const loop = Animated.loop(
        Animated.timing(p.v, { toValue: 1, duration: p.dur, delay: p.delay, easing: Easing.linear, useNativeDriver: true }),
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach((l) => l.stop());
  }, [parts]);
  const rise = kind === "stars" ? -6 : kind === "embers" ? -34 : -22;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            width: p.size,
            height: p.size,
            borderRadius: kind === "blueprint" ? 0 : p.size / 2,
            backgroundColor: color,
            opacity: p.v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.6, 0.6, 0] }),
            transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, rise] }) }],
          }}
        />
      ))}
    </View>
  );
}

// ── Skia availability probe (native + linked only) ─────────────────────────
// Load & feature-detect once at module init. On web we never touch Skia (its
// web path needs CanvasKit WASM). On native we require it AND probe the JSI
// binding — so on a dev-client that hasn't been rebuilt yet, `skiaLinked`
// stays false and we quietly render the Animated fallback (no native crash).
let SkiaMod: any = null;
let skiaLinked = false;
if (Platform.OS !== "web") {
  try {
    SkiaMod = require("@shopify/react-native-skia");
    try {
      SkiaMod?.Skia?.Paint?.(); // touches native JSI; throws if not linked
      skiaLinked = !!SkiaMod?.Canvas;
    } catch {
      skiaLinked = false;
    }
  } catch {
    SkiaMod = null;
    skiaLinked = false;
  }
}

// Catches any render-time Skia error and drops to the Animated fallback.
class FxBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// GPU additive-blur particle field. Reanimated-free: a rAF loop nudges a frame
// counter so the declarative Canvas re-renders with fresh positions. Small
// budget keeps it cheap.
function SkiaParticles({ cfg }: { cfg: ParticleCfg }) {
  const { Canvas, Group, Blur, Circle } = SkiaMod;
  const color = cfg.color ?? "#FFFFFF";
  const kind = cfg.kind ?? "motes";
  const count = Math.min(cfg.count ?? 14, 40);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [, tick] = React.useReducer((x: number) => (x + 1) % 1_000_000, 0);
  const tRef = useRef(0);
  const parts = useRef(
    Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: (kind === "sparks" ? 1.5 : kind === "stars" ? 1.8 : 2.6) + Math.random() * 2.6,
      sp: 0.015 + Math.random() * 0.06,
      ph: Math.random() * Math.PI * 2,
    })),
  ).current;
  useEffect(() => {
    let raf: number;
    const loop = () => {
      tRef.current += 0.016;
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const blur = kind === "sparks" ? 1.5 : kind === "embers" ? 3 : 2.4;
  const upward = kind === "stars" ? 0.4 : 1; // stars barely drift
  const { w: W, h: H } = size;
  const t = tRef.current;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== W || height !== H) setSize({ w: width, h: height });
      }}
    >
      {W > 0 && H > 0 ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Group blendMode="plus">
            <Blur blur={blur} />
            {parts.map((p, i) => {
              const yy = (((p.y - t * p.sp * upward) % 1) + 1) % 1;
              const op = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + p.ph));
              return <Circle key={i} cx={p.x * W} cy={yy * H} r={p.r} color={color} opacity={op} />;
            })}
          </Group>
        </Canvas>
      ) : null}
    </View>
  );
}

/**
 * Drop-in replacement for `ParticleField` that renders a Skia GPU field on
 * native (when linked) and the Animated field everywhere else.
 */
export function LensSkiaFX({ cfg }: { cfg: ParticleCfg }) {
  const fallback = <ParticleField cfg={cfg} />;
  if (Platform.OS === "web" || !skiaLinked) return fallback;
  return <FxBoundary fallback={fallback}><SkiaParticles cfg={cfg} /></FxBoundary>;
}
