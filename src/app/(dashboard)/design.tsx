import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { IsometricHouse } from "@/components/isometric-house";
import { useMode } from "@/lib/view-mode";
import { trpc } from "@/lib/trpc";
import { CompartmentChrome } from "@/components/compartment-chrome";
import { AppHeader } from "@/components/app-header";
import { InvestorPointer } from "@/components/investor-pointer";
import { WARWICK_BUILDS, type ConformingBuild } from "@/lib/design-examples";
import { useSavedPlans, deletePlan, type SavedPlan } from "@/lib/plan-store";

const DESIGN = "#60A5FA";
const STUDIO_URL = "https://design.mlsystemsri.com";

/** Design Studio — CDA's 49-reviewer swarm renders conforming builds in 3D.
 *  Lens-aware: homeowner sees the builds as inspiration for their own rebuild;
 *  custodian sees the full 49-reviewer consensus depth in the expandable card;
 *  investor gets a light throughput pointer. */
export default function DesignStudio() {
  const insets = useSafeAreaInsets();
  const { isHome, isInvestor, isCustodian } = useMode();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Lens copy for the header + section framing.
  const subtitle = isHome
    ? "Designs like these — for your home"
    : isInvestor
    ? "Standardized designs · scaled builds"
    : "AI construction documents · .design";

  return (
    <View className="flex-1 bg-[#0A0A0A]">
    <AppHeader href="/design" title="Design Studio" subtitle={subtitle} />
    <ScrollView
      className="flex-1"
      style={{ zIndex: 1 }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 16, paddingTop: 12 }}
    >
      {/* CDA Console — Custodian governs CDA's design outputs (verify the trust chain). */}
      {isCustodian ? <CdaConsole /> : null}

      {/* Investor lens — light pointer near the top. */}
      {isInvestor ? (
        <View className="mb-6">
          <InvestorPointer line="Standardized conforming designs scale build throughput per crew." />
        </View>
      ) : null}

      {/* Homeowner lens — frame the builds as starting points for their own rebuild. */}
      {isHome ? (
        <View
          className="rounded-2xl px-4 py-4 mb-6"
          style={{ backgroundColor: `${DESIGN}12`, borderWidth: 1, borderColor: `${DESIGN}33` }}
        >
          <Text className="text-[#F9FAFB] text-[14px] font-extrabold mb-1">Designs like these, for your home</Text>
          <Text className="text-[#9CA3AF] text-[12px] leading-relaxed">
            Every build below is a validated starting point — pick one you love and we'll shape it around your
            lot, your equity, and your family's rebuild.
          </Text>
        </View>
      ) : null}

      {/* ── My Plans — the j-space threads saved from "Let's build", one per address ── */}
      <MyPlans />

      {/* 3D Flowchart — loops into the Portfolio screen */}
      <TouchableOpacity
        onPress={() => router.push("/portfolio" as any)}
        activeOpacity={0.85}
        className="rounded-2xl px-4 py-4 mb-6 flex-row items-center justify-between"
        style={{ backgroundColor: "#7aa0ff14", borderWidth: 1, borderColor: "#7aa0ff40" }}
      >
        <View className="flex-row items-center gap-3 flex-1">
          <Text style={{ color: "#7aa0ff", fontSize: 22 }}>✦</Text>
          <View className="flex-1">
            <Text className="text-[#F9FAFB] text-[13px] font-bold leading-tight">View 3D Flowchart</Text>
            <Text className="text-[#6B7280] text-[11px]">Your build as a 3D scene — critical path · pain-points · phase jump</Text>
          </View>
        </View>
        <Text style={{ color: "#7aa0ff" }} className="text-lg">→</Text>
      </TouchableOpacity>

      {/* ── Conforming Builds — the generated examples, rendered in 3D ── */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider">
        {isHome ? "Inspiration for your rebuild · Warwick, RI" : "Conforming Builds · Warwick, RI"}
      </Text>
      <Text className="text-[#4B5563] text-[10px] mb-3">
        {isHome
          ? "Designs like these — each one validated and ready to shape around your home"
          : "Each validated by 7 disciplines × 7 sub-lenses = 49 reviewers"}
      </Text>

      {WARWICK_BUILDS.map((build) => (
        <BuildCard
          key={build.id}
          build={build}
          expanded={expanded === build.id}
          onToggle={() => setExpanded((e) => (e === build.id ? null : build.id))}
        />
      ))}

      {/* ── CTAs — heavy curriculum lives on the web studio ── */}
      <TouchableOpacity
        onPress={() => WebBrowser.openBrowserAsync(STUDIO_URL, { toolbarColor: "#0A0A0A", controlsColor: DESIGN })}
        activeOpacity={0.85}
        className="rounded-2xl py-4 items-center mb-3 mt-2"
        style={{ backgroundColor: DESIGN }}
      >
        <Text className="text-[#0A0A0A] text-[14px] font-extrabold tracking-wide">Open Full Studio →</Text>
      </TouchableOpacity>
      <Text className="text-[#4B5563] text-[10px] text-center mb-4 leading-snug">
        {isHome
          ? "Style quiz · design your own · live drawing · a plan set shaped around your home — on the web"
          : "Style quiz · 5-step curriculum · live drawing · 49-reviewer swarm · 45-sheet plan set — on the web"}
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/loan" as any)}
        activeOpacity={0.8}
        className="rounded-2xl py-3 items-center border border-[#262626]"
      >
        <Text style={{ color: DESIGN }} className="text-[13px] font-bold">Finance a design →</Text>
      </TouchableOpacity>
    </ScrollView>
    <CompartmentChrome href="/design" />
    </View>
  );
}

