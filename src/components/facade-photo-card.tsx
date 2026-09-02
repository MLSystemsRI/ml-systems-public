import { useState } from "react";
import { View, Text, Image } from "react-native";
import type { HomeGenome } from "@ml-systems/types";

/**
 * FacadePhotoCard — the home's real front elevation, on the master ledger.
 *
 * Display evidence, not a conformity code: the photo lives on the genome as a cloud
 * (R2) URL and rides `vc_ontology.genome`, so it's part of the persisted ledger CDA
 * builds from. Renders only when a URL is present; fail-soft on a load error.
 */

const GOLD = "#F5D060";

const SRC_LABEL: Record<string, string> = {
  homeowner: "HOMEOWNER",
  "street-view": "STREET VIEW",
  assessor: "ASSESSOR",
};

export function FacadePhotoCard({ genome }: { genome?: HomeGenome | null }) {
  const url = genome?.facadePhotoUrl;
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;
  const srcLabel = SRC_LABEL[genome?.facadePhotoSrc ?? "homeowner"] ?? "HOMEOWNER";

  return (
    <View className="rounded-2xl border overflow-hidden mb-4" style={{ borderColor: `${GOLD}33`, backgroundColor: `${GOLD}0A` }}>
      <View className="flex-row items-center px-3 pt-2.5 pb-1.5 gap-2">
        <Text style={{ color: GOLD }} className="text-[9px] tracking-widest flex-1" numberOfLines={1}>
          🏠 FRONT ELEVATION — on the value-chain ledger
        </Text>
        <Text style={{ color: GOLD }} className="text-[7.5px] font-bold tracking-wider">{srcLabel}</Text>
      </View>
      <Image
        source={{ uri: url }}
        style={{ width: "100%", height: 200 }}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
      <Text className="text-[#6B7280] text-[9px] px-3 py-2" numberOfLines={1}>
        The real facade CDA reads the windows, doors, and siding against.
      </Text>
    </View>
  );
}
