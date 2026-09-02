import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image } from "react-native";
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useMode } from "@/lib/view-mode";
import { router } from "expo-router";
import { DEMO_LENDER_DATA } from "@/lib/demo-pit";
import { isPreview } from "@/lib/preview";
import { CompartmentChrome } from "@/components/compartment-chrome";
import { AppHeader } from "@/components/app-header";
import { EmberMark } from "@/components/mind-icons";
import { OfficerView } from "@/components/pit/officer-tabs";
import { CustodianView } from "@/components/pit/custodian-tabs";
import { LoanPitCard, type MyLoan } from "@/components/pit/loan-pit-card";
import { BRIDGE, rankBridgeLenders, flattenLenders } from "@/lib/pit-bridge";

/** The Pit — reverse-auction construction loans. The header toggle is the Pit's
 *  own role lens: Homeowner (borrower marketplace) · Loan Officer (open offerings +
 *  My Bids / Tier Guide / RCM Variants) · Custodian (PIT LORD console + oversight
 *  stats + All Pits / All Bids / Lender Pipeline / Revenue). Officer + Custodian
 *  mirror the web pit's tabs, wired live; this file orchestrates the role toggle. */

const RED = "#EF4444";
const AMBER = "#F59E0B";
const FIRE_ORB = require("../../assets/avatars/scenes/pit-lord/fire-orb.png");
const FIRE_LINE = require("../../assets/avatars/scenes/pit-lord/fire-line.png");

type PitRole = "homeowner" | "officer" | "custodian";
const ROLE_ORDER: PitRole[] = ["homeowner", "officer", "custodian"];
const ROLE_META: Record<PitRole, { label: string; color: string }> = {
  homeowner: { label: "Homeowner", color: "#4EA0F5" },
  officer: { label: "Loan Officer", color: RED },
  custodian: { label: "Custodian", color: "#22C55E" },
};

const INTEGRATION: Record<string, { label: string; color: string }> = {
  live:    { label: "Connected",   color: "#22C55E" },
  pending: { label: "Onboarding",  color: AMBER },
  planned: { label: "Coming Soon", color: "#6B7280" },
};

const SUBTITLE: Record<PitRole, string> = {
  homeowner: "Your loan marketplace — lenders compete for your project; you pick the winner.",
  officer: "Open construction loan offerings. Review anonymized project data and cast your bid.",
  custodian: "Full pit oversight — offerings, bids, and lender integration health.",
};

