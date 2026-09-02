import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import { router } from "expo-router";
import { LedgerRow, SRC_META } from "@/components/ledger-row";
import type { LedgerView } from "@/lib/ledger-view";
import type { VeraRow } from "@/lib/vera-extract";
import type { VcConformity } from "@ml-systems/types";

/** VERA-extraction rows → the ledger code that governs their conformity. */
const ROW_CODE: Record<string, string> = {
  height: "DES:heights", roof: "DES:roof-form", footprint: "DES:footprint", floors: "DES:heights",
  windows: "DES:windows", doors: "DES:doors", rooflineElements: "DES:roofline",
};
const CONF_MARK: Record<string, { glyph: string; color: string }> = {
  confirmed: { glyph: "✓", color: "#34D399" },
  reconciled: { glyph: "⚖", color: "#60A5FA" },
  conflict: { glyph: "⛔", color: "#EF4444" },
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

/** One VERA-extraction row — label · value + its confidence bar + source chip. */
function ExtractRow({ r, conf }: { r: VeraRow; conf?: VcConformity }) {
  const meta = r.src === "pending" ? { label: "PENDING", color: "#6B7280" } : SRC_META[r.src] ?? SRC_META.modeled;
  const dim = r.src === "pending";
  const mark = conf ? CONF_MARK[conf.status] : undefined;
  return (
    <View className="py-1.5 border-t" style={{ borderColor: "#14171c" }}>
      <View className="flex-row items-center gap-2">
        <Text className="text-[#9CA3AF] text-[10px] w-28" numberOfLines={1}>{r.label}</Text>
        <Text style={{ color: dim ? "#6B7280" : "#E5E7EB" }} className="text-[11px] font-semibold flex-1" numberOfLines={1}>{r.value}</Text>
        {mark ? <Text style={{ color: mark.color }} className="text-[9px]">{mark.glyph}</Text> : null}
        <Text style={{ color: meta.color }} className="text-[7.5px] font-bold tracking-wider">{meta.label}</Text>
      </View>
      <View className="flex-row items-center gap-2 mt-1">
        <View className="h-1 rounded-full flex-1 overflow-hidden" style={{ backgroundColor: "#1F2937" }}>
          <View className="h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, r.bar))}%`, backgroundColor: meta.color }} />
        </View>
        {r.detail ? <Text className="text-[#6B7280] text-[8px]" numberOfLines={1}>{r.detail}</Text> : null}
      </View>
    </View>
  );
}

export function LedgerSpine({
  extract,
  view,
  revealed,
  /** The portfolio IS the ledger's home, so it hides the link back to itself. */
  showLink = true,
  /** The home's address — the key every entry-input page needs to file against. */
  address,
}: {
  extract: VeraRow[];
  view: LedgerView;
  revealed: number;
  showLink?: boolean;
  address?: string | undefined;
}) {
  const [open, setOpen] = useState(true);
  const [entriesOpen, setEntriesOpen] = useState(false);
  const v = view.verdict;
  let shown = 0;

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
                  ⚖ ENTRIES — {view.templateTotal - view.missing.length} of {view.templateTotal} claimed
                  {view.totals.confirmed ? ` · ${view.totals.confirmed} verified` : ""}
                </Text>
                <Text className="text-[#4B5563] text-[9px]">{entriesOpen ? "▾" : "▸"}</Text>
              </Pressable>
              {/* One flat list, read like the town file — the tax record leads, then
                  most-verified, no ontology-phase headers. Each row wears the sign-off it
                  carries (read-only here); the verifier glyphs render from the rating.
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
                        {...(overlook ? { valueOverride: overlook } : {})}
                        {...(address ? { inputHref: `/entry-input?code=${encodeURIComponent(c.code)}&address=${encodeURIComponent(address)}` } : {})}
                      />
                    );
                  })}
                  {/* The scaffold — the template's unclaimed slots, greyed but OPEN
                      (Sal 9/1): every slot is a door. Tap → the entry's own input page
                      — the ask, the review board, photo/document/chat — and with no
                      address yet, the page steers into "Let's build" first. */}
                  {view.missing.map((s) => (
                    <Pressable
                      key={s.code}
                      onPress={() =>
                        router.push(
                          `/entry-input?code=${encodeURIComponent(s.code)}${address ? `&address=${encodeURIComponent(address)}` : ""}` as never,
                        )
                      }
                      className="py-1.5 border-t flex-row items-center gap-2"
                      style={{ borderColor: "#14171c" }}
                    >
                      <Text className="text-[#4B5563] text-[10px] flex-1" numberOfLines={1}>{s.meaning}</Text>
                      <Text className="text-[#374151] text-[10px]">—</Text>
                      <Text className="text-[#4B5563] text-[6.5px] font-bold tracking-wider border rounded px-1 py-0.5" style={{ borderColor: "#1F2937" }}>
                        NOT YET CLAIMED
                      </Text>
                      <Text className="text-[#4B5563] text-[10px]">→</Text>
                    </Pressable>
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
