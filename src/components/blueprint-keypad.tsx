import { useEffect, useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";

/**
 * BlueprintKeypad — the in-app number pad, styled like the blueprint.
 *
 * The OS keyboard pans/resizes the screen when a TextInput focuses (the "jump").
 * This pad IS the input — no TextInput, no OS keyboard, so the screen physically
 * cannot move. A transparent bottom-sheet Modal over the untouched screen;
 * commits clamp to [min, max] on ✓. OTA-safe, identical on iOS + Android.
 */

const BP_BG = "#0A3D91";
const BP_LINE = "#FFFFFF";
const BP_DIM = "#AECBF5";
const CDA = "#60A5FA";

export function BlueprintKeypad({
  visible,
  label,
  initial,
  min,
  max,
  unit,
  onCommit,
  onClose,
}: {
  visible: boolean;
  label: string;
  initial: number;
  min: number;
  max: number;
  unit?: string;
  onCommit: (n: number) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (visible) setText(String(Math.round(initial)));
  }, [visible, initial]);

  const typed = Number(text || "0");
  const clamped = Math.min(max, Math.max(min, Math.round(typed)));
  const outOfRange = text !== "" && typed !== clamped;

  const press = (k: string) => {
    if (k === "⌫") setText((t) => t.slice(0, -1));
    else if (k === "✓") {
      onCommit(clamped);
      onClose();
    } else setText((t) => (t === "0" ? k : t.length < 6 ? t + k : t));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Tap anywhere above the pad to dismiss without committing. */}
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={{ backgroundColor: BP_BG, borderTopWidth: 2, borderColor: "rgba(255,255,255,0.35)" }} className="px-5 pt-3 pb-7">
        <View className="flex-row items-baseline gap-2 mb-2">
          <Text style={{ color: BP_DIM }} className="text-[10px] uppercase tracking-[0.18em]">{label}</Text>
          <View className="flex-1" />
          <Text style={{ color: BP_LINE }} className="text-[26px] font-black">
            {text || "0"}
            {unit ? <Text style={{ color: BP_DIM }} className="text-[12px]"> {unit}</Text> : null}
          </Text>
        </View>
        <Text style={{ color: outOfRange ? "#F59E0B" : BP_DIM }} className="text-[9px] mb-2">
          {outOfRange ? `will save as ${clamped.toLocaleString()} — ` : ""}range {min.toLocaleString()}–{max.toLocaleString()}{unit ? ` ${unit}` : ""}
        </Text>
        {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["⌫", "0", "✓"]].map((row) => (
          <View key={row.join("")} className="flex-row gap-2 mb-2">
            {row.map((k) => (
              <Pressable
                key={k}
                onPress={() => press(k)}
                className="flex-1 rounded-xl py-3.5 items-center"
                style={{
                  backgroundColor: k === "✓" ? `${CDA}55` : "rgba(255,255,255,0.08)",
                  borderWidth: 1,
                  borderColor: k === "✓" ? CDA : "rgba(255,255,255,0.25)",
                }}
              >
                <Text style={{ color: BP_LINE }} className="text-[17px] font-bold">{k}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </Modal>
  );
}
