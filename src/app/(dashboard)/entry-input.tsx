import { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useHomeLedger } from "@/lib/use-home-ledger";
import { usePlan, getPlan, upsertPlan } from "@/lib/plan-store";
import { normalizeAddress, type BuilderFacts } from "@/lib/jspace-facts";
import { ledgerLabel, ledgerValue } from "@/lib/ledger-label";
import { CLAIMANT_META, TIER_META, VERIFIER_LABEL, REVIEW_META } from "@/components/ledger-row";
import { addEntryEvidence, removeEntryEvidence, useEntryEvidence } from "@/lib/entry-evidence-store";
import { piCollectionChecks } from "@/lib/pi-checks";
import {
  LEDGER_TEMPLATE,
  specKindForCode,
  specOptionsFor,
  statedFieldForKind,
  judgeOption,
  type SpecContext,
  type VcClaimant,
} from "@ml-systems/types";

/**
 * /entry-input — ONE ledger entry's own door for the homeowner.
 *
 * "What we still need from you" merged into the entries (Sal's call): instead of a
 * general asks band, every entry opens onto this page — the review board's standing
 * on THIS number, the ask it would settle, and four ways to answer: a tap (the spec
 * chips), a photo, a document, or plain words. Everything files against the exact
 * entry (address + code), so the record can say who put what on file, and where.
 *
 * Rooms (DES:tiling) get their own editor: the homeowner lists the rooms they
 * actually live in, and that list becomes a real claim beside CDA's tiled count.
 */

const GOLD = "#F5D060";
const BLUE = "#60A5FA";

