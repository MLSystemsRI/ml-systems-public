import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, LayoutAnimation } from "react-native";
import { fetchPlanSetIndex, type PlanSetIndex, type PlanSetIndexParams, type PlanSheet } from "@/lib/plan-set-index";

/**
 * PlanSetCard — the full ~45-sheet NCS plan set, ON the phone. Loads the lightweight
 * sheet index (discipline · drawn/framed/confirmed) so the homeowner sees the whole set
 * natively; "Open full set ↗" renders the hi-fi HTML/DXF in the browser (server-owned).
 */

const CDA = "#60A5FA";
const GREEN = "#22C55E";
const GRAY = "#6B7280";

const DISCIPLINE_ORDER = ["SP", "G", "C", "A", "S", "M", "P", "E", "FN", "RV"];

export function PlanSetCard({
  params,
  onOpenFull,
}: {
  params: PlanSetIndexParams;
  /** Opens the full plan-set render in the browser (the existing openPlanSet). */
  onOpenFull: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState<PlanSetIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [tried, setTried] = useState(false);

  const load = async () => {
    if (loading) return;
    setLoading(true);
    const r = await fetchPlanSetIndex(params);
    setIdx(r);
    setTried(true);
    setLoading(false);
  };

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
    if (!open && !idx && !loading) void load();
  };

  // Group sheets by discipline in NCS order.
  const groups: { code: string; label: string; sheets: PlanSheet[] }[] = [];
  if (idx) {
    for (const code of DISCIPLINE_ORDER) {
      const sheets = idx.sheets.filter((s) => s.disciplineCode === code);
      if (sheets.length) groups.push({ code, label: sheets[0]!.discipline, sheets });
    }
    // Any discipline not in the known order, appended.
    for (const s of idx.sheets) {
      if (!DISCIPLINE_ORDER.includes(s.disciplineCode) && !groups.find((g) => g.code === s.disciplineCode)) {
        groups.push({ code: s.disciplineCode, label: s.discipline, sheets: idx.sheets.filter((x) => x.disciplineCode === s.disciplineCode) });
      }
    }
  }

  return (
    <View className="mt-2 rounded-xl border" style={{ borderColor: `${CDA}33`, backgroundColor: `${CDA}0A` }}>
      <Pressable onPress={toggle} className="flex-row items-center px-3 py-2 gap-2">
        <Text style={{ color: CDA }} className="text-[9px] tracking-wider flex-1" numberOfLines={1}>
          ◇ THE PLAN SET — NCS SHEETS{idx ? ` · ${idx.drawn}/${idx.sheetCount} DRAWN` : ""}
        </Text>
        {loading ? <ActivityIndicator size="small" color={CDA} /> : null}
        <Text className="text-[#4B5563] text-[11px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="px-3 pb-2.5">
          {!idx && tried && !loading ? (
            <Text className="text-[#6B7280] text-[9px]">Plan set unavailable right now — tap "Open full set" for the browser render.</Text>
          ) : null}
          {groups.map((g) => (
            <View key={g.code} className="mt-1.5">
              <Text style={{ color: CDA }} className="text-[8px] tracking-wider uppercase mb-0.5">{g.code} · {g.label}</Text>
              {g.sheets.map((s) => (
                <View key={s.id} className="flex-row items-center py-0.5">
                  <Text className="text-[#9CA3AF] text-[9px] w-12">{s.id}</Text>
                  <Text className="text-[#D1D5DB] text-[10px] flex-1 pr-2" numberOfLines={1}>{s.title}</Text>
                  <Text style={{ color: s.rendered === "drawn" ? GREEN : GRAY }} className="text-[7px] uppercase">
                    {s.confirmed ? "✓ " : ""}{s.rendered}
                  </Text>
                </View>
              ))}
            </View>
          ))}
          <Pressable onPress={onOpenFull} className="rounded-lg px-3 py-2 mt-2 items-center border" style={{ borderColor: `${CDA}44` }}>
            <Text style={{ color: CDA }} className="text-[11px] font-semibold">Open full set (HTML / DXF) ↗</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