export default function PitScreen() {
  const { isHome, isCustodian } = useMode();
  // The Pit's OWN three-role toggle (not the global lens). It seeds from the
  // global mode where it maps: homeowner → homeowner, custodian → custodian,
  // otherwise the loan-officer offerings board.
  // TODO(dual-capable lens): once accounts are provisioned, derive the AVAILABLE
  // roles from the signed-in email — an email in partner_lenders.contact_email
  // unlocks the Loan Officer view, and a person who is also a homeowner keeps both.
  // The .net on-ramp (email MVP) is the front door to that officer role.
  // Server-truth role — the app KNOWS whether this account is a real admin, so
  // "full admin" unlocks all three lenses (and custodian never shows a false
  // "access required" on a token blip). getViewer is public + never throws.
  const viewerQ = trpc.pit.getViewer.useQuery(undefined, { retry: 0 });
  const isAdmin = !!viewerQ.data?.isAdmin;
  const signedIn = !!viewerQ.data?.signedIn;
  const seededRole: PitRole = isHome ? "homeowner" : isCustodian ? "custodian" : "officer";
  // Admin sees every lens; everyone else stays in the one their global lens maps to.
  const availableRoles: PitRole[] = isAdmin ? ROLE_ORDER : [seededRole];

  const [role, setRole] = useState<PitRole>(seededRole);
  const [refreshing, setRefreshing] = useState(false);

  const cycleRole = useCallback(() => {
    const roles: PitRole[] = isAdmin ? ROLE_ORDER : [seededRole];
    setRole((r) => {
      const i = roles.indexOf(r);
      return roles[(i + 1) % roles.length] ?? roles[0]!;
    });
  }, [isAdmin, seededRole]);

  // Warm EVERY role's data on mount (not just the active toggle) so switching
  // homeowner ↔ officer ↔ custodian is instant — React Query dedupes by key, so
  // each tab's own useQuery reads this already-warm cache. One cold-start round up front.
  // Public queries always run; authed ones are gated so they don't error-noise for
  // non-admins / signed-out sessions (and no longer poison the public marketplace).
  const lenders = trpc.pit.getLenders.useQuery(undefined, { retry: 0 });
  const offeringsQ = trpc.pit.getOfferings.useQuery(undefined, { retry: 0 });
  const custodianQ = trpc.pit.getCustodianData.useQuery(undefined, { retry: 0, enabled: isAdmin });
  const myLoansQ = trpc.pit.getMyLoans.useQuery(undefined, { retry: 0, enabled: signedIn });
  const onboardedQ = trpc.pit.getOnboardedLenders.useQuery(undefined, { retry: 0 });
  trpc.pit.getTiers.useQuery(undefined, { retry: 0, enabled: signedIn });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      lenders.refetch(), offeringsQ.refetch(), custodianQ.refetch(), myLoansQ.refetch(), onboardedQ.refetch(),
    ]);
    setRefreshing(false);
  }, [lenders, offeringsQ, custodianQ, myLoansQ, onboardedQ]);

  const rm = ROLE_META[role];

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <AppHeader
        href="/pit"
        title="The Loan Pit"
        subtitle={SUBTITLE[role]}
        toggle={availableRoles.length > 1 ? { label: rm.label, color: rm.color, onPress: cycleRole } : undefined}
      />
      <ScrollView
        className="flex-1"
        style={{ zIndex: 1 }}
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />}
      >
        {role === "homeowner" ? (
          <>
            <ClientTab query={lenders} />
            {/* the homeowner's RCM plan lives on PIT LORD's Loan Origination screen */}
            <TouchableOpacity
              onPress={() => router.push("/loan")}
              activeOpacity={0.85}
              className="rounded-2xl px-4 py-4 mt-2 flex-row items-center justify-between"
              style={{ backgroundColor: `${RED}0D`, borderWidth: 1, borderColor: `${RED}33` }}
            >
              <View className="flex-1 pr-3">
                <Text className="text-[#F9FAFB] text-[13px] font-bold">My RCM plan</Text>
                <Text className="text-[#6B7280] text-[11px]">Reversed Conventional Mortgage — your equity plan &amp; documents.</Text>
              </View>
              <Text style={{ color: RED }} className="text-lg">→</Text>
            </TouchableOpacity>
            {/* PIT LORD's app → the collective consciousness: how the pit fits the value chain */}
            <TouchableOpacity
              onPress={() => router.push("/collective-consciousness?doc=pit-lord-reverse-auction")}
              activeOpacity={0.85}
              className="rounded-2xl px-4 py-4 mt-2 flex-row items-center justify-between"
              style={{ backgroundColor: `${RED}0D`, borderWidth: 1, borderColor: `${RED}33` }}
            >
              <View className="flex-1 pr-3">
                <Text className="text-[#F9FAFB] text-[13px] font-bold">How the Pit fits the value chain</Text>
                <Text className="text-[#6B7280] text-[11px]">VERA gates → the field competes → equity compounds → MURPHY builds.</Text>
              </View>
              <Text style={{ color: RED }} className="text-lg">→</Text>
            </TouchableOpacity>
          </>
        ) : role === "officer" ? (
          <OfficerView />
        ) : (
          <CustodianView isAdmin={isAdmin} />
        )}
      </ScrollView>
      <CompartmentChrome href="/pit" />
    </View>
  );
}

/* ─────────────────────────── Client (lender marketplace) ─────────────────── */
type Lender = { id: string; name: string; tagline: string; highlight: string; products: string[]; location: string; color: string; riPresence: boolean; integration: string };
type Category = { key: string; name: string; desc: string; color: string; lenders: Lender[] };
type LenderData = { stats?: { lenders: number; riPresence: number; connected: number; categories: number }; categories?: Category[]; onboardedSlugs?: string[]; apiSlugs?: string[] };
type OnboardedLender = { id: string; name: string; type: string; integrationMode: string; onboardedAt: string | null; providers: string[] };

