import { useState } from "react";
import { View, Text, Pressable, TextInput, LayoutAnimation } from "react-native";
import type { CustodianEntry, CustodianEntryState } from "@/lib/custodian-queue";
import { ledgerLabel, ledgerValue } from "@/lib/ledger-label";
import { judgeOption, specKindForCode, specOptionsFor, type SpecContext } from "@ml-systems/types";

/**
 * One ledger entry, laid out for review — what stands, who lost, and why.
 *
 * The Custodian's stamp binds to the entry's CONTENTS via `hash`, not to the code name,
 * so what he approves is exactly what is on screen. A disputed entry shows both claims
 * side by side rather than resolving them quietly; a lapsed one shows that the number
 * moved after it was signed.
 */

const GOLD = "#F5D060";

/** Who said it — the mind glyphs the ledger already uses. */
const CLAIMANT: Record<string, { glyph: string; color: string; label: string }> = {
  custodian: { glyph: "⚖", color: GOLD, label: "Custodian" },
  homeowner: { glyph: "🏠", color: "#E5E7EB", label: "You/homeowner" },
  vera: { glyph: "🦉", color: "#34D399", label: "VERA" },
  cda: { glyph: "◇", color: "#60A5FA", label: "CDA" },
  pi: { glyph: "🌱", color: "#22C55E", label: "PI" },
  record: { glyph: "🗎", color: "#94A3B8", label: "Public record" },
};

const STATE_META: Record<CustodianEntryState, { label: string; color: string; note: string }> = {
  quarantined: { label: "DISPUTED", color: "#EF4444", note: "Credible sources disagree — settle before this counts" },
  lapsed: { label: "LAPSED", color: "#F59E0B", note: "Signed once, but the number changed since" },
  unverified: { label: "UNVERIFIED", color: "#A78BFA", note: "Modeled only — nobody has claimed it" },
  "awaiting-stamp": { label: "AWAITING YOU", color: "#60A5FA", note: "The homeowner turned their key" },
  unstamped: { label: "UNREVIEWED", color: "#6B7280", note: "No one has looked at this yet" },
  stamped: { label: "STAMPED", color: "#34D399", note: "Both keys, and the content still matches" },
};

function ClaimRow({ claim, kind }: { claim: CustodianEntry["winner"]; kind: "winner" | "dissent" }) {
  if (!claim) return null;
  const meta = CLAIMANT[claim.by] ?? { glyph: "•", color: "#6B7280", label: claim.by };
  return (
    <View className="flex-row items-start gap-2 py-1">
      <Text style={{ color: meta.color }} className="text-[11px] w-4">{meta.glyph}</Text>
      <View className="flex-1">
        <Text className="text-[10.5px]" style={{ color: kind === "winner" ? "#E5E7EB" : "#9CA3AF" }}>
          <Text style={{ color: meta.color }}>{meta.label}</Text>
          {" — "}
          {String(claim.value)}
          <Text className="text-[#6B7280]">{`  (${claim.src})`}</Text>
          {claim.suspect ? <Text style={{ color: "#EF4444" }}> · instrument suspect</Text> : null}
        </Text>
        {claim.note ? <Text className="text-[#6B7280] text-[9.5px] mt-0.5">{claim.note}</Text> : null}
      </View>
    </View>
  );
}

