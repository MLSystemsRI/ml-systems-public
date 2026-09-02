import { useEffect, useRef } from "react";
import { View, Text, Pressable, Image, Animated, Easing, StyleSheet } from "react-native";
import { router } from "expo-router";
import { AuroraWeaveBorder } from "@/components/aurora-weave-border";

/**
 * The Collective Portal — the Hub's living front door.
 *
 * One flat, clipped square card: a polished aurora scene fills it, "Welcome to ML Systems" fades in
 * and out at the top, and the "Let's build." glass pill at the bottom opens the homeowner chat.
 * A silver + purple weave border frames it. (Rewritten flat so the image can't spill past the
 * rounded corners — radius lives on the card AND the image for Android clipping.)
 */

const HERO = require("../assets/avatars/scenes/welcome/aurora-clean-2.png");
const VIOLET = "#8B5CF6";
const SILVER = "#DCE2EE";
const RADIUS = 24;

/** Fade in, hold, fade out, hold — loop. */
function useFadeLoop(fadeMs: number, holdInMs: number, holdOutMs: number, from = 0) {
  const v = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: fadeMs, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(holdInMs),
        Animated.timing(v, { toValue: 0, duration: fadeMs, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(holdOutMs),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, fadeMs, holdInMs, holdOutMs]);
  return v;
}

export function CollectivePortal() {
  const word = useFadeLoop(5000, 0, 0, 0); // slow 5s-in / 5s-out breathe
  const go = () => router.push("/collective-chat" as any);

  return (
    // shadow wrapper (no clip — the violet glow needs to escape)
    <View
      className="mb-6"
      style={{ borderRadius: RADIUS, shadowColor: VIOLET, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } }}
    >
      {/* the card: a single clipped square that everything lives inside */}
      <View
        style={{
          width: "100%",
          aspectRatio: 1,
          borderRadius: RADIUS,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: VIOLET,
          backgroundColor: "#0A0A0A",
        }}
      >
        {/* background image — radius on the image itself so it clips on Android too */}
        <Image
          source={HERO}
          resizeMode="cover"
          style={[StyleSheet.absoluteFillObject, { borderRadius: RADIUS }]}
        />

        {/* Title — top, fading in/out */}
        <Animated.Text
          className="absolute left-4 right-4 top-6 text-white text-[26px] font-extrabold text-center"
          style={{
            opacity: word,
            textShadowColor: "rgba(0,0,0,0.85)",
            textShadowRadius: 12,
            textShadowOffset: { width: 0, height: 2 },
          }}
        >
          Welcome to ML Systems
        </Animated.Text>

        {/* Chat — glass pill pinned to the bottom (home glows through) */}
        <Pressable
          onPress={go}
          className="absolute left-3.5 right-3.5 bottom-3.5 rounded-2xl px-4 py-3 flex-row items-center justify-between"
          style={{ backgroundColor: "rgba(10,10,10,0.55)", borderWidth: 1, borderColor: `${VIOLET}66` }}
        >
          <Text className="text-[#C7CCD8] text-[13px]">Let's build.</Text>
          <Text style={{ color: SILVER }} className="text-[15px] font-bold">
            →
          </Text>
        </Pressable>

        {/* Thin silver + purple streaks flowing around the whole card */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <AuroraWeaveBorder color={VIOLET} bright={SILVER} radius={RADIUS} both={false} frame={false} full weight={2} idKey="portal" />
        </View>
      </View>
    </View>
  );
}
