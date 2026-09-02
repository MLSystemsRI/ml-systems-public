// @ts-nocheck
/**
 * Skia 2.5D Orbital — GPU-drawn upgrade of orbital-portfolio.tsx.
 *
 * STATUS: written ahead of the native build. @shopify/react-native-skia is NOT
 * installed yet and this file is NOT imported anywhere, so Metro never bundles it
 * and the current dev client stays safe. `// @ts-nocheck` keeps `pnpm typecheck`
 * green until Skia is installed. When the coordinated native build lands (Skia +
 * EXPO_PUBLIC_ENABLE_GPU=1), wire it in via a lazy switch in orbital-portfolio.tsx:
 *
 *   const SkiaOrbital = React.lazy(() => import("./orbital-portfolio-skia"));
 *   return hasSkia
 *     ? <Suspense fallback={<View style={{height:320}}/>}><SkiaOrbital .../></Suspense>
 *     : <SvgOrbital .../>;   // the existing SVG component, kept as fallback
 *
 * Why this is smooth: rotation runs on the UI thread via Reanimated's frame
 * callback (no per-frame React re-render — that was the SVG version's jank), and
 * the loop auto-stops when the screen isn't focused. Depth/quality come from Skia
 * BlurMask glow + radial gradients drawn on the GPU.
 *
 * NOTE: Skia/Reanimated API specifics (useFrameCallback shape, Group transform as
 * a derived value) are to be verified once the package is installed; treat this as
 * the reference implementation to refine against the real types on first build.
 */

import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import {
  Canvas,
  Group,
  Circle,
  BlurMask,
  RadialGradient,
  vec,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
} from "react-native-reanimated";
import { useIsFocused } from "@react-navigation/native";
import type { EquityChain, Home } from "@ml-systems/types";
import { usd } from "@/lib/example-chain";

const HOME_ACCENTS = ["#22C55E", "#14B8A6", "#60A5FA", "#F5B13D"];
const CORE = "#22C55E";

/** A single home orb: its Group is translated around the core on the UI thread. */
function Orb({
  index,
  n,
  cx,
  cy,
  R,
  r,
  color,
  rot,
  focused,
}: {
  index: number;
  n: number;
  cx: number;
  cy: number;
  R: number;
  r: number;
  color: string;
  rot: { value: number };
  focused: boolean;
}) {
  // translate (not rotate) → the orb moves around the ring but stays upright.
  const transform = useDerivedValue(() => {
    "worklet";
    const a = ((rot.value + (index * 360) / n - 90) * Math.PI) / 180;
    return [
      { translateX: cx + R * Math.cos(a) },
      { translateY: cy + R * Math.sin(a) },
    ];
  });
  return (
    <Group transform={transform}>
      {/* soft outer glow */}
      <Circle cx={0} cy={0} r={r * 2.1} color={color} opacity={0.1}>
        <BlurMask blur={r * 0.9} style="normal" />
      </Circle>
      {/* mid glow */}
      <Circle cx={0} cy={0} r={r * 1.4} color={color} opacity={0.22}>
        <BlurMask blur={r * 0.4} style="normal" />
      </Circle>
      {/* body */}
      <Circle cx={0} cy={0} r={r} color={color} opacity={focused ? 1 : 0.85} />
      <Circle cx={0} cy={0} r={r} style="stroke" strokeWidth={focused ? 2 : 1} color={focused ? "#F9FAFB" : color} />
    </Group>
  );
}

