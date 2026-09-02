import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser, useAuth } from "@/lib/clerk-shim";
import { router, usePathname } from "expo-router";
import { clearAdminUnlock } from "@/lib/view-mode";
import { wipeDeviceStores } from "@/lib/device-reset";
import { MLMark } from "@/components/ml-mark";
import { DnaIcon } from "@/components/dna-icon";
import { ScytheIcon, InventionIcon, CompassIcon, PitIcon, HammerIcon } from "@/components/mind-icons";
import { HubGlyph } from "@/components/hub-glyph";
import { AuroraWeaveBorder } from "@/components/aurora-weave-border";
import { useViewMode } from "@/lib/view-mode";
import { mindForRoute } from "@/lib/agents";
import { useLocalHome } from "@/lib/home-store";
import { dedupeAddressKey } from "@ml-systems/types";
import { useValueChainHomes, portfolioHref } from "@/lib/use-value-chain-homes";

const { width: SCREEN_W } = Dimensions.get("window");
const PANEL_W = Math.min(320, SCREEN_W * 0.82);

// `custodianOnly` links are operator surfaces — hidden under the homeowner + investor
// lenses (the Investor page is custodian-only in the drawer; investors reach it via a
// Hub card). `hideForCustodian` is the inverse: homeowner-facing surfaces kept out of the
// operator drawer — Loan Origination (which lives as a tab inside The Loan Pit).
// `clientHidden` drops a link from the homeowner + investor drawers — Loan Origination is
// a Loan Pit tab for those lenses too. `investorHidden` drops a link from the investor
// drawer only — Load Your Home (an investor doesn't load a home). `group` is a collapsible
// section header (the "Ecosystems" dropdown); `eco` links are its children, shown only when
// the group is expanded.
const LINKS: { label: string; glyph: string; href: string; accent: string; custodianOnly?: boolean; hideForCustodian?: boolean; clientHidden?: boolean; investorHidden?: boolean; sub?: boolean; subGroup?: boolean; group?: boolean; eco?: boolean; icon?: "dna" | "scythe" | "invention" | "compass" | "pit" | "mia" | "hub" | "murphy" | "vera" }[] = [
  { label: "Hub", glyph: "⬡", href: "/", accent: "#22C55E", icon: "hub" },
  { label: "Homeowner QR", glyph: "◱", href: "/homeowner-qr", accent: "#22C55E", custodianOnly: true },
  { label: "Load Your Home", glyph: "⌂", href: "/add-home", accent: "#22C55E", hideForCustodian: true, investorHidden: true },
  { label: "The Value Chain Portfolio", glyph: "✦", href: "/portfolio", accent: "#7aa0ff", icon: "dna" },
  { label: "Loan Origination", glyph: "◇", href: "/loan", accent: "#22C55E", hideForCustodian: true, clientHidden: true },
  { label: "Ecosystems", glyph: "◇", href: "#ecosystems", accent: "#93a89b", group: true },
  { label: "Builder's Open House", glyph: "◈", href: "/store", accent: "#14B8A6", eco: true, icon: "mia" },
  { label: "The Loan Pit", glyph: "◉", href: "/pit", accent: "#EF4444", eco: true, icon: "pit" },
  { label: "Decon Lab", glyph: "⬡", href: "/deconstruction", accent: "#F97316", eco: true, subGroup: true, icon: "scythe" },
  { label: "R&D · Potential Products", glyph: "⊥", href: "/deconstruction", accent: "#F97316", eco: true, sub: true, icon: "invention" },
  { label: "Operating Credentials", glyph: "☑", href: "/credentials", accent: "#F97316", eco: true, sub: true, custodianOnly: true },
  { label: "Equipment Packet", glyph: "⛭", href: "/equipment", accent: "#F97316", eco: true, sub: true, custodianOnly: true },
  { label: "Builders Collective", glyph: "◐", href: "/collective", accent: "#D4AF37", eco: true, icon: "vera" },
  { label: "Design Studio", glyph: "◇", href: "/design", accent: "#60A5FA", eco: true, icon: "compass" },
  { label: "Construction", glyph: "⬢", href: "/construction", accent: "#84CC16", icon: "murphy" },
  { label: "Crew", glyph: "⚙", href: "/crew", accent: "#F97316", custodianOnly: true },
  { label: "Profile", glyph: "○", href: "/profile", accent: "#6B7280" },
  { label: "Agent Minds", glyph: "❖", href: "/minds", accent: "#FFE500", custodianOnly: true },
  { label: "Investor", glyph: "★", href: "/investor", accent: "#FFE500", custodianOnly: true },
];

