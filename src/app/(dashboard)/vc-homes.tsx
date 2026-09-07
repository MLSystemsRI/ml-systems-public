import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, LayoutAnimation } from "react-native";
import { router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { AppHeader } from "@/components/app-header";
import { PLAN_TIER_META, type HubHomeSummary } from "@ml-systems/types";

/**
 * VC Homes — the Custodian's Value Chain Homes console (custodian tab, next to
 * Cockpit). Every home a homeowner adds lands here, grouped by the onboarding
 * gate: Verified / In progress / Not started. The Custodian captures the owner's
 * legal identity (individual or LLC) and verifies the entry; on "verified",
 * MURPHY opens the construction entry — his 8-stage milestone template seeds onto
 * the project's construction phase (visible in the MURPHY console immediately).
 */

const VIOLET = "#8B5CF6";
const GOLD = "#F5D060";
const GREEN = "#22C55E";
const AMBER = "#F59E0B";
const GRAY = "#6B7280";

type VerStatus = "not_started" | "in_progress" | "verified";
type VcHome = {
  projectId: string;
  projectStatus: string | null;
  cycleNumber: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  vcVerificationStatus: VerStatus;
  ownerKind: "individual" | "llc" | null;
  ownerLegalName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  /** Saved off the active console (reversible) — folded into the Saved section. */
  vcArchivedAt?: string | null;
  propertyId?: string;
  /** The plan-set entitlement this home holds (1 = Free). */
  planTier?: number | null;
  /** The hub's per-home summary (vc.hubSummary) — what needs him, what ran, what a stamp is worth. */
  summary?: HubHomeSummary | null;
};

const RUN_WORD: Record<string, string> = { never: "not yet", skipped: "couldn't", failed: "failed", empty: "nothing", landed: "ran" };

/**
 * The hub line under each home — the extraction glyphs from the RUN RECORD (did VERA's
 * search run · did PI compute · how many entries the homeowner was told · how many he
 * stamped or overrode), then what needs him and what his stamp is worth.
 */
function HubLine({ s }: { s?: HubHomeSummary | null }) {
  if (!s) return <Text className="text-[#4B5563] text-[9.5px] mt-1.5">no ledger compiled yet — nothing to verify</Text>;
  const on = (st: string) => (st === "landed" ? 1 : st === "never" ? 0.25 : 0.55);
  return (
    <View className="mt-1.5">
      <View className="flex-row items-center gap-2.5 flex-wrap">
        <Text style={{ color: "#34D399", opacity: on(s.vera) }} className="text-[10px]">🦉 <Text className="text-[8px]">{RUN_WORD[s.vera] ?? s.vera}</Text></Text>
        <Text style={{ color: "#22C55E", opacity: on(s.pi) }} className="text-[10px]">🌱 <Text className="text-[8px]">{RUN_WORD[s.pi] ?? s.pi}</Text></Text>
        <Text style={{ color: "#22C55E", opacity: s.told ? 1 : 0.25 }} className="text-[10px]">💬 <Text className="text-[8px]">{s.told} told</Text></Text>
        <Text style={{ color: GOLD, opacity: s.counts.stamped ? 1 : 0.35 }} className="text-[10px]">
          ⚖ <Text className="text-[8px]">{s.counts.stamped} stamped{s.overrides ? ` · ${s.overrides} overrode` : ""}</Text>
        </Text>
      </View>
      <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
        {s.needsYou ? (
          <Text style={{ color: AMBER }} className="text-[9.5px] font-bold">{s.needsYou} need you</Text>
        ) : (
          <Text style={{ color: GREEN }} className="text-[9.5px]">nothing needs you</Text>
        )}
        {s.counts.quarantined ? <Text style={{ color: "#EF4444" }} className="text-[9px]">· {s.counts.quarantined} disputed</Text> : null}
        {s.counts.lapsed ? <Text style={{ color: AMBER }} className="text-[9px]">· {s.counts.lapsed} lapsed</Text> : null}
        <Text className="text-[#6B7280] text-[9px]">· {PLAN_TIER_META[s.planTier].name} tier</Text>
        {s.revenue.sheetsOnSale ? (
          <Text style={{ color: GOLD }} className="text-[9px]">
            · your stamp puts {s.revenue.sheetsOnSale} sheets on sale{s.revenue.cheapestPriceLabel ? ` from ${s.revenue.cheapestPriceLabel}` : ""}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

type ReqStatus = "requested" | "triaged" | "in_progress" | "done" | "declined";
type ProjectReq = {
  id: string;
  requestText: string;
  category: string | null;
  routedMinds: string[] | null;
  status: ReqStatus;
  projectId: string | null;
  address: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
};
// The Custodian's advance path — one tap moves it forward.
const REQ_NEXT: Record<ReqStatus, ReqStatus | null> = {
  requested: "triaged",
  triaged: "in_progress",
  in_progress: "done",
  done: null,
  declined: null,
};
const REQ_COLOR: Record<ReqStatus, string> = {
  requested: "#9CA3AF",
  triaged: "#60A5FA",
  in_progress: "#F59E0B",
  done: "#22C55E",
  declined: "#6B7280",
};

const SECTION: { status: VerStatus; label: string; color: string; note: string }[] = [
  { status: "verified", label: "Verified", color: GREEN, note: "onboarded — MURPHY's construction entry is open" },
  { status: "in_progress", label: "In progress", color: AMBER, note: "owner verification underway" },
  { status: "not_started", label: "Not started", color: GRAY, note: "awaiting the Custodian's gate" },
];

export default function VCHomesScreen() {
  const utils = trpc.useUtils();
  const listQ = trpc.vc.list.useQuery(undefined, { retry: 0 });
  const allHomes: VcHome[] = Array.isArray(listQ.data?.homes) ? (listQ.data.homes as VcHome[]) : [];
  // THE HUB read (Sal's call: this tab is the verification workflow). Every active home
  // summarized ONCE on the server — what needs him, what has run, what a stamp is worth —
  // sorted heaviest first. `vc.list` stays for the Saved section and as the fallback while
  // the hub loads.
  const hubQ = trpc.vc.hubSummary.useQuery(undefined, { retry: 0 });
  const hubHomes = Array.isArray(hubQ.data?.homes) ? (hubQ.data.homes as VcHome[]) : null;
  // One home up at a time while the template stabilizes (Sal 9/1): saved homes fold
  // into their own section below — kept, never deleted, restored in one tap.
  const homes = hubHomes ?? allHomes.filter((h) => !h.vcArchivedAt);
  const saved = allHomes.filter((h) => !!h.vcArchivedAt);
  const needsYouTotal = homes.reduce((n, h) => n + (h.summary?.needsYou ?? 0), 0);
  const [savedOpen, setSavedOpen] = useState(false);
  const refreshHub = () => {
    void utils.vc.list.invalidate();
    void utils.vc.hubSummary.invalidate();
  };
  const setVerification = trpc.vc.setVerification.useMutation({
    onSuccess: () => {
      refreshHub();
      void utils.store.homeCatalogue.invalidate();
    },
  });
  const setArchived = trpc.vc.setArchived.useMutation({ onSuccess: refreshHub });
  // The entitlement — granted here on receipt of payment (the day-one revenue path); the
  // studio's tier gate reads this column through the phone's plan-set params.
  const setPlanTier = trpc.vc.setPlanTier.useMutation({ onSuccess: refreshHub });

  // Homeowner project requests — the Custodian advances or declines them.
  const reqQ = trpc.projectRequests.list.useQuery(undefined, { retry: 0 });
  const requests: ProjectReq[] = Array.isArray(reqQ.data?.requests) ? (reqQ.data.requests as ProjectReq[]) : [];
  const setReqStatus = trpc.projectRequests.setStatus.useMutation({
    onSuccess: () => void utils.projectRequests.list.invalidate(),
  });
  const advance = (r: ProjectReq) => {
    const next = REQ_NEXT[r.status];
    if (next) setReqStatus.mutate({ id: r.id, status: next });
  };

  const [openId, setOpenId] = useState<string | null>(null);
  const [ownerKind, setOwnerKind] = useState<"individual" | "llc">("individual");
  const [legalName, setLegalName] = useState("");
  const [lastSeed, setLastSeed] = useState<{ projectId: string; n: number } | null>(null);

  const openHome = (h: VcHome) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (openId === h.projectId) return setOpenId(null);
    setOpenId(h.projectId);
    setOwnerKind(h.ownerKind ?? "individual");
    setLegalName(h.ownerLegalName ?? h.ownerName ?? "");
  };

  const submit = (h: VcHome, status: VerStatus) => {
    setVerification.mutate(
      {
        projectId: h.projectId,
        status,
        ownerKind,
        ...(legalName.trim() ? { ownerLegalName: legalName.trim() } : {}),
      },
      {
        onSuccess: (r: { milestonesSeeded?: number }) => {
          if (r.milestonesSeeded) setLastSeed({ projectId: h.projectId, n: r.milestonesSeeded });
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <AppHeader title="VC Ledger" subtitle="The Value Chain Ledger console — the Custodian's onboarding gate" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {/* The second key — entry-by-entry review across every account. */}
        <TouchableOpacity
          onPress={() => router.push("/custodian-review" as never)}
          className="rounded-xl px-3 py-2.5 mb-3 border flex-row items-center gap-2"
          style={{ borderColor: "#F5D06033", backgroundColor: "#F5D0600A" }}
        >
          <Text style={{ color: "#F5D060" }} className="text-[12px]">⚖</Text>
          <Text className="text-[#E5E7EB] text-[11.5px] font-semibold flex-1">Review the ledger, entry by entry</Text>
          <Text className="text-[#6B7280] text-[9px]">›</Text>
        </TouchableOpacity>

        {/* Counts strip */}
        <View className="flex-row gap-2 mb-4">
          {SECTION.map((s) => (
            <View key={s.status} className="flex-1 rounded-xl px-3 py-2 border" style={{ borderColor: `${s.color}44`, backgroundColor: `${s.color}0D` }}>
              <Text style={{ color: s.color }} className="text-[16px] font-black">
                {homes.filter((h) => h.vcVerificationStatus === s.status).length}
              </Text>
              <Text className="text-[#9CA3AF] text-[9px] uppercase tracking-wider">{s.label}</Text>
            </View>
          ))}
          {/* What only a human can move — the sweep's worklist, across every home. */}
          <View className="flex-1 rounded-xl px-3 py-2 border" style={{ borderColor: `${GOLD}44`, backgroundColor: `${GOLD}0D` }}>
            <Text style={{ color: GOLD }} className="text-[16px] font-black">{needsYouTotal}</Text>
            <Text className="text-[#9CA3AF] text-[9px] uppercase tracking-wider">Need you</Text>
          </View>
        </View>

        {/* Project requests — what homeowners have asked to get done. The Custodian
            advances each (requested → triaged → in progress → done) or declines it. */}
        {requests.length ? (
          <View className="mb-4 rounded-2xl border px-3.5 py-3" style={{ borderColor: `${VIOLET}44`, backgroundColor: `${VIOLET}0A` }}>
            <Text style={{ color: VIOLET }} className="text-[10px] font-bold uppercase tracking-widest mb-2">
              ✦ Project requests · {requests.length}
            </Text>
            {requests.map((r) => {
              const next = REQ_NEXT[r.status];
              return (
                <View key={r.id} className="py-1.5 border-t" style={{ borderColor: "#1c1c22" }}>
                  <View className="flex-row items-center">
                    <Text className="text-[#E5E7EB] text-[11.5px] flex-1 pr-2" numberOfLines={1}>{r.requestText}</Text>
                    <Text style={{ color: REQ_COLOR[r.status] }} className="text-[8px] font-bold tracking-wider">
                      {r.status.replace(/_/g, " ").toUpperCase()}
                    </Text>
                  </View>
                  <Text className="text-[#6B7280] text-[9.5px] mt-0.5" numberOfLines={1}>
                    {[r.address, r.ownerName ?? r.ownerEmail].filter(Boolean).join(" · ") || "unlinked"}
                    {r.category ? ` · ${r.category.replace(/_/g, " ")}` : ""}
                    {r.routedMinds?.length ? ` · ${r.routedMinds.join(" ")}` : ""}
                  </Text>
                  {r.status !== "done" && r.status !== "declined" ? (
                    <View className="flex-row gap-2 mt-1.5">
                      {next ? (
                        <TouchableOpacity
                          onPress={() => advance(r)}
                          disabled={setReqStatus.isPending}
                          className="rounded-lg px-3 py-1.5 border"
                          style={{ borderColor: `${REQ_COLOR[next]}66`, backgroundColor: `${REQ_COLOR[next]}14` }}
                        >
                          <Text style={{ color: REQ_COLOR[next] }} className="text-[10px] font-bold">
                            → {next.replace(/_/g, " ")}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        onPress={() => setReqStatus.mutate({ id: r.id, status: "declined" })}
                        disabled={setReqStatus.isPending}
                        className="rounded-lg px-3 py-1.5 border"
                        style={{ borderColor: "#37415166" }}
                      >
                        <Text className="text-[#9CA3AF] text-[10px] font-bold">Decline</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {listQ.isLoading ? (
          <Text className="text-[#6B7280] text-[11px]">Reading the record…</Text>
        ) : homes.length === 0 ? (
          <Text className="text-[#6B7280] text-[11px]">
            No homes in the chain yet — every home a homeowner adds lands here for verification.
          </Text>
        ) : (
          SECTION.map((s) => {
            const group = homes.filter((h) => h.vcVerificationStatus === s.status);
            if (!group.length) return null;
            return (
              <View key={s.status} className="mb-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <Text style={{ color: s.color }} className="text-[10px] font-bold uppercase tracking-widest">
                    {s.label} · {group.length}
                  </Text>
                  <Text className="text-[#4B5563] text-[9px] flex-1" numberOfLines={1}>{s.note}</Text>
                </View>
                {group.map((h) => {
                  const on = openId === h.projectId;
                  return (
                    <View key={h.projectId} className="rounded-2xl border mb-2" style={{ borderColor: on ? `${VIOLET}55` : "#262626", backgroundColor: on ? `${VIOLET}0A` : "#111111" }}>
                      <TouchableOpacity onPress={() => openHome(h)} activeOpacity={0.85} className="px-3.5 py-3">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-[#F9FAFB] text-[13px] font-bold flex-1" numberOfLines={1}>
                            {h.address ?? "Unknown address"}
                          </Text>
                          {h.vcVerificationStatus === "verified" ? (
                            <Text style={{ color: GOLD }} className="text-[9px] font-bold">◆ verified</Text>
                          ) : null}
                          <Text className="text-[#4B5563] text-[10px]">{on ? "▾" : "▸"}</Text>
                        </View>
                        <Text className="text-[#6B7280] text-[10.5px] mt-0.5">
                          {[h.city, h.state].filter(Boolean).join(", ")}
                          {h.projectStatus ? ` · ${String(h.projectStatus).replace(/_/g, " ")}` : ""}
                          {h.cycleNumber != null ? ` · cycle ${h.cycleNumber}` : ""}
                        </Text>
                        <Text className="text-[#9CA3AF] text-[10px] mt-0.5" numberOfLines={1}>
                          {h.ownerLegalName ?? h.ownerName ?? h.ownerEmail ?? "owner unknown"}
                          {h.ownerKind ? ` · ${h.ownerKind === "llc" ? "LLC" : "individual"}` : ""}
                        </Text>
                        {hubHomes ? <HubLine s={h.summary} /> : null}
                      </TouchableOpacity>

                      {on ? (
                        <View className="px-3.5 pb-3.5 border-t" style={{ borderColor: "#1c1c22" }}>
                          {/* Owner identity — individuals and LLCs onboard differently. */}
                          <Text className="text-[#9CA3AF] text-[9px] uppercase tracking-wider mt-2.5 mb-1.5">Owner identity</Text>
                          <View className="flex-row gap-2 mb-2">
                            {(["individual", "llc"] as const).map((k) => {
                              const active = ownerKind === k;
                              return (
                                <TouchableOpacity
                                  key={k}
                                  onPress={() => setOwnerKind(k)}
                                  className="flex-1 rounded-lg py-2 items-center border"
                                  style={{ borderColor: active ? VIOLET : "#374151", backgroundColor: active ? `${VIOLET}18` : "transparent" }}
                                >
                                  <Text style={{ color: active ? VIOLET : "#9CA3AF" }} className="text-[11px] font-bold">
                                    {k === "llc" ? "LLC" : "Individual"}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          <TextInput
                            value={legalName}
                            onChangeText={setLegalName}
                            placeholder={ownerKind === "llc" ? "Legal entity name (e.g. 12 Maple St LLC)" : "Owner's full legal name"}
                            placeholderTextColor="#6B7280"
                            className="bg-[#1A1A1A] border border-[#262626] rounded-lg px-3 py-2.5 text-[12px] text-[#F9FAFB] mb-2.5"
                          />

                          {/* The gate — set the stage, or verify (MURPHY opens construction). */}
                          <View className="flex-row gap-2">
                            {h.vcVerificationStatus !== "in_progress" && h.vcVerificationStatus !== "verified" ? (
                              <TouchableOpacity
                                onPress={() => submit(h, "in_progress")}
                                disabled={setVerification.isPending}
                                className="flex-1 rounded-lg py-2.5 items-center border"
                                style={{ borderColor: `${AMBER}66`, backgroundColor: `${AMBER}14` }}
                              >
                                <Text style={{ color: AMBER }} className="text-[11px] font-bold">Start verification</Text>
                              </TouchableOpacity>
                            ) : null}
                            {h.vcVerificationStatus !== "verified" ? (
                              <TouchableOpacity
                                onPress={() => submit(h, "verified")}
                                disabled={setVerification.isPending}
                                className="flex-1 rounded-lg py-2.5 items-center"
                                style={{ backgroundColor: GREEN }}
                              >
                                <Text className="text-black text-[11px] font-bold">
                                  {setVerification.isPending ? "Verifying…" : "◆ Verify — open MURPHY's entry"}
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                onPress={() => submit(h, "in_progress")}
                                disabled={setVerification.isPending}
                                className="flex-1 rounded-lg py-2.5 items-center border"
                                style={{ borderColor: "#37415166" }}
                              >
                                <Text className="text-[#9CA3AF] text-[11px] font-bold">Revoke to in-progress</Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {lastSeed?.projectId === h.projectId ? (
                            <Text style={{ color: "#84CC16" }} className="text-[10px] mt-2">
                              🐕 MURPHY: construction entry opened · {lastSeed.n} milestones seeded
                            </Text>
                          ) : h.vcVerificationStatus === "verified" ? (
                            <Text className="text-[#6B7280] text-[9.5px] mt-2">
                              🐕 MURPHY's construction entry is open — milestones live in his console.
                            </Text>
                          ) : null}

                          {/* The second key, for THIS home — lands on it open in the review queue. */}
                          <TouchableOpacity
                            onPress={() => router.push(`/custodian-review${h.propertyId ? `?propertyId=${h.propertyId}` : ""}` as never)}
                            activeOpacity={0.7}
                            className="mt-3 rounded-lg px-3 py-2 border flex-row items-center"
                            style={{ borderColor: `${GOLD}44`, backgroundColor: `${GOLD}0D` }}
                          >
                            <Text style={{ color: GOLD }} className="text-[10.5px] flex-1">
                              ⚖ Review {h.summary?.needsYou ? `the ${h.summary.needsYou} that need you` : "the ledger, entry by entry"} →
                            </Text>
                          </TouchableOpacity>

                          {/* The entitlement — grant the tier when the homeowner pays. The day-one
                              revenue path: the studio's gate finally hears a tier, through this column. */}
                          <Text className="text-[#9CA3AF] text-[9px] uppercase tracking-wider mt-3 mb-1.5">Plan-set tier</Text>
                          <View className="flex-row gap-2">
                            {([1, 2, 3] as const).map((t) => {
                              const cur = (h.planTier ?? 1) === t;
                              return (
                                <TouchableOpacity
                                  key={t}
                                  disabled={cur || setPlanTier.isPending}
                                  onPress={() => setPlanTier.mutate({ projectId: h.projectId, tier: t })}
                                  className="flex-1 rounded-lg py-2 items-center border"
                                  style={{ borderColor: cur ? GOLD : "#374151", backgroundColor: cur ? `${GOLD}18` : "transparent" }}
                                >
                                  <Text style={{ color: cur ? GOLD : "#9CA3AF" }} className="text-[10.5px] font-bold">{PLAN_TIER_META[t].name}</Text>
                                  <Text className="text-[#6B7280] text-[8px]">{PLAN_TIER_META[t].priceLabel}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          <Text className="text-[#4B5563] text-[8.5px] mt-1 leading-3">
                            Only Free → DIY → Complete move sheets; tiers 4–5 differ by BC verification, not by the gate.
                          </Text>

                          <TouchableOpacity
                            onPress={() => router.push(`/portfolio?name=${encodeURIComponent(h.address ?? "")}&projectId=${h.projectId}` as never)}
                            activeOpacity={0.7}
                            className="mt-2.5"
                          >
                            <Text style={{ color: VIOLET }} className="text-[10.5px]">Open this home's Value Chain Portfolio →</Text>
                          </TouchableOpacity>

                          {/* Save it off the active console — kept, never deleted. */}
                          <TouchableOpacity
                            onPress={() => setArchived.mutate({ projectId: h.projectId, archived: true })}
                            disabled={setArchived.isPending}
                            activeOpacity={0.7}
                            className="mt-2"
                          >
                            <Text className="text-[#6B7280] text-[10px]">
                              {setArchived.isPending ? "Saving…" : "▣ Save for later — off the active console, one tap to restore"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })
        )}

        {/* ── Saved for later — the record is kept, never deleted. Collapsed by default
            so the active console reads as ONE list; each restores in a tap. ── */}
        {saved.length ? (
          <View className="mt-1 mb-2">
            <TouchableOpacity
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSavedOpen((o) => !o);
              }}
              className="flex-row items-center gap-2 py-2"
            >
              <Text className="text-[#6B7280] text-[10px] font-bold uppercase tracking-widest flex-1">
                ▣ Saved for later · {saved.length}
              </Text>
              <Text className="text-[#4B5563] text-[9px]">{savedOpen ? "▾" : "▸"}</Text>
            </TouchableOpacity>
            {savedOpen
              ? saved.map((h) => (
                  <View key={h.projectId} className="rounded-xl border mb-2 px-3.5 py-3" style={{ borderColor: "#1f2937", backgroundColor: "#0d0d0f" }}>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[#9CA3AF] text-[12px] font-semibold flex-1" numberOfLines={1}>
                        {h.address ?? "Unknown address"}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setArchived.mutate({ projectId: h.projectId, archived: false })}
                        disabled={setArchived.isPending}
                        className="rounded-lg px-2.5 py-1.5 border"
                        style={{ borderColor: `${GREEN}55`, backgroundColor: `${GREEN}10` }}
                      >
                        <Text style={{ color: GREEN }} className="text-[9.5px] font-bold">Restore</Text>
                      </TouchableOpacity>
                    </View>
                    <Text className="text-[#4B5563] text-[9.5px] mt-0.5" numberOfLines={1}>
                      {[h.city, h.state].filter(Boolean).join(", ")}
                      {h.ownerEmail ? ` · ${h.ownerEmail}` : ""}
                      {h.vcArchivedAt ? ` · saved ${String(h.vcArchivedAt).slice(0, 10)}` : ""}
                    </Text>
                  </View>
                ))
              : null}
          </View>
        ) : null}

        <Text className="text-[#374151] text-[9px] mt-2">
          Verification is the Custodian's gate: capture the owner's legal identity (individual or LLC),
          verify the entry, and MURPHY opens the build. Homeowners see the ◆ badge on their entry.
        </Text>
      </ScrollView>
    </View>
  );
}