export function OrbitalPortfolioSkia({ chain }: { chain: EquityChain; mode: "homeowner" | "custodian" }) {
  const homes = chain.homes;
  const [w, setW] = React.useState(0);
  const [focused, setFocused] = React.useState(0);
  const isFocused = useIsFocused();

  // UI-thread rotation clock — no React re-render per frame. Auto start/stop with focus.
  const rot = useSharedValue(0);
  useFrameCallback((info) => {
    "worklet";
    const dt = Math.min(info.timeSincePreviousFrame ?? 16, 50);
    rot.value = (rot.value + dt * 0.015) % 360; // ~24s / revolution
  }, isFocused);

  const geo = useMemo(() => {
    const size = w;
    return {
      size,
      cx: size / 2,
      cy: size / 2,
      R: size * 0.33,
      coreR: size * 0.1,
    };
  }, [w]);

  if (w === 0) {
    return <View style={{ height: 320 }} onLayout={(e) => setW(e.nativeEvent.layout.width)} />;
  }

  const { size, cx, cy, R, coreR } = geo;
  const N = homes.length;
  const maxEq = Math.max(...homes.map((h) => h.current.equity), 1);
  const orbR = (h: Home) => {
    const min = size * 0.05;
    const max = size * 0.088;
    return min + (max - min) * (h.current.equity / maxEq);
  };

  const focusedHome = homes[focused] ?? homes[0];
  const rebuildStep = focusedHome?.steps.find((s) => s.kind === "rebuild");
  const expandStep = focusedHome?.steps.find((s) => s.kind === "expansion");

  return (
    <View>
      <View style={{ width: "100%", height: size }}>
        <Canvas style={{ flex: 1 }}>
          {/* orbit ring */}
          <Circle cx={cx} cy={cy} r={R} style="stroke" strokeWidth={1} color="#23262b" opacity={0.7} />

          {/* core glow — radial gradient bloom */}
          <Circle cx={cx} cy={cy} r={coreR * 2.6}>
            <RadialGradient
              c={vec(cx, cy)}
              r={coreR * 2.6}
              colors={[`${CORE}55`, `${CORE}00`]}
            />
            <BlurMask blur={coreR * 0.6} style="normal" />
          </Circle>
          {/* core body */}
          <Circle cx={cx} cy={cy} r={coreR} color="#0A0A0A" />
          <Circle cx={cx} cy={cy} r={coreR} style="stroke" strokeWidth={1.5} color={CORE} />

          {/* orbs */}
          {homes.map((h, i) => (
            <Orb
              key={h.index}
              index={i}
              n={N}
              cx={cx}
              cy={cy}
              R={R}
              r={orbR(h)}
              color={HOME_ACCENTS[i % HOME_ACCENTS.length]}
              rot={rot}
              focused={i === focused}
            />
          ))}
        </Canvas>

        {/* Core equity label — crisp RN text overlay, centered on the core. */}
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: CORE, fontSize: size * 0.052, fontWeight: "800" }}>{usd(chain.rollup.totalEquity)}</Text>
          <Text style={{ color: "#6B7280", fontSize: size * 0.026 }}>CHAIN EQUITY</Text>
        </View>
      </View>

      <Text className="text-[#374151] text-[10px] text-center mt-1 mb-3">Tap a home to focus</Text>

      {/* Home chips */}
      <View className="flex-row gap-2 mb-4">
        {homes.map((h, i) => {
          const c = HOME_ACCENTS[i % HOME_ACCENTS.length]!;
          const on = i === focused;
          return (
            <Pressable
              key={h.index}
              onPress={() => setFocused(i)}
              className="flex-1 rounded-xl px-3 py-2.5 flex-row items-center gap-2"
              style={{ backgroundColor: on ? `${c}1A` : "#111111", borderWidth: 1, borderColor: on ? `${c}80` : "#262626" }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
              <Text style={{ color: on ? "#F9FAFB" : "#9CA3AF" }} className="text-[12px] font-bold">Home {h.index}</Text>
              <Text style={{ color: c }} className="text-[11px] font-mono ml-auto">{usd(h.current.equity)}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Focused home stats */}
      {focusedHome ? (
        <View className="bg-[#111111] border border-[#262626] rounded-2xl p-4">
          <Text className="text-[#F9FAFB] text-[13px] font-bold mb-0.5">{focusedHome.address}</Text>
          <Text className="text-[#6B7280] text-[11px] mb-3">Cycle {focusedHome.index} · acquired {usd(focusedHome.acquisitionPrice)}</Text>
          <View className="flex-row justify-between">
            <Stat label="Equity" value={usd(focusedHome.current.equity)} accent={HOME_ACCENTS[focused % HOME_ACCENTS.length]!} />
            <Stat label="Value" value={usd(focusedHome.current.value)} />
            <Stat label="Rebuild" value={rebuildStep ? `+${usdShort(rebuildStep.equityDelta)}` : "—"} />
            <Stat label="Expansion" value={expandStep ? `+${usdShort(expandStep.equityDelta)}` : "—"} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View>
      <Text className="text-[#4B5563] text-[9px] uppercase tracking-wider mb-0.5">{label}</Text>
      <Text style={accent ? { color: accent } : undefined} className={`text-[12px] font-mono font-bold ${accent ? "" : "text-[#cbd2da]"}`}>{value}</Text>
    </View>
  );
}

function usdShort(n: number): string {
  const a = Math.round(Math.abs(n));
  if (a >= 1_000_000) return "$" + (a / 1_000_000).toFixed(1) + "M";
  if (a >= 1_000) return "$" + Math.round(a / 1_000) + "k";
  return "$" + a;
}

export default OrbitalPortfolioSkia;
