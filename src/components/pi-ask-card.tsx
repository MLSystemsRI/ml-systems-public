import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import type { PiAsk } from "@/lib/pi-asks";
import { EntryAnswer } from "@/components/entry-answer";

/**
 * PiAskCard — PI asks for the next owed ledger entry, the homeowner answers here
 * (Sal 9/6). Pinned above the chat composer once the record is confirmed — the same
 * slot VERA's intake card held — so PI's stream of consciousness is visible and
 * answerable without scrolling. The answer files through the same `EntryAnswer` the
 * ledger rows use; the ledger recompiles and the next ask rises on its own.
 */

const PI = "#22C55E";

export function PiAskCard({
  address,
  asks,
  yearBuilt,
  onSkip,
}: {
  address: string;
  /** PI's asks in order — the card shows the first; the count shows the rest. */
  asks: readonly PiAsk[];
  yearBuilt?: number | undefined;
  onSkip: (code: string) => void;
}) {
  const [ack, setAck] = useState<string | null>(null);
  const ask = asks[0];
  if (!ask) {
    return (
      <View className="rounded-2xl px-3.5 py-2.5 mb-2" style={{ backgroundColor: `${PI}0A`, borderWidth: 1, borderColor: `${PI}3A` }}>
        <Text style={{ color: PI }} className="text-[10px] font-semibold">🌱 PI — nothing owed right now. Every entry the plans need has a real source.</Text>
      </View>
    );
  }
  return (
    <View className="rounded-2xl px-3.5 py-3 mb-2" style={{ backgroundColor: `${PI}0A`, borderWidth: 1, borderColor: `${PI}3A` }}>
      <View className="flex-row items-center gap-2 mb-1">
        <Text style={{ color: PI }} className="text-[9px] font-bold uppercase tracking-widest flex-1">🌱 PI · {asks.length} to fill</Text>
        <Pressable onPress={() => onSkip(ask.code)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Text className="text-[#6B7280] text-[9px]">skip →</Text>
        </Pressable>
      </View>
      <Text className="text-[#E5E7EB] text-[12px] font-semibold leading-4">{ask.ask}</Text>
      <Text className="text-[#6B7280] text-[9px] mt-0.5">{ask.why}</Text>
      <EntryAnswer
        address={address}
        code={ask.code}
        yearBuilt={yearBuilt}
        placeholder={ask.hint ?? "Type it here…"}
        onSaved={(v) => setAck(v ? `Got it — filed on the record.` : null)}
      />
      {ack ? <Text style={{ color: PI }} className="text-[9px] mt-1">{ack}</Text> : null}
    </View>
  );
}
