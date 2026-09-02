import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import { router } from "expo-router";
import type { VcCode, VcSource, VcClaimant, VcConformityStatus } from "@ml-systems/types";
import type { LedgerEntryReview, EntryReviewState } from "@/lib/ledger-view";
import { ledgerLabel, ledgerValue } from "@/lib/ledger-label";

/**
 * ledger-row — one entry of the value-chain ledger, drawn with its confidence bar.
 * Extracted from value-chain-ledger.tsx so the Plan Builder's live ledger spine and
 * the standalone ledger screen render identically. Pure presentational.
 */

/**
 * Where the entry stands on the record — how many INDEPENDENT sources agree, not how
 * confident any one of them is. Breadth is the honest signal: three reads landing on
 * "2 levels" is stronger than one instrument saying it precisely.
 */
export const TIER_META: Record<string, { label: string; color: string }> = {
  grounded: { label: "GROUNDED", color: "#34D399" },
  corroborated: { label: "CORROBORATED", color: "#60A5FA" },
  "single-source": { label: "ONE SOURCE", color: "#9CA3AF" },
  disputed: { label: "DISPUTED", color: "#EF4444" },
  unverified: { label: "NOT YET CLAIMED", color: "#F59E0B" },
};

/** How a claimant reads to a homeowner. "you" beats "homeowner" on your own record. */
export const VERIFIER_LABEL: Record<string, string> = {
  record: "the town record",
  homeowner: "you",
  // Capabilities, not the minds' names — the agents stay backend (Sal 9/1).
  vera: "verification",
  custodian: "the Custodian",
  pi: "PI",
  cda: "the design engine",
};

/** The honesty ladder — "how verified" is the ledger's confidence axis. */
export const SRC_META: Record<VcSource, { label: string; color: string }> = {
  measured: { label: "MEASURED", color: "#34D399" },
  sensed: { label: "SENSED", color: "#2DD4BF" },
  stated: { label: "STATED", color: "#84CC16" },
  record: { label: "RECORD", color: "#60A5FA" },
  modeled: { label: "MODELED", color: "#F59E0B" },
};

/** Who claimed — the reviewer roster (VERA · Custodian · homeowner · PI · record · CDA). */
export const CLAIMANT_META: Record<VcClaimant, { glyph: string; color: string }> = {
  custodian: { glyph: "⚖", color: "#F5D060" },
  vera: { glyph: "🦉", color: "#34D399" },
  homeowner: { glyph: "🏠", color: "#60A5FA" },
  record: { glyph: "📋", color: "#93C5FD" },
  cda: { glyph: "◇", color: "#60A5FA" },
  pi: { glyph: "🌱", color: "#22C55E" },
};

/** The conformity outcome as a chip. */
export const STATUS_META: Record<VcConformityStatus, { label: string; color: string }> = {
  confirmed: { label: "CONFIRMED", color: "#34D399" },
  reconciled: { label: "RECONCILED", color: "#60A5FA" },
  "single-source": { label: "SINGLE-SOURCE", color: "#9CA3AF" },
  conflict: { label: "CONFLICT", color: "#EF4444" },
  unverified: { label: "UNVERIFIED", color: "#F59E0B" },
};

/**
 * Where the entry stands on the file — the two-key sign-off. `stale` is the one that
 * matters most: it means the content changed under a signature, so the stamp lapsed.
 */
export const REVIEW_META: Record<EntryReviewState, { label: string; color: string }> = {
  "on-file": { label: "ON FILE", color: "#34D399" },
  "half-signed": { label: "1 OF 2 KEYS", color: "#60A5FA" },
  stale: { label: "LAPSED — CONTENT CHANGED", color: "#F59E0B" },
  rejected: { label: "REJECTED", color: "#EF4444" },
  unsigned: { label: "UNSIGNED", color: "#6B7280" },
};

/** The claimants who weighed in, winner first — the review trail. */
function reviewersOf(c: NonNullable<VcCode["conformity"]>): VcClaimant[] {
  const seen: VcClaimant[] = [];
  const push = (by?: VcClaimant) => { if (by && !seen.includes(by)) seen.push(by); };
  push(c.winner?.by);
  for (const d of c.dissent) push(d.by);
  return seen;
}

