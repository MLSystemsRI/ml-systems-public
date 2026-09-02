import { View, Text, ScrollView } from "react-native";
import { AppHeader } from "@/components/app-header";
import { CompartmentChrome } from "@/components/compartment-chrome";
import { MilestoneList } from "@/components/milestone-list";
import { CREDENTIAL_SECTIONS, type CredentialStatus } from "@/lib/credentials-checklist";
import { useChecklistOverrides, setStatus } from "@/lib/credentials-store";

/** Equipment Packet — the hoisting → crane → excavator licensing track (RI DLT
 *  endorsements 208 · 102 · 204) plus the license-application submission packet.
 *  Separate from the operating-credentials path (/credentials); tap an item to advance
 *  its status, persisted (lib/credentials-store.ts). Presides under REAPER (orange). */

// Tap advances: pending → in_progress → complete → pending. Blocked → in_progress.
function nextStatus(current: CredentialStatus): CredentialStatus {
  switch (current) {
    case "blocked":
    case "pending":
      return "in_progress";
    case "in_progress":
      return "complete";
    default:
      return "pending";
  }
}

export default function EquipmentScreen() {
  const overrides = useChecklistOverrides();

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <AppHeader
        href="/equipment"
        title="Equipment Packet"
        subtitle="Hoisting · Crane · Excavator — DLT endorsements"
      />
      <ScrollView
        className="flex-1"
        style={{ zIndex: 1 }}
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
      >
        <Text className="text-[#9CA3AF] text-[12.5px] leading-5 mb-4 mt-1">
          The credential to operate crane and excavator equipment on ML Systems sites — three DLT
          endorsements plus the license packet. Tap any item to advance its status; saved on this device.
        </Text>

        {CREDENTIAL_SECTIONS.map((section) => {
          const milestones = section.items.map((it) => ({
            id: it.id,
            name: it.name,
            entity: it.entity,
            description: it.description,
            blockerNotes: it.blockerNotes,
            status: (overrides[it.id] as CredentialStatus) ?? it.defaultStatus,
          }));
          const done = milestones.filter((m) => m.status === "complete").length;

          return (
            <View
              key={section.id}
              className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-4"
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[#F97316] text-[10px] font-bold uppercase tracking-wider">
                  {section.title}
                </Text>
                <Text className="text-[#6B7280] text-[10px] font-mono">
                  {done} / {milestones.length}
                </Text>
              </View>
              {section.blurb ? (
                <Text className="text-[#6B7280] text-[11px] mb-3">{section.blurb}</Text>
              ) : (
                <View className="mb-3" />
              )}
              <MilestoneList
                milestones={milestones}
                dark
                onToggle={(id) => {
                  const current =
                    (overrides[id] as CredentialStatus) ??
                    section.items.find((i) => i.id === id)!.defaultStatus;
                  setStatus(id, nextStatus(current));
                }}
              />
            </View>
          );
        })}

        <Text className="text-center text-[#4B5563] text-[9.5px] font-mono tracking-wider mt-1">
          Entities, not names · LL · TT · MVE
        </Text>
      </ScrollView>
      <CompartmentChrome href="/equipment" />
    </View>
  );
}
