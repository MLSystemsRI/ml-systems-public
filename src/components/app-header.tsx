import type { ReactNode } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDrawer } from "@/lib/drawer";
import { toggleViewMode, useMode, useAdminUnlocked } from "@/lib/view-mode";
import { MindGlyph } from "@/components/mind-icons";
import { mindForRoute, type AgentMind } from "@/lib/agents";

/**
 * Shared app-screen header — the same shape every agent app wears: the presiding
 * mind's glyph (opens the drawer) + title/subtitle tinted by the mind, and the
 * Hub's 3-way lens toggle (homeowner / investor / custodian) on the right.
 *
 * Pass `mind` directly or `href` (resolved via mindForRoute, like CompartmentChrome).
 * `right` renders an optional control just before the toggle.
 */
export function AppHeader({
  mind: mindProp,
  href,
  title,
  subtitle,
  right,
  toggle,
  hideToggle = false,
}: {
  mind?: AgentMind;
  href?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  /** Override the default global lens toggle with an app-specific one (e.g. the
   *  Pit's homeowner / loan officer / custodian roles). */
  toggle?: { label: string; color: string; onPress: () => void };
  /** Hide the toggle entirely (e.g. the homeowner chat has no lens switch). */
  hideToggle?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  const { badge } = useMode();
  const adminUnlocked = useAdminUnlocked();
  const mind = mindProp ?? (href ? mindForRoute(href) : undefined);
  const accent = mind?.color ?? "#22C55E";
  const t = toggle ?? { label: badge.label, color: badge.color, onPress: toggleViewMode };

  return (
    <View className="flex-row items-center gap-3 px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
      {/* Universal menu affordance — a hamburger everywhere so the drawer is obvious,
          regardless of which mind presides. The mind's identity stays as the glyph
          beside the title. */}
      <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text className="text-[#E5E7EB] text-2xl leading-none">☰</Text>
      </TouchableOpacity>

      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[#F9FAFB] text-xl font-extrabold" numberOfLines={1}>{title}</Text>
          {mind ? <MindGlyph slug={mind.slug} size={15} color={accent} /> : null}
        </View>
        {subtitle ? (
          <Text className="text-[#6B7280] text-[11px]" numberOfLines={2}>{subtitle}</Text>
        ) : null}
      </View>

      {right}
      {/* Public web build (try.mlsystemsri.com / homeowner Vercel) is homeowner-locked;
          on native the toggle shows only for a confirmed admin — family testers never
          see a lens switch. An app-specific `toggle` (e.g. the Pit roles) still shows. */}
      {hideToggle || Platform.OS === "web" || (!adminUnlocked && !toggle) ? null : (
        <TouchableOpacity
          onPress={t.onPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: `${t.color}1A`, borderWidth: 1, borderColor: `${t.color}40` }}
        >
          <Text style={{ color: t.color }} className="text-[10px] font-bold tracking-wider uppercase">
            {t.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
