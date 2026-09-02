import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import { router } from "expo-router";
import { DEEP_SEARCH_TASKS, runDeepSearch, hasGoogleKey, type AgentTag, type DeepTask } from "@/lib/vera-deep-search";
import { useDeepFindings, saveFindings } from "@/lib/deep-search-store";
import { useLocalUploads } from "@/lib/uploads-store";
import { readHomeownerPhoto, nextUnreadPhoto } from "@/lib/vera-photo-read";
import { MIND_COLOR } from "@/components/build-trace-card";
import type { TraceStage } from "@/lib/build-trace";
import { mindLabel } from "@/lib/mind-display";

/**
 * DeepSearchCard — BUILD LOGIC · LAYER 2, THE DEEP PASS.
 *
 * Layer 1 (the build trace) reads what the pipeline computed; Layer 2 is the
 * second pass, unified here: first the MINDS' deep read (deepPassStages — VERA's
 * deep record, MIA's systems takeoff, REAPER's precision lift, PIT LORD × MURPHY's
 * rebuild assessment), then the OWL's sources — every source in VERA's search plan
 * with its honest status: live public data runs on tap, Google tasks wait on one
 * key, homeowner tasks are CTAs (their screen, their photos), licensed feeds stay
 * staged. Each row carries the minds that consume it — the collective's wiring.
 */

const VERA = "#34D399";
const AMBER = "#F59E0B";
const VIOLET = "#8B5CF6";
const GRAY = "#6B7280";

const AGENT_GLYPH: Record<AgentTag, { glyph: string; color: string }> = {
  VERA: { glyph: "🦉", color: "#34D399" },
  CDA: { glyph: "◇", color: "#60A5FA" },
  REAPER: { glyph: "⛏", color: "#F97316" },
  "PIT LORD": { glyph: "🐉", color: "#EF4444" },
  MURPHY: { glyph: "⚒", color: "#84CC16" },
  MIA: { glyph: "◈", color: "#14B8A6" },
  Custodian: { glyph: "◆", color: "#FFE500" },
};

const STATUS_CHIP: Record<DeepTask["status"], { label: string; color: string }> = {
  live: { label: "LIVE", color: VERA },
  "needs-key": { label: "KEY", color: AMBER },
  homeowner: { label: "YOU", color: VIOLET },
  staged: { label: "STAGED", color: GRAY },
};

const GROUPS: DeepTask["group"][] = ["Records", "Geospatial", "Google", "Homeowner", "Licensed"];

