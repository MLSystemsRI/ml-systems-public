import { View, Text, Pressable, LayoutAnimation } from "react-native";
import type { StreetCandidate } from "@/lib/vera-assessor";

/**
 * StreetConfirmCard — VERA's "did you mean?" when the address as typed isn't on the
 * town's assessor rolls, but a near-match IS. Towns list streets their own way
 * ("HIGHBUSH TER", not "highbush terr"); rather than fail silently, VERA offers the
 * closest parcels she found and lets the homeowner pick the real one. Deterministic,
 * zero AI — the candidates come from vera-assessor.findAddressCandidates.
 */

const VERA = "#34D399";

export function StreetConfirmCard({
  candidates,
  onConfirm,
  onDismiss,
}: {
  candidates: StreetCandidate[];
  onConfirm: (c: StreetCandidate) => void;
  onDismiss: () => void;
}) {
  if (!candidates.length) return null;
  return (
    <View className="rounded-xl border mb-2" style={{ borderColor: `${VERA}44`, backgroundColor: `${VERA}0D` }}>
      <View className="px-3 py-2.5">
        <Text style={{ color: VERA }} className="text-[9px] font-bold tracking-widest mb-1">DID YOU MEAN?</Text>
        <Text className="text-[#E5E7EB] text-[11px] leading-4 mb-2">
          I couldn&apos;t find that address exactly as typed, but the town lists these close by.
          Tap the right one and I&apos;ll pull its record.
        </Text>
        {candidates.map((c) => (
          <Pressable
            key={c.pid}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onConfirm(c);
            }}
            className="flex-row items-center rounded-lg px-2.5 py-2 mb-1 border"
            style={{ borderColor: `${VERA}33`, backgroundColor: `${VERA}0A` }}
          >
            <Text className="text-[#E5E7EB] text-[12px] font-semibold flex-1" numberOfLines={1}>{c.label}</Text>
            <Text style={{ color: VERA }} className="text-[13px] ml-2">✓</Text>
          </Pressable>
        ))}
        <Pressable onPress={onDismiss} className="items-center py-1.5 mt-0.5">
          <Text className="text-[#6B7280] text-[10px]">None of these — I&apos;ll re-type the address</Text>
        </Pressable>
      </View>
    </View>
  );
}
