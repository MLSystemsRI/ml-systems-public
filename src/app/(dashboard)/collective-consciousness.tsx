import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { VALUE_CHAIN_DOCS, type ValueChainDoc } from "@/lib/value-chain-manifest";
import { ValueChainViewer } from "@/components/value-chain-viewer";

/**
 * Collective Consciousness — the value-chain prototypes, in the app. A native gallery
 * of the bundled sandboxes (value-chain/); tapping one opens it in an in-app WebView.
 * Reached from the cockpit's Dual J-Space section. This is where the homeowner (and the
 * Custodian) can walk the whole force-multiplier thesis: the dual strands, the engine
 * loop, the compression floor, each mind's wire into the swarm.
 */
export default function CollectiveConsciousnessScreen() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<ValueChainDoc | null>(null);

  // Deep-link: /collective-consciousness?doc=<slug> auto-opens that prototype
  // (e.g. the cockpit's Ontology Compression CTA lands straight on the ontology map).
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || !doc) return;
    deepLinked.current = true;
    const match = VALUE_CHAIN_DOCS.find((d) => d.slug === doc);
    if (match) setOpen(match);
  }, [doc]);

  // Opening the gallery is a learning signal — feed PI's ledger once per mount.
  const observe = trpc.pi.observe.useMutation();
  const observed = useRef(false);
  useEffect(() => {
    if (observed.current) return;
    observed.current = true;
    observe.mutate({ surface: "collective-consciousness", detail: "opened the value-chain gallery" });
    // fire-and-forget; errors are non-fatal to the screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (open) {
    return (
      <View className="flex-1 bg-[#07090c]">
        <View
          className="flex-row items-center gap-3 px-4 pb-2"
          style={{ paddingTop: insets.top + 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" }}
        >
          <TouchableOpacity onPress={() => setOpen(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ color: open.color }} className="text-[13px] font-bold">‹ Back</Text>
          </TouchableOpacity>
          <Text className="text-[#F9FAFB] text-[13px] font-bold flex-1" numberOfLines={1}>{open.title}</Text>
          <Text style={{ color: open.color }} className="text-[9px] font-bold uppercase tracking-widest">{open.mind}</Text>
        </View>
        <ValueChainViewer module={open.module} tint={open.color} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}
      >
        <View className="flex-row items-center gap-3 mb-1">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text className="text-[#22C55E] text-[13px] font-bold">‹</Text>
          </TouchableOpacity>
          <Text className="text-[#F9FAFB] text-lg font-extrabold">Collective Consciousness</Text>
          <Text>🧬</Text>
        </View>
        <Text className="text-[#6B7280] text-[11px] mb-5 leading-snug">
          The value chain, made legible — one input, two strands, one force multiplier for the homeowner.
          Walk each prototype: the dual J-Space hub, the engine loop, the compression floor, each mind&apos;s wire.
        </Text>

        <View style={{ gap: 10 }}>
          {VALUE_CHAIN_DOCS.map((doc) => (
            <TouchableOpacity
              key={doc.slug}
              onPress={() => setOpen(doc)}
              activeOpacity={0.85}
              className="rounded-2xl p-4"
              style={{ backgroundColor: `${doc.color}0D`, borderWidth: 1, borderColor: `${doc.color}30` }}
            >
              <View className="flex-row items-center gap-2 mb-1.5">
                <View className="rounded-full" style={{ width: 7, height: 7, backgroundColor: doc.color }} />
                <Text className="text-[#F9FAFB] text-[13.5px] font-bold flex-1">{doc.title}</Text>
                <Text style={{ color: doc.color }} className="text-[9px] font-bold uppercase tracking-widest">{doc.mind}</Text>
              </View>
              <Text className="text-[#9CA3AF] text-[11.5px] leading-snug">{doc.concept}</Text>
              <Text style={{ color: doc.color }} className="text-[10px] font-bold mt-2">Open →</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
