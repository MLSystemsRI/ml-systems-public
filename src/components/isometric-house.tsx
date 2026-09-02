import { View, TouchableOpacity } from "react-native";
import Svg, { Ellipse, Path, Line, Rect, Text as SvgText } from "react-native-svg";
import type { ConformingBuild } from "@/lib/design-examples";

// Native port of the web studio's IsometricHouse
// (apps/design-studio/src/components/swarm-house-render.tsx). Pure isometric
// projection — foundation, walls, story/bay lines, windows, door, roof-by-type,
// conformity badge — rendered with react-native-svg. Shows the outer shell of
// one converged conforming build.
export function IsometricHouse({
  build,
  selected = false,
  onPress,
}: {
  build: ConformingBuild;
  selected?: boolean;
  onPress?: () => void;
}) {
  const bayPx = 28; // 1 bay = 20' = 28px
  const ftPx = 1.4; // 1 foot = 1.4px

  const totalW = build.baysX * bayPx;
  const totalD = build.baysY * bayPx;

  const stories = build.storyHeights;
  const foundationH = build.aboveGradeFoundation * ftPx;
  const totalWallH = stories.reduce((a, b) => a + b * ftPx, 0);
  const roofH =
    build.roofType === "flat"
      ? 4
      : Math.tan((build.roofPitch * Math.PI) / 180) * (totalW / 2) * 0.4;

  // Isometric projection
  const iso = (x: number, y: number, z: number) => ({
    x: 120 + (x - y) * 0.75,
    y: 140 + (x + y) * 0.38 - z,
  });
  const pt = (p: { x: number; y: number }) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;

  // Base + foundation + wall corners
  const fl = iso(0, 0, 0);
  const fr = iso(totalW, 0, 0);
  const br = iso(totalW, totalD, 0);
  const ffl = iso(0, 0, foundationH);
  const ffr = iso(totalW, 0, foundationH);
  const fbr = iso(totalW, totalD, foundationH);

  const wallZ = foundationH + totalWallH;
  const tfl = iso(0, 0, wallZ);
  const tfr = iso(totalW, 0, wallZ);
  const tbr = iso(totalW, totalD, wallZ);
  const tbl = iso(0, totalD, wallZ);

  // Story division heights
  const storyLines: number[] = [];
  let accZ = foundationH;
  for (let i = 0; i < stories.length - 1; i++) {
    accZ += stories[i]! * ftPx;
    storyLines.push(accZ);
  }

  // Bay grid line x-positions
  const bayLines: number[] = [];
  for (let i = 1; i < build.baysX; i++) bayLines.push(i * bayPx);

  const roofZ = wallZ + roofH;
  const c = build.color;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.85 : 1} disabled={!onPress}>
      <View style={{ width: "100%", aspectRatio: 240 / 170 }}>
        <Svg width="100%" height="100%" viewBox="0 0 240 170">
          {/* Ground shadow */}
          <Ellipse
            cx={(fl.x + br.x) / 2}
            cy={(fl.y + br.y) / 2 + 4}
            rx={totalW * 0.6}
            ry={totalD * 0.2}
            fill={`${c}08`}
          />

          {/* Foundation (visible above grade) */}
          {foundationH > 2 ? (
            <>
              <Path d={`M${pt(fl)} L${pt(fr)} L${pt(ffr)} L${pt(ffl)} Z`} fill="#0D0D0D" stroke={`${c}20`} strokeWidth={0.4} />
              <Path d={`M${pt(fr)} L${pt(br)} L${pt(fbr)} L${pt(ffr)} Z`} fill="#080808" stroke={`${c}15`} strokeWidth={0.4} />
            </>
          ) : null}

          {/* Front wall */}
          <Path
            d={`M${pt(ffl.y > fl.y ? fl : ffl)} L${pt(ffr.y > fr.y ? fr : ffr)} L${pt(tfr)} L${pt(tfl)} Z`}
            fill="#111111"
            stroke={`${c}35`}
            strokeWidth={0.5}
          />
          {/* Right wall */}
          <Path
            d={`M${pt(ffr.y > fr.y ? fr : ffr)} L${pt(fbr.y > br.y ? br : fbr)} L${pt(tbr)} L${pt(tfr)} Z`}
            fill="#1A1A1A"
            stroke={`${c}25`}
            strokeWidth={0.5}
          />

          {/* Story division lines */}
          {storyLines.map((z, i) => {
            const l = iso(0, 0, z), r = iso(totalW, 0, z);
            return <Line key={`sf${i}`} x1={l.x} y1={l.y} x2={r.x} y2={r.y} stroke={`${c}20`} strokeWidth={0.3} strokeDasharray={[2, 2]} />;
          })}
          {storyLines.map((z, i) => {
            const f = iso(totalW, 0, z), b = iso(totalW, totalD, z);
            return <Line key={`sr${i}`} x1={f.x} y1={f.y} x2={b.x} y2={b.y} stroke={`${c}15`} strokeWidth={0.3} strokeDasharray={[2, 2]} />;
          })}

          {/* Bay grid lines (front) */}
          {bayLines.map((bx, i) => {
            const bot = iso(bx, 0, foundationH), top = iso(bx, 0, wallZ);
            return <Line key={`bf${i}`} x1={bot.x} y1={bot.y} x2={top.x} y2={top.y} stroke={`${c}12`} strokeWidth={0.3} strokeDasharray={[1, 3]} />;
          })}

          {/* Windows — one per bay per story */}
          {stories.map((sh, si) => {
            const storyBase = foundationH + stories.slice(0, si).reduce((a, b) => a + b * ftPx, 0);
            const storyMid = storyBase + sh * ftPx * 0.5;
            return Array.from({ length: build.baysX }, (_, bi) => {
              const center = iso((bi + 0.5) * bayPx, 0, storyMid);
              const winW = bayPx * 0.35, winH = sh * ftPx * 0.35;
              return (
                <Rect key={`w${si}-${bi}`} x={center.x - winW / 2} y={center.y - winH / 2} width={winW} height={winH} fill={`${c}08`} stroke={`${c}20`} strokeWidth={0.3} rx={0.5} />
              );
            });
          })}

          {/* Door — center of first floor */}
          {(() => {
            const dc = iso(totalW * 0.5, 0, foundationH + stories[0]! * ftPx * 0.25);
            const dW = bayPx * 0.25, dH = stories[0]! * ftPx * 0.45;
            return <Rect x={dc.x - dW / 2} y={dc.y - dH} width={dW} height={dH} fill={`${c}12`} stroke={`${c}30`} strokeWidth={0.4} rx={0.5} />;
          })()}

          {/* Roof */}
          {build.roofType === "flat" ? (
            <>
              <Path d={`M${pt(tfl)} L${pt(tfr)} L${pt(tbr)} L${pt(tbl)} Z`} fill="#141414" stroke={`${c}25`} strokeWidth={0.5} />
              {(() => {
                const pfl = iso(0, 0, wallZ + 3), pfr = iso(totalW, 0, wallZ + 3);
                return <Path d={`M${pt(tfl)} L${pt(tfr)} L${pt(pfr)} L${pt(pfl)} Z`} fill="#181818" stroke={`${c}20`} strokeWidth={0.4} />;
              })()}
              {(() => {
                const pfr = iso(totalW, 0, wallZ + 3), pbr = iso(totalW, totalD, wallZ + 3);
                return <Path d={`M${pt(tfr)} L${pt(tbr)} L${pt(pbr)} L${pt(pfr)} Z`} fill="#151515" stroke={`${c}15`} strokeWidth={0.4} />;
              })()}
            </>
          ) : build.roofType === "hip" ? (
            (() => {
              const inset = totalW * 0.3;
              const rl = iso(inset, totalD / 2, roofZ), rr = iso(totalW - inset, totalD / 2, roofZ);
              return (
                <>
                  <Path d={`M${pt(tfl)} L${pt(tfr)} L${pt(rr)} L${pt(rl)} Z`} fill="#1A1A1A" stroke={`${c}20`} strokeWidth={0.4} />
                  <Path d={`M${pt(tfr)} L${pt(tbr)} L${pt(rr)} Z`} fill="#161616" stroke={`${c}15`} strokeWidth={0.4} />
                  <Line x1={rl.x} y1={rl.y} x2={rr.x} y2={rr.y} stroke={`${c}30`} strokeWidth={0.5} />
                </>
              );
            })()
          ) : (
            (() => {
              const mf = iso(totalW / 2, 0, roofZ), mb = iso(totalW / 2, totalD, roofZ);
              return (
                <>
                  <Path d={`M${pt(tfl)} L${pt(tfr)} L${pt(mf)} Z`} fill="#181818" stroke={`${c}25`} strokeWidth={0.4} />
                  <Path d={`M${pt(tfr)} L${pt(tbr)} L${pt(mb)} L${pt(mf)} Z`} fill="#141414" stroke={`${c}20`} strokeWidth={0.4} />
                  <Line x1={mf.x} y1={mf.y} x2={mb.x} y2={mb.y} stroke={`${c}30`} strokeWidth={0.5} />
                </>
              );
            })()
          )}

          {/* Selection highlight */}
          {selected ? <Rect x={0} y={0} width={240} height={170} fill="none" stroke={c} strokeWidth={1.5} rx={8} opacity={0.4} /> : null}

          {/* Conformity badge */}
          <Rect x={195} y={10} width={38} height={16} rx={8} fill={`${c}20`} />
          <SvgText x={214} y={21} textAnchor="middle" fontSize={8} fontWeight="bold" fill={c}>
            {`${build.conformity.score}%`}
          </SvgText>
        </Svg>
      </View>
    </TouchableOpacity>
  );
}
