import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { specKindForCode, specOptionsFor, judgeOption, type SpecContext } from "@ml-systems/types";
import { usePlan } from "@/lib/plan-store";
import { normalizeAddress } from "@/lib/jspace-facts";
import { saveEntryInput, entryInputFor } from "@/lib/entry-input";

/**
 * EntryAnswer — the homeowner's typing input for ONE ledger entry, inline (Sal 9/6).
 *
 * The same block wherever an entry asks for input: the ledger row (expanded), the
 * unclaimed template slot, and PI's ask card in the chat. Chips when the entry is a
 * member spec (`specKindForCode`) — a shortcut, never a fence — and a one-line text
 * box for everything. Saving files through `saveEntryInput`, which is the one write
 * path; the ledger recompiles on its own. No page change, ever.
 */

const VIOLET = "#A78BFA";

export function EntryAnswer({
  address,
  code,
  yearBuilt,
  placeholder,
  onSaved,
}: {
  address: string;
  code: string;
  /** Orders the spec chips for this home's era. */
  yearBuilt?: number | undefined;
  /** The hint in the empty box — PI's example ("e.g. 40 × 25 ft"). */
  placeholder?: string | undefined;
  onSaved?: ((value: string) => void) | undefined;
}) {
  const plan = usePlan(normalizeAddress(address));
  const current = entryInputFor(plan?.facts, code);
  const kind = specKindForCode(code);
  const specCtx: SpecContext = yearBuilt ? { yearBuilt } : {};
  const options = useMemo(() => (kind ? specOptionsFor(kind, specCtx) : []), [kind, yearBuilt]); // eslint-disable-line react-hooks/exhaustive-deps
  const [text, setText] = useState("");

  const save = (v: string) => {
    saveEntryInput(address, code, v);
    setText("");
    onSaved?.(v.trim());
  };

  const verdict = current && kind ? judgeOption(kind, current, specCtx) : null;

  return (
    // Stops the tap from reaching a parent row that toggles open/closed.
    <View className="mt-2" onStartShouldSetResponder={() => true}>
      {options.length ? (
        <View className="flex-row flex-wrap gap-1.5 mb-1.5">
          {options.map((a) => {
            const on = current === a;
            return (
              <Pressable
                key={a}
                onPress={() => save(on ? "" : a)}
                className="rounded-full px-2.5 py-1"
                style={{ backgroundColor: on ? `${VIOLET}22` : "#111827", borderWidth: 1, borderColor: on ? VIOLET : "#1f2937" }}
              >
                <Text className="text-[9.5px]" style={{ color: on ? VIOLET : "#D1D5DB" }}>{a}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {verdict ? (
        verdict.level !== "typical" ? (
          <Text style={{ color: "#F59E0B" }} className="text-[8.5px] mb-1 leading-3">🌱 PI — {verdict.level}{verdict.note ? `: ${verdict.note}` : ""}</Text>
        ) : (
          <Text style={{ color: "#22C55E" }} className="text-[8.5px] mb-1 leading-3">🌱 PI — typical for this home ✓</Text>
        )
      ) : null}
      <View className="flex-row gap-1.5">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={current ? `On file: ${current} — change it?` : placeholder ?? "Type it here…"}
          placeholderTextColor="#4B5563"
          returnKeyType="done"
          onSubmitEditing={() => { if (text.trim()) save(text); }}
          className="flex-1 rounded-lg px-2.5 py-1.5 text-[11px] text-[#E5E7EB] border"
          style={{ borderColor: "#1f2937", backgroundColor: "#111827" }}
        />
        <Pressable
          onPress={() => { if (text.trim()) save(text); }}
          className="rounded-lg px-3 justify-center border"
          style={{ borderColor: `${VIOLET}55`, backgroundColor: `${VIOLET}1A`, opacity: text.trim() ? 1 : 0.5 }}
        >
          <Text style={{ color: VIOLET }} className="text-[10px] font-semibold">Save</Text>
        </Pressable>
      </View>
      {current ? (
        <View className="flex-row items-center gap-2 mt-1">
          <Text style={{ color: "#60A5FA" }} className="text-[8.5px] flex-1" numberOfLines={1}>🏠 you said: {current}</Text>
          <Pressable onPress={() => save("")} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text className="text-[#6B7280] text-[8.5px]">withdraw</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