export function DeepSearchCard({
  address,
  addressKey,
  deepPass,
  onListingShot,
}: {
  /** The home's address — all the owl needs (she geocodes herself). */
  address?: string;
  /** Findings persist per this key (normalizeAddress of the address). */
  addressKey: string;
  /** The Custodian's merged Layer 2 — his overlook of the VERA × CDA handshake, then
   *  the symbiosis (swarm), then the deep pass — shown above the owl's sources. */
  deepPass?: TraceStage[];
  /** Listing-screenshot CTA — parent runs the vision ingest + merges facts. */
  onListingShot?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [openStage, setOpenStage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const findings = useDeepFindings(addressKey);
  const uploads = useLocalUploads();
  const byTask = new Map(findings.map((f) => [f.taskId, f]));
  const passes = deepPass ?? [];

  const send = async () => {
    if (!address || running) return;
    setRunning(true);
    try {
      const got = await runDeepSearch(address);
      if (got.length) saveFindings(addressKey, got);
    } finally {
      setRunning(false);
    }
  };

  const digestedCount = uploads.filter((u) => u.analysis).length;

  // The homeowner's own camera — VERA reads the newest photo she hasn't read for this
  // home. When there is nothing left to read, the row falls back to the uploads screen
  // so the homeowner can add one.
  const pending = nextUnreadPhoto(uploads, addressKey);
  const readPhoto = async () => {
    if (!pending || photoBusy) return;
    setPhotoBusy(true);
    try {
      await readHomeownerPhoto({ upload: pending, addressKey });
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <View className="mt-2 rounded-xl border" style={{ borderColor: `${VERA}33`, backgroundColor: `${VERA}0A` }}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        className="flex-row items-center px-3 py-2 gap-2"
      >
        <Text style={{ color: VERA }} className="text-[9px] tracking-wider flex-1" numberOfLines={1}>
          ⚖ BUILD LOGIC · LAYER 2 — DEEP PASS × VERA·CDA SYMBIOSIS
        </Text>
        {passes.length ? (
          <Text style={{ color: VERA }} className="text-[8.5px] font-bold mr-1">{passes.length} read</Text>
        ) : null}
        {findings.length ? (
          <Text style={{ color: VERA }} className="text-[8.5px] font-bold mr-1">{findings.length} found</Text>
        ) : null}
        <Text className="text-[#4B5563] text-[11px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="px-3 pb-2.5">
          {/* The minds' deep read — the second pass (deepPassStages), above the owl's
              sources. Same expandable row pattern as the Layer 1 build trace. */}
          {passes.length ? (
            <View className="mb-1">
              <Text style={{ color: VERA }} className="text-[8px] tracking-wider mt-1 mb-0.5 uppercase">The Custodian's merged read — symbiosis + deep pass</Text>
              {passes.map((s, i) => {
                const col = MIND_COLOR[s.mind];
                const on = openStage === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setOpenStage(on ? null : s.id);
                    }}
                    className="py-1.5 border-t"
                    style={{ borderColor: "#14171c" }}
                  >
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[#4B5563] text-[9px] w-3">{i + 1}</Text>
                      <Text style={{ color: col }} className="text-[10px]">{s.glyph}</Text>
                      <Text className="text-[#E5E7EB] text-[11px] font-semibold flex-1" numberOfLines={1}>{s.title}</Text>
                      {/* Capability, not the mind's name — the agents stay backend (Sal 9/1). */}
                      <Text style={{ color: col }} className="text-[8px] tracking-wider">{mindLabel(s.mind)}</Text>
                      <Text className="text-[#4B5563] text-[9px]">{on ? "▾" : "▸"}</Text>
                    </View>
                    {on ? (
                      <View className="ml-5 mt-1">
                        <Text className="text-[#9CA3AF] text-[10px] leading-4">{s.method}</Text>
                        {s.result.map((r, j) => (
                          <Text key={j} style={{ color: col }} className="text-[9.5px] mt-1">· {r}</Text>
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
              <Text style={{ color: VERA }} className="text-[8px] tracking-wider mt-2 mb-0.5 uppercase">The owl's sources</Text>
            </View>
          ) : null}

          {/* Send the owl — runs every live source for this address in parallel. */}
          <Pressable
            onPress={send}
            disabled={!address || running}
            className="rounded-lg py-2 items-center mb-1 border"
            style={{ borderColor: `${VERA}55`, backgroundColor: address ? `${VERA}14` : "transparent" }}
          >
            <Text style={{ color: address ? VERA : GRAY }} className="text-[11px] font-semibold">
              {running ? "🦉 the owl is out…" : address ? "🦉 Send the owl — search everything public" : "🦉 needs an address first"}
            </Text>
          </Pressable>

          {GROUPS.map((group) => {
            const tasks = DEEP_SEARCH_TASKS.filter((t) => t.group === group);
            if (!tasks.length) return null;
            return (
              <View key={group}>
                <Text style={{ color: VERA }} className="text-[8px] tracking-wider mt-2 mb-0.5 uppercase">{group}</Text>
                {tasks.map((t) => {
                  // The Google tier flips KEY → LIVE the moment the key is aboard.
                  const status = t.status === "needs-key" && hasGoogleKey ? "live" : t.status;
                  const chip = STATUS_CHIP[status];
                  const found = byTask.get(t.id);
                  // Homeowner tasks act: listing shot → vision ingest; photos → uploads.
                  const cta =
                    t.id === "listing-screenshot" && onListingShot
                      ? onListingShot
                      : t.id === "photo-digest"
                        ? pending
                          ? readPhoto
                          : () => router.push("/uploads" as never)
                        : t.id === "plans-on-file"
                          ? () => router.push("/uploads" as never)
                          : undefined;
                  const row = (
                    <View className="py-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text style={{ color: chip.color, borderColor: `${chip.color}55` }} className="text-[6.5px] font-bold border rounded px-1 py-0.5 w-11 text-center">
                          {chip.label}
                        </Text>
                        <Text className="text-[#E5E7EB] text-[10.5px] font-semibold flex-1" numberOfLines={1}>{t.title}</Text>
                        {/* The consuming minds — the collective's wiring hooks. */}
                        <View className="flex-row gap-0.5">
                          {t.agents.map((a) => (
                            <Text key={a} style={{ color: AGENT_GLYPH[a].color }} className="text-[8.5px]">{AGENT_GLYPH[a].glyph}</Text>
                          ))}
                        </View>
                        {cta ? <Text style={{ color: VIOLET }} className="text-[10px]">→</Text> : null}
                      </View>
                      {found ? (
                        <Text style={{ color: VERA }} className="text-[9.5px] mt-0.5" numberOfLines={2}>
                          ✓ {found.summary} <Text className="text-[#6B7280] text-[8px]">· {found.source}</Text>
                        </Text>
                      ) : t.id === "photo-digest" && uploads.length ? (
                        <Text style={{ color: VIOLET }} className="text-[9px] mt-0.5">
                          {photoBusy
                            ? "🦉 reading your photo…"
                            : pending
                              ? `${uploads.length} photo${uploads.length === 1 ? "" : "s"} · ${digestedCount} read — tap to read ${pending.fileName.slice(0, 22)}`
                              : `${uploads.length} photo${uploads.length === 1 ? "" : "s"} · all read — tap to add another`}
                        </Text>
                      ) : (
                        <Text className="text-[#6B7280] text-[8.5px] leading-3 mt-0.5" numberOfLines={2}>{t.detail}</Text>
                      )}
                      {t.gem && !found ? (
                        <Text style={{ color: AMBER }} className="text-[8px] mt-0.5" numberOfLines={1}>✦ {t.gem}</Text>
                      ) : null}
                    </View>
                  );
                  return cta ? (
                    <Pressable key={t.id} onPress={cta}>{row}</Pressable>
                  ) : (
                    <View key={t.id}>{row}</View>
                  );
                })}
              </View>
            );
          })}

          <Text className="text-[#4B5563] text-[8px] leading-3 mt-2">
            {hasGoogleKey
              ? "LIVE runs now — public data + Google (key aboard: Street View vision, 3-D roof, satellite). YOU = your screen / your photos — never scraped. STAGED = licensed or per-town, deliberately not faked."
              : "LIVE runs now, free public data. KEY unlocks with a Google Maps Platform key (EXPO_PUBLIC_GOOGLE_MAPS_KEY). YOU = your screen / your photos — never scraped. STAGED = licensed or per-town integration, deliberately not faked."}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
