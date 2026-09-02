import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import type { FidelityReport, HomeConfirmation } from "@ml-systems/types";

/**
 * FidelityCard — VERA's plan-vs-public-record scorecard.
 *
 * The CDA MVE made visible: how close did the generated plan land to the record?
 * The headline is the INDEPENDENT score (cross-source dims only — OSM vs assessor);
 * dims seeded from the record are shown dimmed with a "from record" tag, because
 * agreement there is not evidence. Deterministic input, zero model calls; the card
 * only renders what `planFidelity` computed. VERA's emerald styling throughout.
 */

const VERA = "#34D399";
const CDA = "#60A5FA";
const AMBER = "#F59E0B";

const statusColor = (s: "pass" | "warn" | "fail"): string =>
  s === "pass" ? VERA : s === "warn" ? AMBER : "#F87171";
const statusMark = (s: "pass" | "warn" | "fail"): string =>
  s === "pass" ? "✓" : s === "warn" ? "⚠" : "✕";

/** Stage-1 field verifications: ✓ confirmed · ⇄ reconciled · ○ single-source · ⚠ conflict. */
const confirmColor = (s: "confirmed" | "reconciled" | "single-source" | "conflict"): string =>
  s === "confirmed" ? VERA : s === "reconciled" ? CDA : s === "conflict" ? "#F87171" : "#6B7280";
const confirmMark = (s: "confirmed" | "reconciled" | "single-source" | "conflict"): string =>
  s === "confirmed" ? "✓" : s === "reconciled" ? "⇄" : s === "conflict" ? "⚠" : "○";

export function FidelityCard({ report, confirmation }: { report: FidelityReport; confirmation?: HomeConfirmation }) {
  const [open, setOpen] = useState(false);
  const headline = report.independentScore ?? report.score;

  return (
    <Pressable
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen((o) => !o);
      }}
      className="rounded-xl p-2.5 border mb-2"
      style={{ borderColor: `${VERA}33`, backgroundColor: `${VERA}0A` }}
    >
      <View className="flex-row items-center gap-2">
        <Text style={{ color: VERA }} className="text-[9px] tracking-wider">PLAN vs PUBLIC RECORD</Text>
        <Text style={{ color: VERA }} className="text-[13px] font-extrabold">{headline}%</Text>
        <Text className="text-[#6B7280] text-[9px]">close</Text>
        <View className="flex-1" />
        <Text style={{ color: AMBER }} className="text-[7.5px] tracking-wider border rounded px-1 py-0.5">MODELED</Text>
        <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
      </View>

      {/* Stage-1 field verifications — sources cross-confirmed BEFORE the build. */}
      {confirmation?.fields.length ? (
        <View className="flex-row items-center flex-wrap gap-1.5 mt-1.5">
          <Text className="text-[#6B7280] text-[8px] tracking-wider">VERIFIED</Text>
          {confirmation.fields.map((f) => (
            <View key={f.id} className="flex-row items-center gap-1 rounded-full px-1.5 py-0.5" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
              <Text style={{ color: confirmColor(f.status) }} className="text-[8.5px]">
                {confirmMark(f.status)} {f.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Dim chips — the per-dimension read at a glance. */}
      <View className="flex-row items-center flex-wrap gap-1.5 mt-1.5">
        {report.dims.map((d) => (
          <View
            key={d.id}
            className="flex-row items-center gap-1 rounded-full px-1.5 py-0.5"
            style={{
              backgroundColor: d.status === "warn" ? `${AMBER}1A` : "rgba(255,255,255,0.04)",
              opacity: d.seeded ? 0.55 : 1,
            }}
          >
            <Text style={{ color: statusColor(d.status) }} className="text-[8.5px]">
              {statusMark(d.status)} {d.label} {d.pct}%
            </Text>
          </View>
        ))}
      </View>

      {open ? (
        <View className="mt-2 pt-2 border-t" style={{ borderColor: `${VERA}22` }}>
          {confirmation?.fields.map((f) => (
            <View key={`conf-${f.id}`} className="py-1">
              <View className="flex-row items-center gap-2">
                <Text style={{ color: confirmColor(f.status) }} className="text-[10px] w-3">{confirmMark(f.status)}</Text>
                <Text className="text-[#E5E7EB] text-[10px] font-semibold flex-1">{f.label}</Text>
                <Text style={{ color: confirmColor(f.status) }} className="text-[10px]">{f.value}</Text>
                <Text className="text-[#6B7280] text-[8px]">{f.status}</Text>
              </View>
              {f.note ? <Text className="text-[#6B7280] text-[8px] ml-5">{f.note} · {f.sources.join(" + ")}</Text> : null}
            </View>
          ))}
          {report.dims.map((d) => (
            <View key={`row-${d.id}`} className="py-1" style={{ opacity: d.seeded ? 0.55 : 1 }}>
              <View className="flex-row items-center gap-2">
                <Text style={{ color: statusColor(d.status) }} className="text-[10px] w-3">{statusMark(d.status)}</Text>
                <Text className="text-[#E5E7EB] text-[10px] font-semibold flex-1">{d.label}</Text>
                <Text style={{ color: CDA }} className="text-[10px]">{d.generated.toLocaleString()}</Text>
                <Text className="text-[#4B5563] text-[9px]">vs</Text>
                <Text style={{ color: VERA }} className="text-[10px]">{d.record.toLocaleString()}</Text>
                <Text style={{ color: statusColor(d.status) }} className="text-[10px] font-bold w-9 text-right">{d.pct}%</Text>
              </View>
              {d.seeded ? (
                <Text className="text-[#6B7280] text-[8px] ml-5">seeded from the record — agreement isn&apos;t evidence</Text>
              ) : null}
              {d.note && d.status !== "pass" ? (
                <Text style={{ color: AMBER }} className="text-[8px] ml-5">{d.note}</Text>
              ) : null}
            </View>
          ))}
          <View className="flex-row items-baseline gap-2 mt-1 pt-1.5 border-t" style={{ borderColor: `${VERA}22` }}>
            <Text className="text-[#6B7280] text-[8.5px]">independent {report.independentScore ?? "—"}% · all dims {report.score}%</Text>
          </View>
          {report.recordSources.length ? (
            <Text className="text-[#4B5563] text-[8px] mt-0.5">record: {report.recordSources.join(" · ")}</Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
