import { Text, TouchableOpacity } from "react-native";

// Native reproduction of the portfolio HUD toggle button
// (apps/app/public/time-matrix/*.html): a rounded pill that lights up with its
// accent when active — tinted fill, accent border, and a soft glow — and dims
// to a neutral outline when inactive. Reused by the Portfolio theme switcher
// and available anywhere the app wants the portfolio's control language.
export function ToggleChip({
  label,
  accent,
  active,
  onPress,
}: {
  label: string;
  accent: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        marginRight: 8,
        backgroundColor: active ? `${accent}1A` : "rgba(255,255,255,0.03)",
        borderColor: active ? accent : "rgba(255,255,255,0.12)",
        // Accent glow when active (portfolio HUD .active state).
        shadowColor: accent,
        shadowOpacity: active ? 0.6 : 0,
        shadowRadius: active ? 10 : 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: active ? 6 : 0,
      }}
    >
      <Text
        style={{
          color: active ? accent : "rgba(255,255,255,0.55)",
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
