import Svg, { Rect, Line, Polygon, Circle, Text as SvgText, Defs, RadialGradient, Stop, G } from "react-native-svg";
import type { RoofLayout, LoadPath, WeightDistribution } from "@/lib/roof-structure";
import type { ReverseTakeoff } from "@ml-systems/types";
import { BP_BG, BP_LINE, BP_DIM, BP_GLOW } from "@/components/jspace-builder";

/** Feet (decimal) → architect's feet-inches, e.g. 8.5 → 8'-6" (section dimensions). */
function ftIn(ft: number): string {
  const totalIn = Math.max(0, Math.round(ft * 12));
  return `${Math.floor(totalIn / 12)}'-${totalIn % 12}"`;
}
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/**
 * Roof + Structure renderers — the j-space guide's structural story, drawn in the
 * glowing blueprint language. Pure presentational (react-native-svg), deterministic
 * inputs from lib/roof-structure. MODELED — never a stamped design.
 */

const GOLD = "#FFE500"; // the load arrows — gold pops on blueprint blue

/** Two-pass "glow" line: wide soft stroke under a crisp one. */
function GlowLine({ x1, y1, x2, y2, color = BP_LINE, width = 1.6 }: { x1: number; y1: number; x2: number; y2: number; color?: string; width?: number }) {
  return (
    <>
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeOpacity={0.22} strokeWidth={width * 3.2} />
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} />
    </>
  );
}

/** A glowing load arrow (shaft + head) pointing DOWN the transfer path. */
function LoadArrow({ x, y1, y2, label, value }: { x: number; y1: number; y2: number; label?: string; value?: string }) {
  const head = 5;
  return (
    <>
      <Line x1={x} y1={y1} x2={x} y2={y2 - head} stroke={GOLD} strokeOpacity={0.25} strokeWidth={5} />
      <Line x1={x} y1={y1} x2={x} y2={y2 - head} stroke={GOLD} strokeWidth={1.8} />
      <Polygon points={`${x - 4},${y2 - head} ${x + 4},${y2 - head} ${x},${y2}`} fill={GOLD} />
      {value ? (
        <SvgText x={x + 7} y={(y1 + y2) / 2} fontSize={7.5} fill={GOLD} fontWeight="700">
          {value}
        </SvgText>
      ) : null}
      {label ? (
        <SvgText x={x + 7} y={(y1 + y2) / 2 + 9} fontSize={6} fill={BP_DIM}>
          {label}
        </SvgText>
      ) : null}
    </>
  );
}