function ClientTab({ query }: { query: any }) {
  // All the homeowner's loans + the real onboarded lenders, above the marketplace.
  const loansQ = trpc.pit.getMyLoans.useQuery(undefined, { retry: 0 });
  const onboardedQ = trpc.pit.getOnboardedLenders.useQuery(undefined, { retry: 0 });
  const [showDemo, setShowDemo] = useState(false);
  const live = query.data as LenderData | undefined;
  if (query.isLoading) return <Text className="text-[#6B7280] text-sm text-center mt-8">Loading the marketplace…</Text>;
  // Only a REAL failure reads as an outage — a transient/empty settle falls through
  // to the demo catalog rather than falsely claiming the marketplace is unreachable.
  if (query.isError && !live?.stats && !isPreview()) return <Text className="text-[#EF4444] text-sm text-center mt-8">Couldn't reach the marketplace — pull to retry.</Text>;

  const hasLive = !!live?.stats;
  const demo = DEMO_LENDER_DATA as LenderData;
  const s = hasLive ? live!.stats! : demo.stats!;
  const liveCategories = hasLive ? (live!.categories ?? []) : [];
  const demoCategories = demo.categories ?? [];
  const myLoans = (loansQ.data ?? []) as MyLoan[];
  const onboarded = (onboardedQ.data ?? []) as OnboardedLender[];
  const recs = rankBridgeLenders(flattenLenders(hasLive ? live!.categories : demoCategories), 4);
  const onboardedSlugs = new Set(live?.onboardedSlugs ?? []);
  const apiSlugs = new Set(live?.apiSlugs ?? []);

  // One fire lender card, reused for live + demo categories. `dim` fades demo examples.
  const lenderCard = (l: Lender, dim?: boolean) => {
    const integ = INTEGRATION[l.integration] ?? INTEGRATION.planned;
    const isOnboarded = onboardedSlugs.has(l.id);
    const isApi = apiSlugs.has(l.id);
    return (
      <View key={l.id} className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-2.5 mt-6" style={dim ? { opacity: 0.55 } : undefined}>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <EmberMark opacity={0.06} />
        </View>
        <View pointerEvents="none" style={{ position: "absolute", top: -15, left: 0, right: 0 }}>
          <Image source={FIRE_LINE} resizeMode="cover" style={{ width: "100%", height: 24 }} />
        </View>
        <View pointerEvents="none" style={{ position: "absolute", top: -42, left: 0, right: 0, alignItems: "center" }}>
          <Image source={FIRE_ORB} resizeMode="contain" style={{ width: 44, height: 78 }} />
        </View>
        <View className="flex-row items-start justify-between mb-1">
          <View className="flex-row items-center gap-2 flex-1 pr-2">
            <Text className="text-[#F9FAFB] text-[14px] font-bold">{l.name}</Text>
            {l.riPresence ? (
              <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: "#22C55E1A" }}><Text className="text-[#22C55E] text-[8px] font-bold">RI</Text></View>
            ) : null}
            {isOnboarded ? (
              <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: "#22C55E1A" }}><Text className="text-[#22C55E] text-[8px] font-bold">✓ ONBOARDED</Text></View>
            ) : null}
            {isApi ? (
              <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: "#60A5FA1A" }}><Text className="text-[#60A5FA] text-[8px] font-bold">API</Text></View>
            ) : null}
          </View>
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${integ.color}1A`, borderWidth: 1, borderColor: `${integ.color}40` }}>
            <Text style={{ color: integ.color }} className="text-[8px] font-bold uppercase tracking-wider">{integ.label}</Text>
          </View>
        </View>
        <Text className="text-[#6B7280] text-[11px] mb-2">{l.tagline}</Text>
        <Text className="text-[#9CA3AF] text-[11px] leading-snug mb-2">{l.highlight}</Text>
        <View className="flex-row flex-wrap gap-1.5 mb-1">
          {l.products.slice(0, 4).map((p, i) => (
            <View key={i} className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${l.color}14`, borderWidth: 1, borderColor: `${l.color}30` }}>
              <Text style={{ color: l.color }} className="text-[9px]">{p}</Text>
            </View>
          ))}
          {l.products.length > 4 ? <Text className="text-[#4B5563] text-[9px] self-center">+{l.products.length - 4}</Text> : null}
        </View>
        <Text className="text-[#4B5563] text-[10px] mt-1">{l.location}</Text>
      </View>
    );
  };

  const catHeader = (cat: Category) => (
    <View className="flex-row items-center gap-2 mb-2">
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: cat.color }} />
      <Text style={{ color: cat.color }} className="text-[13px] font-bold">{cat.name}</Text>
      <Text className="text-[#4B5563] text-[10px]">{cat.desc}</Text>
    </View>
  );

  return (
    <View>
      {/* Your loans — every loan the homeowner holds (decon bridge = steel, construction = fire) */}
      {myLoans.length ? (
        <View className="mb-4">
          <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#9CA3AF]">Your loans</Text>
          {myLoans.map((m) => <LoanPitCard key={m.loan.id} m={m} />)}
        </View>
      ) : null}

      {/* Onboarded lenders — the real partner_lenders table (active), with API integrations */}
      {onboarded.length ? (
        <View className="mb-5">
          <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#22C55E]">Onboarded lenders · live</Text>
          {onboarded.map((o) => (
            <View key={o.id} className="bg-[#111111] border rounded-xl p-3 mb-2 flex-row items-center justify-between" style={{ borderColor: "#22C55E2E" }}>
              <View className="flex-1 pr-2">
                <Text className="text-[#F9FAFB] text-[13px] font-bold">{o.name}</Text>
                <Text className="text-[#6B7280] text-[11px]">{o.type.replace(/_/g, " ")} · {o.integrationMode}</Text>
              </View>
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${o.providers.length ? "#60A5FA" : "#22C55E"}1A`, borderWidth: 1, borderColor: `${o.providers.length ? "#60A5FA" : "#22C55E"}40` }}>
                <Text style={{ color: o.providers.length ? "#60A5FA" : "#22C55E" }} className="text-[8px] font-bold uppercase">{o.providers.length ? `API · ${o.providers.length}` : "Onboarded"}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Qualified for your decon loan — best product-fit lenders from the list */}
      {recs.length ? (
        <View className="mb-5 mt-1">
          <Text className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: BRIDGE.bright }}>Qualified for your decon loan</Text>
          {recs.map((r) => {
            const integ = INTEGRATION[r.integration] ?? INTEGRATION.planned!;
            return (
              <View key={r.id} className="bg-[#111111] border rounded-xl p-3 mb-2 flex-row items-center justify-between" style={{ borderColor: `${BRIDGE.color}2E` }}>
                <View className="flex-1 pr-2">
                  <Text className="text-[#F9FAFB] text-[13px] font-bold">{r.name}</Text>
                  <Text className="text-[#94A3B8] text-[11px]" numberOfLines={1}>{r.matched}{r.riPresence ? " · RI" : ""}</Text>
                </View>
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${integ.color}1A`, borderWidth: 1, borderColor: `${integ.color}40` }}>
                  <Text style={{ color: integ.color }} className="text-[8px] font-bold uppercase">{integ.label}</Text>
                </View>
              </View>
            );
          })}
          <Text className="text-[#4B5563] text-[9px] mt-1">Matched from the lender list to your decon/bridge need — informational, not an offer.</Text>
        </View>
      ) : null}

      {/* Stats */}
      <View className="flex-row flex-wrap justify-between mb-4">
        {[
          { label: "Lenders", value: s.lenders, color: RED },
          { label: "RI Presence", value: s.riPresence, color: "#60A5FA" },
          { label: "Connected", value: s.connected, color: "#22C55E" },
          { label: "Categories", value: s.categories, color: "#F9FAFB" },
        ].map((t) => (
          <View key={t.label} className="bg-[#111111] border border-[#262626] rounded-xl p-3 mb-2" style={{ width: "48.5%" }}>
            <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider mb-1">{t.label}</Text>
            <Text style={{ color: t.color }} className="text-lg font-extrabold">{t.value}</Text>
          </View>
        ))}
      </View>

      {/* Marketplace intro */}
      <View className="bg-[#111111] border rounded-2xl p-4 mb-5" style={{ borderColor: "#22C55E26" }}>
        <Text className="text-[#22C55E] text-[10px] font-bold uppercase tracking-widest mb-1.5">Loan Marketplace</Text>
        <Text className="text-[#cbd2da] text-[12px] leading-snug">
          When you open The Loan Pit, these lenders compete on your loan terms. You see every bid. You pick the winner.
          The more lenders connected, the better your rate.
        </Text>
      </View>

      {/* LIVE lender catalog — grouped by category, with onboarded/API truth badges */}
      {liveCategories.map((cat) => (
        <View key={cat.key} className="mb-4">
          {catHeader(cat)}
          {cat.lenders.map((l) => lenderCard(l))}
        </View>
      ))}

      {/* DEMO catalog — kept but collapsed by default so real data stays the focus */}
      {demoCategories.length ? (
        <View className="mt-2">
          <TouchableOpacity onPress={() => setShowDemo((v) => !v)} activeOpacity={0.7} className="flex-row items-center gap-1 mb-2 py-1">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">{showDemo ? "Hide" : "Show"} examples · illustrative</Text>
            <Text className="text-[#6B7280] text-[10px]">{showDemo ? "▾" : "▸"}</Text>
          </TouchableOpacity>
          {showDemo
            ? demoCategories.map((cat) => (
                <View key={`demo-${cat.key}`} className="mb-4">
                  {catHeader(cat)}
                  {cat.lenders.map((l) => lenderCard(l, true))}
                </View>
              ))
            : null}
        </View>
      ) : null}
    </View>
  );
}
