import Svg, { Defs, LinearGradient, Stop, Path, Text as SvgText } from "react-native-svg";

/**
 * DnaIcon — the value chain as a DNA double-helix built from a chain of dollar
 * signs (mirrors the financial-architect value-chain renders: "$" chained through
 * a helix). Two strands weave around a vertical $-backbone, all stroked/filled with
 * a Gemini-blue gradient (blue → periwinkle → violet). Vector, so it renders the
 * same on native + web. viewBox 24×24.
 */
export function DnaIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="dnaGemini" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#4285F4" />
          <Stop offset="0.5" stopColor="#7AA0FF" />
          <Stop offset="1" stopColor="#A78BFA" />
        </LinearGradient>
      </Defs>

      {/* two strands crossing at the middle + near each end (the double helix) */}
      <Path
        d="M7 2.5 C 18 6, 18 9, 12 12 C 6 15, 6 18, 17 21.5"
        stroke="url(#dnaGemini)"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M17 2.5 C 6 6, 6 9, 12 12 C 18 15, 18 18, 7 21.5"
        stroke="url(#dnaGemini)"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* the value chain — dollar signs chained down the backbone */}
      <SvgText x="12" y="8.3" fontSize="7" fontWeight="bold" fill="url(#dnaGemini)" textAnchor="middle">$</SvgText>
      <SvgText x="12" y="14.4" fontSize="7" fontWeight="bold" fill="url(#dnaGemini)" textAnchor="middle">$</SvgText>
      <SvgText x="12" y="20.5" fontSize="7" fontWeight="bold" fill="url(#dnaGemini)" textAnchor="middle">$</SvgText>
    </Svg>
  );
}