/** The roof plan — ridge down the long axis, slope arrows, pitch, overhang dashes. */
export function RoofPlanSvg({ roof, footprintW, footprintD, width }: { roof: RoofLayout; footprintW: number; footprintD: number; width: number }) {
  const pad = 22;
  const s = (width - pad * 2) / (footprintW + roof.overhangFt * 2);
  const H = (footprintD + roof.overhangFt * 2) * s + pad * 2 + 16;
  const X = (ft: number) => pad + (ft + roof.overhangFt) * s;
  const Y = (ft: number) => pad + (ft + roof.overhangFt) * s;

  const r = roof.ridge;
  // Slope arrows: perpendicular to the ridge, from ridge toward each eave.
  const arrows: Array<{ x1: number; y1: number; x2: number; y2: number }> = roof.ridgeAlongW
    ? [
        { x1: X(footprintW * 0.3), y1: Y(r.y1), x2: X(footprintW * 0.3), y2: Y(footprintD * 0.12) },
        { x1: X(footprintW * 0.7), y1: Y(r.y1), x2: X(footprintW * 0.7), y2: Y(footprintD * 0.88) },
      ]
    : [
        { x1: X(r.x1), y1: Y(footprintD * 0.3), x2: X(footprintW * 0.12), y2: Y(footprintD * 0.3) },
        { x1: X(r.x1), y1: Y(footprintD * 0.7), x2: X(footprintW * 0.88), y2: Y(footprintD * 0.7) },
      ];

  return (
    <Svg width={width} height={H}>
      <Defs>
        <RadialGradient id="roofBloom" cx="50%" cy="45%" r="65%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.10} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={H} fill={BP_BG} />
      <Rect x={0} y={0} width={width} height={H} fill="url(#roofBloom)" />

      {/* Overhang (the roof edge) — dashed, 1.5' beyond the walls. */}
      <Rect
        x={pad} y={pad}
        width={(footprintW + roof.overhangFt * 2) * s}
        height={(footprintD + roof.overhangFt * 2) * s}
        fill="rgba(255,255,255,0.05)" stroke={BP_DIM} strokeWidth={1} strokeDasharray="5,4"
      />
      {/* Walls below. */}
      <Rect x={X(0)} y={Y(0)} width={footprintW * s} height={footprintD * s} fill="none" stroke={BP_GLOW} strokeWidth={4.5} />
      <Rect x={X(0)} y={Y(0)} width={footprintW * s} height={footprintD * s} fill="none" stroke={BP_LINE} strokeWidth={1.4} />

      {/* The ridge — the roof's spine. */}
      <GlowLine x1={X(r.x1)} y1={Y(r.y1)} x2={X(r.x2)} y2={Y(r.y2)} width={2.4} />

      {/* Any further ridges VERA measured (a cross-gable, a wing) — drawn thinner so
          the primary spine still reads first. Absent until the roof is classified. */}
      {(roof.ridges ?? [])
        .filter((rr) => rr.x1 !== r.x1 || rr.y1 !== r.y1 || rr.x2 !== r.x2 || rr.y2 !== r.y2)
        .map((rr, i) => (
          <GlowLine key={`ridge-${i}`} x1={X(rr.x1)} y1={Y(rr.y1)} x2={X(rr.x2)} y2={Y(rr.y2)} width={1.6} />
        ))}

      {/* Slope arrows — water (and load) flows ridge → eaves. */}
      {arrows.map((a, i) => (
        <LoadArrow key={i} x={a.x1 === a.x2 ? a.x1 : (a.x1 + a.x2) / 2} y1={Math.min(a.y1, a.y2)} y2={Math.max(a.y1, a.y2)} />
      ))}

      <SvgText x={X(footprintW / 2)} y={Y(r.y1) - 6} textAnchor="middle" fontSize={9} fill={BP_LINE} fontWeight="700">
        RIDGE · {roof.pitch}:12 ({roof.pitchDeg}°){roof.pitchSrc === "sensed" ? " · MEASURED" : ""}
      </SvgText>
      <SvgText x={width / 2} y={H - 8} textAnchor="middle" fontSize={7.5} fill={BP_DIM}>
        {roof.type}
        {roof.ridges && roof.ridges.length > 1 ? ` · ${roof.ridges.length} ridges` : ""} · ridge{" "}
        {roof.ridgeHeightFt}&apos; · eave {roof.eaveHeightFt}&apos; · roof ≈ {roof.roofAreaSF.toLocaleString()} SF
      </SvgText>
    </Svg>
  );
}

/**
 * WeightPlanSvg — the PLAN-view weight distribution: the footprint, the ridge spine,
 * and the BEARING LINES the roof loads land on (eave walls in gold, a central girder
 * dashed, a ridge beam when the ceiling is vaulted), each tagged with its plf. Valleys
 * and ridge-beam posts are marked where load piles up. This is the load path when the
 * plans are locked away — read from the roof + ridges. MODELED, never a stamped design.
 */
