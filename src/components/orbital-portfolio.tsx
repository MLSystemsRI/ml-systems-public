import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, PanResponder } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import Svg, { Circle, Line, Text as SvgText, G } from "react-native-svg";
import type { EquityChain, Home } from "@ml-systems/types";
import { usd } from "@/lib/example-chain";

/**
 * Orbital Portfolio — a native, on-device "3D-ish" view of the Value Chain.
 * A glowing equity core with each home orbiting it (orb size ∝ equity). Renders
 * entirely with react-native-svg + a JS animation loop (no WebView, no Skia/GL,
 * no native rebuild). Auto-orbits, pulses, drag to spin, tap a chip to focus.
 */

const HOME_ACCENTS = ["#22C55E", "#14B8A6", "#60A5FA", "#F5B13D"];
const CORE = "#22C55E";

export function OrbitalPortfolio({ chain, mode, isReal = true }: { chain: EquityChain; mode: "homeowner" | "custodian"; isReal?: boolean }) {
  const homes = chain.homes;
  const [w, setW] = useState(0);
  const [rot, setRot] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(0);

  const rotRef = useRef(0);
  const draggingRef = useRef(false);
  const dragStart = useRef(0);
  // Pause the loop when this screen isn't focused — otherwise the tab navigator
  // keeps it mounted and it burns CPU/battery re-rendering the SVG off-screen.
  const isFocused = useIsFocused();

  // JS animation loop: advance rotation unless the user is dragging.
  useEffect(() => {
    if (!isFocused) return;
    let raf = 0;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      // Clamp dt so returning to the screen after a pause doesn't lurch forward.
      const dt = Math.min(now - last, 50);
      last = now;
      if (!draggingRef.current) {
        rotRef.current = rotRef.current + dt * 0.015; // ~24s / revolution
        setRot(rotRef.current);
      } else {
        setRot(rotRef.current); // keep pulse alive while dragging
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isFocused]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2,
      onPanResponderGrant: () => {
        draggingRef.current = true;
        setDragging(true);
        dragStart.current = rotRef.current;
      },
      onPanResponderMove: (_, g) => {
        rotRef.current = dragStart.current + g.dx * 0.6;
      },
      onPanResponderRelease: () => {
        draggingRef.current = false;
        setDragging(false);
      },
      onPanResponderTerminate: () => {
        draggingRef.current = false;
        setDragging(false);
      },
    }),
  ).current;

  if (w === 0) {
    return <View style={{ height: 320 }} onLayout={(e) => setW(e.nativeEvent.layout.width)} />;
  }

  const size = w;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.33; // orbit radius
  const coreR = size * 0.1;
  const N = homes.length;

  const t = Date.now();
  const pulse = 1 + 0.05 * Math.sin(t / 650);

  const maxEq = Math.max(...homes.map((h) => h.current.equity), 1);
  const orbR = (h: Home) => {
    const min = size * 0.05;
    const max = size * 0.088;
    return min + (max - min) * (h.current.equity / maxEq);
  };

  const orbs = homes.map((h, i) => {
    const a = ((rot + (i * 360) / N - 90) * Math.PI) / 180;
    return {
      home: h,
      i,
      x: cx + R * Math.cos(a),
      y: cy + R * Math.sin(a),
      r: orbR(h),
      color: HOME_ACCENTS[i % HOME_ACCENTS.length],
    };
  });

  const focusedHome = homes[focused] ?? homes[0];
  const rebuildStep = focusedHome?.steps.find((s) => s.kind === "rebuild");
  const expandStep = focusedHome?.steps.find((s) => s.kind === "expansion");

  return (
    <View>
      {/* Example banner — demo data is always labeled, never passed off as real
          (same badge as ValueChain). Real chains render unbadged. */}
      {!isReal ? (
        <View className="flex-row items-center gap-2 mb-2">
          <Text className="text-[#111111] text-[9px] font-black px-1.5 py-0.5 rounded" style={{ backgroundColor: "#F59E0B" }}>EXAMPLE</Text>
          <Text className="text-[#6B7280] text-[10px] flex-1">An illustrative journey — not your data. VERA's record replaces this.</Text>
        </View>
      ) : null}
      {/* Orbital canvas */}
      <View {...pan.panHandlers} style={{ width: "100%", height: size }}>
        <Svg width={size} height={size}>
          {/* orbit ring */}
          <Circle cx={cx} cy={cy} r={R} stroke="#23262b" strokeWidth={1} strokeDasharray="2 7" fill="none" />

          {/* spokes core → orb */}
          {orbs.map((o) => (
            <Line key={`sp-${o.i}`} x1={cx} y1={cy} x2={o.x} y2={o.y} stroke={`${o.color}22`} strokeWidth={1} />
          ))}

          {/* core glow + core */}
          <Circle cx={cx} cy={cy} r={coreR * 2.2 * pulse} fill={`${CORE}0e`} />
          <Circle cx={cx} cy={cy} r={coreR * 1.5 * pulse} fill={`${CORE}18`} />
          <Circle cx={cx} cy={cy} r={coreR} fill="#0A0A0A" stroke={CORE} strokeWidth={1.5} />
          <SvgText x={cx} y={cy - 2} fill={CORE} fontSize={size * 0.052} fontWeight="800" textAnchor="middle">
            {usd(chain.rollup.totalEquity)}
          </SvgText>
          <SvgText x={cx} y={cy + size * 0.05} fill="#6B7280" fontSize={size * 0.026} textAnchor="middle">
            CHAIN EQUITY
          </SvgText>

          {/* orbs (glow layers + body + number) */}
          {orbs.map((o) => {
            const hot = o.i === focused;
            return (
              <G key={`orb-${o.i}`}>
                <Circle cx={o.x} cy={o.y} r={o.r * 2.1 * pulse} fill={`${o.color}12`} />
                <Circle cx={o.x} cy={o.y} r={o.r * 1.45 * pulse} fill={`${o.color}22`} />
                <Circle cx={o.x} cy={o.y} r={o.r} fill={`${o.color}cc`} stroke={hot ? "#F9FAFB" : o.color} strokeWidth={hot ? 2 : 1} />
                <SvgText x={o.x} y={o.y + o.r * 0.35} fill="#0A0A0A" fontSize={o.r * 0.95} fontWeight="900" textAnchor="middle">
                  {o.home.index}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Hint */}
      <Text className="text-[#374151] text-[10px] text-center mt-1 mb-3">
        {dragging ? "Spinning…" : "Drag to spin · tap a home to focus"}
      </Text>

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
              style={{
                backgroundColor: on ? `${c}1A` : "#111111",
                borderWidth: 1,
                borderColor: on ? `${c}80` : "#262626",
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
              <Text style={{ color: on ? "#F9FAFB" : "#9CA3AF" }} className="text-[12px] font-bold">
                Home {h.index}
              </Text>
              <Text style={{ color: c }} className="text-[11px] font-mono ml-auto">
                {usd(h.current.equity)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Focused home stats */}
      {focusedHome ? (
        <View className="bg-[#111111] border border-[#262626] rounded-2xl p-4">
          <Text className="text-[#F9FAFB] text-[13px] font-bold mb-0.5">{focusedHome.address}</Text>
          <Text className="text-[#6B7280] text-[11px] mb-3">
            Cycle {focusedHome.index} · acquired {usd(focusedHome.acquisitionPrice)}
          </Text>
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
      <Text style={accent ? { color: accent } : undefined} className={`text-[12px] font-mono font-bold ${accent ? "" : "text-[#cbd2da]"}`}>
        {value}
      </Text>
    </View>
  );
}

function usdShort(n: number): string {
  const a = Math.round(Math.abs(n));
  if (a >= 1_000_000) return "$" + (a / 1_000_000).toFixed(1) + "M";
  if (a >= 1_000) return "$" + Math.round(a / 1_000) + "k";
  return "$" + a;
}
