import { View, Text, ScrollView } from "react-native";
import { AppHeader } from "@/components/app-header";
import { CompartmentChrome } from "@/components/compartment-chrome";
import { FieldOpsPath } from "@/components/field-ops-path";

/** Operating Credentials — ML Systems LLC's road to legally operate. The merged
 *  "critical path" timeline (formerly the Crew › Path tab): entity + EIN + insurance
 *  + GC registration + licensing, with the GL rent-vs-buy decision node. Tap a step's
 *  status node to advance it; the override is persisted (lib/credentials-store.ts).
 *  The hoisting/crane/excavator licensing lives separately in /equipment. */

export default function CredentialsScreen() {
  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <AppHeader
        href="/credentials"
        title="Operating Credentials"
        subtitle="ML Systems LLC — road to operate"
      />
      <ScrollView
        className="flex-1"
        style={{ zIndex: 1 }}
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
      >
        <Text className="text-[#9CA3AF] text-[12.5px] leading-5 mb-4 mt-1">
          The entity's path to legal field access — insurance gates registration, registration makes
          field work legal. Tap any status to advance it; saved on this device.
        </Text>

        <FieldOpsPath />

        <Text className="text-center text-[#4B5563] text-[9.5px] font-mono tracking-wider mt-2">
          Entities, not names · LL · TT · MVE
        </Text>
      </ScrollView>
      <CompartmentChrome href="/credentials" />
    </View>
  );
}
