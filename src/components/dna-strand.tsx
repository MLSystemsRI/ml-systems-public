import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Line, Text as SvgText, Circle } from "react-native-svg";

/**
 * DnaStrand — the value chain as a full-height DNA double helix built from a chain of
 * dollar signs (ports apps/web/src/components/dna-helix.tsx to react-native-svg, reusing
 * the Gemini-blue gradient from dna-icon.tsx). Two strands weave down a central axis; five
 * phase nodes sit on the axis at phaseNodeYs(). The selected node lights up + pulses. Purely
 * visual — the parent overlays Pressables at the same Ys for the touch targets.
 */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CENTER_FRACTION = 0.5; // strand axis sits at the horizontal middle
const AMP = 26;              // helix half-width
const PERIOD = 150;          // vertical wavelength
const SPACING = 15;          // gap between $ points down a strand
const TOP_INSET = 0.2;       // first node this far down the height (clears the title)
const BOT_INSET = 0.1;       // last node this far up from the bottom

/** Evenly spaced node Ys, inset from top/bottom — shared by the SVG + the parent overlays. */
export function phaseNodeYs(height: number, count = 5): number[] {
  const top = height * TOP_INSET;
  const bottom = height * (1 - BOT_INSET);
  const span = bottom - top;
  return Array.from({ length: count }, (_, i) =>
    count === 1 ? (top + bottom) / 2 : top + (span * i) / (count - 1),
  );
}

export function DnaStrand({
  width,
  height,
  accents,
  selected,
  dim = false,
}: {
  width: number;
  height: number;
  accents: string[];
  selected: number;
  /** Recede the $-helix (front/back/rungs) so a prominent backdrop reads through, while the
   *  accent nodes + selection pulse stay full strength as the interactive feedback. */
  dim?: boolean;
}) {
  const centerX = width * CENTER_FRACTION;
  // $-helix opacities — dropped hard when `dim`, so the fusion backdrop is the hero.
  const frontOp = dim ? 0.16 : 0.92;
  const backOp = dim ? 0.05 : 0.18;
  const rungOp = dim ? 0.04 : 0.1;
  const pulse = useRef(new Animated.Value(0)).current;

  // Loop the selected node's glow ring whenever the selection changes. We animate the
  // Circle's r/opacity PROPS (not a style transform), so useNativeDriver must be false —
  // native driver only handles style transform/opacity, not react-native-svg attributes.
  useEffect(() => {
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [selected, pulse]);

  const nodes = phaseNodeYs(height, accents.length);

  // Points down both weaving strands.
  const front: { x: number; y: number }[] = [];
  const back: { x: number; y: number }[] = [];
  const rungs: { x1: number; x2: number; y: number }[] = [];
  for (let y = SPACING; y < height; y += SPACING) {
    const phase = (2 * Math.PI * y) / PERIOD;
    const sin = Math.sin(phase);
    const xa = centerX + AMP * sin; // strand A
    const xb = centerX - AMP * sin; // strand B
    (sin >= 0 ? front : back).push({ x: xa, y });
    (sin <= 0 ? front : back).push({ x: xb, y });
  }
  for (let y = PERIOD / 4; y < height; y += PERIOD / 2) {
    const sin = Math.sin((2 * Math.PI * y) / PERIOD);
    rungs.push({ x1: centerX + AMP * sin, x2: centerX - AMP * sin, y });
  }

  const pulseR = pulse.interpolate({ inputRange: [0, 1], outputRange: [7, 20] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const selAccent = accents[selected] ?? "#7AA0FF";
  const selY = nodes[selected] ?? height / 2;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="strandGrad" x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#4285F4" />
          <Stop offset="0.5" stopColor="#7AA0FF" />
          <Stop offset="1" stopColor="#A78BFA" />
        </LinearGradient>
      </Defs>

      {/* faint rungs */}
      {rungs.map((r, i) => (
        <Line key={`r${i}`} x1={r.x1} y1={r.y} x2={r.x2} y2={r.y} stroke="#4285F4" strokeOpacity={rungOp} strokeWidth={1} />
      ))}

      {/* back strand — faded */}
      {back.map((p, i) => (
        <SvgText key={`b${i}`} x={p.x} y={p.y} fontSize={11} fontWeight="bold" fill="url(#strandGrad)" fillOpacity={backOp} textAnchor="middle">
          $
        </SvgText>
      ))}

      {/* front strand — bright */}
      {front.map((p, i) => (
        <SvgText key={`f${i}`} x={p.x} y={p.y} fontSize={14} fontWeight="bold" fill="url(#strandGrad)" fillOpacity={frontOp} textAnchor="middle">
          $
        </SvgText>
      ))}

      {/* phase nodes on the axis */}
      {nodes.map((y, i) => {
        const accent = accents[i] ?? "#7AA0FF";
        const on = i === selected;
        return (
          <Circle
            key={`n${i}`}
            cx={centerX}
            cy={y}
            r={on ? 7 : 3.5}
            fill={accent}
            fillOpacity={on ? 1 : 0.5}
            stroke={accent}
            strokeOpacity={on ? 0.5 : 0}
            strokeWidth={on ? 2 : 0}
          />
        );
      })}

      {/* animated pulse ring on the selected node (grows + fades) */}
      <AnimatedCircle cx={centerX} cy={selY} r={pulseR} fill="none" stroke={selAccent} strokeWidth={2} opacity={pulseOpacity} />
    </Svg>
  );
}