export default function EntryInputScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string; address?: string; projectId?: string }>();
  const code = typeof params.code === "string" ? params.code : "";
  const address = typeof params.address === "string" ? params.address : "";
  const projectId = typeof params.projectId === "string" ? params.projectId : undefined;

  const planKey = address ? normalizeAddress(address) : undefined;
  const plan = usePlan(planKey);
  const ledger = useHomeLedger({
    address: address || undefined,
    projectId,
    savedFacts: plan?.facts,
    hasSavedPlan: !!plan,
    persist: false, // this page files input; the compiling surfaces persist
  });
  const entry = useMemo(() => ledger.view.ranked.find((c) => c.code === code), [ledger.view.ranked, code]);
  const review = ledger.view.reviewByCode[code];
  const evidence = useEntryEvidence(address || undefined, code || undefined);
  // PI's check layer — his cross-source verdict on THIS entry, when he has one.
  const piCheck = useMemo(
    () => piCollectionChecks(ledger.facts, ledger.facts.genome).find((c) => c.code === code),
    [ledger.facts, code],
  );

  // ── The ask this entry carries, if any (spec chips + the open task's question). ──
  const kind = code ? specKindForCode(code) : null;
  const field = kind ? statedFieldForKind(kind) : null;
  const specCtx: SpecContext = ledger.facts.genome?.yearBuilt?.v ? { yearBuilt: ledger.facts.genome.yearBuilt.v } : {};
  const options = kind && field ? specOptionsFor(kind, specCtx) : [];
  const answered = (plan?.facts ?? {}) as Record<string, string | undefined>;
  const picked = field ? answered[field] : undefined;
  const tasks = ((ledger.ontology ?? ledger.stored?.ontology)?.openTasks ?? []).filter((t) => t.unlocks.includes(code));

  const [specText, setSpecText] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  // PI's acknowledgment after a filing — every input to the master ledger is received
  // onto the review board (vision extraction is Phase 2; the receipt is honest now).
  const [filedAck, setFiledAck] = useState(false);

  const saveFact = useCallback(
    (value: string) => {
      if (!address || !field) return;
      const prev = getPlan(normalizeAddress(address))?.facts ?? {};
      upsertPlan(address, { ...prev, [field]: value || undefined } as BuilderFacts);
    },
    [address, field],
  );

  // ── Rooms editor (DES:tiling) — the homeowner's own list becomes a claim. ──
  const isRooms = code === "DES:tiling";
  const rooms = plan?.facts?.homeownerRooms ?? [];
  const levels = Math.max(1, Math.round(ledger.facts.levels ?? ledger.facts.genome?.levels?.v ?? 1));
  const [roomName, setRoomName] = useState("");
  const [roomLevel, setRoomLevel] = useState(1);
  const saveRooms = useCallback(
    (next: Array<{ name: string; level?: number }>) => {
      if (!address) return;
      const prev = getPlan(normalizeAddress(address))?.facts ?? {};
      upsertPlan(address, { ...prev, homeownerRooms: next.length ? next : undefined } as BuilderFacts);
    },
    [address],
  );

  // ── Capture — photo / library / document, filed against THIS entry. ──
  const takePhoto = useCallback(async () => {
    setError("");
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError("Camera permission needed — you can still use the photo library.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.5 });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0]!;
      addEntryEvidence(address, code, { kind: "photo", uri: a.uri, name: a.fileName ?? "photo" });
      setFiledAck(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the camera.");
    }
  }, [address, code]);

  const pickPhoto = useCallback(async () => {
    setError("");
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0]!;
      addEntryEvidence(address, code, { kind: "photo", uri: a.uri, name: a.fileName ?? "photo" });
      setFiledAck(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the photo library.");
    }
  }, [address, code]);

  const pickDoc = useCallback(async () => {
    setError("");
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0]!;
      addEntryEvidence(address, code, { kind: "doc", uri: a.uri, name: a.name ?? "document" });
      setFiledAck(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the document picker.");
    }
  }, [address, code]);

  const sendNote = useCallback(() => {
    const t = note.trim();
    if (!t) return;
    addEntryEvidence(address, code, { kind: "note", text: t });
    setNote("");
    setFiledAck(true);
  }, [address, code, note]);

  // ── The board strip — every perspective on this number, Custodian dim until stamped. ──
  const signedKeys = new Set<VcClaimant>();
  if (review?.homeowner === "approved") signedKeys.add("homeowner");
  if (review?.custodian === "approved") signedKeys.add("custodian");
  const entities: { by: VcClaimant; signed: boolean }[] = [];
  for (const by of [...(entry?.rating?.verifiers ?? []), ...signedKeys]) {
    if (!entities.some((e) => e.by === by)) entities.push({ by, signed: signedKeys.has(by) });
  }
  const tier = entry?.rating ? TIER_META[entry.rating.tier] ?? null : null;

  // The slot's PROMISE — what this entry will record — for a slot nothing has claimed
  // yet (the zeroed template is open: every slot is a door, even before the home).
  const slot = LEDGER_TEMPLATE.find((t) => t.code === code);
  // No home yet → every input needs an address to file against, so the page steers
  // into intake instead of offering controls that would fail silently.
  const needsHome = !address;

  return (
    <ScrollView className="flex-1 bg-[#0A0A0A]" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}>
      <View className="px-4">
        {/* Header */}
        <View className="flex-row items-center gap-3 pb-2">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text className="text-[#93a89b] text-xl">←</Text>
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[#F9FAFB] text-base font-extrabold">{entry ? ledgerLabel(entry) : code ? ledgerLabel({ code }) : "Ledger entry"}</Text>
            <Text className="text-[#6B7280] text-[10px]" numberOfLines={1}>{address || "your home, once it's on file"}{code ? ` · ${code}` : ""}</Text>
          </View>
        </View>

        {/* ── The review board's standing on this number ── */}
        <View className="rounded-xl border px-3 py-3 mb-3" style={{ borderColor: `${GOLD}33`, backgroundColor: `${GOLD}0A` }}>
          <Text style={{ color: GOLD }} className="text-[8px] font-bold tracking-widest mb-1.5">THE REVIEW BOARD</Text>
          {entry ? (
            <>
              <View className="flex-row items-center gap-2">
                <Text className="text-[#E5E7EB] text-[13px] font-semibold flex-1">{ledgerValue(entry) || "—"}</Text>
                {tier ? <Text style={{ color: tier.color }} className="text-[7.5px] font-bold tracking-wider">{tier.label}</Text> : null}
                {entities.map((e) => (
                  <Text
                    key={e.by}
                    style={{
                      color: CLAIMANT_META[e.by]?.color ?? "#6B7280",
                      opacity: e.by === "custodian" ? (e.signed ? 1 : 0.3) : e.signed ? 1 : 0.5,
                    }}
                    className="text-[12px]"
                  >
                    {CLAIMANT_META[e.by]?.glyph ?? "•"}
                  </Text>
                ))}
              </View>
              {entry.rating?.why ? <Text className="text-[#9CA3AF] text-[10px] mt-1 leading-4">{entry.rating.why}</Text> : null}
              {/* PI's check — his cross-source verdict over the collected record. */}
              {piCheck ? (
                <Text style={{ color: piCheck.level === "flag" ? "#F59E0B" : "#22C55E" }} className="text-[9.5px] mt-1 leading-4">
                  🌱 PI check — {piCheck.note}
                </Text>
              ) : null}
              {/* Who claimed what — winner first, dissent honestly under it. */}
              {entry.conformity?.winner ? (
                <View className="mt-2 pt-2 border-t" style={{ borderColor: "#1f2937" }}>
                  <View className="flex-row items-center gap-1.5">
                    <Text style={{ color: CLAIMANT_META[entry.conformity.winner.by]?.color }} className="text-[10px]">
                      {CLAIMANT_META[entry.conformity.winner.by]?.glyph}
                    </Text>
                    <Text className="text-[#E5E7EB] text-[10px] flex-1" numberOfLines={1}>
                      {VERIFIER_LABEL[entry.conformity.winner.by] ?? entry.conformity.winner.by} · {String(entry.conformity.winner.value)}
                    </Text>
                    <Text style={{ color: "#34D399" }} className="text-[7px] font-bold">STANDS</Text>
                  </View>
                  {(entry.conformity.dissent ?? []).map((d, i) => (
                    <View key={`${d.by}-${i}`} className="flex-row items-center gap-1.5 mt-0.5">
                      <Text style={{ color: CLAIMANT_META[d.by]?.color ?? "#6B7280" }} className="text-[10px]">{CLAIMANT_META[d.by]?.glyph ?? "•"}</Text>
                      <Text className="text-[#6B7280] text-[10px] flex-1" numberOfLines={1}>
                        {VERIFIER_LABEL[d.by] ?? d.by} · {String(d.value)}{d.suspect ? " (unreliable)" : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {review ? (
                <View className="flex-row items-center gap-1.5 mt-2">
                  {(() => {
                    const m = REVIEW_META[review.state];
                    return <Text style={{ color: m.color, borderColor: `${m.color}55` }} className="text-[6.5px] font-bold tracking-wider border rounded px-1 py-0.5">{m.label}</Text>;
                  })()}
                  <Text style={{ color: review.homeowner === "approved" ? "#34D399" : "#4B5563" }} className="text-[9px]">🏠 {review.homeowner === "approved" ? "signed" : "—"}</Text>
                  <Text style={{ color: review.custodian === "approved" ? GOLD : "#4B5563" }} className="text-[9px]">⚖ {review.custodian === "approved" ? "stamped" : "—"}</Text>
                  {/* PI on the board — lit when he holds a real claim on this entry (advisor, never a key). */}
                  {(() => {
                    const claimants = [
                      ...(entry.rating?.verifiers ?? []),
                      entry.conformity?.winner?.by,
                      ...(entry.conformity?.dissent ?? []).map((d) => d.by),
                    ];
                    const piOn = claimants.includes("pi" as VcClaimant);
                    return <Text style={{ color: piOn ? "#22C55E" : "#4B5563" }} className="text-[9px]">🌱 {piOn ? "PI reviewed" : "—"}</Text>;
                  })()}
                </View>
              ) : null}
            </>
          ) : (
            <>
              {slot ? <Text className="text-[#E5E7EB] text-[12px] font-semibold mb-1">{slot.meaning}</Text> : null}
              <Text className="text-[#6B7280] text-[11px]">
                {needsHome
                  ? "This slot is open and waiting — it fills the moment your home is on file."
                  : "This entry hasn't compiled for this home yet — your input still files against it."}
              </Text>
            </>
          )}
        </View>

        {/* ── No home yet: ONE door forward. Every input files against an address, so
            the page steers into intake instead of controls that would drop the answer. ── */}
        {needsHome ? (
          <TouchableOpacity
            onPress={() => router.push("/collective-chat" as never)}
            activeOpacity={0.85}
            className="rounded-xl px-4 py-4 mb-3 border border-dashed"
            style={{ borderColor: "#22C55E44", backgroundColor: "#22C55E0A" }}
          >
            <Text className="text-[#F9FAFB] text-[13px] font-extrabold mb-1">Start with your home</Text>
            <Text className="text-[#9CA3AF] text-[11px] leading-4">
              Tell the collective your address — the record opens, and this slot (and every other) becomes yours to fill with photos, documents, or your own words.
            </Text>
            <Text style={{ color: "#22C55E" }} className="text-[11px] font-bold mt-2">Let's build →</Text>
          </TouchableOpacity>
        ) : null}

        {/* ── The ask — the question your answer would settle ── */}
        {tasks.map((t) => (
          <View key={t.id} className="rounded-xl border px-3 py-3 mb-3" style={{ borderColor: "#8B5CF633", backgroundColor: "#8B5CF60A" }}>
            <Text style={{ color: "#A78BFA" }} className="text-[8px] font-bold tracking-widest mb-1">WHAT WE STILL NEED FROM YOU</Text>
            <Text className="text-[#E5E7EB] text-[11.5px] font-semibold">{t.title}</Text>
            <Text className="text-[#9CA3AF] text-[10px] leading-4 mt-1">{t.why}</Text>
          </View>
        ))}
        {!needsHome && field && options.length ? (
          <View className="rounded-xl border px-3 py-3 mb-3" style={{ borderColor: "#1f2937", backgroundColor: "#0b0f16" }}>
            <Text className="text-[#9CA3AF] text-[8px] font-bold tracking-widest mb-2">TAP WHAT'S ACTUALLY THERE</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {options.map((a) => {
                const on = picked === a;
                return (
                  <Pressable
                    key={a}
                    onPress={() => saveFact(on ? "" : a)}
                    className="rounded-full px-2.5 py-1.5"
                    style={{ backgroundColor: on ? "#A78BFA22" : "#111827", borderWidth: 1, borderColor: on ? "#A78BFA" : "#1f2937" }}
                  >
                    <Text className="text-[10px]" style={{ color: on ? "#A78BFA" : "#D1D5DB" }}>{a}</Text>
                  </Pressable>
                );
              })}
            </View>
            {/* PI verifies the pick at the door — advise-and-confirm, never blocking. */}
            {picked && kind ? (() => {
              const v = judgeOption(kind, picked, specCtx);
              if (!v) return null;
              return v.level !== "typical" ? (
                <Text style={{ color: "#F59E0B" }} className="text-[9px] mt-2 leading-3">🌱 PI — {v.level}{v.note ? `: ${v.note}` : ""}</Text>
              ) : (
                <Text style={{ color: "#22C55E" }} className="text-[9px] mt-2 leading-3">🌱 PI — typical for this home ✓</Text>
              );
            })() : null}
            {/* Free text — the chips are a shortcut, never a fence. */}
            <View className="flex-row gap-1.5 mt-2">
              <TextInput
                value={specText}
                onChangeText={setSpecText}
                placeholder="Or type it exactly…"
                placeholderTextColor="#4B5563"
                className="flex-1 rounded-lg px-2.5 py-1.5 text-[11px] text-[#E5E7EB] border"
                style={{ borderColor: "#1f2937", backgroundColor: "#111827" }}
              />
              <Pressable
                onPress={() => { if (specText.trim()) { saveFact(specText.trim()); setSpecText(""); } }}
                className="rounded-lg px-3 justify-center border"
                style={{ borderColor: "#A78BFA55", backgroundColor: "#A78BFA1A" }}
              >
                <Text style={{ color: "#A78BFA" }} className="text-[10px] font-semibold">Save</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* ── Rooms — the homeowner's own list, room by room ── */}
        {!needsHome && isRooms ? (
          <View className="rounded-xl border px-3 py-3 mb-3" style={{ borderColor: "#34D39933", backgroundColor: "#34D3990A" }}>
            <Text style={{ color: "#34D399" }} className="text-[8px] font-bold tracking-widest mb-1">
              YOUR ROOMS — {rooms.length} listed
            </Text>
            <Text className="text-[#9CA3AF] text-[10px] leading-4 mb-2">
              List the rooms you actually live in. Your count goes on the record beside the drawn plan's count — agreement confirms it, a gap is worth knowing.
            </Text>
            {rooms.map((rm, i) => (
              <View key={`${rm.name}-${i}`} className="flex-row items-center gap-2 py-1.5 border-t" style={{ borderColor: "#14171c" }}>
                <Text className="text-[#E5E7EB] text-[11px] flex-1">{rm.name}</Text>
                {rm.level ? <Text className="text-[#6B7280] text-[9px]">level {rm.level}</Text> : null}
                <Pressable onPress={() => saveRooms(rooms.filter((_, j) => j !== i))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: "#EF4444" }} className="text-[11px]">✕</Text>
                </Pressable>
              </View>
            ))}
            <View className="flex-row gap-1.5 mt-2">
              <TextInput
                value={roomName}
                onChangeText={setRoomName}
                placeholder="Kitchen, primary bedroom…"
                placeholderTextColor="#4B5563"
                className="flex-1 rounded-lg px-2.5 py-1.5 text-[11px] text-[#E5E7EB] border"
                style={{ borderColor: "#1f2937", backgroundColor: "#111827" }}
              />
              {levels > 1 ? (
                <Pressable
                  onPress={() => setRoomLevel((l) => (l >= levels ? 1 : l + 1))}
                  className="rounded-lg px-2.5 justify-center border"
                  style={{ borderColor: "#1f2937", backgroundColor: "#111827" }}
                >
                  <Text className="text-[#9CA3AF] text-[10px]">L{roomLevel}</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  const nm = roomName.trim();
                  if (!nm) return;
                  saveRooms([...rooms, { name: nm, ...(levels > 1 ? { level: roomLevel } : {}) }]);
                  setRoomName("");
                }}
                className="rounded-lg px-3 justify-center border"
                style={{ borderColor: "#34D39955", backgroundColor: "#34D3991A" }}
              >
                <Text style={{ color: "#34D399" }} className="text-[10px] font-semibold">Add</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* ── Put it on file — photo, library, document ── */}
        {!needsHome ? (
        <View className="rounded-xl border px-3 py-3 mb-3" style={{ borderColor: "#1f2937", backgroundColor: "#0b0f16" }}>
          <Text className="text-[#9CA3AF] text-[8px] font-bold tracking-widest mb-2">PUT IT ON FILE</Text>
          <View className="flex-row gap-1.5">
            {([
              ["📷", "Take photo", takePhoto],
              ["🖼", "Photo library", pickPhoto],
              ["📄", "Document", pickDoc],
            ] as const).map(([glyph, label, fn]) => (
              <Pressable
                key={label}
                onPress={fn}
                className="flex-1 items-center rounded-lg py-2.5 border"
                style={{ borderColor: `${BLUE}44`, backgroundColor: `${BLUE}0D` }}
              >
                <Text className="text-[14px]">{glyph}</Text>
                <Text style={{ color: BLUE }} className="text-[9px] mt-0.5">{label}</Text>
              </Pressable>
            ))}
          </View>
          {error ? <Text style={{ color: "#F59E0B" }} className="text-[9px] mt-2">{error}</Text> : null}
          {filedAck && !error ? (
            <Text style={{ color: "#22C55E" }} className="text-[9px] mt-2">
              ✓ Filed to the review board — PI holds it against the record.
            </Text>
          ) : null}

          {/* Chat input — plain words file too. */}
          <View className="flex-row gap-1.5 mt-2.5">
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Tell us in your own words…"
              placeholderTextColor="#4B5563"
              multiline
              className="flex-1 rounded-lg px-2.5 py-2 text-[11px] text-[#E5E7EB] border"
              style={{ borderColor: "#1f2937", backgroundColor: "#111827", maxHeight: 80 }}
            />
            <Pressable onPress={sendNote} className="rounded-lg px-3 justify-center border" style={{ borderColor: `${BLUE}55`, backgroundColor: `${BLUE}1A` }}>
              <Text style={{ color: BLUE }} className="text-[10px] font-semibold">Send</Text>
            </Pressable>
          </View>

          {/* What's on file already. */}
          {evidence.length ? (
            <View className="mt-2.5 pt-2 border-t" style={{ borderColor: "#14171c" }}>
              {evidence.map((ev) => (
                <View key={ev.id} className="flex-row items-center gap-2 py-1.5">
                  {ev.kind === "photo" && ev.uri ? (
                    <Image source={{ uri: ev.uri }} style={{ width: 34, height: 34, borderRadius: 6 }} />
                  ) : (
                    <Text className="text-[13px]">{ev.kind === "doc" ? "📄" : "💬"}</Text>
                  )}
                  <Text className="text-[#D1D5DB] text-[10px] flex-1" numberOfLines={2}>
                    {ev.kind === "note" ? ev.text : ev.name}
                  </Text>
                  <Text className="text-[#4B5563] text-[8px]">{ev.at.slice(0, 10)}</Text>
                  <Pressable onPress={() => removeEntryEvidence(address, code, ev.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: "#EF4444" }} className="text-[11px]">✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