export function WeightPlanSvg({
  dist,
  roof,
  footprintW,
  footprintD,
  outline,
  width,
}: {
  dist: WeightDistribution;
  roof: RoofLayout;
  footprintW: number;
  footprintD: number;
  outline?: Array<{ x: number; y: number }>;
  width: number;
}) {
  const pad = 26;
  const fp = outline && outline.length >= 3 ? outline : null;
  const minX = fp ? Math.min(...fp.map((p) => p.x)) : 0;
  const maxX = fp ? Math.max(...fp.map((p) => p.x)) : footprintW;
  const minY = fp ? Math.min(...fp.map((p) => p.y)) : 0;
  const maxY = fp ? Math.max(...fp.map((p) => p.y)) : footprintD;
  const spanW = Math.max(1, maxX - minX);
  const spanD = Math.max(1, maxY - minY);
  const s = (width - pad * 2) / spanW;
  const H = spanD * s + pad * 2 + 24;
  const X = (ft: number) => pad + (ft - minX) * s;
  const Y = (ft: number) => pad + (ft - minY) * s;

  const roleStyle = (role: WeightDistribution["bearing"][number]["role"]) =>
    role === "central-girder"
      ? { color: GOLD, w: 2.2, dash: "6,4", tag: "girder" }
      : role === "ridge-beam"
        ? { color: GOLD, w: 2.2, dash: "2,3", tag: "ridge beam" }
        : { color: GOLD, w: 3, dash: undefined, tag: "bearing" };

  return (
    <Svg width={width} height={H}>
      <Defs>
        <RadialGradient id="wtBloom" cx="50%" cy="45%" r="65%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.09} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={H} fill={BP_BG} />
      <Rect x={0} y={0} width={width} height={H} fill="url(#wtBloom)" />

      {/* The footprint — the reconciled outline when VERA has it, else the box. */}
      {fp ? (
        <Polygon points={fp.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")} fill="rgba(255,255,255,0.05)" stroke={BP_GLOW} strokeWidth={4.5} />
      ) : (
        <Rect x={X(0)} y={Y(0)} width={spanW * s} height={spanD * s} fill="rgba(255,255,255,0.05)" stroke={BP_GLOW} strokeWidth={4.5} />
      )}
      {fp ? (
        <Polygon points={fp.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")} fill="none" stroke={BP_LINE} strokeWidth={1.4} />
      ) : (
        <Rect x={X(0)} y={Y(0)} width={spanW * s} height={spanD * s} fill="none" stroke={BP_LINE} strokeWidth={1.4} />
      )}

      {/* Ridge spine(s) — the geometry the whole read hangs on. */}
      {(roof.ridges ?? [roof.ridge]).map((r, i) => (
        <G key={`r-${i}`}>
          <Line x1={X(r.x1)} y1={Y(r.y1)} x2={X(r.x2)} y2={Y(r.y2)} stroke={BP_LINE} strokeOpacity={0.9} strokeWidth={1.6} strokeDasharray="7,4" />
        </G>
      ))}

      {/* Bearing lines — where the roof's weight lands, gold. */}
      {dist.bearing.map((b) => {
        const st = roleStyle(b.role);
        const mx = (X(b.line.x1) + X(b.line.x2)) / 2;
        const my = (Y(b.line.y1) + Y(b.line.y2)) / 2;
        return (
          <G key={b.id}>
            <Line x1={X(b.line.x1)} y1={Y(b.line.y1)} x2={X(b.line.x2)} y2={Y(b.line.y2)} stroke={st.color} strokeOpacity={0.22} strokeWidth={st.w * 3} />
            <Line
              x1={X(b.line.x1)} y1={Y(b.line.y1)} x2={X(b.line.x2)} y2={Y(b.line.y2)}
              stroke={st.color} strokeWidth={st.w} {...(st.dash ? { strokeDasharray: st.dash } : {})}
            />
            <SvgText x={mx} y={my - 3} textAnchor="middle" fontSize={7.5} fill={st.color} fontWeight="700">
              {b.plf.toLocaleString()} plf
            </SvgText>
          </G>
        );
      })}

      {/* Concentrations — a valley or a ridge-beam post: where load piles to a point. */}
      {dist.concentrations.map((c, i) => (
        <G key={`c-${i}`}>
          <Circle cx={X(c.x)} cy={Y(c.y)} r={6} fill="none" stroke={GOLD} strokeWidth={1.6} />
          <Circle cx={X(c.x)} cy={Y(c.y)} r={2} fill={GOLD} />
          <SvgText x={X(c.x)} y={Y(c.y) + 15} textAnchor="middle" fontSize={6} fill={GOLD}>
            {c.kind}
          </SvgText>
        </G>
      ))}

      <SvgText x={width / 2} y={H - 7} textAnchor="middle" fontSize={7.5} fill={BP_DIM}>
        rafters span {dist.rafterSpanFt}′ · ridge {dist.ridge.likely}
        {dist.ridge.src === "stated" ? " (confirmed)" : " (assumed)"} · MODELED
      </SvgText>
    </Svg>
  );
}

/** The section — foundation to ridge, with the loads flowing down in gold. */
export function LoadSectionSvg({ roof, load, levels, spanFt, width }: { roof: RoofLayout; load: LoadPath; levels: number; spanFt: number; width: number }) {
  const pad = 26;
  const wallH = 34; // px per story
  const roofH = Math.min(52, ((spanFt / 2) * roof.pitch) / 12 * 2.4);
  const footH = 10;
  const soilH = 22;
  const H = pad + roofH + levels * wallH + footH + soilH + 26;
  const wL = pad + 24; // left wall x
  const wR = width - pad - 24;
  const eaveY = pad + roofH;
  const foundY = eaveY + levels * wallH;
  const soilY = foundY + footH;
  const ridgeX = (wL + wR) / 2;

  const stop = (id: string) => load.stops.find((s) => s.id === id);

  return (
    <Svg width={width} height={H}>
      <Rect x={0} y={0} width={width} height={H} fill={BP_BG} />

      {/* Soil + hatch. */}
      <Rect x={0} y={soilY} width={width} height={H - soilY} fill="rgba(255,255,255,0.05)" />
      {Array.from({ length: Math.floor(width / 14) }, (_, i) => (
        <Line key={i} x1={i * 14} y1={soilY + 4 + (i % 2) * 6} x2={i * 14 + 8} y2={soilY + 10 + (i % 2) * 6} stroke={BP_DIM} strokeOpacity={0.35} strokeWidth={0.8} />
      ))}
      <GlowLine x1={0} y1={soilY} x2={width} y2={soilY} width={1.2} />

      {/* Footings. */}
      {[wL, wR].map((x) => (
        <Rect key={x} x={x - 12} y={foundY} width={24} height={footH} fill="rgba(255,255,255,0.14)" stroke={BP_LINE} strokeWidth={1.1} />
      ))}

      {/* Walls + floor plates per level. */}
      {[wL, wR].map((x) => (
        <GlowLine key={x} x1={x} y1={eaveY} x2={x} y2={foundY} width={1.8} />
      ))}
      {Array.from({ length: levels }, (_, i) => {
        const y = eaveY + (i + 1) * wallH;
        return i < levels - 0 && y < foundY + 1 ? (
          <Line key={i} x1={wL} y1={y} x2={wR} y2={y} stroke={BP_LINE} strokeOpacity={0.5} strokeWidth={1} />
        ) : null;
      })}

      {/* The roof triangle. */}
      <Polygon
        points={`${wL - 8},${eaveY} ${ridgeX},${pad} ${wR + 8},${eaveY}`}
        fill="rgba(255,255,255,0.07)" stroke={BP_GLOW} strokeWidth={4}
      />
      <Polygon points={`${wL - 8},${eaveY} ${ridgeX},${pad} ${wR + 8},${eaveY}`} fill="none" stroke={BP_LINE} strokeWidth={1.5} />
      <SvgText x={ridgeX} y={pad - 6 + 4} textAnchor="middle" fontSize={7.5} fill={BP_LINE} fontWeight="700">
        {stop("roof")?.value ?? ""}
      </SvgText>

      {/* The load path — gold arrows: roof planes → eave walls → foundation → soil. */}
      <LoadArrow x={(wL + ridgeX) / 2 - 6} y1={pad + roofH * 0.35} y2={eaveY - 2} />
      <LoadArrow x={(wR + ridgeX) / 2 + 6} y1={pad + roofH * 0.35} y2={eaveY - 2} />
      <LoadArrow x={wL - 14} y1={eaveY + 4} y2={foundY - 2} value={stop("eave-walls")?.value} label={levels > 1 ? stop("floors")?.value : undefined} />
      <LoadArrow x={wR + 14} y1={eaveY + 4} y2={foundY - 2} />
      <LoadArrow x={wL - 14} y1={foundY + 2} y2={soilY + soilH - 4} value={stop("foundation")?.value} />
      <LoadArrow x={wR + 14} y1={foundY + 2} y2={soilY + soilH - 4} />

      <SvgText x={width / 2} y={H - 6} textAnchor="middle" fontSize={7.5} fill={BP_DIM}>
        soil: {stop("soil")?.value ?? ""} footing · RI bearing 2,000 psf · frost 40"
      </SvgText>
    </Svg>
  );
}

/**
 * WallSectionSvg — a REAL wall/building section at code-grounded heights: footing (frost
 * depth) → foundation wall → sill → studs (labeled height) → floor joists → next level →
 * roof, with the member specs pulled from the reverse takeoff and a left dimension chain in
 * feet-inches. MODELED — the structural pass' headline, never a stamped drawing.
 */
export function WallSectionSvg({
  width,
  levels,
  floorToFloorFt,
  foundationWallHeightFt,
  frostDepthIn,
  reverse,
  regimeLabel,
}: {
  width: number;
  levels: number;
  floorToFloorFt: number;
  foundationWallHeightFt: number;
  frostDepthIn: number;
  reverse?: ReverseTakeoff | null;
  regimeLabel?: string;
}) {
  const spec = (needle: string): string | undefined =>
    reverse?.lines.find((l) => l.member.toLowerCase().includes(needle))?.spec;
  const studSpec = spec("wall studs") ?? '2×4 @ 16" o.c.';
  const joistSpec = spec("floor joists") ?? '2×8 @ 16" o.c.';
  const subfloorSpec = spec("subfloor") ?? '3/4" subfloor';
  const sheathingSpec = reverse?.lines.find((l) => l.member.toLowerCase() === "sheathing")?.spec ?? '7/16" OSB';
  const drywallSpec = spec("wall board") ?? '1/2" gypsum';
  const roofSpec = spec("roof sheathing") ?? spec("rafter") ?? spec("truss") ?? '1/2" roof deck';
  const foundationSpec = spec("foundation") ?? '8" poured concrete';

  const n = Math.max(1, Math.round(levels));
  const f2f = Math.max(7, floorToFloorFt);
  const foundFt = Math.max(4, foundationWallHeightFt);
  const roofRiseFt = 5;
  const totalFt = roofRiseFt + n * f2f + foundFt;
  const pxPerFt = clamp(300 / totalFt, 6, 13);

  const pad = 12;
  const dimW = 30; // left dimension gutter
  const bayL = pad + dimW + 8;
  const bayR = width - 104; // right spec-label gutter
  const midX = (bayL + bayR) / 2;

  const apexY = pad + 6;
  const eaveY = apexY + roofRiseFt * pxPerFt;
  const bandH = f2f * pxPerFt;
  const sillY = eaveY + n * bandH; // grade / top of foundation
  const foundBottomY = sillY + foundFt * pxPerFt;
  const footH = 8;
  const footBottomY = foundBottomY + footH;
  const H = footBottomY + 30;

  // Left dimension chain rows: roof, each floor-to-floor, foundation.
  const dims: { y0: number; y1: number; ft: number }[] = [
    { y0: apexY, y1: eaveY, ft: roofRiseFt },
    ...Array.from({ length: n }, (_, i) => ({ y0: eaveY + i * bandH, y1: eaveY + (i + 1) * bandH, ft: f2f })),
    { y0: sillY, y1: foundBottomY, ft: foundFt },
  ];
  // Right spec tags at the vertical center of the element they describe.
  const midLevelY = eaveY + bandH / 2;
  const tags: { y: number; text: string }[] = [
    { y: apexY + roofRiseFt * pxPerFt * 0.5, text: `roof · ${roofSpec}` },
    { y: midLevelY - 8, text: `studs · ${studSpec}` },
    { y: midLevelY + 4, text: `sheathing · ${sheathingSpec}` },
    { y: midLevelY + 16, text: `interior · ${drywallSpec}` },
    { y: sillY - 4, text: `floor · ${joistSpec}` },
    { y: sillY + 6, text: subfloorSpec },
    { y: (sillY + foundBottomY) / 2, text: `foundation · ${foundationSpec}` },
  ];
  const dimX = pad + dimW - 4;

  return (
    <Svg width={width} height={H}>
      <Rect x={0} y={0} width={width} height={H} fill={BP_BG} />

      {/* Ground/soil below grade (sill line) with hatch. */}
      <Rect x={0} y={sillY} width={width} height={H - sillY} fill="rgba(255,255,255,0.05)" />
      {Array.from({ length: Math.floor(width / 14) }, (_, i) => (
        <Line key={i} x1={i * 14} y1={sillY + 4 + (i % 2) * 6} x2={i * 14 + 8} y2={sillY + 10 + (i % 2) * 6} stroke={BP_DIM} strokeOpacity={0.3} strokeWidth={0.8} />
      ))}
      <GlowLine x1={0} y1={sillY} x2={width} y2={sillY} width={1.1} />

      {/* Roof triangle. */}
      <Polygon points={`${bayL - 10},${eaveY} ${midX},${apexY} ${bayR + 10},${eaveY}`} fill="rgba(255,255,255,0.07)" stroke={BP_GLOW} strokeWidth={4} />
      <Polygon points={`${bayL - 10},${eaveY} ${midX},${apexY} ${bayR + 10},${eaveY}`} fill="none" stroke={BP_LINE} strokeWidth={1.4} />

      {/* Wall studs — the left/right of the bay, plus a few intermediate studs @16" feel. */}
      {[bayL, bayR].map((x) => (
        <GlowLine key={x} x1={x} y1={eaveY} x2={x} y2={sillY} width={1.8} />
      ))}
      {/* Double top plate + sill plate lines. */}
      <Line x1={bayL} y1={eaveY + 2} x2={bayR} y2={eaveY + 2} stroke={BP_LINE} strokeWidth={1.4} />
      <Line x1={bayL} y1={eaveY + 5} x2={bayR} y2={eaveY + 5} stroke={BP_LINE} strokeOpacity={0.6} strokeWidth={1} />
      {/* Floor joist lines between levels + at the sill. */}
      {Array.from({ length: n }, (_, i) => {
        const y = eaveY + (i + 1) * bandH;
        return <Line key={i} x1={bayL} y1={y - 3} x2={bayR} y2={y - 3} stroke={BP_LINE} strokeOpacity={0.7} strokeWidth={1.6} />;
      })}

      {/* Foundation walls (thicker — concrete) + footings. */}
      {[bayL, bayR].map((x) => (
        <Line key={x} x1={x} y1={sillY} x2={x} y2={foundBottomY} stroke={BP_LINE} strokeWidth={2.4} />
      ))}
      {[bayL, bayR].map((x) => (
        <Rect key={`ft-${x}`} x={x - 12} y={foundBottomY} width={24} height={footH} fill="rgba(255,255,255,0.14)" stroke={BP_LINE} strokeWidth={1.1} />
      ))}

      {/* Left dimension chain — feet-inches, rotated. */}
      {dims.map((d, i) => (
        <G key={`d-${i}`}>
          <Line x1={dimX} y1={d.y0} x2={dimX} y2={d.y1} stroke={BP_DIM} strokeWidth={0.7} />
          <Line x1={dimX - 3} y1={d.y0} x2={dimX + 3} y2={d.y0} stroke={BP_DIM} strokeWidth={0.7} />
          <Line x1={dimX - 3} y1={d.y1} x2={dimX + 3} y2={d.y1} stroke={BP_DIM} strokeWidth={0.7} />
          {d.y1 - d.y0 > 14 ? (
            <SvgText x={dimX - 8} y={(d.y0 + d.y1) / 2} textAnchor="middle" fontSize={6.5} fill={BP_DIM} rotation={-90} originX={dimX - 8} originY={(d.y0 + d.y1) / 2}>
              {ftIn(d.ft)}
            </SvgText>
          ) : null}
        </G>
      ))}

      {/* Right member-spec tags. */}
      {tags.map((t, i) => (
        <SvgText key={`t-${i}`} x={bayR + 14} y={t.y} fontSize={6.5} fill={BP_LINE}>
          {t.text}
        </SvgText>
      ))}

      {/* Grade tick + footer. */}
      <SvgText x={bayL - 12} y={sillY - 3} fontSize={6} fill={BP_DIM}>grade</SvgText>
      <SvgText x={width / 2} y={H - 6} textAnchor="middle" fontSize={7} fill={BP_DIM}>
        {regimeLabel ? `${regimeLabel} · ` : ""}footing {Math.round(frostDepthIn)}" (RI frost) · MODELED
      </SvgText>
    </Svg>
  );
}
