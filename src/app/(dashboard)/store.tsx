import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput, Image } from "react-native";
import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useMode } from "@/lib/view-mode";
import { BOH_ZONES, zoneForCategory } from "@/lib/boh-categories";
import { DEMO_LISTINGS } from "@/lib/demo-store";
import { isPreview } from "@/lib/preview";
import { CompartmentChrome } from "@/components/compartment-chrome";
import { AuroraWeaveBorder } from "@/components/aurora-weave-border";
import { AppHeader } from "@/components/app-header";
import { InvestorPointer } from "@/components/investor-pointer";
import { addToCart, useCartCount } from "@/lib/cart-store";
import { parseIntent, scoutMatch, scoutReflect, type ParsedIntent } from "@/lib/scout-intent";
import { useLocalHome } from "@/lib/home-store";
import { WHITEHALL_HOME, WHITEHALL_HARVEST } from "@/lib/whitehall-home";

const SCOUT_SUGGESTIONS = [
  "Roofing for my 2,000 SF home",
  "Kitchen remodel",
  "Framing lumber",
  "Doors & windows",
  "Whole-home bundle",
];

/** Builder's Open House — recovered-material marketplace (.store).
 *  Mirrors the live store: Shop-by-Zone browse + faithful listing cards.
 *  Homeowner = clean shopping; Custodian = + provenance internals (server-gated). */

const TEAL = "#14B8A6";

const CONDITION_COLORS: Record<string, string> = {
  excellent: "#22C55E",
  good: TEAL,
  fair: "#FFE500",
  salvage: "#F97316",
};

function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const BRIGHT = "#CCFBF1";

type Listing = {
  id: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  category: string | null;
  condition: string | null;
  priceCents: number | null;
  compareAtCents: number | null;
  quantity: number | null;
  unit: string | null;
  pickupLocation: string | null;
  images?: string[] | null;
  dimensions?: string | null;
  specs?: Record<string, string> | null;
  featured: boolean | null;
  mlMaterialId?: string | null;
  grade?: string | null;
  contaminationStatus?: string | null;
  /** Custodian tier only — the home/project the material came from. */
  sourceProject?: string | null;
};

const GRADE_COLORS: Record<string, string> = {
  A: "#22C55E",
  B: "#60A5FA",
  C: "#FFE500",
  D: "#EF4444",
};

/** One material under a home's expansion — merged from live listings (active +
 *  draft), REAPER's recovered ledger, and the bundled demo harvest. */
type HomeMaterial = {
  id: string;
  title: string;
  category: string | null;
  grade?: string | null;
  mlMaterialId?: string | null;
  priceCents?: number | null;
  compareAtCents?: number | null;
  quantity?: number | null;
  unit?: string | null;
  condition?: string | null;
  dimensions?: string | null;
  source: "listed" | "draft" | "recovered" | "demo";
  /** storeListings id — present for listed/draft rows so drafts can be activated. */
  listingId?: string;
};

const SOURCE_META: Record<HomeMaterial["source"], { label: string; color: string }> = {
  listed: { label: "live on .store", color: TEAL },
  draft: { label: "draft — activate to go live", color: "#FFE500" },
  recovered: { label: "recovered · ready to list", color: "#F97316" },
  demo: { label: "demo", color: "#6B7280" },
};

/** One home in the catalogue — from store.homeCatalogue, or the bundled fallback. */
type CatalogueHome = {
  key: string;
  projectId: string | null;
  address: string;
  cityState: string;
  statusLabel: string | null;
  cycleNumber: number | null;
  isOwn: boolean;
  materialsCount: number;
  activeListingCount: number;
  canBulkDraft: boolean;
  materials: HomeMaterial[];
};

