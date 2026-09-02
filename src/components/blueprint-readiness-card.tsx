import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import type { BlueprintReadiness, DisciplineReadiness, SheetReadiness } from "@ml-systems/types";

/**
 * BlueprintReadinessCard — the Custodian's read of how close the master ledger is to a
 * FULL construction-document set (General · Civil · Structural · Architectural · MEP ·
 * Specifications). This is the CDA-handoff gate made visible: per discipline, how much
 * of the evidence a real sheet needs is on the ledger, and which sheets are ready,
 * partial, or blocked. Deterministic — it only renders what `blueprintReadiness`
 * computed off the same compiled ontology the ledger shows. MODELED.
 */

const CDA = "#60A5FA";       // blueprint blue
const ALLOW = "#34D399";     // ready / allow
const WATCH = "#F59E0B";     // partial / watch
const BLOCK = "#F87171";     // blocked / block

type Verdict = "allow" | "watch" | "block";
const verdictColor = (v: Verdict): string => (v === "allow" ? ALLOW : v === "watch" ? WATCH : BLOCK);
const verdictWord = (v: Verdict): string => (v === "allow" ? "READY" : v === "watch" ? "GAPS" : "BLOCKED");
const sheetColor = (s: SheetReadiness["status"]): string =>
  s === "ready" ? ALLOW : s === "partial" ? WATCH : BLOCK;
const sheetMark = (s: SheetReadiness["status"]): string =>
  s === "ready" ? "✓" : s === "partial" ? "◐" : "✕";

export function BlueprintReadinessCard({ readiness }: { readiness: BlueprintReadiness }) {
  const [open, setOpen] = useState(false);
  const [openDisc, setOpenDisc] = useState<string | null>(null);
  const readyCount = readiness.sheets.filter((s) => s.status === "ready").length;

  return (
    <View className="rounded-xl border mb-2" style={{ borderColor: `${CDA}33`, backgroundColor: `${CDA}0A` }}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        className="px-2.5 py-2"
      >
        <View className="flex-row items-center gap-2">
          <Text style={{ color: CDA }} className="text-[9px] tracking-wider">BLUEPRINT SET</Text>
          <Text style={{ color: verdictColor(readiness.verdict) }} className="text-[9px] font-bold tracking-wider">
            {verdictWord(readiness.verdict)}
          </Text>
          <Text style={{ color: CDA }} className="text-[13px] font-extrabold">{readiness.overallCoverage}%</Text>
          <View className="flex-1" />
          <Text className="text-[#6B7280] text-[9px]">{readyCount}/{readiness.sheets.length} sheets</Text>
          <Text style={{ color: WATCH }} className="text-[7.5px] tracking-wider border rounded px-1 py-0.5">MODELED</Text>
          <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
        </View>

        {/* Discipline chips — the six-discipline read at a glance. */}
        <View className="flex-row items-center flex-wrap gap-1.5 mt-1.5">
          {readiness.disciplines.map((d) => (
            <View
              key={d.discipline}
              className="flex-row items-center gap-1 rounded-full px-1.5 py-0.5"
              style={{ backgroundColor: `${verdictColor(d.verdict)}1A` }}
            >
              <Text style={{ color: verdictColor(d.verdict) }} className="text-[8.5px]">
                {d.label} {d.coverage}%
              </Text>
            </View>
          ))}
        </View>
      </Pressable>

      {open ? (
        <View className="px-2.5 pb-2.5">
          {readiness.notes.map((n, i) => (
            <Text key={`note-${i}`} className="text-[#9CA3AF] text-[9.5px] leading-4 mb-1">{n}</Text>
          ))}

          {readiness.disciplines.map((d) => (
            <DisciplineBlock
              key={d.discipline}
              disc={d}
              sheets={readiness.sheets.filter((s) => s.discipline === d.discipline)}
              open={openDisc === d.discipline}
              onToggle={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setOpenDisc((cur) => (cur === d.discipline ? null : d.discipline));
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DisciplineBlock({
  disc,
  sheets,
  open,
  onToggle,
}: {
  disc: DisciplineReadiness;
  sheets: SheetReadiness[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="mt-1.5 pt-1.5 border-t" style={{ borderColor: `${CDA}1A` }}>
      <Pressable onPress={onToggle} className="flex-row items-center gap-2">
        <Text style={{ color: verdictColor(disc.verdict) }} className="text-[10px] w-3">
          {disc.verdict === "allow" ? "✓" : disc.verdict === "watch" ? "◐" : "✕"}
        </Text>
        <Text className="text-[#E5E7EB] text-[10px] font-semibold flex-1">{disc.label}</Text>
        <Text style={{ color: ALLOW }} className="text-[9px]">{disc.ready}</Text>
        <Text className="text-[#4B5563] text-[9px]">·</Text>
        <Text style={{ color: WATCH }} className="text-[9px]">{disc.partial}</Text>
        <Text className="text-[#4B5563] text-[9px]">·</Text>
        <Text style={{ color: BLOCK }} className="text-[9px]">{disc.blocked}</Text>
        <Text style={{ color: verdictColor(disc.verdict) }} className="text-[10px] font-bold w-9 text-right">{disc.coverage}%</Text>
        <Text className="text-[#4B5563] text-[9px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="mt-1">
          {sheets.map((s) => (
            <View key={s.id} className="py-0.5">
              <View className="flex-row items-center gap-2">
                <Text style={{ color: sheetColor(s.status) }} className="text-[9px] w-3">{sheetMark(s.status)}</Text>
                <Text className="text-[#9CA3AF] text-[8.5px] w-10">{s.id}</Text>
                <Text className="text-[#D1D5DB] text-[9px] flex-1" numberOfLines={1}>{s.title}</Text>
                <Text style={{ color: sheetColor(s.status) }} className="text-[9px] w-8 text-right">{s.coverage}%</Text>
              </View>
              {s.blockedBy ? (
                <Text style={{ color: BLOCK }} className="text-[8px] ml-5">{s.blockedBy}</Text>
              ) : s.status !== "ready" && s.missing.length ? (
                <Text className="text-[#6B7280] text-[8px] ml-5">needs: {s.missing.join(" · ")}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