function initials(name?: string | null, email?: string | null) {
  const src = (name ?? email ?? "?").trim();
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || src[0]?.toUpperCase() || "?";
}

export function SideBar({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { isSignedIn, signOut } = useAuth();
  const viewMode = useViewMode();
  // Context-aware chrome: when the active screen belongs to an aurora-signature mind (MIA · /store),
  // the drawer wears her Aurora loom-loop — a woven backdrop, loom header, and flowing weave edge.
  const pathname = usePathname();
  const presiding = mindForRoute(pathname);
  const aurora = presiding?.lens_theme?.signature === "aurora";
  const aColor = presiding?.color ?? "#14B8A6";
  const aBright = presiding?.lens_theme?.bright ?? "#CCFBF1";
  const [ecoOpen, setEcoOpen] = useState(false); // "Ecosystems" group starts collapsed
  const [deconOpen, setDeconOpen] = useState(false); // Decon Lab's children (R&D, Credentials, Equipment) start collapsed
  // Custodian sees operator links but not the homeowner-only ones (hideForCustodian).
  // Homeowner + investor hide operator-only (custodianOnly, incl. the Investor page) and
  // clientHidden links (Loan Origination — a Loan Pit tab); investor also hides
  // investorHidden links (Load Your Home).
  const links =
    viewMode === "custodian"
      ? LINKS.filter((l) => !l.hideForCustodian)
      : viewMode === "investor"
        ? LINKS.filter((l) => !l.custodianOnly && !l.clientHidden && !l.investorHidden)
        : LINKS.filter((l) => !l.custodianOnly && !l.clientHidden);
  const slide = useRef(new Animated.Value(-PANEL_W)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: visible ? 0 : -PANEL_W, duration: 220, useNativeDriver: true }),
      Animated.timing(fade, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible, slide, fade]);

  const home = useLocalHome();
  // The SAME list the Hub's Value Chain Homes card draws, so this link opens the same
  // home it does — own-project-first, device records merged in, spellings deduped.
  // Picking off the raw catalogue instead is what opened a different house here.
  const { homes: vcHomes } = useValueChainHomes();
  const vcHome = useMemo(() => {
    if (!vcHomes.length) return null;
    if (!home?.address) return vcHomes[0] ?? null;
    // Prefer the home the device is actually holding; fall back to the Hub's first row.
    const want = dedupeAddressKey(home.address);
    return vcHomes.find((h) => h.address && dedupeAddressKey(h.address) === want) ?? vcHomes[0] ?? null;
  }, [vcHomes, home?.address]);

  const go = (href: string) => {
    onClose();
    // The Value Chain Portfolio is a per-home page — one shared href builder, so the
    // drawer and the Hub cannot drift apart again.
    const target =
      href === "/portfolio"
        ? portfolioHref(vcHome ?? (home?.address ? { address: home.address, projectId: "" } : null))
        : href;
    // let the drawer close before navigating
    setTimeout(() => router.push(target as any), 60);
  };

  const name = user?.fullName || user?.firstName || null;
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* backdrop */}
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={onClose} />
      </Animated.View>

      {/* panel */}
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: PANEL_W,
          backgroundColor: aurora ? "#06100E" : "#0C120E",
          borderRightWidth: 1,
          borderRightColor: aurora ? `${aColor}55` : "#1F3327",
          transform: [{ translateX: slide }],
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        }}
      >
        {/* MIA context — faint Aurora loom-loop woven behind the nav */}
        {aurora ? (
          <Image
            source={require("../assets/avatars/scenes/mia/loom-loop.png")}
            resizeMode="cover"
            style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, opacity: 0.14 }}
          />
        ) : null}

        {/* brand — a loom-loop header hero in MIA context, else the plain mark */}
        {aurora ? (
          <View style={{ height: 92, marginBottom: 14, overflow: "hidden" }}>
            <Image
              source={require("../assets/avatars/scenes/mia/loom-loop.png")}
              resizeMode="cover"
              style={{ position: "absolute", left: 0, right: 0, top: -24, height: 150, opacity: 0.9 }}
            />
            <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(6,16,14,0.42)" }} />
            <View className="flex-row items-center gap-2.5 px-5" style={{ position: "absolute", left: 0, bottom: 10 }}>
              <MLMark size={22} color={aColor} />
              <View>
                <Text className="text-[#F9FAFB] text-base font-extrabold leading-tight">Open House</Text>
                <Text style={{ color: aColor }} className="text-[10px] font-bold tracking-[0.15em]">THE MARKETPLACE</Text>
              </View>
            </View>
          </View>
        ) : (
          <View className="flex-row items-center gap-3 px-5 mb-5">
            <MLMark size={24} color="#22C55E" />
            <Text className="text-[#F9FAFB] text-base font-extrabold">Systems</Text>
          </View>
        )}

        {/* account */}
        <TouchableOpacity
          onPress={() => (isSignedIn ? undefined : go("/(auth)/sign-in"))}
          activeOpacity={isSignedIn ? 1 : 0.8}
          className="flex-row items-center gap-3 px-5 py-3 mx-3 mb-4 rounded-xl bg-[#111c16] border border-[#1f3327]"
        >
          <View
            className="rounded-full items-center justify-center"
            style={{ width: 40, height: 40, backgroundColor: "#22C55E22" }}
          >
            <Text className="text-[#22C55E] font-black text-sm">
              {isSignedIn ? initials(name, email) : "?"}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[#F9FAFB] text-[13px] font-bold" numberOfLines={1}>
              {isSignedIn ? name ?? "Signed in" : "Guest · Preview"}
            </Text>
            <Text className="text-[#6B7280] text-[11px]" numberOfLines={1}>
              {isSignedIn ? email ?? "" : "Tap to sign in"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* nav */}
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 12 }}>
          {links.map((l) => {
            // Collapsible "Ecosystems" section header — toggles its children, no navigation.
            if (l.group) {
              return (
                <TouchableOpacity
                  key={l.href}
                  onPress={() => setEcoOpen((v) => !v)}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-3 px-3 py-3 rounded-xl"
                >
                  <Text style={{ color: l.accent, fontSize: 16, width: 22, textAlign: "center" }}>{l.glyph}</Text>
                  <Text className="text-[#E8F2EC] text-[14px] font-medium flex-1">{l.label}</Text>
                  <Text style={{ color: "#6B7280" }} className="text-[12px]">{ecoOpen ? "▾" : "▸"}</Text>
                </TouchableOpacity>
              );
            }
            // Ecosystem children collapse under the header; hidden until expanded.
            if (l.eco && !ecoOpen) return null;
            // Decon Lab's sub-items (R&D, Operating Credentials, Equipment) collapse
            // under Decon Lab — hidden until its own chevron is expanded.
            if (l.sub && !deconOpen) return null;
            // Ecosystem apps sit indented one level under the header, but full-size and
            // aligned with each other — they are apps, not sub-items.
            // `sub` items (R&D) nest one level deeper — a child of the app above (Decon Lab).
            const indent = l.sub ? "pl-[3.25rem] pr-2" : l.eco ? "pl-9 pr-3" : "px-3";
            return (
              <TouchableOpacity
                key={l.href}
                onPress={() => go(l.href)}
                activeOpacity={0.7}
                className={`flex-row items-center gap-3 py-3 rounded-xl ${indent}`}
              >
                {l.sub ? <Text style={{ color: "#6B7280", fontSize: 13, marginRight: -6 }}>└</Text> : null}
                {l.icon === "dna" ? (
                  // The DNA strand is its own tap target → the Value Chain explainer.
                  // Nested Touchable captures the press, so the row (→ /portfolio) doesn't fire.
                  <TouchableOpacity
                    onPress={() => go("/value-chain-explainer")}
                    activeOpacity={0.6}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 8 }}
                    className="items-center"
                    style={{ width: 22 }}
                  >
                    <DnaIcon size={20} />
                  </TouchableOpacity>
                ) : l.icon === "scythe" ? (
                  // REAPER's scythe — a mind's glyph in the menu (row still navigates;
                  // a DNA-style dedicated tap target can be added later).
                  <View style={{ width: 22, alignItems: "center" }}>
                    <ScytheIcon size={20} color={l.accent} />
                  </View>
                ) : l.icon === "invention" ? (
                  <View style={{ width: 22, alignItems: "center" }}>
                    <InventionIcon size={20} color={l.accent} />
                  </View>
                ) : l.icon === "compass" ? (
                  <View style={{ width: 22, alignItems: "center" }}>
                    <CompassIcon size={20} color={l.accent} />
                  </View>
                ) : l.icon === "pit" ? (
                  <View style={{ width: 22, alignItems: "center" }}>
                    <PitIcon size={20} color={l.accent} />
                  </View>
                ) : l.icon === "hub" ? (
                  // Hub — the nano-banana Lucent home mark (glowing orb grounded in roots),
                  // matching the Hub bottom-tab glyph.
                  <View style={{ width: 22, alignItems: "center" }}>
                    <HubGlyph size={22} />
                  </View>
                ) : l.icon === "murphy" ? (
                  // MURPHY's hammer striking a QA milestone check.
                  <View style={{ width: 22, alignItems: "center" }}>
                    <HammerIcon size={20} color={l.accent} />
                  </View>
                ) : l.icon === "vera" ? (
                  // VERA's verification-owl emblem (matches her card + BC opener).
                  <View style={{ width: 22, alignItems: "center" }}>
                    <Image
                      source={require("../assets/avatars/scenes/vera/vera-owl.png")}
                      style={{ width: 20, height: 20 }}
                      resizeMode="contain"
                    />
                  </View>
                ) : l.icon === "mia" ? (
                  // MIA's rendered card glyph — her woven nexus/lens orb (the aurora
                  // weaves), a circular crop seated among the line icons.
                  <View style={{ width: 22, alignItems: "center" }}>
                    <Image
                      source={require("../assets/avatars/scenes/mia/mia-sprite.png")}
                      resizeMode="cover"
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 1,
                        borderColor: `${l.accent}88`,
                        shadowColor: l.accent,
                        shadowOpacity: 0.7,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 0 },
                      }}
                    />
                  </View>
                ) : (
                  <Text style={{ color: l.accent, fontSize: 16, width: 22, textAlign: "center" }}>
                    {l.glyph}
                  </Text>
                )}
                <Text className="text-[#E8F2EC] text-[14px] font-medium">{l.label}</Text>
                {/* Decon Lab is both an app (row → /lab) and a collapsible sub-group;
                    the chevron is its own tap target toggling its children. */}
                {l.subGroup ? (
                  <>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                      onPress={() => setDeconOpen((v) => !v)}
                      activeOpacity={0.6}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      className="pl-2"
                    >
                      <Text style={{ color: "#6B7280" }} className="text-[12px]">{deconOpen ? "▾" : "▸"}</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* sign out */}
        {isSignedIn ? (
          <TouchableOpacity
            onPress={async () => {
              onClose();
              // The session ends → drop the admin unlock AND the device stores, so
              // the next account on this phone starts truly clean (Sal 9/1).
              try { clearAdminUnlock(); } catch {}
              try { wipeDeviceStores(); } catch {}
              try {
                await signOut();
              } catch {}
              setTimeout(() => router.replace("/(auth)/sign-in"), 60);
            }}
            activeOpacity={0.8}
            className="mx-4 mt-2 rounded-xl py-3 items-center border border-[#3a2020]"
          >
            <Text className="text-[#EF4444] text-[13px] font-bold">Sign out</Text>
          </TouchableOpacity>
        ) : null}

        <Text className="text-[#374151] text-[10px] text-center mt-3">
          Custodian · LL · TT · MVE
        </Text>

        {/* MIA context — flowing aurora weave hugging the panel edges */}
        {aurora ? (
          <AuroraWeaveBorder color={aColor} bright={aBright} radius={0} both frame={false} idKey="drawer" />
        ) : null}
      </Animated.View>
    </Modal>
  );
}
