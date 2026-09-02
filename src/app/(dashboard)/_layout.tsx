import { Tabs, Redirect } from "expo-router";
import { View, Text, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/clerk-shim";
import { useState, useEffect, useRef } from "react";
import { isPreview } from "@/lib/preview";
import { DrawerContext } from "@/lib/drawer";
import { SideBar } from "@/components/side-bar";
import { useMode, setAdminAnswer } from "@/lib/view-mode";
import { trpc } from "@/lib/trpc";
import { NeighborsGlyph } from "@/components/neighbors-glyph";
import { HubGlyph } from "@/components/hub-glyph";
import { AuroraGlyph } from "@/components/aurora-glyph";
import { CockpitGlyph } from "@/components/cockpit-glyph";
import { VCHomesGlyph } from "@/components/vc-homes-glyph";
import { ProfileGlyph } from "@/components/profile-glyph";

const DEPT_COLORS: Record<string, string> = {
  Hub: "#22C55E",
  Custodian: "#22C55E",
  AI: "#22C55E",
  Crew: "#F97316",
  Neighbors: "#4EA0F5",
  Profile: "#6B7280",
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const ICONS: Record<string, string> = {
    Hub: "\u2B21",
    Custodian: "\u25C8",
    AI: "\u25C9",
    Crew: "\u2699",
    Neighbors: "\u{1F465}",
    Profile: "\u25CB",
  };
  const color = focused ? (DEPT_COLORS[label] ?? "#22C55E") : "rgba(255,255,255,0.35)";
  return (
    <View style={{ alignItems: "center", paddingTop: 4 }}>
      <Text style={{ color, fontSize: 18 }}>{ICONS[label] ?? "\u25CB"}</Text>
    </View>
  );
}

export default function DashboardLayout() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Under the homeowner lens, operator tabs (Cockpit, Crew) drop out of the
  // bar — the client sees only their value-chain surfaces. Routes still exist.
  const { isHome, isCustodian } = useMode();

  // Server-truth role gate: only a real admin (Sal) can leave the Homeowner lens.
  // Everyone else — family testers, signed-out sessions — stays homeowner, no toggle.
  // getViewer is public + never throws; undefined/false → locked to homeowner.
  // THE RACE: on cold start this query fires before Clerk's token warms, the server
  // sees no session (signedIn:false), and a one-shot query would freeze an admin in
  // homeowner forever. So: wait for Clerk, retry, and keep re-asking every 15s until
  // the server actually SEES the session — then stop (an answered non-admin is final).
  const viewerQ = trpc.pit.getViewer.useQuery(undefined, {
    enabled: isLoaded && !!isSignedIn,
    retry: 2,
    refetchInterval: (q: { state: { data?: { signedIn?: boolean } } }) =>
      q.state.data?.signedIn ? false : 15_000,
  });
  // Feed the FULL answer: isAdmin unlocks (+ caches on-device so the next boot starts
  // unlocked); only an explicit signed-in-but-not-admin answer downgrades; an
  // unanswered/failed query changes nothing (never lock a confirmed admin on a blip).
  const answer = viewerQ.data as { signedIn?: boolean; isAdmin?: boolean } | undefined;
  useEffect(() => {
    setAdminAnswer(answer);
  }, [answer]);
  // ACCOUNT SWITCH: react-query would happily serve the PREVIOUS account's cached
  // answer (sign out of admin → test a client account → sign back in as admin →
  // stale "not admin" → no toggle). The user changed → the question must be re-asked.
  const utils = trpc.useUtils();
  const lastUserRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (lastUserRef.current !== undefined && lastUserRef.current !== userId) {
      void utils.pit.getViewer.invalidate();
    }
    lastUserRef.current = userId ?? null;
  }, [userId, utils]);

  // Guard: everything under (dashboard) requires a session. Unauthenticated
  // users are sent to sign-in; the (auth) guard sends them back once signed in.
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0A0A", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }
  if (!isSignedIn && !isPreview()) return <Redirect href="/(auth)/sign-in" />;

  return (
    <DrawerContext.Provider value={{ open: () => setDrawerOpen(true) }}>
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <Tabs
        // Android back walks the visited-tab history (chat → AI tab → hub) instead of
        // resetting straight to the initial tab.
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#0A0A0A",
            borderTopColor: "rgba(255,255,255,0.06)",
            // Lift the bar above Android's gesture/nav bar via the safe-area inset.
            height: 60 + insets.bottom,
            paddingBottom: 8 + insets.bottom,
            paddingTop: 6,
          },
          tabBarActiveTintColor: "#22C55E",
          tabBarInactiveTintColor: "rgba(255,255,255,0.35)",
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            letterSpacing: 0.5,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Hub",
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: "center", paddingTop: 4 }}>
                <HubGlyph size={26} focused={focused} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="assistant"
          options={{
            // The AI landing page (assistant.tsx) — value chain + j-space builder,
            // funneling into the one collective chat. One Aurora button, every lens.
            title: "AI",
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: "center", paddingTop: 4 }}>
                <AuroraGlyph size={26} focused={focused} />
              </View>
            ),
            tabBarActiveTintColor: "#14B8A6",
          }}
        />
        {/* Legacy cockpit route — the cockpit is now its own tab (cockpit.tsx);
            /portal kept hidden so any existing link still resolves. */}
        <Tabs.Screen name="portal" options={{ href: null }} />
        <Tabs.Screen
          name="crew"
          options={{
            title: "Crew",
            href: isHome ? null : undefined,
            tabBarIcon: ({ focused }) => <TabIcon label="Crew" focused={focused} />,
            tabBarActiveTintColor: "#F97316",
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            // Homeowner-only: neighbors staying connected. Hidden in custodian/investor.
            title: "Neighbors",
            href: isHome ? undefined : null,
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: "center", paddingTop: 4 }}>
                <NeighborsGlyph size={66} focused={focused} />
              </View>
            ),
            tabBarActiveTintColor: "#4EA0F5",
          }}
        />
        {/* Custodian lens: VC Ledger — the Value Chain Ledger console (every home
            homeowners add, grouped by the verification gate). Sits next to Cockpit. */}
        <Tabs.Screen
          name="vc-homes"
          options={{
            title: "VC Ledger",
            href: isCustodian ? undefined : null,
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: "center", paddingTop: 4 }}>
                <VCHomesGlyph size={26} focused={focused} />
              </View>
            ),
            tabBarActiveTintColor: "#8B5CF6",
          }}
        />
        {/* Custodian lens: the Cockpit takes Profile's tab slot (Profile stays in
            the side drawer). Other lenses keep the Profile tab. */}
        <Tabs.Screen
          name="cockpit"
          options={{
            title: "Cockpit",
            href: isCustodian ? undefined : null,
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: "center", paddingTop: 4 }}>
                <CockpitGlyph size={26} focused={focused} />
              </View>
            ),
            tabBarActiveTintColor: "#FFE500",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            href: isCustodian ? null : undefined,
            // Nano-banana constellation-bust emblem (scripts/gen-profile-glyph.mjs)
            // in place of the old ○ placeholder.
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: "center", paddingTop: 4 }}>
                <ProfileGlyph size={26} focused={focused} />
              </View>
            ),
            tabBarActiveTintColor: "#6B7280",
          }}
        />
        <Tabs.Screen name="portfolio" options={{ href: null }} />
        <Tabs.Screen name="design" options={{ href: null }} />
        <Tabs.Screen name="lab" options={{ href: null }} />
        <Tabs.Screen name="store" options={{ href: null }} />
        <Tabs.Screen name="cart" options={{ href: null }} />
        <Tabs.Screen name="pit" options={{ href: null }} />
        <Tabs.Screen name="investor" options={{ href: null }} />
        <Tabs.Screen name="collective" options={{ href: null }} />
        <Tabs.Screen name="collective-chat" options={{ href: null }} />
        <Tabs.Screen name="blocked" options={{ href: null }} />
        <Tabs.Screen name="payroll" options={{ href: null }} />
        <Tabs.Screen name="loan" options={{ href: null }} />
        <Tabs.Screen name="deconstruction" options={{ href: null }} />
        <Tabs.Screen name="decon-project" options={{ href: null }} />
        <Tabs.Screen name="credentials" options={{ href: null }} />
        <Tabs.Screen name="equipment" options={{ href: null }} />
        <Tabs.Screen name="construction" options={{ href: null }} />
        <Tabs.Screen name="equity" options={{ href: null }} />
        <Tabs.Screen name="value-chain-explainer" options={{ href: null }} />
        <Tabs.Screen name="value-chain-ledger" options={{ href: null }} />
        {/* Reached from the VC Ledger tab, never the tab bar — the Custodian's entry-by-entry review. */}
        <Tabs.Screen name="custodian-review" options={{ href: null }} />
        {/* Reached from a ledger entry's expanded row — one entry's own input page. */}
        <Tabs.Screen name="entry-input" options={{ href: null }} />
        <Tabs.Screen name="collective-consciousness" options={{ href: null }} />
        <Tabs.Screen name="plan-builder" options={{ href: null }} />
        <Tabs.Screen name="homeowner-qr" options={{ href: null }} />
        <Tabs.Screen name="add-home" options={{ href: null }} />
        <Tabs.Screen name="uploads" options={{ href: null }} />
        <Tabs.Screen name="cost" options={{ href: null }} />
        <Tabs.Screen name="minds" options={{ href: null }} />
        <Tabs.Screen name="billing" options={{ href: null }} />
      </Tabs>
      <SideBar visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
    </DrawerContext.Provider>
  );
}
