import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Platform } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { fetchOntologyReadout, type OntologyReadout, type ReadoutArchetype } from "@/lib/ontology";

/**
 * OntologyReadoutPanel — the plan-ontology's learned state, live in the cockpit.
 *
 * Fetches /api/design/ontology (Design Studio, deterministic + free) and renders it: a
 * totals strip, per-archetype coverage rings, and a COLD ↔ WARM toggle that flips the
 * dials + chips to watch the compression compound (using the two coverage snapshots the
 * payload already carries — no re-fetch, no fabrication). Tap an archetype to expand its
 * sheet codes. Fail-soft: if the route is unreachable it says so, never invents numbers.
 */

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });
const GOLD = "#FFE500";
const GREEN = "#22C55E";
const AMBER = "#F59E0B";
const CDA = "#60A5FA";

const glass = {
  backgroundColor: "rgba(255,255,255,0.03)",
  borderColor: "rgba(255,255,255,0.08)",
  borderWidth: 1,
} as const;

/** A coverage ring — confirmedRatio as a stroked arc (react-native-svg, cockpit idiom). */
function Ring({ pct, color, size = 62 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const mid = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={mid} cy={mid} r={r} stroke="rgba(148,163,184,0.14)" strokeWidth={5} fill="none" />
        <Circle
          cx={mid}
          cy={mid}
          r={r}
          stroke={color}
          strokeWidth={5}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ color, fontFamily: MONO }} className="text-[13px] font-black tabular-nums">{pct}%</Text>
    </View>
  );
}

function ArchetypeRow({ a, warm }: { a: ReadoutArchetype; warm: boolean }) {
  const [open, setOpen] = useState(false);
  const cov = warm ? a.coverage : a.coverageCold;
  const p = a.program;
  return (
    <View className="rounded-xl mb-2 p-3" style={glass}>
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-center gap-3">
        <Ring pct={cov.confirmedRatio} color={warm ? GREEN : AMBER} />
        <View className="flex-1">
          <Text style={{ color: CDA, fontFamily: MONO }} className="text-[12px] font-bold">{a.code}</Text>
          <Text className="text-[#6B7280] text-[10px] mt-0.5">
            {p.beds}bd · {p.baths}ba · {p.footprintW}×{p.footprintD} · {p.style}
          </Text>
          <Text style={{ fontFamily: MONO }} className="text-[10px] mt-1">
            <Text style={{ color: AMBER }}>run 1 · {a.coverageCold.confirmed}</Text>
            <Text className="text-[#4B5563]">  →  </Text>
            <Text style={{ color: GREEN }}>run {a.runs} · {a.coverage.confirmed} confirmed</Text>
          </Text>
        </View>
        <Text style={{ color: "#4B5563" }} className="text-[12px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="flex-row flex-wrap gap-1 mt-3">
          {a.sheets.map((s) => {
            const on = warm ? s.confirmed : s.coldConfirmed;
            const col = on ? GREEN : AMBER;
            return (
              <View
                key={s.sheetId}
                className="flex-row items-center gap-1 rounded-md px-1.5 py-1"
                style={{ borderWidth: 1, borderColor: `${col}44`, backgroundColor: `${col}12` }}
              >
                <Text style={{ color: "#E5E7EB", fontFamily: MONO }} className="text-[8.5px] font-bold">{s.sheetId}</Text>
                <View className="rounded-full overflow-hidden" style={{ width: 16, height: 3, backgroundColor: "rgba(148,163,184,0.18)" }}>
                  <View style={{ width: `${s.bar}%`, height: 3, backgroundColor: col }} />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function OntologyReadoutPanel() {
  const [data, setData] = useState<OntologyReadout | null>(null);
  const [loading, setLoading] = useState(true);
  const [warm, setWarm] = useState(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    const r = await fetchOntologyReadout(2, force);
    setData(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View className="rounded-2xl border p-4 mb-7" style={{ borderColor: `${GOLD}33`, backgroundColor: `${GOLD}0A` }}>
      <View className="flex-row items-center gap-2 mb-1">
        <View className="rounded-full" style={{ width: 8, height: 8, backgroundColor: GOLD }} />
        <Text className="text-[#F9FAFB] text-[14px] font-bold flex-1">The codes, read out</Text>
        <Pressable onPress={() => load(true)} className="rounded-full px-2.5 py-1" style={{ borderWidth: 1, borderColor: `${GOLD}55`, backgroundColor: `${GOLD}18` }}>
          <Text style={{ color: GOLD, fontFamily: MONO }} className="text-[9px] font-bold">↻ refresh</Text>
        </Pressable>
      </View>
      <Text className="text-[#9CA3AF] text-[11px] mb-3">
        The plan ontology's learned codes — bars + confirmed coverage compounding across archetypes. Deterministic, no spend.
      </Text>

      {loading && !data ? (
        <View className="py-6 items-center"><ActivityIndicator color={GOLD} /></View>
      ) : !data ? (
        <View className="rounded-xl px-3 py-3" style={glass}>
          <Text className="text-[#6B7280] text-[11px] leading-snug">
            Readout unreachable — live once the Design Studio deploys <Text style={{ fontFamily: MONO }} className="text-[#9CA3AF] text-[10px]">/api/design/ontology</Text>.
          </Text>
        </View>
      ) : (
        <>
          {/* totals */}
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {[
              { n: data.totals.archetypes, l: "archetypes" },
              { n: data.totals.learnedCodes, l: "codes" },
              { n: data.totals.confirmed, l: "confirmed" },
              { n: `${data.totals.avgConfirmedRatio}%`, l: "avg iron-clad" },
            ].map((t) => (
              <View key={t.l} className="rounded-lg px-2.5 py-1.5" style={glass}>
                <Text style={{ color: GOLD, fontFamily: MONO }} className="text-[13px] font-black tabular-nums">{t.n}</Text>
                <Text style={{ fontFamily: MONO }} className="text-[#6B7280] text-[8px] uppercase tracking-wider">{t.l}</Text>
              </View>
            ))}
          </View>

          {/* cold ↔ warm toggle — the compression compounding, on tap */}
          <View className="flex-row rounded-full self-start mb-3 overflow-hidden" style={glass}>
            {([["cold", false, AMBER], ["warm", true, GREEN]] as const).map(([label, val, col]) => (
              <Pressable
                key={label}
                onPress={() => setWarm(val)}
                className="px-3.5 py-1.5"
                style={{ backgroundColor: warm === val ? `${col}22` : "transparent" }}
              >
                <Text
                  style={{ color: warm === val ? col : "#6B7280", fontFamily: MONO }}
                  className="text-[10px] font-bold uppercase tracking-[0.12em]"
                >
                  {label === "cold" ? "cold · run 1" : "warm · run 2"}
                </Text>
              </Pressable>
            ))}
          </View>

          {data.archetypes.map((a) => (
            <ArchetypeRow key={a.code} a={a} warm={warm} />
          ))}

          <Text style={{ fontFamily: MONO }} className="text-[#4B5563] text-[9px] mt-1 leading-snug">
            cold = new sheets provisional · warm = ontology-confirmed after one clean pass. Drawn ratio holds; verified coverage compounds.
          </Text>
        </>
      )}
    </View>
  );
}
