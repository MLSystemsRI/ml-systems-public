import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation } from "react-native";
import type { CodeCompliance, ComplianceStatus } from "@ml-systems/types";

/**
 * CodeComplianceCard — the architectural layer's room-level RI code read (egress, ceiling
 * height, light/vent). Collapsible; grouped per room with pass/review/fail chips and the
 * IRC citation. MODELED, advisory — the AHJ confirms.
 */

const CDA = "#60A5FA";
const GREEN = "#22C55E";
const AMBER = "#F59E0B";
const RED = "#F87171";

const color = (s: ComplianceStatus): string =>
  s === "pass" ? GREEN : s === "review" ? AMBER : s === "fail" ? RED : "#6B7280";
const mark = (s: ComplianceStatus): string =>
  s === "pass" ? "✓" : s === "review" ? "⚠" : s === "fail" ? "✕" : "·";

export function CodeComplianceCard({ compliance }: { compliance?: CodeCompliance | null }) {
  const [open, setOpen] = useState(false);
  if (!compliance || !compliance.rooms.length) return null;
  const { summary } = compliance;

  return (
    <View className="mt-2 rounded-xl border" style={{ borderColor: `${CDA}33`, backgroundColor: `${CDA}0A` }}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        className="flex-row items-center px-3 py-2 gap-2"
      >
        <Text style={{ color: CDA }} className="text-[9px] tracking-wider flex-1" numberOfLines={1}>
          🦉 CODE COMPLIANCE — ROOM BY ROOM (RI · MODELED)
        </Text>
        <Text style={{ color: GREEN }} className="text-[9px]">{summary.pass}✓</Text>
        <Text style={{ color: AMBER }} className="text-[9px]">{summary.review}⚠</Text>
        {summary.fail ? <Text style={{ color: RED }} className="text-[9px]">{summary.fail}✕</Text> : null}
        <Text className="text-[#4B5563] text-[11px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View className="px-3 pb-2.5">
          {compliance.rooms.map((r) => (
            <View key={r.roomId} className="mt-1.5">
              <Text style={{ color: "#E5E7EB" }} className="text-[10.5px] font-semibold">
                {r.roomName}
                <Text className="text-[#6B7280]"> · {r.onExteriorWall ? "exterior wall" : "interior"}</Text>
              </Text>
              {r.items.map((it, i) => (
                <View key={i} className="flex-row items-start gap-1.5 py-0.5">
                  <Text style={{ color: color(it.status) }} className="text-[10px] w-3">{mark(it.status)}</Text>
                  <Text className="text-[#9CA3AF] text-[10px] flex-1 leading-snug">
                    <Text style={{ color: color(it.status) }}>{it.label}</Text>
                    <Text className="text-[#6B7280]"> ({it.code})</Text> — {it.detail}
                  </Text>
                </View>
              ))}
            </View>
          ))}
          <Text className="text-[#6B7280] text-[9px] leading-3 mt-2">{compliance.note}</Text>
        </View>
      ) : null}
    </View>
  );
}
