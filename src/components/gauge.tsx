import { View, Text } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";

interface GaugeProps {
  score: number;
  size?: number;
  label?: string;
  sublabel?: string;
}

function scoreColor(score: number): string {
  if (score >= 75) return "#2A7A4B";
  if (score >= 50) return "#D97706";
  return "#DC2626";
}

function polarToXY(angleDeg: number, r: number, cx: number, cy: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(startDeg: number, endDeg: number, r: number, cx: number, cy: number) {
  const s = polarToXY(startDeg, r, cx, cy);
  const e = polarToXY(endDeg, r, cx, cy);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export function Gauge({ score, size = 120, label, sublabel }: GaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const radius = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const sw = size * 0.07;
  const startAngle = 165;
  const totalAngle = 210;
  const fillAngle = (clamped / 100) * totalAngle;
  const color = scoreColor(clamped);

  return (
    <View className="items-center gap-1">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Path
          d={arcPath(startAngle, startAngle + totalAngle, radius, cx, cy)}
          fill="none"
          stroke="#E2E2E2"
          strokeWidth={sw}
          strokeLinecap="round"
        />
        {clamped > 0 && (
          <Path
            d={arcPath(startAngle, startAngle + fillAngle, radius, cx, cy)}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        )}
        <SvgText
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize={size * 0.22}
          fontWeight="800"
          fill="#0D0D0D"
        >
          {clamped}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + size * 0.19}
          textAnchor="middle"
          fontSize={size * 0.1}
          fill="#9B9B9B"
        >
          /100
        </SvgText>
      </Svg>
      {label    && <Text className="text-sm font-bold text-[#0D0D0D]">{label}</Text>}
      {sublabel && <Text className="text-xs text-[#9B9B9B]">{sublabel}</Text>}
    </View>
  );
}
