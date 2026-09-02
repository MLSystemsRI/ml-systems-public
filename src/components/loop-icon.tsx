import Svg, { Defs, LinearGradient, RadialGradient, Stop, Circle, Path } from "react-native-svg";

/**
 * LoopIcon — PI's glyph for the Value Chain Portfolio. The equity LOOP
 * (Finance → Decon → Design → Build → Loop) drawn as a cyclic ring in PI's green
 * Lucent palette (#86EFAC → #22C55E → #14532D), with PI's glowing lens-eye at the
 * center — PI orchestrating the loop. Faint phase nodes on the ring nod to the
 * value-chain $-chain heritage. Pure react-native-svg → same on native + web.
 * viewBox 24×24. Replaces DnaIcon on the drawer's Value Chain Portfolio tap-target.
 */
export function LoopIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="piLoop" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#86EFAC" />
          <Stop offset="0.55" stopColor="#22C55E" />
          <Stop offset="1" stopColor="#14532D" />
        </LinearGradient>
        <RadialGradient id="piEye" cx="12" cy="12" r="4" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#DCFCE7" />
          <Stop offset="0.5" stopColor="#86EFAC" />
          <Stop offset="1" stopColor="#22C55E" />
        </RadialGradient>
      </Defs>

      {/* the loop — a near-full ring (the value-chain cycle) */}
      <Path
        d="M 12 4 A 8 8 0 1 1 6.9 5.4"
        stroke="url(#piLoop)"
        strokeWidth={1.7}
        strokeLinecap="round"
        fill="none"
      />
      {/* arrowhead at the top — the loop's clockwise flow */}
      <Path d="M 12 4 L 9.3 2.7 L 10.1 6 Z" fill="url(#piLoop)" />

      {/* faint phase nodes on the ring (the $-chain, subtle) */}
      <Circle cx="20" cy="12" r="0.9" fill="#22C55E" opacity={0.5} />
      <Circle cx="12" cy="20" r="0.9" fill="#22C55E" opacity={0.5} />
      <Circle cx="4" cy="12" r="0.9" fill="#22C55E" opacity={0.5} />

      {/* PI's lens-eye at the center */}
      <Circle cx="12" cy="12" r="4.4" fill="#22C55E" opacity={0.14} />
      <Circle cx="12" cy="12" r="2.5" fill="url(#piEye)" />
      <Circle cx="11.3" cy="11.3" r="0.85" fill="#F0FDF4" opacity={0.9} />
    </Svg>
  );
}
