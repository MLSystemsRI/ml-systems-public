import Svg, { Rect, Line, Polygon, Text as SvgText } from "react-native-svg";
import { View, Text } from "react-native";
import type { RoofPlane } from "@ml-systems/types";
import type { RoofLayout } from "@/lib/roof-structure";
import { elevationFaces, type FaceElev } from "@/lib/elevation-faces";
import { BP_BG, BP_LINE, BP_DIM } from "@/components/jspace-builder";

/**
 * ElevationSet — the four cardinal elevations (N · E · S · W), compiled ON the phone
 * from VERA's Google Solar roof. The CDA×VERA symbiosis as a drawing: each face gets
 * the pitch of the roof plane facing that way (north/south are VERA's sensed gold),
 * drawn as a gable end (triangle to ridge) or an eave side (roof rising eave→ridge).
 * No button — it renders straight from `roof`. Blueprint language, MODELED until sensed.
 */

const GRADE = "#7FA8E0";
const WIN = "#0F62C0";

function ftIn(ft: number): string {
  const totalIn = Math.max(0, Math.round(ft * 12));
  return `${Math.floor(totalIn / 12)}'-${totalIn % 12}"`;
}

/** One cardinal elevation drawn to `width` px. */
function FaceSvg({ face, width }: { face: FaceElev; width: number }) {
  const pad = 16;
  const capH = 16;
  const fpW = Math.max(8, face.width);
  const s = (width - pad * 2) / fpW;
  const drawW = fpW * s;
  const H = face.ridgeH * s + pad * 2 + capH;
  const X = (ft: number) => pad + ft * s;
  const groundY = H - pad - capH;
  const Yh = (h: number) => groundY - h * s;
  const eaveY = Yh(face.eaveH);
  const ridgeY = Yh(face.ridgeH);

  // Floor lines.
  const floors: number[] = [];
  let acc = 0;
  for (let i = 0; i < face.perFloor.length - 1; i++) { acc += face.perFloor[i] ?? 0; floors.push(acc); }
  // Windows per story: Google's sensed front-face count when we have it, else the
  // ~12 ft/bay heuristic. The count is the whole face → spread across the stories.
  const stories = Math.max(1, face.perFloor.length);
  const winSensed = face.windowsSrc === "sensed" && face.windows;
  const bays = winSensed ? Math.max(1, Math.round(face.windows! / stories)) : Math.max(1, Math.round(fpW / 12));
  const sensed = face.pitchSrc === "sensed";

  return (
    <View>
      <Svg width={width} height={H}>
        <Rect x={0} y={0} width={width} height={H} fill={BP_BG} rx={6} />
        <Line x1={pad - 8} y1={groundY} x2={width - pad + 8} y2={groundY} stroke={GRADE} strokeWidth={1.2} />
        {/* Wall */}
        <Rect x={X(0)} y={eaveY} width={drawW} height={groundY - eaveY} fill="none" stroke={BP_LINE} strokeWidth={1.5} />
        {/* Roof: gable-end triangle, or eave-side band rising eave→ridge */}
        {face.gableEnd ? (
          <Polygon points={`${X(0)},${eaveY} ${X(fpW / 2)},${ridgeY} ${X(fpW)},${eaveY}`} fill="none" stroke={BP_LINE} strokeWidth={1.5} />
        ) : (
          <>
            <Rect x={X(0)} y={ridgeY} width={drawW} height={eaveY - ridgeY} fill={BP_LINE} fillOpacity={0.06} stroke={BP_LINE} strokeWidth={1.5} />
            <Line x1={X(0)} y1={ridgeY} x2={X(fpW)} y2={ridgeY} stroke={BP_LINE} strokeWidth={1.5} />
          </>
        )}
        {/* Floor lines */}
        {floors.map((h, i) => (
          <Line key={`f${i}`} x1={X(0)} y1={Yh(h)} x2={X(fpW)} y2={Yh(h)} stroke={BP_LINE} strokeOpacity={0.35} strokeWidth={0.7} />
        ))}
        {/* Windows: a row per story */}
        {face.perFloor.map((fh, story) => {
          const midFt = face.perFloor.slice(0, story).reduce((a, b) => a + b, 0) + fh / 2;
          const y = Yh(midFt) - 5 * (s / 2);
          const wpx = Math.min(2.4 * s, drawW / (bays * 2.4));
          const hpx = Math.min(2.6 * s, (groundY - eaveY) / (face.perFloor.length * 2));
          return Array.from({ length: bays }, (_, b) => {
            const cx = X((b + 0.5) * (fpW / bays));
            return <Rect key={`w${story}-${b}`} x={cx - wpx / 2} y={y} width={wpx} height={hpx} fill={WIN} fillOpacity={0.5} stroke={BP_LINE} strokeWidth={0.6} />;
          });
        })}
        {/* Center door */}
        <Rect x={X(fpW / 2) - 1.4 * s} y={groundY - 6 * s} width={2.8 * s} height={6 * s} fill={WIN} fillOpacity={0.3} stroke={BP_LINE} strokeWidth={0.8} />
        {/* Ridge dim */}
        <SvgText x={X(fpW / 2)} y={ridgeY - 3} fontSize={7} fill={BP_LINE} textAnchor="middle" fontWeight="700">{ftIn(face.ridgeH)}</SvgText>
        <SvgText x={X(fpW / 2)} y={groundY + 11} fontSize={6.5} fill={BP_DIM} textAnchor="middle">{`${Math.round(fpW)}' · ${face.pitchDeg}°${winSensed ? ` · ${face.windows} windows` : ""}`}</SvgText>
      </Svg>
      <View className="flex-row items-center justify-between mt-0.5">
        <Text style={{ color: BP_DIM }} className="text-[9px] font-bold tracking-widest">{face.label}</Text>
        {winSensed ? <Text style={{ color: "#34D399" }} className="text-[7.5px] font-bold tracking-wider">{face.windows} WIN · GOOGLE</Text> : null}
        <Text style={{ color: sensed ? "#34D399" : "#6B7280" }} className="text-[7.5px] font-bold tracking-wider">{sensed ? "SENSED" : "MODELED"}</Text>
      </View>
    </View>
  );
}

export function ElevationSet({
  roof,
  planes,
  footprintW,
  footprintD,
  levels,
  width,
  facadeWindows,
}: {
  roof: RoofLayout;
  planes: RoofPlane[];
  footprintW: number;
  footprintD: number;
  levels: number;
  width: number;
  facadeWindows?: number;
}) {
  const faces = elevationFaces({ roof, planes, footprintW, footprintD, levels, facadeWindows });
  const anySensed = faces.some((f) => f.pitchSrc === "sensed");
  const winSensed = faces.some((f) => f.windowsSrc === "sensed");
  const cell = Math.floor((width - 10) / 2);
  return (
    <View style={{ width, padding: 6 }}>
      <View className="flex-row flex-wrap justify-between">
        {faces.map((f) => (
          <View key={f.dir} style={{ width: cell, marginBottom: 8 }}>
            <FaceSvg face={f} width={cell} />
          </View>
        ))}
      </View>
      <Text style={{ color: anySensed || winSensed ? "#34D399" : "#6B7280" }} className="text-[9px] mt-0.5">
        N/E/S/W elevations · {anySensed ? "N/S pitch from Google Solar" : "roof modeled"}{winSensed ? " · front windows from Street View" : ""}
      </Text>
    </View>
  );
}
