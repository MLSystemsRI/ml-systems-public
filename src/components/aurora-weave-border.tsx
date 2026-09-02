import { useEffect, useRef, useState } from "react";
import { View, Animated, Easing, StyleSheet, type LayoutChangeEvent } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Line } from "react-native-svg";

/**
 * AuroraWeaveBorder — MIA's signature: a flowing woven-ribbon border. Bright woven strands hug the
 * top + bottom edges; luminous aurora ribbons sweep around ALL FOUR edges (teal color + cyan
 * bright) with a soft glow + gentle pulse. Reused identically across her card, her app frame, and
 * her Hub card. Absolute-fills its parent; purely decorative (pointerEvents none).
 */

type Edge = "top" | "bottom" | "left" | "right";

function Ribbon({ id, edge, span, color, dur, delay, weight = 3 }: { id: string; edge: Edge; span: number; color: string; dur: number; delay: number; weight?: number }) {
  const horizontal = edge === "top" || edge === "bottom";
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
  const seg = Math.max(48, span * 0.5);
  const move = t.interpolate({ inputRange: [0, 1], outputRange: [-seg, span] });
  const opacity = t.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.95, 0.95, 0] });
  const T = weight;
  const base: any = { position: "absolute", opacity, shadowColor: color, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 };
  const style = horizontal
    ? { ...base, [edge]: 0, left: 0, width: seg, height: T, transform: [{ translateX: move }] }
    : { ...base, [edge]: 0, top: 0, height: seg, width: T, transform: [{ translateY: move }] };
  return (
    <Animated.View pointerEvents="none" style={style}>
      <Svg width={horizontal ? seg : T} height={horizontal ? T : seg}>
        <Defs>
          <LinearGradient id={`awb-${id}`} x1="0" y1="0" x2={horizontal ? "1" : "0"} y2={horizontal ? "0" : "1"}>
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset="0.5" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {horizontal ? (
          <Line x1={0} y1={T / 2} x2={seg} y2={T / 2} stroke={`url(#awb-${id})`} strokeWidth={T} />
        ) : (
          <Line x1={T / 2} y1={0} x2={T / 2} y2={seg} stroke={`url(#awb-${id})`} strokeWidth={T} />
        )}
      </Svg>
    </Animated.View>
  );
}

export function AuroraWeaveBorder({
  color,
  bright,
  radius = 18,
  both = true,
  frame = true,
  idKey = "awb",
  full = false,
  weight = 3,
}: {
  color: string;
  bright?: string;
  radius?: number;
  both?: boolean;
  /** Draw the base rounded border rect. Set false when the parent already has its own border. */
  frame?: boolean;
  idKey?: string;
  /** Flow BOTH color + bright ribbons on all four edges (each hue sweeps the whole perimeter). */
  full?: boolean;
  /** Ribbon stroke thickness in px (default 3). */
  weight?: number;
}) {
  const hi = bright ?? color;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 1 || Math.abs(height - size.h) > 1) setSize({ w: width, h: height });
  };

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const borderOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  // bright woven double-strand along an edge
  const strands = (edge: "top" | "bottom") => (
    <View style={{ position: "absolute", [edge]: 0, left: 12, right: 12, flexDirection: edge === "top" ? "column" : "column-reverse" }}>
      <View style={{ height: 2.5, backgroundColor: hi, opacity: 0.9, borderRadius: 2 }} />
      <View style={{ height: 1.5, marginTop: 2.5, backgroundColor: color, opacity: 0.5, borderRadius: 1 }} />
    </View>
  );

  const { w, h } = size;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {/* base woven ring (a glowing rounded border) */}
      {frame ? (
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            borderWidth: 1.5,
            borderColor: `${color}66`,
            borderRadius: radius,
            opacity: borderOpacity,
            shadowColor: color,
            shadowOpacity: 0.6,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      ) : null}
      {/* bright woven strands top + bottom */}
      {strands("top")}
      {both ? strands("bottom") : null}
      {/* flowing aurora ribbons around all four edges */}
      {w > 0 && h > 0 ? (
        <>
          <Ribbon id={`${idKey}-t`} edge="top" span={w} color={hi} dur={4200} delay={0} weight={weight} />
          <Ribbon id={`${idKey}-b`} edge="bottom" span={w} color={color} dur={5200} delay={1400} weight={weight} />
          <Ribbon id={`${idKey}-l`} edge="left" span={h} color={color} dur={4800} delay={700} weight={weight} />
          <Ribbon id={`${idKey}-r`} edge="right" span={h} color={hi} dur={5600} delay={2100} weight={weight} />
          {/* full: the complementary hue sweeps the other two edges too, so BOTH colors
              flow around the entire perimeter (offset timing keeps them from overlapping) */}
          {full ? (
            <>
              <Ribbon id={`${idKey}-t2`} edge="top" span={w} color={color} dur={5000} delay={2600} weight={weight} />
              <Ribbon id={`${idKey}-b2`} edge="bottom" span={w} color={hi} dur={4600} delay={600} weight={weight} />
              <Ribbon id={`${idKey}-l2`} edge="left" span={h} color={hi} dur={5400} delay={2000} weight={weight} />
              <Ribbon id={`${idKey}-r2`} edge="right" span={h} color={color} dur={4400} delay={1100} weight={weight} />
            </>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
