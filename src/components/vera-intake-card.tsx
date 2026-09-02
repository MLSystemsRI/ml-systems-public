import { View, Text, TouchableOpacity } from "react-native";
import type { HomeConfirmation } from "@ml-systems/types";
import { useIntake, setIntakeField, setIntakeConfirmed } from "@/lib/intake-store";

/**
 * VERA's intake confirm — the chat's slow front door. When the address lands and
 * her record fetches settle, this card walks the homeowner through every found
 * fact: ✓ Right / ✕ Off per field (Off = say the correction in chat — stated
 * facts win over the record), then "Looks right — continue" signs the intake off
 * and unlocks the full collective (financing included). Until then every chat
 * turn runs in the INTAKE stage: no loan talk, no pit. Reuses HomeConfirmation —
 * zero new computation; state persists per address (intake-store).
 */

const VERA = "#34D399";
const MARK: Record<string, string> = { confirmed: "✓", reconciled: "⇄", conflict: "⚠" };

export function VeraIntakeCard({ address, confirmation }: { address: string; confirmation: HomeConfirmation }) {
  const intake = useIntake(address);
  const fields = confirmation.fields;
  const marked = fields.filter((f) => intake.fields?.[f.label]).length;

  return (
    <View className="rounded-2xl px-3.5 py-3 mb-3" style={{ backgroundColor: `${VERA}0A`, borderWidth: 1, borderColor: `${VERA}3A` }}>
      <Text style={{ color: VERA }} className="text-[9px] font-bold uppercase tracking-widest mb-0.5">🏠 Confirm your home's record</Text>
      <Text className="text-[#9CA3AF] text-[10.5px] leading-snug mb-2">
        I found this in the public record — tell me what's right. Anything off, say the correct number in chat and I'll take your word over the record.
      </Text>

      {fields.map((f) => {
        const mark = intake.fields?.[f.label];
        return (
          <View key={f.label} className="flex-row items-center py-1.5 border-t" style={{ borderColor: "#14171c" }}>
            <Text style={{ color: f.status === "conflict" ? "#F59E0B" : VERA }} className="text-[10px] w-4">{MARK[f.status] ?? "○"}</Text>
            <View className="flex-1 pr-2">
              <Text className="text-[#E5E7EB] text-[11.5px] font-semibold">
                {f.label}: <Text className="font-normal">{f.value}</Text>
              </Text>
              {mark === "no" ? (
                <Text className="text-[#F59E0B] text-[9.5px] mt-0.5">Noted — tell me the correct value in chat.</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => setIntakeField(address, f.label, "yes")}
              activeOpacity={0.7}
              className="rounded-md px-2 py-1 mr-1"
              style={{ backgroundColor: mark === "yes" ? `${VERA}26` : "transparent", borderWidth: 1, borderColor: mark === "yes" ? `${VERA}66` : "#262626" }}
            >
              <Text style={{ color: mark === "yes" ? VERA : "#6B7280" }} className="text-[10px] font-bold">✓ Right</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIntakeField(address, f.label, "no")}
              activeOpacity={0.7}
              className="rounded-md px-2 py-1"
              style={{ backgroundColor: mark === "no" ? "#F59E0B26" : "transparent", borderWidth: 1, borderColor: mark === "no" ? "#F59E0B66" : "#262626" }}
            >
              <Text style={{ color: mark === "no" ? "#F59E0B" : "#6B7280" }} className="text-[10px] font-bold">✕ Off</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity
        onPress={() => setIntakeConfirmed(address)}
        activeOpacity={0.85}
        className="rounded-lg px-3.5 py-2.5 mt-2 items-center"
        style={{ backgroundColor: `${VERA}1F`, borderWidth: 1, borderColor: `${VERA}66` }}
      >
        <Text style={{ color: VERA }} className="text-[12px] font-extrabold">
          Looks right — continue →{marked ? `  (${marked}/${fields.length} marked)` : ""}
        </Text>
      </TouchableOpacity>
      <Text className="text-[#4B5563] text-[9px] mt-1.5 text-center">
        This unlocks the full collective — financing included.
      </Text>
    </View>
  );
}
