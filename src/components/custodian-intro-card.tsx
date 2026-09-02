import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import { trpc } from "@/lib/trpc";

/**
 * CustodianIntroCard — the overseer steps forward, right where VERA's intake
 * confirm hands off (record signed → financing talk begins).
 *
 * Deterministic, zero AI: a brief intro in the Custodian's voice (V0 · #F5D060 ·
 * TT · LL · MVE, fiduciary + operational governance), what happens next in the
 * chain, and THE ONE-ENTRY RULE — a homeowner holds ONE value-chain home entry
 * until the Custodian reviews it in VC Homes; verification opens the second.
 * The rule's state is LIVE from vc.myHome (fail-soft: signed-out/local homes get
 * the static rule text).
 */

const GOLD = "#F5D060";

export function CustodianIntroCard() {
  // Collapsed by default — a slim one-line bar above the input, not a tall block (Sal 8/26).
  const [open, setOpen] = useState(false);

  // Server truth for the one-entry rule — fail-soft (null = local/signed-out).
  const myHomeQ = trpc.vc.myHome.useQuery(undefined, { retry: 0 });
  const myHome = (myHomeQ.data ?? null) as
    | { address: string | null; vcVerificationStatus?: "not_started" | "in_progress" | "verified" | null }
    | null;
  const status = myHome?.vcVerificationStatus ?? null;

  // The one-entry rule ends at "until it's verified" — nothing after (Sal 8/20).
  const entryLine = !myHome
    ? "Your value chain holds one home entry until it's verified."
    : status === "verified"
      ? `◆ ${myHome.address ?? "Your home"} is verified.`
      : status === "in_progress"
        ? `Your value chain holds one home entry until it's verified. ${myHome.address ?? "Your home"} — verification underway.`
        : `Your value chain holds one home entry until it's verified. ${myHome.address ?? "Your home"} is with me for review.`;

  return (
    <View className="rounded-xl border mb-2" style={{ borderColor: `${GOLD}44`, backgroundColor: `${GOLD}0D` }}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        className="flex-row items-center px-3 py-2.5 gap-2"
      >
        <Text style={{ color: GOLD }} className="text-[12px]">⚖</Text>
        <Text style={{ color: GOLD }} className="text-[9px] font-bold tracking-widest flex-1" numberOfLines={1}>
          THE CUSTODIAN — YOUR GUIDE
        </Text>
        {status === "verified" ? (
          <Text style={{ color: GOLD, borderColor: `${GOLD}55`, backgroundColor: `${GOLD}14` }} className="text-[8px] font-bold rounded-full px-1.5 py-0.5 border">
            ◆ verified
          </Text>
        ) : null}
        <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="px-3 pb-3">
          <Text className="text-[#E5E7EB] text-[11.5px] leading-4">
            VERA verified your record with you — from here, I&apos;m your guide. I&apos;m the
            Custodian: I oversee everything that happens to your home, and nothing
            reaches your value chain without passing my gate.
          </Text>
          <Text className="text-[#9CA3AF] text-[10.5px] leading-4 mt-2">
            What happens next: financing opens only when YOU say yes to deconstruction ·
            your home&apos;s materials get valued · the build gets sequenced · and it all
            lands in your Value Chain Portfolio. You&apos;ll see the work happening —
            I&apos;m the one you talk to.
          </Text>
          {/* The one-entry rule — live from the record. */}
          <View className="mt-2.5 rounded-lg px-2.5 py-2 border" style={{ borderColor: `${GOLD}33`, backgroundColor: `${GOLD}0A` }}>
            <Text style={{ color: GOLD }} className="text-[8.5px] font-bold tracking-wider mb-0.5">THE ONE-ENTRY RULE</Text>
            <Text className="text-[#D1D5DB] text-[10.5px] leading-4">{entryLine}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
