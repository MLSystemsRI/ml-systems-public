import { useState } from "react";
import { View, Text, Pressable, TouchableOpacity, Image, LayoutChangeEvent } from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDrawer } from "@/lib/drawer";
import { DnaIcon } from "@/components/dna-icon";
import { LoopIcon } from "@/components/loop-icon";
import { DnaStrand, phaseNodeYs } from "@/components/dna-strand";
import { MindNode } from "@/components/mind-node";
import { VALUE_CHAIN_PHASES } from "@/lib/example-chain";
import { AGENT_MINDS } from "@/lib/agents";

/** "What is the Value Chain" — one full-screen interactive DNA strand. The value chain runs
 *  top→bottom as a dollar-sign double helix; the five phases sit on it as nodes. Tap a phase
 *  to light it up and reveal its one-line explanation. Simplified + merged onto the picture
 *  (no cards). Static — safe on the no-login demo. */

type Phase = { key: string; accent: string; line: string };

const PHASES: Phase[] = [
  { key: VALUE_CHAIN_PHASES[0], accent: "#22C55E", line: "Lenders compete in PIT LORD's pit — a full-build RCM, or a small decon loan (~$10k) to take the home apart first; your whole payment builds equity from day one, interest waits." },
  { key: VALUE_CHAIN_PHASES[1], accent: "#F97316", line: "We recover, not demolish — 80–90% of materials feed the rebuild, funded by the $10k decon loan." },
  { key: VALUE_CHAIN_PHASES[2], accent: "#60A5FA", line: "AI plans an ML Hybrid structure, built to come apart next cycle." },
  { key: VALUE_CHAIN_PHASES[3], accent: "#84CC16", line: "Recovered materials rebuild it bigger: +10% footprint, one level up." },
  { key: VALUE_CHAIN_PHASES[4], accent: "#FFE500", line: "New equity funds the next loan — value compounds ~1.43× a cycle." },
];

const AXIS_GAP = 40; // distance from the central strand axis to a phase block

// Each agent-mind claims its Value Chain phase node (from lib/agents.ts). Mapped by slug in phase
// order (Finance→PIT LORD, Decon→REAPER, Design→CDA, Build→MURPHY, Loop→PI). Uses the mind's cropped
// `nodeImage` when it has one, else its `avatar` — so MURPHY fills Build and PI fills Loop today,
// upgradable to dedicated node crops later.
const PHASE_SLUGS = ["pit-lord", "reaper", "cda", "murphy", "pi"] as const;
const PHASE_AGENTS = PHASE_SLUGS.map((slug) => AGENT_MINDS.find((a) => a.slug === slug));
const NODE_R = 26; // half the orb size
const BG_ASPECT = 1408 / 2944; // backdrop w/h

export default function ValueChainExplainer() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  const [sel, setSel] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  const centerX = size.w / 2;
  const nodeYs = size.h > 0 ? phaseNodeYs(size.h, PHASES.length) : [];
  // Fit-to-screen backdrop: whole image at the largest size that fits (contain), numeric dims.
  const bgH = size.h > 0 ? Math.min(size.h, size.w / BG_ASPECT) : 0;
  const bgW = bgH * BG_ASPECT;

  return (
    <View className="flex-1 bg-[#0A0A0A]" onLayout={onLayout}>
      {/* Layer 0 — the Fusion 2 render (words + $ columns + helix), fit to screen: the whole
          image at the largest size that fits, via explicit numeric dims (deterministic — % +
          resizeMode kept rendering a zoomed crop). */}
      {size.w > 0 && size.h > 0 && (
        <View
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
          pointerEvents="none"
        >
          <Image
            source={require("../../assets/value-chain-backdrop.jpg")}
            resizeMode="contain"
            style={{ width: bgW, height: bgH, opacity: 0.8 }}
          />
        </View>
      )}

      {/* Layer 1 — the live DNA strand, bright & crisp: centered on the same axis as the
          render, so the vector helix + nodes reinforce it (they're the only labels now). */}
      {size.w > 0 && size.h > 0 && (
        <View style={{ position: "absolute", left: 0, top: 0 }}>
          <DnaStrand width={size.w} height={size.h} accents={PHASES.map((p) => p.accent)} selected={sel} />
        </View>
      )}

      {/* Layer 1.6 — each mind claims its phase node: its cropped scene orb + lens glow floats
          on the strand. Data-driven from AGENT_MINDS (a phase lights up as its mind is stylized). */}
      {nodeYs.map((y, i) => {
        const agent = PHASE_AGENTS[i];
        const orb = agent?.nodeImage ?? agent?.avatar;
        if (!agent || !orb) return null;
        const glow = agent.lens_theme?.particles?.color ?? agent.color;
        return (
          <Pressable
            key={`node-${i}`}
            onPress={() => setSel(i)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ position: "absolute", left: centerX - NODE_R, top: y - NODE_R }}
          >
            <MindNode source={orb} glow={glow} ring={agent.color} size={NODE_R * 2} selected={sel === i} />
          </Pressable>
        );
      })}

      {/* Layer 1.5 — top scrim so the title reads over the strand */}
      {size.w > 0 && (
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: insets.top + 80 }} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <SvgLinearGradient id="vcTopScrim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#0A0A0A" stopOpacity="0.92" />
                <Stop offset="1" stopColor="#0A0A0A" stopOpacity="0" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#vcTopScrim)" />
          </Svg>
        </View>
      )}

      {/* Layer 2 — title + hamburger, pinned top */}
      <View style={{ position: "absolute", left: 0, right: 0, top: insets.top + 10, paddingHorizontal: 16 }}>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={open}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="rounded-full items-center justify-center"
            style={{ width: 34, height: 34, backgroundColor: "rgba(10,10,10,0.55)" }}
          >
            <Text className="text-[#e8f0fb] text-2xl leading-none">☰</Text>
          </TouchableOpacity>
          <DnaIcon size={22} />
          <LoopIcon size={22} />
          <Text className="text-[#F9FAFB] text-xl font-extrabold">The Value Chain</Text>
        </View>
        <Text className="text-[#6B7280] text-[12px] mt-1 ml-[46px]">
          Two strands. Five phases. One loop. <Text className="text-[#7aa0ff]">Tap a phase →</Text>
        </Text>
      </View>

      {/* Layer 3 — the five phase blocks, alternating sides of the strand */}
      {nodeYs.map((y, i) => {
        const p = PHASES[i]!;
        const on = i === sel;
        const left = i % 2 === 0; // even → left of the axis, odd → right
        const boxStyle = left
          ? { position: "absolute" as const, top: y - 22, right: size.w - (centerX - AXIS_GAP), maxWidth: centerX - AXIS_GAP - 12 }
          : { position: "absolute" as const, top: y - 22, left: centerX + AXIS_GAP, right: 12 };
        return (
          <Pressable
            key={p.key}
            onPress={() => setSel(i)}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={boxStyle}
          >
            <View className={left ? "items-end" : "items-start"}>
              <View className="flex-row items-center gap-1.5" style={{ flexDirection: left ? "row-reverse" : "row" }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.accent, opacity: on ? 1 : 0.5 }} />
                <Text
                  style={{ color: p.accent, opacity: on ? 1 : 0.7, textShadowColor: "#000", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } }}
                  className="text-[13px] font-black uppercase tracking-[0.12em]"
                >
                  {p.key}
                </Text>
              </View>
              {on && (
                <Text
                  style={{ textShadowColor: "#000", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } }}
                  className={`text-[#e5eaf0] text-[12px] leading-snug mt-1 ${left ? "text-right" : "text-left"}`}
                >
                  {p.line}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
