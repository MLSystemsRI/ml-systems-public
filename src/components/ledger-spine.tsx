import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import { router } from "expo-router";
import { LedgerRow, SRC_META } from "@/components/ledger-row";
import { EntryAnswer } from "@/components/entry-answer";
import { LedgerPhotoSpot } from "@/components/ledger-photo-spot";
import { PartyStrip } from "@/components/party-strip";
import type { LedgerView } from "@/lib/ledger-view";
import type { VeraRow } from "@/lib/vera-extract";
import { normalizeAddress } from "@/lib/jspace-facts";
import { partyCoverage, type VcConformity, type AgentRun, type LedgerTemplateSlot } from "@ml-systems/types";
import { reviewToSignOff } from "@/lib/ledger-view";

/** VERA-extraction rows → the ledger code that governs their conformity. */
const ROW_CODE: Record<string, string> = {
  height: "DES:heights", roof: "DES:roof-form", footprint: "DES:footprint", floors: "DES:heights",
  windows: "DES:windows", doors: "DES:doors", rooflineElements: "DES:roofline",
};

/**
 * LedgerSpine — the Plan Builder's spine, in two layers:
 *   1. THE HOME — address, footprint, height, roof, elevations, floor heights, each
 *      with its source. Always open.
 *   2. Entries — the ontology codes (the value-chain grammar), collapsed.
 *
 * Headings name the FACT, not the mind that fetched it. Which agent extracted a
 * number and what each one computes from it are that app's business; the ledger's
 * job is to say what is true about the home and how well it is known.
 */

const GOLD = "#F5D060";
const VERA = "#34D399";

/**
 * One VERA-extraction row — label · value + its confidence bar + source chip, and the same
 * five-seat party strip the entries wear (the old ✓/⚖/⛔ status mark used ⚖ for "reconciled",
 * colliding with the Custodian's glyph — Sal 9/7). A conflict keeps its ⛔.
 */
function ExtractRow({ r, conf }: { r: VeraRow; conf?: VcConformity }) {
  const meta = r.src === "pending" ? { label: "PENDING", color: "#6B7280" } : SRC_META[r.src] ?? SRC_META.modeled;
  const dim = r.src === "pending";
  return (
    <View className="py-1.5 border-t" style={{ borderColor: "#14171c" }}>
      <View className="flex-row items-center gap-2">
        <Text className="text-[#9CA3AF] text-[10px] w-28" numberOfLines={1}>{r.label}</Text>
        <Text style={{ color: dim ? "#6B7280" : "#E5E7EB" }} className="text-[11px] font-semibold flex-1" numberOfLines={1}>{r.value}</Text>
        {conf?.status === "conflict" ? <Text style={{ color: "#EF4444" }} className="text-[9px]">⛔</Text> : null}
        <Text style={{ color: meta.color }} className="text-[7.5px] font-bold tracking-wider">{meta.label}</Text>
      </View>
      <View className="flex-row items-center gap-2 mt-1">
        <View className="h-1 rounded-full flex-1 overflow-hidden" style={{ backgroundColor: "#1F2937" }}>
          <View className="h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, r.bar))}%`, backgroundColor: meta.color }} />
        </View>
        {r.detail ? <Text className="text-[#6B7280] text-[8px]" numberOfLines={1}>{r.detail}</Text> : null}
        {conf ? <PartyStrip compact code={{ conformity: conf }} size={8} /> : null}
      </View>
    </View>
  );
}

/**
 * An unclaimed template slot — greyed, with the Custodian's example, and OPEN: tap →
 * the homeowner's typing input right here (Sal 9/6), never another page.
 */
function MissingSlotRow({ slot, address, yearBuilt }: { slot: LedgerTemplateSlot; address?: string | undefined; yearBuilt?: number | undefined }) {
  const [open, setOpen] = useState(false);
  const hint = slot.example ? (typeof slot.example.value === "number" ? slot.example.value.toLocaleString() : slot.example.value) : null;
  return (
    <View className="py-1.5 border-t" style={{ borderColor: "#14171c" }}>
      <Pressable
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen((o) => !o); }}
        className="flex-row items-center gap-2"
      >
        <Text className="text-[#4B5563] text-[10px] flex-1" numberOfLines={1}>{slot.meaning}</Text>
        {/* No home compiled yet → the Custodian's example still shows what the
            slot will hold, dim gold with his ⚖, never a dash (Sal 9/6). */}
        {hint ? (
          <Text style={{ color: GOLD, opacity: 0.55 }} className="text-[10px]" numberOfLines={1}>⚖ {hint}</Text>
        ) : (
          <Text className="text-[#374151] text-[10px]">—</Text>
        )}
        <Text className="text-[#4B5563] text-[6.5px] font-bold tracking-wider border rounded px-1 py-0.5" style={{ borderColor: "#1F2937" }}>
          {hint ? "EXAMPLE" : "NOT YET CLAIMED"}
        </Text>
        <Text className="text-[#4B5563] text-[10px]">{open ? "▾" : "▸"}</Text>
      </Pressable>
      {open ? (
        address ? (
          <EntryAnswer address={address} code={slot.code} yearBuilt={yearBuilt} placeholder={hint ? `e.g. ${hint}` : undefined} />
        ) : (
          <Text className="text-[#6B7280] text-[9px] mt-1">This slot fills the moment your home is on file — start with its address.</Text>
        )
      ) : null}
    </View>
  );
}

