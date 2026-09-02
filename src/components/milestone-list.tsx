import { View, Text, TouchableOpacity } from "react-native";
import { Badge, statusVariant } from "./badge";
import { formatDate } from "@/lib/format";

type MilestoneStatus = "pending" | "in_progress" | "complete" | "blocked";

interface Milestone {
  id: string;
  name: string;
  status: MilestoneStatus;
  /** Issuing / verifying entity — rendered as a small org line under the name. */
  entity?: string | null;
  description?: string | null;
  plannedDate?: string | null;
  completedDate?: string | null;
  blockerNotes?: string | null;
}

const STATUS_ICON: Record<MilestoneStatus, string> = {
  complete:    "✓",
  in_progress: "◎",
  pending:     "○",
  blocked:     "✕",
};

const STATUS_COLOR: Record<MilestoneStatus, string> = {
  complete:    "text-[#2A7A4B]",
  in_progress: "text-[#D97706]",
  pending:     "text-[#D1D1D1]",
  blocked:     "text-[#DC2626]",
};

// Dark-surface variant of STATUS_COLOR — the pending grey reads too faint on
// #0A0A0A, and complete/in_progress get brighter tokens to sit on dark cards.
const STATUS_COLOR_DARK: Record<MilestoneStatus, string> = {
  complete:    "text-[#22C55E]",
  in_progress: "text-[#F59E0B]",
  pending:     "text-[#6B7280]",
  blocked:     "text-[#EF4444]",
};

interface MilestoneListProps {
  milestones: Milestone[];
  emptyMessage?: string;
  /** Dark-surface palette (decon screens sit on #0A0A0A). Defaults to light. */
  dark?: boolean;
  /** When set, each row becomes tappable and calls back with the item id. */
  onToggle?: (id: string) => void;
}

export function MilestoneList({
  milestones,
  emptyMessage = "No milestones yet.",
  dark = false,
  onToggle,
}: MilestoneListProps) {
  if (milestones.length === 0) {
    return <Text className="text-sm text-[#9B9B9B]">{emptyMessage}</Text>;
  }

  const iconColor = dark ? STATUS_COLOR_DARK : STATUS_COLOR;
  const nameActive = dark ? "text-[#F9FAFB]" : "text-[#0D0D0D]";
  const nameDone = dark ? "text-[#6B7280] line-through" : "text-[#6B6B6B] line-through";
  const muted = dark ? "text-[#9CA3AF]" : "text-[#9B9B9B]";

  return (
    <View className="gap-3">
      {milestones.map((m) => {
        const Row = onToggle ? TouchableOpacity : View;
        const rowProps = onToggle
          ? { onPress: () => onToggle(m.id), activeOpacity: 0.7 as const }
          : {};
        return (
          <Row key={m.id} className="flex-row gap-3" {...rowProps}>
            <Text className={`mt-0.5 text-sm font-bold w-5 text-center ${iconColor[m.status]}`}>
              {STATUS_ICON[m.status]}
            </Text>
            <View className="flex-1">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className={`text-sm font-semibold ${m.status === "complete" ? nameDone : nameActive}`}>
                  {m.name}
                </Text>
                <Badge label={m.status.replace("_", " ")} variant={statusVariant(m.status)} />
              </View>
              {m.entity && (
                <Text className={`text-[11px] mt-0.5 ${muted}`}>{m.entity}</Text>
              )}
              {m.description && (
                <Text className={`text-xs mt-0.5 ${muted}`}>{m.description}</Text>
              )}
              {m.blockerNotes && (
                <Text className="text-xs text-[#DC2626] mt-0.5">⚠ {m.blockerNotes}</Text>
              )}
              {(m.plannedDate || m.completedDate) && (
                <Text className={`text-xs mt-0.5 ${muted}`}>
                  {m.completedDate
                    ? `Completed ${formatDate(m.completedDate)}`
                    : m.plannedDate
                    ? `Due ${formatDate(m.plannedDate)}`
                    : null}
                </Text>
              )}
            </View>
          </Row>
        );
      })}
    </View>
  );
}
