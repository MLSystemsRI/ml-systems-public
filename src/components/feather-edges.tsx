import { StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";

/**
 * Softens the outer edges of whatever sits beneath it.
 *
 * Sprite art arrives as a rectangle, and against a flat dark screen that rectangle
 * reads as a pasted-on box. This lays four short gradients of the background colour
 * along the edges so the art dissolves into the surface instead of ending at a line.
 *
 * It paints the background over the image rather than masking the image, which keeps
 * it cheap and works with plain <Image>. That only holds while the surface behind is
 * a solid colour — pass the colour it sits on.
 */
export function FeatherEdges({
  color = "#0A0A0A",
  /** How far in the fade reaches, as a fraction of each side. Small = a soft lip. */
  size = 0.22,
  /** Skip sides that are already clipped or meant to stay hard. */
  edges = { top: true, bottom: true, left: true, right: true },
  idKey = "fe",
}: {
  color?: string;
  size?: number;
  edges?: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean };
  idKey?: string;
}) {
  // Numeric units against a viewBox rather than percentages: on web react-native-svg
  // renders a real <svg>, and percentage width/height inside an absolutely positioned
  // box collapses to nothing, so the fade silently disappeared there. preserveAspectRatio
  // "none" lets the 100×100 grid stretch to whatever shape it's covering.
  const band = Math.round(Math.min(50, Math.max(2, size * 100)));
  const g = (dir: string) => `feather-${idKey}-${dir}`;

  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <Defs>
        {/* each gradient runs from the solid edge inward to nothing */}
        <LinearGradient id={g("top")} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={g("bottom")} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={g("left")} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={g("right")} x1="1" y1="0" x2="0" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {edges.top ? <Rect x={0} y={0} width={100} height={band} fill={`url(#${g("top")})`} /> : null}
      {edges.bottom ? <Rect x={0} y={100 - band} width={100} height={band} fill={`url(#${g("bottom")})`} /> : null}
      {edges.left ? <Rect x={0} y={0} width={band} height={100} fill={`url(#${g("left")})`} /> : null}
      {edges.right ? <Rect x={100 - band} y={0} width={band} height={100} fill={`url(#${g("right")})`} /> : null}
    </Svg>
  );
}
