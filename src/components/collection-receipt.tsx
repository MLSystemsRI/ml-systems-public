import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import { DEEP_SEARCH_TASKS, hasGoogleKey } from "@/lib/vera-deep-search";
import { useDeepFindings } from "@/lib/deep-search-store";
import type { BonesStatus } from "@/components/jspace-builder";

/**
 * CollectionReceipt — the gather, made legible (Sal 9/1).
 *
 * The auto sweep runs invisibly; this strip is its receipt: which source landed, which
 * didn't, and how full the master ledger stands. Pure READ of the findings store + the
 * task registry's labels — zero runner logic here (the VERA runners are owned by the
 * parallel work; this surface is also its debugging window). The card's manual re-run
 * stays the retry; a missed source reads plainly, not as an error dump.
 */

const VERA = "#34D399";
const DIM = "#4B5563";

/** Sources the sweep can actually fetch — homeowner-assisted + staged sit outside the count. */
const runnableTasks = () =>
  DEEP_SEARCH_TASKS.filter((t) => t.status === "live" || (t.status === "needs-key" && hasGoogleKey));

/** A short hint off a finding — the first couple of fields, human-readable. */
function hint(fields?: Record<string, string>): string | null {
  if (!fields) return null;
  const entries = Object.entries(fields).slice(0, 2);
  if (!entries.length) return null;
  return entries.map(([k, v]) => `${k} ${String(v).slice(0, 24)}`).join(" · ");
}

export function CollectionReceipt({
  addressKey,
  bonesStatus,
  cardSource,
  claimed,
  templateTotal,
}: {
  addressKey: string;
  /** Layer 1's two reads aren't findings — they lead the receipt from props. */
  bonesStatus?: BonesStatus;
  /** The assessor card's source string once folded (facts.attributesSource). */
  cardSource?: string | undefined;
  claimed: number;
  templateTotal: number;
}) {
  const findings = useDeepFindings(addressKey);
  const byTask = new Map(findings.map((f) => [f.taskId, f]));
  const tasks = runnableTasks();
  // Layer 1 rows (geocode/footprint + tax card) + the sweep's runnable tasks.
  const layer1Landed = (bonesStatus === "found" ? 1 : 0) + (cardSource ? 1 : 0);
  const landed = layer1Landed + tasks.filter((t) => byTask.has(t.id)).length;
  const total = 2 + tasks.length;
  const allIn = landed >= total;
  const [open, setOpen] = useState(false);

  if (!addressKey) return null;

  return (
    <View className="rounded-xl border mb-2" style={{ borderColor: `${VERA}33`, backgroundColor: `${VERA}08` }}>
      <Pressable
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen((o) => !o); }}
        className="flex-row items-center px-3 py-2 gap-2"
      >
        <Text style={{ color: VERA }} className="text-[11px]">📥</Text>
        <Text style={{ color: VERA }} className="text-[8px] font-bold tracking-widest flex-1" numberOfLines={1}>
          COLLECTED — {landed} of {total} sources · {claimed} of {templateTotal} entries claimed
        </Text>
        {allIn ? <Text style={{ color: VERA }} className="text-[9px]">✓</Text> : null}
        <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="px-3 pb-2">
          {/* Layer 1 — the two reads the chat itself made. */}
          <Row on={bonesStatus === "found"} label="Geocode + real footprint" note={bonesStatus === "fetching" ? "reading…" : undefined} />
          <Row on={!!cardSource} label="Tax assessor card (VGSI)" note={cardSource ?? undefined} />
          {/* The sweep — one line per runnable source, straight off the findings. */}
          {tasks.map((t) => {
            const f = byTask.get(t.id);
            return <Row key={t.id} on={!!f} label={t.title} note={f ? hint(f.fields) ?? f.summary.slice(0, 48) : "didn't land this run"} />;
          })}
        </View>
      ) : null}
    </View>
  );
}

function Row({ on, label, note }: { on: boolean; label: string; note?: string | undefined }) {
  return (
    <View className="flex-row items-center gap-2 py-1 border-t" style={{ borderColor: "#12211c" }}>
      <Text style={{ color: on ? VERA : DIM }} className="text-[9px] w-3">{on ? "✓" : "—"}</Text>
      <Text style={{ color: on ? "#D1D5DB" : DIM }} className="text-[10px] flex-1" numberOfLines={1}>{label}</Text>
      {note ? <Text className="text-[#4B5563] text-[8px] max-w-[45%]" numberOfLines={1}>{note}</Text> : null}
    </View>
  );
}