export function CustodianEntryCard({
  entry,
  busy,
  specCtx = {},
  onStamp,
}: {
  entry: CustodianEntry;
  busy: boolean;
  /** This home's era + span, so the options lead with what it probably is and a pick
   *  that fights the record (slab on a home with a basement) can be flagged. */
  specCtx?: SpecContext;
  onStamp: (verdict: "approved" | "corrected" | "rejected", opts: { correction?: string; note?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [correction, setCorrection] = useState("");
  const [note, setNote] = useState("");
  const [freeText, setFreeText] = useState(false);
  const meta = STATE_META[entry.state];
  const measures = Object.entries(entry.measures).slice(0, 4);

  // Which member this entry is about, and what is recorded for it right now. The primitive
  // reads "Wall studs: 2×4 @ 16\" o.c." — the part after the colon is the spec on file.
  const kind = specKindForCode(entry.code);
  const options = kind ? specOptionsFor(kind, specCtx) : [];
  const firstPrimitive = entry.primitives?.[0];
  const current = firstPrimitive?.includes(": ")
    ? firstPrimitive.slice(firstPrimitive.indexOf(": ") + 2).trim()
    : undefined;

  return (
    <View className="rounded-xl border mb-2" style={{ borderColor: "#1f2937", backgroundColor: "#0B0F16" }}>
      <Pressable
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen((o) => !o); }}
        className="px-3 py-2.5"
      >
        {/* The glance — the same noun · value · chip the homeowner's ledger uses, so the
            two surfaces read alike. The sentence and the numbers open below. */}
        <View className="flex-row items-center gap-2">
          <Text className="text-[#9CA3AF] text-[10px]" numberOfLines={1}>{ledgerLabel(entry)}</Text>
          <Text className="text-[#E5E7EB] text-[11.5px] font-semibold flex-1 text-right" numberOfLines={1}>
            {ledgerValue(entry)}
          </Text>
          <Text style={{ color: meta.color }} className="text-[8px] font-bold tracking-wider">{meta.label}</Text>
          <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
        </View>
        {open ? (
          <Text className="text-[#9CA3AF] text-[10px] mt-1.5 leading-4">{entry.meaning}</Text>
        ) : null}
        {/* The confidence bar — a quarantined entry reads BELOW modeled on purpose. */}
        <View className="flex-row items-center gap-2 mt-1.5">
          <View className="h-1.5 rounded-full flex-1 overflow-hidden" style={{ backgroundColor: "#1F2937" }}>
            <View className="h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, entry.bar))}%`, backgroundColor: meta.color }} />
          </View>
          <Text style={{ color: meta.color }} className="text-[7.5px] font-bold">{entry.bar}</Text>
        </View>
      </Pressable>

      {open ? (
        <View className="px-3 pb-3">
          <Text className="text-[#4B5563] text-[8px] tracking-wider mb-1">{entry.code}</Text>
          <Text className="text-[#9CA3AF] text-[10px] leading-4 mb-2">{meta.note}</Text>

          {/* Why it stands where it does — conformEntry's own sentence. */}
          <Text className="text-[#D1D5DB] text-[10.5px] leading-4 mb-2">{entry.why}</Text>

          {entry.winner ? (
            <>
              <Text className="text-[#6B7280] text-[8px] font-bold tracking-widest mb-0.5">WHAT STANDS</Text>
              <ClaimRow claim={entry.winner} kind="winner" />
            </>
          ) : null}
          {entry.dissent.length ? (
            <>
              <Text className="text-[#6B7280] text-[8px] font-bold tracking-widest mt-1.5 mb-0.5">
                {entry.winner ? "OVER" : "IN DISPUTE"}
              </Text>
              {entry.dissent.map((d, i) => <ClaimRow key={i} claim={d} kind="dissent" />)}
            </>
          ) : null}

          {entry.primitives.length ? (
            <Text className="text-[#6B7280] text-[9.5px] mt-2" numberOfLines={3}>
              {entry.primitives.slice(0, 4).join(" · ")}
            </Text>
          ) : null}
          {measures.length ? (
            <Text className="text-[#4B5563] text-[9px] mt-1">
              {measures.map(([k, v]) => `${k} ${Math.round(v).toLocaleString()}`).join(" · ")}
            </Text>
          ) : null}

          {entry.state === "lapsed" ? (
            <Text style={{ color: "#F59E0B" }} className="text-[9.5px] mt-2 leading-4">
              Signed against {entry.signedHash}, now {entry.hash}. An amended drawing needs a new stamp.
            </Text>
          ) : null}

          {/* The stamp — one entry at a time, bound to the hash shown above. */}
          <View className="mt-3 pt-2.5 border-t" style={{ borderColor: "#14171c" }}>
            {/* Correcting a member is a tap, not a retype. The options are the ones the
                takeoff itself writes, so a pick flows through unparsed; the value already
                recorded is shown and marked rather than hidden, because knowing what is
                there is how you know which chip you want. */}
            {options.length ? (
              <>
                <Text className="text-[#6B7280] text-[8px] font-bold tracking-widest mb-1.5">CORRECT IT</Text>
                <View className="flex-row flex-wrap gap-1.5 mb-2">
                  {options.map((opt) => {
                    const isCurrent = current != null && opt === current;
                    const picked = correction === opt;
                    // A pick that fights this home's record still shows — the homeowner
                    // may be correcting the record — but it carries the warning.
                    const verdict = kind ? judgeOption(kind, opt, specCtx) : null;
                    const odd = verdict?.level === "unusual";
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setCorrection(picked ? "" : opt)}
                        className="rounded-full px-2.5 py-1.5"
                        style={{
                          backgroundColor: picked ? `${GOLD}22` : "#111827",
                          borderWidth: 1,
                          borderColor: picked ? GOLD : odd ? "#F59E0B55" : "#1f2937",
                        }}
                      >
                        <Text
                          className="text-[10px]"
                          style={{ color: picked ? GOLD : isCurrent ? "#6B7280" : "#D1D5DB" }}
                        >
                          {opt}
                          {isCurrent ? " · on file" : ""}
                          {odd ? " ⚠" : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={() => setFreeText((f) => !f)}
                    className="rounded-full px-2.5 py-1.5"
                    style={{ backgroundColor: "#111827", borderWidth: 1, borderColor: "#1f2937" }}
                  >
                    <Text className="text-[10px] text-[#9CA3AF]">{freeText ? "− Other" : "Other…"}</Text>
                  </Pressable>
                </View>
                {(() => {
                  const v = correction && kind ? judgeOption(kind, correction, specCtx) : null;
                  return v?.note ? (
                    <Text style={{ color: v.level === "unusual" ? "#F59E0B" : "#6B7280" }} className="text-[9px] mb-1.5 leading-3">
                      {v.note}
                    </Text>
                  ) : null;
                })()}
              </>
            ) : null}
            {/* Free text stays reachable — the house that doesn't fit the list is real. */}
            {!options.length || freeText ? (
              <TextInput
                value={correction}
                onChangeText={setCorrection}
                placeholder="Correct it — the real value (optional)"
                placeholderTextColor="#4B5563"
                className="rounded-lg px-2.5 py-2 text-[11px] text-[#E5E7EB] mb-1.5"
                style={{ backgroundColor: "#111827", borderWidth: 1, borderColor: "#1f2937" }}
              />
            ) : null}
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Note for the record (optional)"
              placeholderTextColor="#4B5563"
              className="rounded-lg px-2.5 py-2 text-[11px] text-[#E5E7EB] mb-2"
              style={{ backgroundColor: "#111827", borderWidth: 1, borderColor: "#1f2937" }}
            />
            <View className="flex-row gap-2">
              <Pressable
                disabled={busy}
                onPress={() => onStamp(correction.trim() ? "corrected" : "approved", {
                  ...(correction.trim() ? { correction: correction.trim() } : {}),
                  ...(note.trim() ? { note: note.trim() } : {}),
                })}
                className="flex-1 rounded-lg py-2.5 items-center"
                style={{ backgroundColor: busy ? "#374151" : GOLD }}
              >
                <Text className="text-[11px] font-bold" style={{ color: "#0A0A0A" }}>
                  {correction.trim() ? "Correct + stamp" : "Approve"}
                </Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => onStamp("rejected", { ...(note.trim() ? { note: note.trim() } : {}) })}
                className="rounded-lg py-2.5 px-4 items-center"
                style={{ borderWidth: 1, borderColor: "#EF4444" }}
              >
                <Text style={{ color: "#EF4444" }} className="text-[11px] font-bold">Reject</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
