import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Line, Circle, Text as SvgText } from "react-native-svg";
import { computeStrands, moneyShort, DEFAULT_HOME_FACTS, type HomeFacts } from "@/lib/strands";

/**
 * DualStrandHelix — the dual J-Space, rendered as a DNA double helix 🧬.
 *
 * One home's numbers, two intertwined strands (the "force multiplier for the
 * homeowner"): the SAME input draws the blueprint AND finances the loan AND schedules
 * the build. Ports `value-chain/hub-dual-perspective-strands.html` (one input → two
 * strands) fused with the native `dna-strand.tsx` helix, so the two perspectives read
 * as the two backbones of a strand:
 *   • PHYSICAL  strand — blue  #60A5FA — grossSF · levels · next-cycle geometry
 *   • FINANCIAL strand — green #22C55E — value · equity · monthly · next-cycle value
 *
 * Cycle-aware + MODELED: step the cycle and both strands recompute their looped-journey
 * projection from `@ml-systems/types` (via lib/strands). No model call, no DB.
 */

const PHYS = "#60A5FA";
const FIN = "#22C55E";

const AMP = 30; // helix half-width
const PERIOD = 130; // vertical wavelength
const SPACING = 12; // gap between glyphs down a backbone
const HEIGHT = 240;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function DualStrandHelix({
  facts,
  width = 300,
}: {
  /** Home facts (from the local home or seeded project). Falls back to the calibrated default. */
  facts?: HomeFacts;
  width?: number;
}) {
  const base = facts ?? DEFAULT_HOME_FACTS;
  const [cycle, setCycle] = useState(Math.max(1, Math.round(base.cycle ?? 1)));
  const { financial, physical } = useMemo(
    () => computeStrands({ ...base, cycle }),
    [base, cycle],
  );

  const centerX = width * 0.5;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Weave the two backbones down the axis: A = physical (blue), B = financial (green).
  const { physPts, finPts, rungs } = useMemo(() => {
    const physPts: { x: number; y: number; front: boolean }[] = [];
    const finPts: { x: number; y: number; front: boolean }[] = [];
    const rungs: { x1: number; x2: number; y: number }[] = [];
    for (let y = SPACING; y < HEIGHT; y += SPACING) {
      const sin = Math.sin((2 * Math.PI * y) / PERIOD);
      physPts.push({ x: centerX + AMP * sin, y, front: sin >= 0 });
      finPts.push({ x: centerX - AMP * sin, y, front: sin <= 0 });
    }
    for (let y = PERIOD / 4; y < HEIGHT; y += PERIOD / 2) {
      const sin = Math.sin((2 * Math.PI * y) / PERIOD);
      rungs.push({ x1: centerX + AMP * sin, x2: centerX - AMP * sin, y });
    }
    return { physPts, finPts, rungs };
  }, [centerX]);

  const glowR = pulse.interpolate({ inputRange: [0, 1], outputRange: [4, 26] });
  const glowOp = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <View>
      {/* Two-strand headline numbers, physical | financial */}
      <View className="flex-row" style={{ gap: 10 }}>
        <StrandColumn
          side="◇ PHYSICAL"
          color={PHYS}
          rows={[
            ["Gross", physical ? `${physical.grossSF.toLocaleString()} SF` : "—"],
            ["Levels", physical ? `${physical.levels}` : "—"],
            [`Cycle ${cycle + 1}`, physical ? `~${physical.nextCycleSF.toLocaleString()} SF` : "—"],
          ]}
        />
        <StrandColumn
          side="◆ FINANCIAL"
          color={FIN}
          rows={[
            ["Value", financial ? moneyShort(financial.marketValue) : "—"],
            ["Equity", financial ? moneyShort(financial.equityAtClose) : "—"],
            [`Cycle ${cycle + 1}`, financial ? `~${moneyShort(financial.nextCycleValue)}` : "—"],
          ]}
          right
        />
      </View>

      {/* The double helix */}
      <View className="items-center my-2">
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="physGrad" x1="0" y1="0" x2="0" y2={HEIGHT} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#93C5FD" />
              <Stop offset="1" stopColor={PHYS} />
            </LinearGradient>
            <LinearGradient id="finGrad" x1="0" y1="0" x2="0" y2={HEIGHT} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#86EFAC" />
              <Stop offset="1" stopColor={FIN} />
            </LinearGradient>
          </Defs>

          {/* rungs — each is a cycle/handoff tying the two strands together */}
          {rungs.map((r, i) => (
            <Line key={`rung${i}`} x1={r.x1} y1={r.y} x2={r.x2} y2={r.y} stroke="#94A3B8" strokeOpacity={0.14} strokeWidth={1} />
          ))}

          {/* physical backbone (blue) */}
          {physPts.map((p, i) => (
            <Circle key={`p${i}`} cx={p.x} cy={p.y} r={p.front ? 3.2 : 1.8} fill="url(#physGrad)" fillOpacity={p.front ? 0.95 : 0.28} />
          ))}
          {/* financial backbone (green) — a few $ glyphs for flavor */}
          {finPts.map((p, i) => (
            i % 3 === 0 ? (
              <SvgText key={`f${i}`} x={p.x} y={p.y + 4} fontSize={p.front ? 12 : 9} fontWeight="bold" fill="url(#finGrad)" fillOpacity={p.front ? 0.95 : 0.28} textAnchor="middle">$</SvgText>
            ) : (
              <Circle key={`f${i}`} cx={p.x} cy={p.y} r={p.front ? 3.2 : 1.8} fill="url(#finGrad)" fillOpacity={p.front ? 0.95 : 0.28} />
            )
          ))}

          {/* center spine glow — the single input both strands read from */}
          <AnimatedCircle cx={centerX} cy={HEIGHT / 2} r={glowR} fill="none" stroke="#FFE500" strokeWidth={1.5} opacity={glowOp} />
          <Circle cx={centerX} cy={HEIGHT / 2} r={3} fill="#FFE500" fillOpacity={0.8} />
        </Svg>
      </View>

      {/* Cycle stepper + monthly line */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Stepper label="−" onPress={() => setCycle((c) => Math.max(1, c - 1))} disabled={cycle <= 1} />
          <Text className="text-[#F9FAFB] text-[11px] font-bold">CYCLE {cycle}</Text>
          <Stepper label="+" onPress={() => setCycle((c) => Math.min(5, c + 1))} disabled={cycle >= 5} />
        </View>
        <Text className="text-[#6B7280] text-[10px]">
          Loan pit · {financial ? `${moneyShort(financial.monthlyPayment)}/mo` : "—"}
        </Text>
      </View>
    </View>
  );
}

function StrandColumn({
  side,
  color,
  rows,
  right = false,
}: {
  side: string;
  color: string;
  rows: [string, string][];
  right?: boolean;
}) {
  return (
    <View
      className="flex-1 rounded-xl px-3 py-2.5"
      style={{ backgroundColor: `${color}0F`, borderWidth: 1, borderColor: `${color}33` }}
    >
      <Text style={{ color }} className={`text-[9px] font-bold uppercase tracking-widest mb-1.5 ${right ? "text-right" : ""}`}>
        {side}
      </Text>
      {rows.map(([l, v]) => (
        <View key={l} className="flex-row justify-between items-center py-0.5">
          <Text className="text-[#6B7280] text-[10px]">{l}</Text>
          <Text style={{ color }} className="text-[11px] font-bold">{v}</Text>
        </View>
      ))}
    </View>
  );
}

function Stepper({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      className="rounded-md items-center justify-center"
      style={{ width: 24, height: 24, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", opacity: disabled ? 0.4 : 1 }}
    >
      <Text className="text-[#E5E7EB] text-[13px] font-bold">{label}</Text>
    </TouchableOpacity>
  );
}