export function LedgerSpine({
  extract,
  view,
  revealed,
  /** The portfolio IS the ledger's home, so it hides the link back to itself. */
  showLink = true,
  /** The home's address — every row's input files against it; the photo spot reads into it. */
  address,
  /** The home's run record (useHomeLedger.runs) — lights each row's extraction glyphs. */
  runs,
  /** Orders the spec chips for this home's era. */
  yearBuilt,
}: {
  extract: VeraRow[];
  view: LedgerView;
  revealed: number;
  showLink?: boolean;
  address?: string | undefined;
  runs?: readonly AgentRun[] | undefined;
  yearBuilt?: number | undefined;
}) {
  const [open, setOpen] = useState(true);
  const [entriesOpen, setEntriesOpen] = useState(false);
  const v = view.verdict;
  let shown = 0;
  // The five parties across the ledger — how many entries all five have weighed in on.
  const cov = partyCoverage(
    { codes: Object.fromEntries(view.ranked.map((c) => [c.code, c])) },
    Object.fromEntries(Object.entries(view.reviewByCode).map(([k, r]) => [k, reviewToSignOff(r)])),
  );

  return (
    <View className="rounded-xl border mb-4" style={{ borderColor: `${GOLD}33`, backgroundColor: `${GOLD}0A` }}>
      <Pressable
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen((o) => !o); }}
        className="flex-row items-center px-3 py-2.5 gap-2"
      >
        <Text style={{ color: GOLD }} className="text-[9px] tracking-widest flex-1" numberOfLines={1}>⚖ VALUE-CHAIN LEDGER</Text>
        {v ? (
          <Text style={{ color: v.color, backgroundColor: `${v.color}14`, borderColor: `${v.color}44`, borderWidth: 1 }} className="text-[8px] font-bold rounded-full px-1.5 py-0.5">
            {v.label}
          </Text>
        ) : null}
        <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="px-3 pb-2.5">
          {/* ── THE one photo spot (Sal 9/6): photos of the home go here, at the top of
              the master ledger, and are read into it — never per entry. ── */}
          {address ? <LedgerPhotoSpot address={address} addressKey={normalizeAddress(address)} /> : null}
          {/* ── Layer 1 — what VERA extracted (always open). ── */}
          <Text style={{ color: VERA }} className="text-[8px] font-bold tracking-widest mb-0.5">
            THE HOME{view.conflicts ? ` · ${view.conflicts} to settle` : ""}
          </Text>
          {extract.map((r) => <ExtractRow key={r.id} r={r} conf={view.byCode[ROW_CODE[r.id] ?? ""]} />)}

          {/* ── Layer 2 — the ontology entries ON the template scaffold (Sal 8/31):
              production ships the STRUCTURE; unclaimed slots read greyed below the
              compiled rows and fill in as real sources land. ── */}
          {view.hasData || view.missing.length ? (
            <>
              <Pressable
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setEntriesOpen((o) => !o); }}
                className="flex-row items-center mt-2.5 pt-2 border-t gap-2"
                style={{ borderColor: "#1f2937" }}
              >
                <Text style={{ color: GOLD }} className="text-[8px] font-bold tracking-widest flex-1">
                  ⚖ ENTRIES — {view.templateTotal - view.missing.length - view.examples} of {view.templateTotal} claimed
                  {view.examples ? ` · ${view.examples} examples` : ""}
                  {view.totals.confirmed ? ` · ${view.totals.confirmed} verified` : ""}
                  {cov.entries ? ` · ${cov.complete} with all five in` : ""}
                </Text>
                <Text className="text-[#4B5563] text-[9px]">{entriesOpen ? "▾" : "▸"}</Text>
              </Pressable>
              {/* One flat list, read like the town file — the house's identity leads, then
                  the entries most PEOPLE have weighed in on (Sal 9/7), agreement breaking
                  ties, no ontology-phase headers. Each row wears one party strip.
                  The Custodian's read scales by his stamped share — an unreviewed
                  ledger must not present his blessing (Sal's call, for now). */}
              {entriesOpen ? (
                <View className="mt-1.5">
                  {view.ranked.map((c) => {
                    const on = shown < revealed;
                    shown += 1;
                    if (!on) return null;
                    const overlook =
                      c.code === "VER:overlook" && c.measures.lucent != null
                        ? `${Math.round(c.measures.lucent * view.stampedShare)}/100 · ${Math.round(view.stampedShare * 100)}% stamped`
                        : undefined;
                    return (
                      <LedgerRow
                        key={c.code}
                        code={c}
                        review={view.reviewByCode[c.code]}
                        {...(runs ? { runs } : {})}
                        {...(overlook ? { valueOverride: overlook } : {})}
                        address={address}
                        yearBuilt={yearBuilt}
                      />
                    );
                  })}
                  {/* The scaffold — the template's unclaimed slots, greyed but OPEN
                      (Sal 9/1): every slot is a door — and the door is the typing
                      input itself (Sal 9/6), not another page. */}
                  {view.missing.map((s) => (
                    <MissingSlotRow key={s.code} slot={s} address={address} yearBuilt={yearBuilt} />
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {/* "What we still need from you" MERGED into the entries (Sal's call): each
              row's expanded view opens its own input page — the ask, the review board,
              and photo/document/chat capture live on the entry they would settle. The
              town-plans trip keeps its own callout on the portfolio (only a human can
              walk into the town hall). */}

          {showLink ? (
            <Pressable
              onPress={() => router.push("/portfolio" as never)}
              className="mt-2 rounded-lg px-2.5 py-2 border flex-row items-center"
              style={{ borderColor: `${GOLD}44`, backgroundColor: `${GOLD}0D` }}
            >
              <Text className="text-[9.5px] flex-1" style={{ color: GOLD }}>the full value-chain ledger →</Text>
              <Text style={{ color: GOLD }} className="text-[11px]">→</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
