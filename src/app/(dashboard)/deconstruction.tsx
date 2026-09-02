import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useMode } from "@/lib/view-mode";
import { isPreview } from "@/lib/preview";
import { DEMO_PRODUCTS } from "@/lib/demo-deconstruction";
import { useLocalHome } from "@/lib/home-store";
import { detailedBOM, bomByZone, bomHighTicket } from "@ml-systems/types";
import { CompartmentChrome } from "@/components/compartment-chrome";
import { AppHeader } from "@/components/app-header";
import { InvestorPointer } from "@/components/investor-pointer";

/** Decon Lab — R&D potential-product previews.
 *  Reads the tier-filtered `deconProducts.list` procedure: preview tier gets
 *  teaser cards; Custodian (admin) additionally sees the internal detail. */

const STATUS_COLORS: Record<string, string> = {
  "in-development": "#22C55E",
  prototype: "#F97316",
  research: "#60A5FA",
  concept: "#6B7280",
};

const CATEGORY_LABELS: Record<string, string> = {
  foundation: "Foundation",
  roofing: "Roofing",
  walls: "Walls",
  metadata: "Metadata",
  ree: "REE · Cross-industry",
};

// Each invention's building-material personalization — REAPER themes its card
// by what it's made of (accent + glyph on the border), on top of its stage.
const CATEGORY_MATERIAL: Record<string, { color: string; glyph: string }> = {
  foundation: { color: "#9CA3AF", glyph: "▤" }, // concrete / aggregate
  roofing: { color: "#F59E0B", glyph: "◣" }, // slate / shingle
  walls: { color: "#B45309", glyph: "▦" }, // brick / timber
  metadata: { color: "#2DD4BF", glyph: "⌗" }, // data
  ree: { color: "#A78BFA", glyph: "◆" }, // rare-earth crystal
};

type ProductRow = {
  id: string;
  name: string;
  category: string;
  status: string;
  tagline: string;
  glyph: string;
  maturity: number;
  // Custodian-tier fields
  phase?: string;
  description?: string;
  deconUse?: string;
  crossIndustryUse?: string;
  costEstimate?: string;
  replaces?: string;
  researchPath?: string;
};