/* ── My Plans — saved j-space builds, ONE per address, recalled into the chat ── */
function MyPlans() {
  const plans = useSavedPlans();

  // Primary action: edit in the Plan Builder (the homeowner's build room).
  const edit = (p: SavedPlan) =>
    router.push(`/plan-builder?plan=${encodeURIComponent(p.addressKey)}` as any);
  // Secondary: recall the plan into "Let's build" to talk it through.
  const recall = (p: SavedPlan) =>
    router.push(`/collective-chat?plan=${encodeURIComponent(p.addressKey)}` as any);

  const remove = (p: SavedPlan) =>
    Alert.alert("Delete plan", `Delete the plan for ${p.address}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePlan(p.addressKey) },
    ]);

  return (
    <View className="mb-6">
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider">My Plans</Text>
      <Text className="text-[#4B5563] text-[10px] mb-3">One plan build per address · grown in "Let's build" · saved here</Text>
      {plans.length === 0 ? (
        <TouchableOpacity
          onPress={() => router.push("/collective-chat" as any)}
          activeOpacity={0.85}
          className="rounded-2xl px-4 py-4 border border-dashed"
          style={{ borderColor: `${DESIGN}44`, backgroundColor: `${DESIGN}0A` }}
        >
          <Text className="text-[#9CA3AF] text-[12px] leading-relaxed">
            Talk to the collective about your home — the j-space plan builds as you chat and saves here.
          </Text>
          <Text style={{ color: DESIGN }} className="text-[11px] font-bold mt-1.5">Start building →</Text>
          <TouchableOpacity
            onPress={() => router.push("/plan-builder" as any)}
            hitSlop={{ top: 6, bottom: 6 }}
            className="mt-2"
          >
            <Text className="text-[#34D399] text-[11px] font-bold">Or design it yourself — no CAD, just taps →</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ) : (
        <View className="gap-2">
          {plans.map((p) => {
            const f = p.facts;
            const real = !!f.outline;
            const specs = [
              f.grossSF ? `${Math.round(f.grossSF).toLocaleString()} SF` : null,
              f.beds ? `${f.beds}bd` : null,
              f.baths ? `${f.baths}ba` : null,
              f.footprintW && f.footprintD ? `${f.footprintW}×${f.footprintD}'` : null,
            ].filter(Boolean).join(" · ");
            return (
              <TouchableOpacity
                key={p.addressKey}
                onPress={() => edit(p)}
                activeOpacity={0.85}
                className="rounded-2xl px-4 py-3 flex-row items-center gap-3 border"
                style={{ borderColor: `${DESIGN}33`, backgroundColor: "#0B0F16" }}
              >
                <Text style={{ color: DESIGN, fontSize: 18 }}>▤</Text>
                <View className="flex-1">
                  <Text className="text-[#F9FAFB] text-[13px] font-bold" numberOfLines={1}>{p.address}</Text>
                  <Text className="text-[#6B7280] text-[10.5px] mt-0.5" numberOfLines={1}>
                    {specs || "in progress"}
                    {real ? <Text style={{ color: "#34D399" }}>  · real footprint ✓</Text> : null}
                  </Text>
                  <Text className="text-[#4B5563] text-[9px] mt-0.5">updated {p.updatedAt.slice(0, 10)} · tap to customize</Text>
                </View>
                <TouchableOpacity onPress={() => recall(p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text className="text-[13px]">💬</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text className="text-[#4B5563] text-[13px]">✕</Text>
                </TouchableOpacity>
                <Text style={{ color: DESIGN }} className="text-[14px]">→</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// A single conforming build: isometric 3D render + stats, expandable to the
// 49-reviewer consensus + locked params, with a loop into the 3D timeline.
function BuildCard({ build, expanded, onToggle }: { build: ConformingBuild; expanded: boolean; onToggle: () => void }) {
  const c = build.color;
  const totalH = build.storyHeights.reduce((a, b) => a + b, 0) + build.aboveGradeFoundation;

  return (
    <View
      className="rounded-2xl border mb-3 overflow-hidden"
      style={{ borderColor: expanded ? `${c}55` : "#1A1A1A", backgroundColor: "#0D0D0D" }}
    >
      {/* 3D render */}
      <IsometricHouse build={build} selected={expanded} onPress={onToggle} />

      {/* Info strip */}
      <TouchableOpacity onPress={onToggle} activeOpacity={0.85} className="px-4 pb-3">
        <View className="flex-row items-center justify-between mb-0.5">
          <Text className="text-[#F9FAFB] text-[14px] font-extrabold">{build.name}</Text>
          <Text style={{ color: c, backgroundColor: `${c}15` }} className="text-[10px] font-bold rounded-full px-2 py-0.5">
            {build.conformity.score}% · {build.conformity.disciplineVotes}/7
          </Text>
        </View>
        <Text className="text-[#6B7280] text-[11px] mb-1">{build.style}</Text>
        <View className="flex-row items-center gap-3">
          {[`${build.baysX * 20}' × ${build.baysY * 20}'`, `${build.storyHeights.length} story`, `${build.roofType} roof`, `${totalH}' total`].map((d) => (
            <Text key={d} className="text-[#4B5563] text-[10px]">{d}</Text>
          ))}
        </View>

        {/* Locked param chips */}
        <View className="flex-row flex-wrap gap-1 mt-2">
          {build.conformity.lockedParams.slice(0, expanded ? undefined : 3).map((p, i) => (
            <Text key={i} style={{ color: c, backgroundColor: `${c}10` }} className="text-[9px] rounded px-1.5 py-0.5">{p}</Text>
          ))}
          {!expanded && build.conformity.lockedParams.length > 3 ? (
            <Text className="text-[#4B5563] text-[9px] px-1 py-0.5">+{build.conformity.lockedParams.length - 3} more</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Expanded detail */}
      {expanded ? (
        <View className="px-4 pb-4 pt-1 border-t" style={{ borderColor: `${c}1A` }}>
          <Text className="text-[#9CA3AF] text-[11px] leading-relaxed mb-3 mt-2">{build.description}</Text>

          <Text className="text-[#374151] text-[9px] uppercase tracking-wider font-bold mb-1.5">
            49-Reviewer Consensus · {build.conformity.commonalities.length} points
          </Text>
          <View className="gap-1 mb-3">
            {build.conformity.commonalities.map((cc, i) => (
              <View key={i} className="flex-row items-start gap-1.5">
                <Text style={{ color: c }} className="text-[10px] mt-0.5">✓</Text>
                <Text className="text-[#9CA3AF] text-[10px] leading-snug flex-1">{cc}</Text>
              </View>
            ))}
          </View>

          {/* Loop the example into the Three.js 3D timeline */}
          <TouchableOpacity
            onPress={() =>
              router.push(`/portfolio?theme=norse&phase=7&name=${encodeURIComponent(build.name)}` as any)
            }
            activeOpacity={0.85}
            className="rounded-xl py-3 items-center flex-row justify-center gap-2"
            style={{ backgroundColor: `${c}18`, borderWidth: 1, borderColor: `${c}45` }}
          >
            <Text style={{ color: c }} className="text-[12px] font-bold">View construction timeline in 3D →</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

/* ─────────────────────── CDA Console (Custodian only) ─────────────────────
 * CDA's swarm governance surface: the Custodian advances each design output
 * through the 4-layer trust chain (Architect → Engineer → FA → ML Systems).
 * When all four are done the output flips fully-verified. Mirrors the PIT LORD
 * Console pattern. Blue #60A5FA / swarm — CDA's identity. */

const LAYERS = [
  { key: "architect",  label: "Arch", field: "architectStatus" },
  { key: "engineer",   label: "Eng",  field: "engineerStatus" },
  { key: "fa",         label: "FA",   field: "faStatus" },
  { key: "ml_systems", label: "ML",   field: "mlSystemsStatus" },
] as const;

type CdaLayer = (typeof LAYERS)[number]["key"];

const STATUS_COLOR: Record<string, string> = {
  verified: "#22C55E",
  annotated: "#22C55E",
  flagged: "#EF4444",
  pending: "#6B7280",
};

type CdaOutputRow = {
  id: string;
  title: string;
  category: string | null;
  architectStatus: string;
  engineerStatus: string;
  faStatus: string;
  mlSystemsStatus: string;
  topic: string | null;
};

function CdaConsole() {
  const listQ = trpc.cda.listUnverified.useQuery(undefined, { retry: 0 });
  const advance = trpc.cda.advanceVerification.useMutation({
    onSuccess: () => listQ.refetch(),
  });
  const [busy, setBusy] = useState<string | null>(null); // `${outputId}:${layer}`

  const outputs = (listQ.data?.outputs ?? []) as CdaOutputRow[];

  const act = (outputId: string, layer: CdaLayer, status: "verified" | "flagged") => {
    setBusy(`${outputId}:${layer}`);
    advance.mutate({ outputId, layer, status });
  };

  return (
    <View className="mb-6 rounded-2xl" style={{ backgroundColor: "#0a1020", borderWidth: 1, borderColor: `${DESIGN}44` }}>
      <View className="px-3.5 py-3 flex-row items-center gap-2">
        <Text style={{ fontSize: 15 }}>💎</Text>
        <Text className="text-[#F9FAFB] text-[13px] font-bold">CDA Console</Text>
        <Text className="text-[#5f7bad] text-[10px] ml-auto">{outputs.length} awaiting sign-off</Text>
      </View>
      <View className="px-3.5 pb-3.5">
        <Text className="text-[#5f7bad] text-[10px] mb-2 leading-snug">
          Advance each design output through the trust chain — CDA designs, the four layers verify. All four done → fully verified.
        </Text>

        {listQ.isLoading ? (
          <Text className="text-[#6B7280] text-[11px]">Loading…</Text>
        ) : listQ.isError ? (
          <Text className="text-[#EF4444] text-[10px]">
            {String(listQ.error?.message ?? "").includes("FORBIDDEN") ? "Operator account required." : "Couldn't reach CDA — pull to retry."}
          </Text>
        ) : outputs.length === 0 ? (
          <Text className="text-[#6B7280] text-[11px]">No outputs awaiting verification. CDA is all caught up.</Text>
        ) : (
          <View className="gap-2.5">
            {outputs.map((o) => (
              <View key={o.id} className="rounded-xl p-3" style={{ backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#16203a" }}>
                <Text className="text-[#F9FAFB] text-[12.5px] font-bold" numberOfLines={1}>{o.title}</Text>
                <Text className="text-[#5f7bad] text-[10px] mb-2" numberOfLines={1}>
                  {o.category ? `${o.category} · ` : ""}{o.topic ?? "design output"}
                </Text>
                <View className="gap-1.5">
                  {LAYERS.map((L) => {
                    const st = (o[L.field] as string) ?? "pending";
                    const done = st === "verified" || st === "annotated";
                    const key = `${o.id}:${L.key}`;
                    const pending = advance.isPending && busy === key;
                    return (
                      <View key={L.key} className="flex-row items-center gap-2">
                        <Text className="text-[#9CA3AF] text-[10px] w-9">{L.label}</Text>
                        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${STATUS_COLOR[st] ?? "#6B7280"}1A` }}>
                          <Text style={{ color: STATUS_COLOR[st] ?? "#6B7280" }} className="text-[9px] font-bold uppercase tracking-wider">{st}</Text>
                        </View>
                        <View className="flex-row gap-1.5 ml-auto">
                          <TouchableOpacity
                            onPress={() => act(o.id, L.key, "verified")}
                            disabled={pending || done}
                            activeOpacity={0.85}
                            className="rounded-lg px-2.5 py-1"
                            style={{ backgroundColor: done ? "#14251a" : DESIGN, opacity: pending ? 0.6 : 1 }}
                          >
                            <Text className="text-[10px] font-extrabold" style={{ color: done ? "#22C55E" : "#0A0A0A" }}>
                              {done ? "✓ done" : pending ? "…" : "verify"}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => act(o.id, L.key, "flagged")}
                            disabled={pending}
                            activeOpacity={0.85}
                            className="rounded-lg px-2.5 py-1"
                            style={{ backgroundColor: "#1a0d0d", borderWidth: 1, borderColor: "#EF444455", opacity: pending ? 0.6 : 1 }}
                          >
                            <Text className="text-[#EF4444] text-[10px] font-bold">flag</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {advance.isError ? (
          <Text className="text-[#EF4444] text-[10px] mt-2">
            {String(advance.error?.message ?? "").includes("FORBIDDEN") ? "Operator account required." : "Couldn't update — try again."}
          </Text>
        ) : advance.isSuccess ? (
          <Text style={{ color: DESIGN }} className="text-[10px] mt-2">✓ Trust chain updated.</Text>
        ) : null}
      </View>
    </View>
  );
}
