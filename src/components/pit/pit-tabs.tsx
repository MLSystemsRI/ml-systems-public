import { View, Text, TouchableOpacity } from "react-native";

/**
 * PitTabs — the mobile sub-tab bar for the Loan Pit's Officer/Custodian views.
 * Mirrors the web `TabBar` (apps/loan-pit/src/components/ui/tab-bar.tsx): one active
 * accent, with an optional per-tab accent override (so RCM Variants stays purple).
 */
export function PitTabs<T extends string>({
  tabs,
  active,
  onChange,
  color,
  labels,
  accents,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  color: string;
  labels: Record<T, string>;
  /** Per-tab active-color override, e.g. { "rcm-variants": "#8B5CF6" }. */
  accents?: Partial<Record<T, string>>;
}) {
  return (
    <View className="flex-row flex-wrap gap-2 mb-4">
      {tabs.map((t) => {
        const isActive = active === t;
        const activeColor = accents?.[t] ?? color;
        return (
          <TouchableOpacity
            key={t}
            onPress={() => onChange(t)}
            activeOpacity={0.8}
            className="rounded-lg px-3.5 py-2"
            style={
              isActive
                ? { backgroundColor: activeColor, borderWidth: 1, borderColor: activeColor }
                : { backgroundColor: "transparent", borderWidth: 1, borderColor: "#262626" }
            }
          >
            <Text className="text-[12px] font-semibold" style={{ color: isActive ? "#FFFFFF" : "#6B7280" }}>
              {labels[t]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