export default function StoreScreen() {
  const { isHome, isInvestor, isCustodian } = useMode();
  const router = useRouter();
  const cartCount = useCartCount();
  const [zone, setZone] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const q = trpc.store.listRecent.useQuery(
    { limit: 48, category: zone ?? undefined },
    { retry: 0 },
  );
  const data = q.data as { tier?: string; listings?: Listing[] } | undefined;
  const live = data?.listings ?? [];
  // Guest web build (try.mlsystemsri.com) can't reach the API cross-origin — fall
  // back to demo listings (filtered by the selected zone) so the marketplace
  // always renders. Native/authenticated builds keep real data + real empty states.
  const usingDemo = !q.isLoading && live.length === 0 && isPreview();
  const rows: Listing[] = live.length
    ? live
    : usingDemo
      ? (zone ? DEMO_LISTINGS.filter((l) => l.category === zone) : DEMO_LISTINGS)
      : [];
  // Custodian lens reveals operator provenance internals; a custodian-tier account also unlocks it.
  const showProvenance = isCustodian || data?.tier === "custodian";

  // ── MIA console — the operator governs the .store catalog from the phone.
  // Writes hit the shared storeListings table, so the web store reflects them
  // instantly. Mutations are admin-gated server-side (adminProcedure).
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [fTitle, setFTitle] = useState("");
  const [fZone, setFZone] = useState<string | null>(null);
  const [fPrice, setFPrice] = useState("");
  const [fQty, setFQty] = useState("1");
  const [fCondition, setFCondition] = useState<"excellent" | "good" | "fair" | "salvage">("good");
  const [fFeatured, setFFeatured] = useState(false);

  const afterWrite = useCallback(() => {
    q.refetch();
  }, [q]);
  const createM = trpc.store.createListing.useMutation({
    onSuccess: () => {
      setFTitle("");
      setFPrice("");
      setFQty("1");
      setFFeatured(false);
      afterWrite();
    },
  });
  const featureM = trpc.store.setFeatured.useMutation({ onSuccess: afterWrite });
  const statusM = trpc.store.setStatus.useMutation({ onSuccess: afterWrite });

  const priceCents = Math.round((parseFloat(fPrice) || 0) * 100);
  const canPublish = fTitle.trim().length > 0 && !!fZone && priceCents > 0 && !createM.isPending;
  const publish = () => {
    if (!canPublish || !fZone) return;
    createM.mutate({
      title: fTitle.trim(),
      category: fZone,
      priceCents,
      quantity: parseInt(fQty, 10) || 1,
      condition: fCondition,
      featured: fFeatured,
    });
  };

  // ── REAPER → MIA handoff — list his recovered materials onto the .store.
  const [reaperOpen, setReaperOpen] = useState(false);
  const [priceById, setPriceById] = useState<Record<string, string>>({});
  const [listingId, setListingId] = useState<string | null>(null);
  const listableQ = trpc.materials.getListableMaterials.useQuery(undefined, {
    retry: 0,
    enabled: showProvenance,
  });
  const listFromM = trpc.store.listFromMaterial.useMutation({
    onSuccess: () => {
      listableQ.refetch();
      q.refetch();
    },
  });
  // Array.isArray, not `?? []` — the query can settle to a non-array (error
  // payload), and `?? []` only guards null/undefined (the Hub launch-crash lesson).
  const listable = (Array.isArray(listableQ.data) ? listableQ.data : []) as {
    id: string;
    name: string;
    grade: string | null;
    category: string | null;
    mlMaterialId: string | null;
  }[];
  const listMaterial = (id: string) => {
    const cents = Math.round((parseFloat(priceById[id] ?? "") || 0) * 100);
    if (!cents) return;
    setListingId(id);
    listFromM.mutate({ materialId: id, priceCents: cents });
  };

  // ── The Home Catalogue — the LIVE value-chain homes connected to the
  // marketplace (store.homeCatalogue): every home with market content, tap →
  // its materials by zone, tap a material for provenance. Falls back to the
  // bundled Whitehall harvest when the feed is empty/unreachable.
  const [openHomeId, setOpenHomeId] = useState<string | null>(null);
  const [openMaterial, setOpenMaterial] = useState<string | null>(null);
  const localHome = useLocalHome();
  const equityQ = trpc.equity.getMine.useQuery(undefined, { retry: 0 });
  const homeProject = equityQ.data?.project ?? null;
  const hcQ = trpc.store.homeCatalogue.useQuery(undefined, { retry: 0 });
  // Array.isArray, not `?? []` — the query can settle to a non-array error
  // payload (the Hub launch-crash lesson).
  const feedHomes: any[] = Array.isArray(hcQ.data?.homes) ? hcQ.data.homes : [];
  const bulkM = trpc.store.listAllFromProject.useMutation({
    onSuccess: () => {
      hcQ.refetch();
      q.refetch();
      listableQ.refetch();
    },
  });
  const activateM = trpc.store.setStatus.useMutation({
    onSuccess: () => {
      hcQ.refetch();
      q.refetch();
    },
  });

  const listingToMaterial = (l: any): HomeMaterial => ({
    id: `l-${l.id}`,
    title: l.title,
    category: l.category,
    grade: l.grade ?? (l.specs?.grade ? String(l.specs.grade).replace("Grade ", "") : null),
    mlMaterialId: l.mlMaterialId ?? l.specs?.provenance ?? null,
    priceCents: l.priceCents,
    compareAtCents: l.compareAtCents,
    quantity: l.quantity,
    unit: l.unit,
    condition: l.condition,
    dimensions: l.dimensions ?? null,
    source: l.status === "draft" ? ("draft" as const) : ("listed" as const),
    listingId: l.id,
  });

  const catalogueHomes: CatalogueHome[] = feedHomes.length
    ? feedHomes.map((h: any) => {
        const listings: any[] = Array.isArray(h.listings) ? h.listings : [];
        const mats: any[] = Array.isArray(h.materials) ? h.materials : [];
        const recovered: HomeMaterial[] = mats
          .filter((m) => m.status !== "listed" && m.status !== "sold")
          .map((m, i) => ({
            id: `m-${h.projectId}-${m.mlMaterialId ?? i}`,
            title: m.name,
            category: m.category,
            grade: m.grade,
            mlMaterialId: m.mlMaterialId,
            priceCents: m.estimatedValueCents || null,
            source: "recovered" as const,
          }));
        return {
          key: h.projectId,
          projectId: h.projectId,
          address: h.address ?? "Unknown address",
          cityState: [h.city, h.state].filter(Boolean).join(", "),
          statusLabel: h.status ? String(h.status).replace(/_/g, " ") : null,
          cycleNumber: h.cycleNumber ?? null,
          isOwn: !!homeProject?.id && h.projectId === homeProject.id,
          materialsCount: h.materialsCount ?? 0,
          activeListingCount: h.activeListingCount ?? 0,
          canBulkDraft: showProvenance && recovered.length > 0,
          materials: [...listings.map(listingToMaterial), ...recovered],
        };
      })
    : [
        // Fallback — the bundled Whitehall flagship (offline / feed unreachable).
        {
          key: "fallback-whitehall",
          projectId: homeProject?.id ?? null,
          address: homeProject?.property?.addressLine1 ?? localHome?.address ?? WHITEHALL_HOME.address,
          cityState: [
            homeProject?.property?.city ?? localHome?.city ?? WHITEHALL_HOME.city,
            homeProject?.property?.state ?? localHome?.state ?? WHITEHALL_HOME.state,
          ]
            .filter(Boolean)
            .join(", "),
          statusLabel: null,
          cycleNumber: null,
          isOwn: true,
          materialsCount: WHITEHALL_HARVEST.length,
          activeListingCount: 0,
          canBulkDraft: false,
          materials: WHITEHALL_HARVEST.map((h) => ({ ...h, source: "demo" as const })),
        },
      ];

  // Group one home's materials by BOH zone; categories that aren't zone keys
  // (REAPER's ledger uses material categories like "structural") land in a
  // Recovered Materials bucket.
  const zoneGroupsFor = (materials: HomeMaterial[]) =>
    [
      ...BOH_ZONES.map((z) => ({
        key: z.key,
        name: z.zone ? `${z.zone} · ${z.name}` : z.name,
        icon: z.icon,
        items: materials.filter((m) => m.category === z.key),
      })),
      {
        key: "other",
        name: "Recovered Materials",
        icon: "⛏️",
        items: materials.filter((m) => !zoneForCategory(m.category)),
      },
    ].filter((g) => g.items.length > 0);

  // MIA's Scout — "Shop by Intent": mirror the homeowner's project to recovered supply.
  const [intentText, setIntentText] = useState("");
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const scouted = intent ? scoutMatch(rows, intent) : null;
  const displayRows: Listing[] = scouted ? scouted.rows : rows;
  const submitIntent = (text: string) => {
    const t = text.trim();
    if (!t) {
      setIntent(null);
      return;
    }
    setZone(null); // intent mirrors across all supply
    setIntent(parseIntent(t));
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  return (
    <View className="flex-1 bg-[#0A0A0A]">
    <AppHeader
      href="/store"
      title="Builder's Open House"
      subtitle={
        isHome
          ? "Materials for your rebuild · .store"
          : showProvenance
            ? "Recovered-material marketplace · provenance"
            : "Recovered-material marketplace · .store"
      }
      right={
        <TouchableOpacity
          onPress={() => router.push("/cart")}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="rounded-full px-2.5 py-1 flex-row items-center gap-1"
          style={{ backgroundColor: `${TEAL}1A`, borderWidth: 1, borderColor: `${TEAL}40` }}
        >
          <Text style={{ fontSize: 13 }}>🛒</Text>
          {cartCount > 0 ? (
            <Text style={{ color: TEAL }} className="text-[11px] font-bold">{cartCount}</Text>
          ) : null}
        </TouchableOpacity>
      }
    />
    <ScrollView
      className="flex-1"
      style={{ zIndex: 1 }}
      contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
    >
      {/* Investor: the salvage marketplace as a recovery-revenue channel. */}
      {isInvestor ? (
        <View className="mb-5 mt-1">
          <InvestorPointer line="The salvage marketplace is a recovery-revenue channel." />
        </View>
      ) : null}

      {/* Hero — MIA's woven mirror over the marketplace */}
      <View className="rounded-2xl p-4 mb-5 mt-1 overflow-hidden" style={{ backgroundColor: `${TEAL}12`, borderWidth: 1, borderColor: `${TEAL}33` }}>
        <Text className="text-[16px] font-extrabold mb-1">
          <Text style={{ color: TEAL }}>Resell.</Text> <Text className="text-[#06B6D4]">Reuse.</Text> <Text className="text-[#10B981]">Recycle.</Text>
        </Text>
        <Text className="text-[#9CA3AF] text-[12px] leading-snug">
          We systematically take buildings apart and bring every material to its most valuable recoverable
          state — the most salvage value it can hold. A virtual salvage yard and Builder's Open House, as one.
        </Text>
        <AuroraWeaveBorder color={TEAL} bright={BRIGHT} radius={16} both frame={false} idKey="store-hero" />
      </View>

      {/* The Home Catalogue — LIVE value-chain homes feeding the marketplace */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-2">
        The Home Catalogue{feedHomes.length ? " · live" : ""}
      </Text>
      {catalogueHomes.map((home) => {
        const homeOpen = openHomeId === home.key;
        const homeZoneGroups = zoneGroupsFor(home.materials);
        return (
      <View key={home.key} className="rounded-2xl mb-3 overflow-hidden" style={{ backgroundColor: "#0d1513", borderWidth: 1, borderColor: home.isOwn ? `${TEAL}44` : "#1a2422" }}>
        <TouchableOpacity
          onPress={() => setOpenHomeId(homeOpen ? null : home.key)}
          activeOpacity={0.85}
          className="px-3.5 py-3"
        >
          <View className="flex-row items-center gap-2 mb-1.5 flex-wrap">
            {home.isOwn ? (
              <>
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: "#34D39918", borderWidth: 1, borderColor: "#34D39955" }}>
                  <Text style={{ color: "#34D399" }} className="text-[9px] font-bold">✓ VERA-verified</Text>
                </View>
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: "#F9731618", borderWidth: 1, borderColor: "#F9731655" }}>
                  <Text style={{ color: "#F97316" }} className="text-[9px] font-bold">🔥 Fire sale</Text>
                </View>
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${TEAL}14`, borderWidth: 1, borderColor: `${TEAL}44` }}>
                  <Text style={{ color: TEAL }} className="text-[9px] font-bold">Homeowner #1</Text>
                </View>
              </>
            ) : (
              <>
                {home.statusLabel ? (
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: "#26262640", borderWidth: 1, borderColor: "#374151" }}>
                    <Text className="text-[#9CA3AF] text-[9px] font-bold uppercase">{home.statusLabel}</Text>
                  </View>
                ) : null}
                {home.cycleNumber != null ? (
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${TEAL}0D`, borderWidth: 1, borderColor: `${TEAL}33` }}>
                    <Text style={{ color: TEAL }} className="text-[9px] font-bold">Cycle {home.cycleNumber}</Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
          <View className="flex-row items-center">
            <View className="flex-1">
              <Text className="text-[#F9FAFB] text-[14px] font-extrabold" numberOfLines={1}>{home.address}</Text>
              <Text className="text-[#6B7280] text-[10.5px] mt-0.5">
                {home.cityState}
                {home.isOwn ? ` · ${WHITEHALL_HOME.propertyType} · built ${WHITEHALL_HOME.yearBuilt}` : ""}
              </Text>
              <Text style={{ color: TEAL }} className="text-[10.5px] mt-1">
                {home.materials.length} material{home.materials.length === 1 ? "" : "s"} catalogued
                {home.activeListingCount ? ` · ${home.activeListingCount} live` : ""} · tap to open the harvest
              </Text>
            </View>
            <Text style={{ color: TEAL }} className="text-[15px] ml-2">{homeOpen ? "▾" : "▸"}</Text>
          </View>
        </TouchableOpacity>

        {homeOpen ? (
          <View className="px-3.5 pb-3.5">
            {/* REAPER → MIA: stage every unlisted recovered material as a draft listing */}
            {home.canBulkDraft && home.projectId ? (
              <TouchableOpacity
                onPress={() => bulkM.mutate({ projectId: home.projectId })}
                disabled={bulkM.isPending}
                activeOpacity={0.85}
                className="rounded-xl py-2.5 items-center mb-2.5"
                style={{ backgroundColor: "#F9731618", borderWidth: 1, borderColor: "#F9731644", opacity: bulkM.isPending ? 0.6 : 1 }}
              >
                <Text style={{ color: "#F97316" }} className="text-[11px] font-bold">
                  {bulkM.isPending ? "Staging drafts…" : "Bulk list as drafts → you activate"}
                </Text>
              </TouchableOpacity>
            ) : null}
            {bulkM.isSuccess ? (
              <Text style={{ color: "#F97316" }} className="text-[10px] mb-2">
                ✓ {bulkM.data?.created ?? 0} drafted{bulkM.data?.skipped ? ` · ${bulkM.data.skipped} skipped` : ""} — activate below.
              </Text>
            ) : bulkM.isError ? (
              <Text className="text-[#EF4444] text-[10px] mb-2">Couldn't stage drafts — admin account required.</Text>
            ) : null}
            {homeZoneGroups.map((g) => (
              <View key={g.key} className="mb-2.5">
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <Text style={{ fontSize: 13 }}>{g.icon}</Text>
                  <Text className="text-[#9CA3AF] text-[10.5px] font-bold uppercase tracking-wider">{g.name}</Text>
                  <Text className="text-[#4B5563] text-[10px]">{g.items.length}</Text>
                </View>
                <View className="gap-1.5">
                  {g.items.map((m) => {
                    const open = openMaterial === m.id;
                    const gradeColor = m.grade ? (GRADE_COLORS[m.grade] ?? "#6B7280") : null;
                    const src = SOURCE_META[m.source];
                    const savings =
                      m.compareAtCents && m.priceCents && m.compareAtCents > m.priceCents
                        ? Math.round(((m.compareAtCents - m.priceCents) / m.compareAtCents) * 100)
                        : 0;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => setOpenMaterial(open ? null : m.id)}
                        activeOpacity={0.85}
                        className="rounded-xl px-3 py-2.5"
                        style={{ backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: open ? `${TEAL}55` : "#1a2422" }}
                      >
                        <View className="flex-row items-center gap-2">
                          <Text className="text-[#F9FAFB] text-[12px] font-semibold flex-1" numberOfLines={open ? undefined : 1}>
                            {m.title}
                          </Text>
                          {m.grade && gradeColor ? (
                            <Text style={{ color: gradeColor, backgroundColor: `${gradeColor}18` }} className="text-[9.5px] font-bold px-1.5 py-0.5 rounded">
                              {m.grade}
                            </Text>
                          ) : null}
                          {m.priceCents != null ? (
                            <Text style={{ color: TEAL }} className="text-[12px] font-extrabold">{formatPrice(m.priceCents)}</Text>
                          ) : null}
                          <Text style={{ color: TEAL }} className="text-[11px]">{open ? "▾" : "▸"}</Text>
                        </View>
                        {open ? (
                          <View className="mt-2 pt-2 border-t border-[#1a2422]">
                            {m.mlMaterialId ? (
                              <Text style={{ color: TEAL }} className="text-[10px] font-mono mb-1">{m.mlMaterialId}</Text>
                            ) : null}
                            <View className="flex-row items-center flex-wrap gap-x-2 gap-y-0.5">
                              {m.condition ? (
                                <Text style={{ color: CONDITION_COLORS[m.condition] ?? "#9CA3AF" }} className="text-[10px] font-semibold">{cap(m.condition)}</Text>
                              ) : null}
                              {m.quantity != null && m.unit ? (
                                <Text className="text-[#9CA3AF] text-[10px]">{m.quantity.toLocaleString()} {m.unit}</Text>
                              ) : null}
                              {savings > 0 && m.compareAtCents != null ? (
                                <Text className="text-[#22C55E] text-[10px]">save {savings}% (was {formatPrice(m.compareAtCents)})</Text>
                              ) : null}
                            </View>
                            {m.dimensions ? (
                              <Text className="text-[#6B7280] text-[10px] mt-1">{m.dimensions}</Text>
                            ) : null}
                            <Text style={{ color: src.color }} className="text-[9px] font-bold uppercase tracking-wider mt-1.5">{src.label}</Text>
                            {/* Draft → active: the operator's one-tap go-live */}
                            {m.source === "draft" && showProvenance && m.listingId ? (
                              <TouchableOpacity
                                onPress={() => activateM.mutate({ id: m.listingId, status: "active" })}
                                disabled={activateM.isPending}
                                activeOpacity={0.85}
                                className="mt-2 rounded-lg py-1.5 items-center"
                                style={{ backgroundColor: "#FFE50018", borderWidth: 1, borderColor: "#FFE50055", opacity: activateM.isPending ? 0.6 : 1 }}
                              >
                                <Text style={{ color: "#FFE500" }} className="text-[11px] font-bold">
                                  {activateM.isPending ? "Activating…" : "Activate → live on .store"}
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            {home.isOwn ? (
              <Text className="text-[#4B5563] text-[9.5px] leading-snug mt-1">
                {WHITEHALL_HOME.homeownerLine} — everything must go before the rebuild. Each material carries an
                ML Material ID and provenance chain; the full catalogue lives at mlsystemsri.store.
              </Text>
            ) : null}
          </View>
        ) : null}
        {home.isOwn ? (
          <AuroraWeaveBorder color={TEAL} bright={BRIGHT} radius={16} both frame={false} idKey={`store-home-${home.key}`} />
        ) : null}
      </View>
        );
      })}
      <View className="mb-2" />

      {/* MIA Console — operator governs the .store catalog from the phone (Custodian only) */}
      {showProvenance ? (
        <View className="rounded-2xl mb-5" style={{ backgroundColor: "#0d1513", borderWidth: 1, borderColor: `${TEAL}44` }}>
          <TouchableOpacity
            onPress={() => setConsoleOpen((o) => !o)}
            activeOpacity={0.85}
            className="flex-row items-center gap-2 px-3.5 py-3"
          >
            <Text style={{ fontSize: 15 }}>🪞</Text>
            <Text className="text-[#F9FAFB] text-[13px] font-bold">MIA Console</Text>
            <Text className="text-[#5f7d76] text-[10px]">govern .store · live</Text>
            <Text style={{ color: TEAL }} className="text-[13px] ml-auto">{consoleOpen ? "▾" : "▸"}</Text>
          </TouchableOpacity>

          {consoleOpen ? (
            <View className="px-3.5 pb-3.5">
              <Text className="text-[#6B7280] text-[10px] mb-2 leading-snug">
                Publishing writes to the shared catalog — it appears on mlsystemsri.store instantly.
              </Text>

              <TextInput
                value={fTitle}
                onChangeText={setFTitle}
                placeholder="Listing title — e.g. Reclaimed oak flooring, 200 SF"
                placeholderTextColor="#4b5563"
                className="text-[#F9FAFB] text-[12.5px] rounded-xl px-3 py-2.5 mb-2"
                style={{ backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#20302c" }}
              />

              {/* Zone picker */}
              <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1.5">Zone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2" contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
                {BOH_ZONES.map((z) => (
                  <ZoneChip
                    key={z.key}
                    label={z.zone ? `${z.zone} · ${z.name}` : z.name}
                    icon={z.icon}
                    active={fZone === z.key}
                    onPress={() => setFZone(fZone === z.key ? null : z.key)}
                  />
                ))}
              </ScrollView>

              {/* Price + Qty */}
              <View className="flex-row gap-2 mb-2">
                <View className="flex-1">
                  <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1.5">Price ($)</Text>
                  <TextInput
                    value={fPrice}
                    onChangeText={setFPrice}
                    placeholder="0"
                    placeholderTextColor="#4b5563"
                    keyboardType="numeric"
                    className="text-[#F9FAFB] text-[12.5px] rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#20302c" }}
                  />
                </View>
                <View className="w-24">
                  <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1.5">Qty</Text>
                  <TextInput
                    value={fQty}
                    onChangeText={setFQty}
                    placeholder="1"
                    placeholderTextColor="#4b5563"
                    keyboardType="numeric"
                    className="text-[#F9FAFB] text-[12.5px] rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#20302c" }}
                  />
                </View>
              </View>

              {/* Condition */}
              <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1.5">Condition</Text>
              <View className="flex-row flex-wrap gap-1.5 mb-2">
                {(["excellent", "good", "fair", "salvage"] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setFCondition(c)}
                    activeOpacity={0.8}
                    className="rounded-full px-2.5 py-1"
                    style={fCondition === c
                      ? { backgroundColor: `${CONDITION_COLORS[c]}22`, borderWidth: 1, borderColor: `${CONDITION_COLORS[c]}88` }
                      : { backgroundColor: "#111111", borderWidth: 1, borderColor: "#262626" }}
                  >
                    <Text style={{ color: fCondition === c ? CONDITION_COLORS[c] : "#9CA3AF" }} className="text-[10.5px] font-semibold">{cap(c)}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setFFeatured((v) => !v)}
                  activeOpacity={0.8}
                  className="rounded-full px-2.5 py-1 ml-auto"
                  style={fFeatured
                    ? { backgroundColor: `${TEAL}22`, borderWidth: 1, borderColor: `${TEAL}88` }
                    : { backgroundColor: "#111111", borderWidth: 1, borderColor: "#262626" }}
                >
                  <Text style={{ color: fFeatured ? TEAL : "#9CA3AF" }} className="text-[10.5px] font-semibold">★ Featured</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={publish}
                disabled={!canPublish}
                activeOpacity={0.85}
                className="rounded-xl py-3 items-center"
                style={{ backgroundColor: canPublish ? TEAL : "#1f2937", opacity: canPublish ? 1 : 0.6 }}
              >
                <Text style={{ color: canPublish ? "#04231D" : "#6B7280" }} className="text-[13px] font-extrabold">
                  {createM.isPending ? "Publishing…" : "Publish to .store"}
                </Text>
              </TouchableOpacity>
              {createM.isError ? (
                <Text className="text-[#EF4444] text-[10px] mt-2">
                  {createM.error.message.includes("FORBIDDEN") || createM.error.data?.code === "FORBIDDEN"
                    ? "Admin account required to publish."
                    : `Couldn't publish — ${createM.error.message}`}
                </Text>
              ) : createM.isSuccess ? (
                <Text style={{ color: TEAL }} className="text-[10px] mt-2">✓ Live on the store.</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* List from REAPER — recovered materials → .store (the swarm handoff, REAPER orange → MIA teal) */}
      {showProvenance ? (
        <View className="rounded-2xl mb-5" style={{ backgroundColor: "#140d08", borderWidth: 1, borderColor: "#F9731644" }}>
          <TouchableOpacity onPress={() => setReaperOpen((o) => !o)} activeOpacity={0.85} className="flex-row items-center gap-2 px-3.5 py-3">
            <Text style={{ fontSize: 15 }}>⛏️</Text>
            <Text className="text-[#F9FAFB] text-[13px] font-bold">List from REAPER</Text>
            <Text className="text-[#9a7a5f] text-[10px]">{listable.length} recovered · ready to list</Text>
            <Text style={{ color: "#F97316" }} className="text-[13px] ml-auto">{reaperOpen ? "▾" : "▸"}</Text>
          </TouchableOpacity>

          {reaperOpen ? (
            <View className="px-3.5 pb-3.5">
              <Text className="text-[#9a7a5f] text-[10px] mb-2 leading-snug">
                REAPER recovered these. Set a price to list one on the store — MIA sells what REAPER recovers.
              </Text>
              {listableQ.isLoading ? (
                <Text className="text-[#6B7280] text-[11px]">Loading…</Text>
              ) : listable.length === 0 ? (
                <Text className="text-[#6B7280] text-[11px]">Nothing waiting — scan &amp; save in the Decon Lab first.</Text>
              ) : (
                <View className="gap-2">
                  {listable.map((m) => (
                    <View key={m.id} className="rounded-xl p-3" style={{ backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#20160e" }}>
                      <View className="flex-row items-center gap-2 mb-1.5">
                        <Text className="text-[#F9FAFB] text-[12.5px] font-bold flex-1" numberOfLines={1}>{m.name}</Text>
                        {m.grade ? (
                          <Text style={{ color: "#F97316", backgroundColor: "#F9731618" }} className="text-[10px] font-bold px-1.5 py-0.5 rounded">{m.grade}</Text>
                        ) : null}
                      </View>
                      <Text className="text-[#4B5563] text-[9px] mb-2" numberOfLines={1}>{m.mlMaterialId} · {m.category}</Text>
                      <View className="flex-row items-center gap-2">
                        <TextInput
                          value={priceById[m.id] ?? ""}
                          onChangeText={(v) => setPriceById((p) => ({ ...p, [m.id]: v }))}
                          placeholder="Price $"
                          placeholderTextColor="#4b5563"
                          keyboardType="numeric"
                          className="flex-1 text-[#F9FAFB] text-[12px] rounded-lg px-3 py-2"
                          style={{ backgroundColor: "#111111", borderWidth: 1, borderColor: "#20160e" }}
                        />
                        <TouchableOpacity
                          onPress={() => listMaterial(m.id)}
                          disabled={listFromM.isPending && listingId === m.id}
                          activeOpacity={0.85}
                          className="rounded-lg px-3.5 py-2"
                          style={{ backgroundColor: "#F97316", opacity: listFromM.isPending && listingId === m.id ? 0.6 : 1 }}
                        >
                          <Text className="text-[#1a0f06] text-[12px] font-extrabold">
                            {listFromM.isPending && listingId === m.id ? "…" : "List it"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {listFromM.isError ? (
                <Text className="text-[#EF4444] text-[10px] mt-2">
                  {String(listFromM.error?.message ?? "").includes("FORBIDDEN") ? "Admin account required." : "Couldn't list — try again."}
                </Text>
              ) : listFromM.isSuccess ? (
                <Text style={{ color: "#F97316" }} className="text-[10px] mt-2">✓ Listed to the store — REAPER → MIA.</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Shop by Intent — MIA's Market Mirror */}
      <View className="rounded-2xl p-3.5 mb-5 overflow-hidden" style={{ backgroundColor: "#0d1513", borderWidth: 1, borderColor: `${TEAL}33` }}>
        <View className="flex-row items-center gap-2 mb-2">
          <Text style={{ fontSize: 15 }}>🪞</Text>
          <Text className="text-[#F9FAFB] text-[13px] font-bold">Shop by Intent</Text>
          <Text className="text-[#5f7d76] text-[10px] ml-auto">MIA · Market Mirror</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TextInput
            value={intentText}
            onChangeText={setIntentText}
            onSubmitEditing={() => submitIntent(intentText)}
            placeholder="Describe your project — e.g. roofing for my 2,000 SF home"
            placeholderTextColor="#4b5563"
            returnKeyType="search"
            className="flex-1 text-[#F9FAFB] text-[12.5px] rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#20302c" }}
          />
          <TouchableOpacity
            onPress={() => submitIntent(intentText)}
            activeOpacity={0.85}
            className="rounded-xl px-3.5 py-2.5"
            style={{ backgroundColor: `${TEAL}22`, borderWidth: 1, borderColor: `${TEAL}66` }}
          >
            <Text style={{ color: TEAL }} className="text-[12px] font-bold">Match</Text>
          </TouchableOpacity>
        </View>
        {!intent ? (
          <View className="flex-row flex-wrap gap-1.5 mt-2.5">
            {SCOUT_SUGGESTIONS.map((sug) => (
              <TouchableOpacity
                key={sug}
                onPress={() => {
                  setIntentText(sug);
                  submitIntent(sug);
                }}
                activeOpacity={0.8}
                className="rounded-full px-2.5 py-1"
                style={{ backgroundColor: "#111111", borderWidth: 1, borderColor: "#262626" }}
              >
                <Text className="text-[#9CA3AF] text-[10.5px]">{sug}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="flex-row items-center gap-2 mt-2.5">
            <Text style={{ color: TEAL }} className="text-[11px] flex-1 leading-snug">
              {scoutReflect(intent, scouted?.matched ?? 0)}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIntent(null);
                setIntentText("");
              }}
              activeOpacity={0.8}
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: "#111111", borderWidth: 1, borderColor: "#262626" }}
            >
              <Text className="text-[#9CA3AF] text-[10.5px]">✕ Clear</Text>
            </TouchableOpacity>
          </View>
        )}
        <AuroraWeaveBorder color={TEAL} bright={BRIGHT} radius={16} both frame={false} idKey="store-intent" />
      </View>

      {/* Shop by Zone */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-2">Shop by Zone</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5" contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        <ZoneChip label="All" icon="◆" active={zone === null} onPress={() => setZone(null)} />
        {BOH_ZONES.map((z) => (
          <ZoneChip
            key={z.key}
            label={z.zone ? `${z.zone} · ${z.name}` : z.name}
            icon={z.icon}
            active={zone === z.key}
            onPress={() => setZone(zone === z.key ? null : z.key)}
          />
        ))}
      </ScrollView>

      {/* Listings */}
      {q.isLoading ? (
        <Text className="text-[#6B7280] text-sm text-center mt-8">Loading listings…</Text>
      ) : q.isError && !isPreview() ? (
        <Text className="text-[#EF4444] text-sm text-center mt-8">Couldn't reach the marketplace — pull to retry.</Text>
      ) : displayRows.length === 0 ? (
        <Text className="text-[#6B7280] text-sm text-center mt-8">No listings in this zone yet.</Text>
      ) : (
        <View className="flex-row flex-wrap justify-between">
          {displayRows.map((item) => {
            const z = zoneForCategory(item.category);
            const savings =
              item.compareAtCents && item.priceCents && item.compareAtCents > item.priceCents
                ? Math.round(((item.compareAtCents - item.priceCents) / item.compareAtCents) * 100)
                : 0;
            const condColor = CONDITION_COLORS[item.condition ?? ""] ?? "#6B7280";
            const showUnit = item.unit && item.unit !== "each" && item.unit !== "lot";
            return (
              <View key={item.id} className="bg-[#111111] border border-[#262626] rounded-2xl p-3 mb-3" style={{ width: "48.5%" }}>
                {/* Featured → MIA's woven top-accent (curated) */}
                {item.featured ? (
                  <View className="mb-2 -mt-0.5">
                    <View style={{ height: 1, backgroundColor: TEAL, opacity: 0.9 }} />
                    <View style={{ height: 1, marginTop: 1, backgroundColor: TEAL, opacity: 0.4 }} />
                    <View style={{ height: 1, marginTop: 1, backgroundColor: TEAL, opacity: 0.15 }} />
                  </View>
                ) : null}
                {/* Image tile (falls back to the zone glyph — the catalog is text/spec today) */}
                <View className="rounded-xl bg-[#0A0A0A] items-center justify-center mb-2.5 overflow-hidden" style={{ aspectRatio: 4 / 3 }}>
                  {item.images && item.images[0] ? (
                    <Image source={{ uri: item.images[0] }} resizeMode="cover" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }} />
                  ) : (
                    <Text style={{ fontSize: 34 }}>{z?.icon ?? "📦"}</Text>
                  )}
                  {savings > 0 ? (
                    <View className="absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5" style={{ backgroundColor: "#22C55E" }}>
                      <Text className="text-[#06210F] text-[9px] font-bold">Save {savings}%</Text>
                    </View>
                  ) : null}
                  {item.featured ? (
                    <View className="absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5" style={{ backgroundColor: `${TEAL}33`, borderWidth: 1, borderColor: `${TEAL}55` }}>
                      <Text style={{ color: TEAL }} className="text-[9px] font-bold">Featured</Text>
                    </View>
                  ) : null}
                </View>

                {/* Category tag */}
                <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider mb-0.5" numberOfLines={1}>
                  {z ? (z.zone ? `${z.zone} · ${z.name}` : z.name) : (item.category ?? "material")}
                </Text>

                {/* Title */}
                <Text className="text-[#F9FAFB] text-[12.5px] font-bold leading-snug mb-1" numberOfLines={2}>{item.title}</Text>

                {/* Description — mirrors the web store card */}
                {item.description ? (
                  <Text className="text-[#9CA3AF] text-[10px] leading-snug mb-1.5" numberOfLines={2}>{item.description}</Text>
                ) : null}

                {/* Price */}
                <View className="flex-row items-baseline gap-1.5 mb-1.5">
                  <Text style={{ color: TEAL }} className="text-[15px] font-extrabold">{formatPrice(item.priceCents)}</Text>
                  {item.compareAtCents && item.priceCents && item.compareAtCents > item.priceCents ? (
                    <Text className="text-[#6B7280] text-[11px] line-through">{formatPrice(item.compareAtCents)}</Text>
                  ) : null}
                  {showUnit ? <Text className="text-[#6B7280] text-[10px]">/{item.unit}</Text> : null}
                </View>

                {/* Meta */}
                <View className="flex-row items-center flex-wrap gap-x-2">
                  {item.condition ? <Text style={{ color: condColor }} className="text-[10px] font-semibold">{cap(item.condition)}</Text> : null}
                  {item.quantity && item.quantity > 1 ? <Text className="text-[#6B7280] text-[10px]">Qty {item.quantity}</Text> : null}
                  {item.pickupLocation ? <Text className="text-[#4B5563] text-[10px]" numberOfLines={1}>{item.pickupLocation}</Text> : null}
                </View>

                {/* Dimensions — extra spec detail from the .store catalog */}
                {item.dimensions ? (
                  <Text className="text-[#4B5563] text-[9px] mt-1" numberOfLines={1}>{item.dimensions}</Text>
                ) : null}

                {/* Add to cart — real (purchasable) DB listings only */}
                {!usingDemo && item.priceCents ? (
                  <TouchableOpacity
                    onPress={() =>
                      addToCart({
                        id: item.id,
                        title: item.title,
                        priceCents: item.priceCents ?? 0,
                        quantity: 1,
                        maxQuantity: item.quantity ?? 99,
                        category: item.category,
                      })
                    }
                    activeOpacity={0.85}
                    className="mt-2 rounded-lg py-1.5 items-center"
                    style={{ backgroundColor: `${TEAL}1A`, borderWidth: 1, borderColor: `${TEAL}55` }}
                  >
                    <Text style={{ color: TEAL }} className="text-[11px] font-bold">+ Add to cart</Text>
                  </TouchableOpacity>
                ) : null}

                {/* Custodian internal provenance */}
                {showProvenance && (item.mlMaterialId || item.grade || item.contaminationStatus) ? (
                  <View className="mt-2 pt-2 border-t border-[#262626]">
                    <Text className="text-[#F97316] text-[8px] font-bold uppercase tracking-widest mb-0.5">Internal</Text>
                    <Text className="text-[#6B7280] text-[9.5px]" numberOfLines={2}>
                      {[item.mlMaterialId, item.grade ? `Grade ${item.grade}` : null, item.contaminationStatus].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                ) : null}

                {/* MIA quick governance — real DB rows only (writes reflect on the web store) */}
                {showProvenance && !usingDemo ? (
                  <View className="flex-row gap-1.5 mt-2 pt-2 border-t border-[#262626]">
                    <TouchableOpacity
                      onPress={() => featureM.mutate({ id: item.id, featured: !item.featured })}
                      activeOpacity={0.8}
                      className="rounded-lg px-2 py-1"
                      style={{ backgroundColor: item.featured ? `${TEAL}22` : "#111111", borderWidth: 1, borderColor: item.featured ? `${TEAL}66` : "#262626" }}
                    >
                      <Text style={{ color: item.featured ? TEAL : "#9CA3AF" }} className="text-[10px] font-semibold">★ {item.featured ? "Featured" : "Feature"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => statusM.mutate({ id: item.id, status: "sold" })}
                      activeOpacity={0.8}
                      className="rounded-lg px-2 py-1"
                      style={{ backgroundColor: "#111111", borderWidth: 1, borderColor: "#262626" }}
                    >
                      <Text className="text-[#9CA3AF] text-[10px] font-semibold">Mark sold</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
    {/* MIA presides — her aurora / blue-weave chrome over the marketplace. */}
    <CompartmentChrome href="/store" />
    </View>
  );
}

function ZoneChip({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="flex-row items-center gap-1.5 rounded-full px-3 py-2"
      style={active ? { backgroundColor: `${TEAL}1F`, borderWidth: 1, borderColor: `${TEAL}66` } : { backgroundColor: "#111111", borderWidth: 1, borderColor: "#262626" }}
    >
      <Text style={{ fontSize: 13 }}>{icon}</Text>
      <Text style={{ color: active ? TEAL : "#9CA3AF" }} className="text-[11px] font-semibold">{label}</Text>
    </TouchableOpacity>
  );
}
