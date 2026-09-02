import { useEffect, useRef } from "react";
import { Animated, Easing, Image, View, type ImageSourcePropType } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";

/**
 * MindNode — an agent-mind's floating avatar orb for a value-chain node. The mind's cropped
 * scene sits in a ring, over a real radial "ember" glow halo, and gently bobs (floats). Colors
 * come from the mind's lens_theme (AGENT_MINDS) so each mind styles its own node. First user:
 * REAPER on the Decon node (molten-orange glow).
 */

let _gid = 0;

export function MindNode({
  source,
  glow,
  ring,
  size = 52,
  selected = false,
}: {
  source: ImageSourcePropType;
  glow: string; // ember glow color
  ring: string; // orb border color
  size?: number;
  selected?: boolean;
}) {
  const R = size / 2;
  const halo = Math.round(size * 2.5);
  const gid = useRef(`mnGlow${_gid++}`).current;

  // gentle float (bob) — transform-only, native-driver safe
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] });

  return (
    <Animated.View
      style={{ width: size, height: size, transform: [{ translateY }, { scale: selected ? 1.08 : 1 }] }}
    >
      {/* Ember glow halo behind the orb — a real radial gradient, not a border. */}
      <View style={{ position: "absolute", left: R - halo / 2, top: R - halo / 2, width: halo, height: halo }} pointerEvents="none">
        <Svg width={halo} height={halo}>
          <Defs>
            <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={glow} stopOpacity={selected ? 0.8 : 0.55} />
              <Stop offset="0.5" stopColor={glow} stopOpacity={selected ? 0.4 : 0.25} />
              <Stop offset="1" stopColor={glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill={`url(#${gid})`} />
        </Svg>
      </View>

      {/* The orb — the mind's cropped scene in a ring. */}
      <Image
        source={source}
        resizeMode="cover"
        style={{
          width: size,
          height: size,
          borderRadius: R,
          borderWidth: selected ? 3 : 2,
          borderColor: ring,
          backgroundColor: "#0A0A0A",
        }}
      />
    </Animated.View>
  );
}
