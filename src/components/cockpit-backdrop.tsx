import { View, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Ellipse, Circle } from "react-native-svg";

/**
 * Deep-space backdrop for the Custodian Cockpit — a faithful React Native port of
 * the aurora + starfield from `apps/financial-architect/public/x-algorithm-agent-minds.html`.
 * Three bottom radial glows (X-blue / gold / teal) sit under a static starfield on a
 * near-black field. Absolutely positioned; the cockpit content scrolls over the top.
 * No runtime randomness — the starfield is a hand-authored const so renders are stable.
 */

// Precomputed stars: x/y are 0–1 fractions of the viewport, r = radius px, o = opacity.
// Kept to the upper ~70% so the aurora owns the bottom band.
const STARS: { x: number; y: number; r: number; o: number }[] = [
  { x: 0.08, y: 0.06, r: 1.1, o: 0.5 }, { x: 0.19, y: 0.13, r: 0.8, o: 0.35 },
  { x: 0.31, y: 0.04, r: 1.3, o: 0.6 }, { x: 0.44, y: 0.10, r: 0.7, o: 0.3 },
  { x: 0.57, y: 0.05, r: 1.0, o: 0.45 }, { x: 0.69, y: 0.12, r: 0.9, o: 0.4 },
  { x: 0.81, y: 0.07, r: 1.2, o: 0.55 }, { x: 0.93, y: 0.14, r: 0.7, o: 0.3 },
  { x: 0.04, y: 0.22, r: 0.9, o: 0.4 }, { x: 0.16, y: 0.28, r: 1.1, o: 0.5 },
  { x: 0.27, y: 0.20, r: 0.7, o: 0.28 }, { x: 0.39, y: 0.26, r: 1.0, o: 0.42 },
  { x: 0.52, y: 0.19, r: 0.8, o: 0.34 }, { x: 0.63, y: 0.29, r: 1.3, o: 0.58 },
  { x: 0.75, y: 0.22, r: 0.7, o: 0.3 }, { x: 0.87, y: 0.27, r: 1.0, o: 0.44 },
  { x: 0.97, y: 0.20, r: 0.8, o: 0.32 }, { x: 0.11, y: 0.38, r: 1.2, o: 0.5 },
  { x: 0.23, y: 0.44, r: 0.7, o: 0.26 }, { x: 0.35, y: 0.36, r: 0.9, o: 0.38 },
  { x: 0.48, y: 0.42, r: 1.1, o: 0.46 }, { x: 0.60, y: 0.35, r: 0.7, o: 0.28 },
  { x: 0.72, y: 0.45, r: 1.0, o: 0.4 }, { x: 0.84, y: 0.38, r: 0.8, o: 0.32 },
  { x: 0.95, y: 0.43, r: 1.2, o: 0.5 }, { x: 0.06, y: 0.54, r: 0.8, o: 0.3 },
  { x: 0.20, y: 0.58, r: 1.0, o: 0.4 }, { x: 0.33, y: 0.52, r: 0.7, o: 0.24 },
  { x: 0.46, y: 0.60, r: 0.9, o: 0.34 }, { x: 0.58, y: 0.53, r: 1.1, o: 0.44 },
  { x: 0.71, y: 0.61, r: 0.7, o: 0.26 }, { x: 0.83, y: 0.55, r: 1.0, o: 0.38 },
  { x: 0.91, y: 0.62, r: 0.8, o: 0.3 }, { x: 0.14, y: 0.68, r: 0.9, o: 0.32 },
  { x: 0.29, y: 0.71, r: 0.7, o: 0.22 }, { x: 0.42, y: 0.66, r: 1.0, o: 0.36 },
  { x: 0.55, y: 0.72, r: 0.7, o: 0.24 }, { x: 0.68, y: 0.67, r: 0.9, o: 0.32 },
  { x: 0.79, y: 0.73, r: 0.8, o: 0.26 }, { x: 0.89, y: 0.69, r: 1.0, o: 0.34 },
  { x: 0.02, y: 0.34, r: 0.9, o: 0.34 }, { x: 0.50, y: 0.30, r: 0.7, o: 0.26 },
  { x: 0.37, y: 0.09, r: 0.9, o: 0.4 }, { x: 0.64, y: 0.16, r: 0.8, o: 0.3 },
];

export function CockpitBackdrop() {
  const { width, height } = useWindowDimensions();

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#050507" }}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* Aurora glows — X-blue / gold / teal, matching the source .aurora-glow */}
          <RadialGradient id="auroraBlue" cx="18%" cy="100%" rx="42%" ry="60%">
            <Stop offset="0%" stopColor="#1DA1F2" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#1DA1F2" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="auroraGold" cx="50%" cy="100%" rx="46%" ry="62%">
            <Stop offset="0%" stopColor="#FFE500" stopOpacity={0.22} />
            <Stop offset="100%" stopColor="#FFE500" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="auroraTeal" cx="82%" cy="100%" rx="42%" ry="60%">
            <Stop offset="0%" stopColor="#14B8A6" stopOpacity={0.24} />
            <Stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
          </RadialGradient>
          {/* A faint top-center wash so the apex node sits in a soft gold field */}
          <RadialGradient id="apexWash" cx="50%" cy="20%" rx="55%" ry="30%">
            <Stop offset="0%" stopColor="#FFE500" stopOpacity={0.06} />
            <Stop offset="100%" stopColor="#FFE500" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Starfield */}
        {STARS.map((s, i) => (
          <Circle key={i} cx={s.x * width} cy={s.y * height} r={s.r} fill="#FFFFFF" opacity={s.o} />
        ))}

        {/* Top wash behind the Custodian apex */}
        <Ellipse cx={width * 0.5} cy={height * 0.18} rx={width * 0.6} ry={height * 0.22} fill="url(#apexWash)" />

        {/* Bottom aurora band */}
        <Ellipse cx={width * 0.18} cy={height} rx={width * 0.5} ry={height * 0.32} fill="url(#auroraBlue)" />
        <Ellipse cx={width * 0.5} cy={height} rx={width * 0.55} ry={height * 0.34} fill="url(#auroraGold)" />
        <Ellipse cx={width * 0.82} cy={height} rx={width * 0.5} ry={height * 0.32} fill="url(#auroraTeal)" />
      </Svg>
    </View>
  );
}
