import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, LayoutAnimation } from "react-native";

/**
 * SymbiosisCard — the VERA ⇄ CDA loop, run server-side, shown here.
 *
 * The quality vision (card-reconciled sketch, facade + lot reads) only runs where
 * Claude is funded, so this taps the design-studio endpoint (/api/symbiosis): CDA
 * names what it doesn't know, VERA fetches only that, the roof flips modeled→sensed,
 * the true outline lands, and it loops until fidelity plateaus. Then "Run the 49"
 * hands the converged genome to the design-studio swarm (7 disciplines × 7 lenses).
 */

const STUDIO_URL = process.env.EXPO_PUBLIC_DESIGN_URL ?? "https://design.mlsystemsri.com";
const VERA = "#34D399";
const CDA = "#60A5FA";
const GRAY = "#6B7280";

interface SymRound {
  round: number;
  gaps: Array<{ dim: string; why?: string; want?: string }>;
  wants: string[];
  fetched: string[];
  hypotheses: string[];
  scoreBefore: number | null;
  scoreAfter: number | null;
  roofSource: string;
}
interface SymRun {
  rounds: SymRound[];
  converged: string;
  independentFidelity: number | null;
  outlinePts: number;
  roofPitchDeg: number | null;
  genomeParam: string | null;
  bootstrap?: { style?: string; levels?: number; grossSF?: number } | null;
}
interface FinaleResult {
  disciplines: number;
  commonalities: number;
  conflicts: number;
  sheets: number;
  escalations: string[];
}

const pct = (n: number | null): string => (n == null ? "—" : `${Math.round(n)}%`);

export function SymbiosisCard({ address, town, styleName }: { address?: string; town?: string; styleName?: string }) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<SymRun | null>(null);
  const [finale, setFinale] = useState<FinaleResult | null>(null);
  const [finaleRunning, setFinaleRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const streetPart = (address ?? "").split(",")[0]?.trim() ?? "";
  const townResolved = (town ?? /,\s*([A-Za-z ]{3,25})(?:,|$)/.exec(address ?? "")?.[1] ?? "").trim();
  const ready = streetPart.length > 3 && townResolved.length > 1;

  const runLoop = async () => {
    if (!ready || running) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRunning(true);
    setErr(null);
    setFinale(null);
    try {
      const res = await fetch(`${STUDIO_URL}/api/symbiosis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: streetPart, town: townResolved }),
      });
      if (!res.ok) {
        setErr(`run failed (${res.status})`);
        return;
      }
      setRun((await res.json()) as SymRun);
    } catch {
      setErr("couldn't reach the studio");
    } finally {
      setRunning(false);
    }
  };

  const runFinale = async () => {
    if (!run?.genomeParam || finaleRunning) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFinaleRunning(true);
    try {
      const res = await fetch(`${STUDIO_URL}/api/symbiosis/finale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genomeParam: run.genomeParam, address: `${streetPart}, ${townResolved}, RI`, style: styleName ?? "master" }),
      });
      if (res.ok) setFinale((await res.json()) as FinaleResult);
      else setErr(`swarm failed (${res.status})`);
    } catch {
      setErr("couldn't reach the swarm");
    } finally {
      setFinaleRunning(false);
    }
  };

  return (
    <View className="mt-2 rounded-xl border" style={{ borderColor: `${VERA}33`, backgroundColor: `${VERA}0A` }}>
      <Pressable
        className="flex-row items-center justify-between px-3 py-2.5"
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
      >
        <View className="flex-row items-center">
          <Text style={{ color: VERA }}>🦉</Text>
          <Text className="mx-1 text-white/50">⇄</Text>
          <Text style={{ color: CDA }}>◇</Text>
          <Text className="ml-2 font-semibold text-white">Records ⇄ Design · the deep read</Text>
        </View>
        <Text className="text-white/40">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open && (
        <View className="px-3 pb-3">
          <Text className="mb-2 text-xs leading-4 text-white/50">
            The design names what it can&apos;t see; the record search fetches only that. Steered by the plan — roof,
            footprint, facade — it loops until the score stops climbing.
          </Text>

          <Pressable
            disabled={!ready || running}
            onPress={runLoop}
            className="mb-2 items-center rounded-lg py-2"
            style={{ backgroundColor: ready ? `${VERA}22` : "#ffffff10" }}
          >
            {running ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color={VERA} />
                <Text className="ml-2 text-sm" style={{ color: VERA }}>
                  the minds are trading…
                </Text>
              </View>
            ) : (
              <Text className="text-sm font-semibold" style={{ color: ready ? VERA : GRAY }}>
                {run ? "Run again" : "Run the loop"}
              </Text>
            )}
          </Pressable>

          {err && <Text className="mb-2 text-xs text-red-400">{err}</Text>}

          {run && (
            <View>
              {run.bootstrap && (
                <Text className="mb-1 text-[11px] text-white/40">
                  bootstrap · {run.bootstrap.style ?? "?"} · {run.bootstrap.levels ?? "?"} lvl ·{" "}
                  {run.bootstrap.grossSF ? `${run.bootstrap.grossSF} SF` : "?"}
                </Text>
              )}
              {run.rounds.map((r) => (
                <View key={r.round} className="mb-1.5 rounded-lg border border-white/10 px-2 py-1.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-white/80">Round {r.round}</Text>
                    <Text className="text-[11px] text-white/50">
                      {pct(r.scoreBefore)} → <Text style={{ color: VERA }}>{pct(r.scoreAfter)}</Text> · roof {r.roofSource}
                    </Text>
                  </View>
                  <Text className="mt-0.5 text-[11px]" style={{ color: CDA }}>
                    Plan gaps: {r.gaps.map((g) => g.dim).join(", ") || "none"}
                  </Text>
                  <Text className="text-[11px]" style={{ color: VERA }}>
                    Fetched: {r.fetched.join(", ") || "—"}
                  </Text>
                  {r.hypotheses.map((h, i) => (
                    <Text key={i} className="mt-0.5 text-[10px] italic text-white/40">
                      · {h}
                    </Text>
                  ))}
                </View>
              ))}
              <Text className="mt-1 text-xs text-white/70">
                converged: <Text className="font-semibold text-white">{run.converged}</Text> · fidelity{" "}
                <Text style={{ color: VERA }}>{pct(run.independentFidelity)}</Text> · outline {run.outlinePts} pts
                {run.roofPitchDeg ? ` · roof ${Math.round(run.roofPitchDeg)}°` : ""}
              </Text>

              {run.genomeParam && (
                <Pressable
                  disabled={finaleRunning}
                  onPress={runFinale}
                  className="mt-2 items-center rounded-lg py-2"
                  style={{ backgroundColor: `${CDA}22` }}
                >
                  {finaleRunning ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" color={CDA} />
                      <Text className="ml-2 text-sm" style={{ color: CDA }}>
                        49 reviewers converging…
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-sm font-semibold" style={{ color: CDA }}>
                      Run the 49 · swarm the converged genome
                    </Text>
                  )}
                </Pressable>
              )}

              {finale && (
                <View className="mt-2 rounded-lg border border-white/10 px-2 py-1.5">
                  <Text className="text-xs font-semibold" style={{ color: CDA }}>
                    49-swarm · {finale.disciplines}/7 disciplines
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-white/60">
                    {finale.commonalities} commonalities · {finale.conflicts} conflicts · {finale.sheets} sheets
                  </Text>
                  {finale.escalations.slice(0, 3).map((e, i) => (
                    <Text key={i} className="mt-0.5 text-[10px] text-amber-400/80">
                      ⚠ {e}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