export function LedgerRow({
  code,
  review,
  onReview,
  valueOverride,
  inputHref,
}: {
  code: VcCode;
  /** Sign-off state from the server rows (ledgerView.reviewByCode). Omitted → read-only. */
  review?: LedgerEntryReview;
  /** Present → the row becomes reviewable (tap to open the claims + the two keys). */
  onReview?: (code: VcCode, verdict: "approved" | "corrected" | "rejected", liveHash: string) => void;
  /** Display-only value replacement (e.g. the Custodian's read scaled by stamped share). */
  valueOverride?: string;
  /** Present → the expanded view offers "Add your input →" into the entry-input page. */
  inputHref?: string;
}) {
  const src = SRC_META[code.provenance.src] ?? SRC_META.modeled;
  const measures = Object.entries(code.measures).slice(0, 4);
  const [open, setOpen] = useState(false);
  const canReview = !!onReview && !!review;
  // A contested number must never wear a confident label — that is the failure the
  // conformity layer exists to prevent. It takes over the one chip the row has.
  const chip = code.quarantined
    ? { label: "DISPUTED", color: "#EF4444" }
    : { label: src.label, color: src.color };
  // The standing + who earned it. `rating.verifiers` is already deduped by the
  // anti-echo rule, so a value re-stated by a second claimant does not inflate it.
  const tier = code.rating ? TIER_META[code.rating.tier] ?? null : null;
  const verifiers = (code.rating?.verifiers ?? []).length
    ? code.rating!.verifiers.map((v) => VERIFIER_LABEL[v] ?? v).join(" + ")
    : "";
  // Every entity that stands behind this number — "all that apply". Independent
  // agreement (the rating's verifiers) shows dimmed; a two-key sign-off shows at full
  // strength, because a signed/stamped key is a stronger claim than a mere agreement.
  // The homeowner 🏠 + Custodian ⚖ keys together are the review board.
  const signedKeys = new Set<VcClaimant>();
  if (review?.homeowner === "approved") signedKeys.add("homeowner");
  if (review?.custodian === "approved") signedKeys.add("custodian");
  const entities: { by: VcClaimant; signed: boolean }[] = [];
  for (const by of [...(code.rating?.verifiers ?? []), ...signedKeys]) {
    if (!entities.some((e) => e.by === by)) entities.push({ by, signed: signedKeys.has(by) });
  }
  return (
    <Pressable
      className="py-2 border-t"
      style={{ borderColor: "#14171c" }}
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen((o) => !o);
      }}
    >
      {/* The glance: a noun, one value, one chip. The sentence and the cross-check live
          behind the tap. What each mind DOES with this entry is not shown — the ledger
          records the fact; the apps that read it show their own computed work. */}
      <View className="flex-row items-center gap-2">
        <Text className="text-[#9CA3AF] text-[10px]" numberOfLines={1}>{ledgerLabel(code)}</Text>
        <Text className="text-[#E5E7EB] text-[11px] font-semibold flex-1 text-right" numberOfLines={1}>
          {valueOverride ?? ledgerValue(code)}
        </Text>
        {code.confirmed ? <Text style={{ color: "#34D399" }} className="text-[9px]">✓</Text> : null}
        <Text className="text-[#4B5563] text-[8px]">{open ? "▾" : "▸"}</Text>
      </View>
      <View className="flex-row items-center gap-2 mt-1">
        <View className="h-1.5 rounded-full flex-1 overflow-hidden" style={{ backgroundColor: "#1F2937" }}>
          <View className="h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, code.bar))}%`, backgroundColor: chip.color }} />
        </View>
        <Text style={{ color: chip.color }} className="text-[7.5px] font-bold tracking-wider">{chip.label}</Text>
      </View>

      {/* WHO stands behind this number. The point of the master ledger: an entry three
          independent sources agree on is a different thing from one the model guessed,
          and the homeowner should not have to tap to tell them apart. */}
      {tier || entities.length ? (
        <View className="flex-row items-center gap-1.5 mt-1">
          {tier ? <Text style={{ color: tier.color }} className="text-[7px] font-bold tracking-wider">{tier.label}</Text> : null}
          {/* The verifier glyphs — every perspective that agrees, signed keys at full
              strength. A homeowner sees the multiple perspectives without a tap.
              The Custodian's ⚖ stays LOW until he has stamped THIS entry (Sal's
              call) — his seat on the board is not his approval. */}
          {entities.map((e) => (
            <Text
              key={e.by}
              style={{
                color: CLAIMANT_META[e.by]?.color ?? "#6B7280",
                opacity: e.by === "custodian" ? (e.signed ? 1 : 0.3) : e.signed ? 1 : 0.5,
              }}
              className="text-[9px]"
            >
              {CLAIMANT_META[e.by]?.glyph ?? "•"}
            </Text>
          ))}
          {verifiers ? (
            <Text className="text-[#6B7280] text-[8.5px] flex-1" numberOfLines={1}>{verifiers}</Text>
          ) : null}
        </View>
      ) : null}

      {/* ── Everything below opens on tap ─────────────────────────────────────────── */}
      {open ? (
        <>
      <Text className="text-[#9CA3AF] text-[10px] mt-2 leading-4">{code.meaning}</Text>
      <Text className="text-[#4B5563] text-[8px] tracking-wider mt-1">{code.code}</Text>
      {measures.length ? (
        <Text className="text-[#6B7280] text-[9px] mt-1" numberOfLines={1}>
          {measures.map(([k, v]) => `${k} ${Math.round(v).toLocaleString()}`).join(" · ")}
        </Text>
      ) : null}
      {/* Conformity — who reviewed, what stands, and why. Shown when more than one
          source weighed in (reconciled/confirmed/conflict); single-source stays quiet. */}
      {code.conformity && code.conformity.status !== "single-source" ? (
        <View className="mt-1">
          <View className="flex-row items-center gap-1.5">
            {(() => {
              const st = STATUS_META[code.conformity.status];
              return <Text style={{ color: st.color, borderColor: `${st.color}55` }} className="text-[6.5px] font-bold tracking-wider border rounded px-1 py-0.5">{st.label}</Text>;
            })()}
            {reviewersOf(code.conformity).map((by) => (
              <Text key={by} style={{ color: CLAIMANT_META[by]?.color ?? "#6B7280" }} className="text-[9px]">{CLAIMANT_META[by]?.glyph ?? "•"}</Text>
            ))}
            {code.quarantined ? <Text style={{ color: "#EF4444" }} className="text-[7px] font-bold">held for review</Text> : null}
          </View>
          {code.conformity.why ? (
            <Text className="text-[#6B7280] text-[8.5px] mt-0.5 leading-3" numberOfLines={2}>{code.conformity.why}</Text>
          ) : null}
        </View>
      ) : null}

      {/* The door to the entry's own input page — the review-board card, the ask,
          and photo / library / document / chat capture. "What we still need from
          you" now lives HERE, on the entry it would settle. */}
      {inputHref ? (
        <Pressable
          onPress={() => router.push(inputHref as never)}
          className="mt-2 rounded-lg px-2.5 py-2 border flex-row items-center"
          style={{ borderColor: "#60A5FA44", backgroundColor: "#60A5FA0D" }}
        >
          <Text className="text-[9.5px] flex-1" style={{ color: "#60A5FA" }}>Add your input — photo, document, or tell us</Text>
          <Text style={{ color: "#60A5FA" }} className="text-[11px]">→</Text>
        </Pressable>
      ) : null}

      {/* The sign-off — where this entry stands on the file. A town record isn't a
          record until someone puts their name to it, against THIS content. */}
      {review ? (
        <View className="flex-row items-center gap-1.5 mt-1">
          {(() => {
            const m = REVIEW_META[review.state];
            return (
              <Text style={{ color: m.color, borderColor: `${m.color}55` }} className="text-[6.5px] font-bold tracking-wider border rounded px-1 py-0.5">
                {m.label}
              </Text>
            );
          })()}
          <Text style={{ color: review.homeowner === "approved" ? "#34D399" : "#4B5563" }} className="text-[8px]">🏠 {review.homeowner === "approved" ? "signed" : "—"}</Text>
          <Text style={{ color: review.custodian === "approved" ? "#F5D060" : "#4B5563" }} className="text-[8px]">⚖ {review.custodian === "approved" ? "stamped" : "—"}</Text>
        </View>
      ) : null}

      {/* Every claim that was made, then the two keys. */}
      {canReview ? (
        <View className="mt-2 rounded-lg border px-2 py-2" style={{ borderColor: "#1F2937", backgroundColor: "#0b0f16" }}>
          <Text className="text-[#9CA3AF] text-[8px] font-bold tracking-wider mb-1">WHO CLAIMED WHAT</Text>
          {code.conformity?.winner ? (
            <View className="flex-row items-center gap-1.5">
              <Text style={{ color: CLAIMANT_META[code.conformity.winner.by]?.color }} className="text-[9px]">{CLAIMANT_META[code.conformity.winner.by]?.glyph}</Text>
              <Text className="text-[#E5E7EB] text-[9px] flex-1" numberOfLines={1}>{code.conformity.winner.by} · {String(code.conformity.winner.value)}</Text>
              <Text style={{ color: "#34D399" }} className="text-[7px] font-bold">STANDS</Text>
            </View>
          ) : null}
          {(code.conformity?.dissent ?? []).map((d, i) => (
            <View key={`${d.by}-${i}`} className="flex-row items-center gap-1.5 mt-0.5">
              <Text style={{ color: CLAIMANT_META[d.by]?.color ?? "#6B7280" }} className="text-[9px]">{CLAIMANT_META[d.by]?.glyph ?? "•"}</Text>
              <Text className="text-[#6B7280] text-[9px] flex-1" numberOfLines={1}>{d.by} · {String(d.value)}{d.suspect ? " (unreliable)" : ""}</Text>
              <Text style={{ color: "#6B7280" }} className="text-[7px]">{d.src}</Text>
            </View>
          ))}
          {review.state === "stale" ? (
            <Text style={{ color: "#F59E0B" }} className="text-[8px] mt-1.5 leading-3">
              This was signed, then the number changed. The old signature no longer applies — review it again.
            </Text>
          ) : null}
          <View className="flex-row gap-1.5 mt-2">
            {([["approved", "Approve", "#34D399"], ["corrected", "Correct", "#60A5FA"], ["rejected", "Reject", "#EF4444"]] as const).map(([v, label, color]) => (
              <Pressable
                key={v}
                onPress={() => onReview?.(code, v, review.liveHash)}
                className="flex-1 items-center rounded-lg py-1.5"
                style={{ backgroundColor: `${color}1A`, borderWidth: 1, borderColor: `${color}55` }}
              >
                <Text style={{ color }} className="text-[9px] font-semibold">{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
        </>
      ) : null}
    </Pressable>
  );
}
