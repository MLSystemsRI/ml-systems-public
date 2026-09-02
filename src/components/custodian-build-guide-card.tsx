import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import type { CustodianOverlook } from "@ml-systems/types";

/**
 * CustodianBuildGuideCard — PI welcomes the homeowner and centers them on their home.
 *
 * PI (Project Intelligence, the homeowner's Lucent-Lens agency) is the ONE the homeowner
 * talks to. This is his intro: it's about the HOME entering the value chain — start with the
 * address, and the ledger compiles from there. No agent names, no scores in the welcome; the
 * `overlook` is still accepted so the pipeline can pass it, but the card no longer surfaces
 * the VERA × CDA handshake here (that lives on the ledger's own entries). Deterministic, zero AI.
 */

const PI = "#22C55E";       // PI's green — the homeowner's guide
const PI_BRIGHT = "#86EFAC"; // his lucent accent
const AURORA = "#14B8A6";   // aurora teal — the value-chain hue

export function CustodianBuildGuideCard({
  /** True once the home's address has resolved — the intro shifts from "pick a home" to "here's your ledger". */
  hasHome = false,
}: {
  /** Accepted for pipeline compatibility; no longer rendered in the welcome (kept off the intro). */
  overlook?: CustodianOverlook | null;
  /** Accepted for compatibility; the simplified intro no longer counts stages. */
  stageCount?: number;
  hasHome?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <View className="rounded-xl border mb-2" style={{ borderColor: `${AURORA}44`, backgroundColor: "rgba(20,184,166,0.05)" }}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        className="flex-row items-center px-3 py-2.5 gap-2"
      >
        <Text style={{ color: PI }} className="text-[12px]">🌱</Text>
        <Text style={{ color: PI }} className="text-[9px] font-bold tracking-widest flex-1" numberOfLines={1}>
          PI — YOUR VALUE CHAIN
        </Text>
        <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="px-3 pb-3">
          {hasHome ? (
            <Text className="text-[#E5E7EB] text-[11.5px] leading-4">
              I&apos;m PI — Project Intelligence. This is your home in the value chain, and this is
              your ledger — the one verified record everything we build for you grounds on.
            </Text>
          ) : (
            <>
              <Text className="text-[#E5E7EB] text-[11.5px] leading-4">
                I&apos;m PI — Project Intelligence. Let&apos;s start with the home you&apos;re putting
                into the value chain.
              </Text>
              <Text className="text-[#9CA3AF] text-[10.5px] leading-4 mt-2">
                Give me its <Text style={{ color: PI_BRIGHT }}>address</Text> and I&apos;ll pull its record
                and compile your ledger. The more we verify together, the less your build costs.
              </Text>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}