export default function DeconProductsScreen() {
  const { isHome, isInvestor, isCustodian } = useMode();
  const localHome = useLocalHome();
  const products = trpc.deconProducts.list.useQuery({}, { retry: 0 });
  // The homeowner's live decon progress, surfaced on the project card so the
  // landing shows where their recovery stands before they open the project.
  const equity = trpc.equity.getMine.useQuery(undefined, { retry: 0 });
  const project = equity.data?.project ?? null;
  const profile = trpc.deconSessions.getProfileByProject.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id, retry: 0 },
  );
  const prof = profile.data;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await products.refetch();
    setRefreshing(false);
  }, [products]);

  const data = products.data as { tier?: string; products?: ProductRow[] } | undefined;
  const live = data?.products ?? [];
  // Guest web build (try.mlsystemsri.com) can't reach the API cross-origin — fall
  // back to the preview-tier demo catalog so R&D renders like the dev server.
  const usingDemo = !products.isLoading && live.length === 0 && isPreview();
  const rows: ProductRow[] = live.length ? live : (usingDemo ? DEMO_PRODUCTS : []);
  // Internal detail unlocks under the Custodian lens OR a custodian-tier account.
  const showInternal = isCustodian || data?.tier === "custodian";

  return (
    <View className="flex-1 bg-[#0A0A0A]">
    <AppHeader
      href="/deconstruction"
      title="Decon Lab — R&D"
      subtitle={showInternal ? "Potential products · internal detail" : "Recovered-material R&D"}
    />
    <ScrollView
      className="flex-1"
      style={{ zIndex: 1 }}
      contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
    >
      {/* Homeowner: why recovery matters to them. Investor: the bond pointer. */}
      {isHome ? (
        <Text className="text-[#9CA3AF] text-[12.5px] leading-5 mb-4 mt-1">
          Recovered materials from your home lower your rebuild cost and grow your equity faster —
          here's the R&D turning salvage into new building products.
        </Text>
      ) : null}
      {isInvestor ? (
        <View className="mb-4 mt-1">
          <InvestorPointer line="Recovered-material R&D compounds the recovery margin." />
        </View>
      ) : null}

      {/* Decon Lab project — the home, the assemblies, the measurement gather, then capture. */}
      <TouchableOpacity
        onPress={() => router.push("/decon-project")}
        activeOpacity={0.8}
        className="bg-[#111111] border border-[#F97316]/30 rounded-2xl p-4 mb-4 flex-row items-center justify-between"
      >
        <View className="flex-1 pr-3">
          <Text className="text-[#F97316] text-[10px] font-bold uppercase tracking-wider mb-1">
            ⬡ Project
          </Text>
          <Text className="text-[#F9FAFB] text-[14px] font-bold">Open your Decon Lab project</Text>
          <Text className="text-[#6B7280] text-[11px] mt-0.5">
            Home · assemblies · measure · capture on site
          </Text>
          {/* Live progress — REAPER's rollup for this home, so the landing shows where
              recovery stands before the homeowner opens the project. */}
          {prof && (prof.materialsCount ?? 0) > 0 ? (
            <Text className="text-[#F97316] text-[11px] font-semibold mt-1.5">
              ⛏ {prof.materialsCount} materials
              {prof.recoveryRate != null ? ` · ${prof.recoveryRate}% recovery` : ""}
              {prof.estValueCents ? ` · $${Math.round(prof.estValueCents / 100).toLocaleString()} ready` : ""}
              {prof.highTicketValueCents ? ` · ⭐ $${Math.round(prof.highTicketValueCents / 100).toLocaleString()} high-ticket` : ""}
            </Text>
          ) : null}
        </View>
        <Text className="text-[#F97316] text-[15px]">→</Text>
      </TouchableOpacity>

      {/* Every building material — REAPER's itemized breakdown of THIS home, by BOH zone.
          MODELED from the home's gross SF; these are what he stages for MIA / the BOH. */}
      {isHome && localHome?.sqft ? (() => {
        const bom = detailedBOM({ grossSF: localHome.sqft });
        const zones = bomByZone(bom);
        const totalCents = bom.reduce((n, l) => n + l.salvageValueCents, 0);
        const ht = bomHighTicket(bom);
        return (
          <View className="bg-[#111111] border border-[#F97316]/30 rounded-2xl p-4 mb-4">
            <Text className="text-[#F97316] text-[10px] font-bold uppercase tracking-wider mb-1">⛏ Every building material</Text>
            <Text className="text-[#6B7280] text-[11px] mb-3">
              Your home ({localHome.sqft.toLocaleString()} SF) breaks down to {bom.length} materials · ${Math.round(totalCents / 100).toLocaleString()} recoverable
            </Text>
            {/* High-ticket isolation — trim, kitchen, fixtures, architectural salvage:
                individually listed for MIA / the BOH, soft-stripped before the crane. */}
            {ht.lines.length ? (
              <View className="rounded-xl border border-[#F5D060]/40 bg-[#F5D060]/5 p-3 mb-3">
                <View className="flex-row items-center mb-1">
                  <Text className="text-[#F5D060] text-[10px] font-bold uppercase tracking-wider flex-1">
                    ⭐ High-ticket — isolated for MIA
                  </Text>
                  <Text className="text-[#F5D060] text-[11px] font-bold">
                    ${Math.round(ht.totalCents / 100).toLocaleString()}
                  </Text>
                </View>
                {ht.lines.slice(0, 6).map((l) => (
                  <View key={l.id} className="flex-row justify-between">
                    <Text className="text-[#E5E7EB] text-[10px] flex-1" numberOfLines={1}>{l.qty.toLocaleString()} {l.unit} · {l.name}</Text>
                    <Text className="text-[#F5D060] text-[10px] ml-2">${Math.round(l.salvageValueCents / 100).toLocaleString()}</Text>
                  </View>
                ))}
                {ht.lines.length > 6 ? (
                  <Text className="text-[#6B7280] text-[9.5px] mt-0.5">+ {ht.lines.length - 6} more high-ticket items</Text>
                ) : null}
                <Text className="text-[#4B5563] text-[8.5px] mt-1">
                  Soft-strip first — these come out by hand before the crane · each gets its own BOH listing
                </Text>
              </View>
            ) : null}
            {zones.map((z) => (
              <View key={z.bohZone} className="mb-2.5">
                <View className="flex-row items-center mb-1">
                  <Text className="text-[#F9FAFB] text-[11px] font-semibold flex-1">Z{z.bohZone} · {z.zoneName}</Text>
                  <Text style={{ color: "#F97316" }} className="text-[10px]">${Math.round(z.salvageValueCents / 100).toLocaleString()}</Text>
                </View>
                {z.lines.map((l) => (
                  <View key={l.id} className="flex-row justify-between">
                    <Text className="text-[#9CA3AF] text-[10px] flex-1" numberOfLines={1}>{l.qty.toLocaleString()} {l.unit} · {l.name}</Text>
                    <Text className="text-[#6B7280] text-[10px] ml-2" numberOfLines={1}>{l.route?.label ?? l.disposition}</Text>
                  </View>
                ))}
              </View>
            ))}
            <Text className="text-[#4B5563] text-[8.5px] mt-1">MODELED · scales from a 2,500 SF baseline · REAPER stages these for MIA / the Builders Open House</Text>
          </View>
        );
      })() : null}

      {/* Operating credentials — the entity's path to legally operate */}
      {showInternal ? (
        <TouchableOpacity
          onPress={() => router.push("/credentials")}
          activeOpacity={0.8}
          className="bg-[#111111] border border-[#F97316]/30 rounded-2xl p-4 mb-4 flex-row items-center justify-between"
        >
          <View className="flex-1 pr-3">
            <Text className="text-[#F97316] text-[10px] font-bold uppercase tracking-wider mb-1">
              ☑ Credentials
            </Text>
            <Text className="text-[#F9FAFB] text-[14px] font-bold">Operating Credentials</Text>
            <Text className="text-[#6B7280] text-[11px] mt-0.5">
              Road to operate — insurance · registration · licensing
            </Text>
          </View>
          <Text className="text-[#F97316] text-[15px]">→</Text>
        </TouchableOpacity>
      ) : null}

      {products.isLoading ? (
        <Text className="text-[#6B7280] text-sm text-center mt-8">Loading products…</Text>
      ) : products.isError && !isPreview() ? (
        <Text className="text-[#EF4444] text-sm text-center mt-8">
          Couldn't reach the lab — pull to retry.
        </Text>
      ) : rows.length === 0 ? (
        <Text className="text-[#6B7280] text-sm text-center mt-8">No products yet.</Text>
      ) : (
        rows.map((p) => {
          const statusColor = STATUS_COLORS[p.status] ?? "#6B7280";
          const mat = CATEGORY_MATERIAL[p.category] ?? { color: "#6B7280", glyph: "◇" };
          const maturityPct = Math.max(2, Math.min(100, p.maturity));
          return (
            <View
              key={p.id}
              className="bg-[#111111] rounded-2xl p-4 mb-3 overflow-hidden"
              style={{ borderWidth: 1, borderColor: `${statusColor}55` }}
            >
              {/* stage → border: a maturity fill along the top edge, in the status color */}
              <View style={{ position: "absolute", top: 0, left: 0, height: 2, width: `${maturityPct}%`, backgroundColor: statusColor }} />
              {/* material personalization → a left-edge accent in the material color */}
              <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: mat.color }} />
              <View className="flex-row items-center gap-2 mb-1">
                <Text style={{ color: mat.color }} className="text-[14px]">{p.glyph}</Text>
                <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider">
                  {CATEGORY_LABELS[p.category] ?? p.category}
                </Text>
                <View className="flex-1" />
                <Text
                  style={{ color: statusColor }}
                  className="text-[9px] font-bold uppercase tracking-wider"
                >
                  {p.status.replace(/-/g, " ")}
                </Text>
              </View>
              <Text className="text-[#F9FAFB] text-[15px] font-bold leading-tight mb-1">{p.name}</Text>
              <Text className="text-[#9CA3AF] text-[12px] leading-snug">{p.tagline}</Text>

              {/* Maturity bar */}
              <View className="flex-row items-center gap-2 mt-2.5">
                <View className="flex-1 h-[3px] rounded-full bg-[#262626] overflow-hidden">
                  <View
                    className="h-full rounded-full bg-[#F97316]"
                    style={{ width: `${Math.max(2, Math.min(100, p.maturity))}%` }}
                  />
                </View>
                <Text className="text-[#6B7280] text-[9px] font-mono">{p.maturity}%</Text>
              </View>

              {/* Custodian internal detail */}
              {showInternal && p.description ? (
                <View className="mt-3 pt-3 border-t border-[#262626]">
                  <View className="flex-row items-center gap-1.5 mb-1.5">
                    <Text className="text-[#FFE500] text-[8px] font-bold uppercase tracking-widest">
                      Internal · Custodian
                    </Text>
                    {p.phase ? (
                      <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider">
                        · {p.phase}
                      </Text>
                    ) : null}
                  </View>
                  <Text className="text-[#cbd2da] text-[11.5px] leading-snug">{p.description}</Text>
                  {p.deconUse ? (
                    <Text className="text-[#9CA3AF] text-[11px] leading-snug mt-1.5">
                      <Text className="text-[#F97316] font-bold">Decon: </Text>
                      {p.deconUse}
                    </Text>
                  ) : null}
                  {p.crossIndustryUse ? (
                    <Text className="text-[#9CA3AF] text-[11px] leading-snug mt-1">
                      <Text className="text-[#A78BFA] font-bold">Cross-industry: </Text>
                      {p.crossIndustryUse}
                    </Text>
                  ) : null}
                  {p.costEstimate || p.replaces ? (
                    <Text className="text-[#9CA3AF] text-[11px] leading-snug mt-1">
                      {p.costEstimate ? (
                        <>
                          <Text className="text-[#22C55E] font-bold">Cost: </Text>
                          {p.costEstimate}
                        </>
                      ) : null}
                      {p.costEstimate && p.replaces ? "  ·  " : ""}
                      {p.replaces ? (
                        <>
                          <Text className="text-[#EF4444] font-bold">Replaces: </Text>
                          {p.replaces}
                        </>
                      ) : null}
                    </Text>
                  ) : null}
                  {p.researchPath ? (
                    <Text className="text-[#4B5563] text-[9px] font-mono mt-1.5" numberOfLines={1}>
                      {p.researchPath}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })
      )}

      <Text className="text-center text-[#4B5563] text-[9.5px] font-mono tracking-wider mt-2">
        {showInternal
          ? "Full portfolio — LL · TT · MVE"
          : "Detail is internal — Custodian lens"}
      </Text>
    </ScrollView>
    <CompartmentChrome href="/deconstruction" />
    </View>
  );
}
