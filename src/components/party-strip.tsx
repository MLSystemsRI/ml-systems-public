import { View, Text } from "react-native";
import { entryParties, LEDGER_PARTIES, PARTY_META, type LedgerSignOff, type PartyHow, type VcCode } from "@ml-systems/types";

/**
 * PartyStrip — THE one glyph strip on a ledger entry (Sal 9/7).
 *
 * Five seats in a fixed order — 🏠 homeowner · 📋 record · 🦉 verification · 🌱 PI ·
 * ⚖ Custodian — each lit when that party has put real input on this entry and dim when it
 * is still owed. It replaces the verifier glyphs, the run-record strip, the gather-pass
 * strip, the conformity reviewers and the sign-off keys, which were five drawings of the
 * same five people. The Custodian's ⚖ stays LOW until he has stamped THIS entry — his
 * seat on the board is not his approval.
 *
 * Compact = glyphs + "n/5" (the glance line). Full = glyphs with the word for how each
 * came in (photo · measured · said · on record · checked · signed · stamped · overrode),
 * and what to ask for next. Two lenses: the Custodian's names the minds — his console —
 * the homeowner's uses capability words; the agents stay backend (Sal 9/1).
 */

const HOW_WORD: Record<PartyHow, string> = {
  photo: "photo", measured: "measured", said: "said", "on record": "on file",
  checked: "checked", signed: "signed", stamped: "stamped", overrode: "overrode",
};

export function PartyStrip({
  code,
  signOff,
  lens = "homeowner",
  compact = false,
  /** An action cue on the ⚖ — the entry is waiting on the Custodian specifically. */
  needsCustodian = false,
  size = 10,
}: {
  code: Pick<VcCode, "conformity" | "example">;
  signOff?: LedgerSignOff | undefined;
  lens?: "custodian" | "homeowner";
  compact?: boolean;
  needsCustodian?: boolean;
  size?: number;
}) {
  const p = entryParties(code, signOff);
  const custodian = lens === "custodian";
  return (
    <View className={compact ? "flex-row items-center gap-1.5" : "mt-1"}>
      <View className="flex-row items-center gap-2 flex-wrap">
        {p.inputs.map((i) => {
          const m = PARTY_META[i.party];
          const dim = i.party === "custodian" ? 0.3 : 0.28;
          const cue = i.party === "custodian" && !i.lit && needsCustodian;
          return (
            <View key={i.party} className="flex-row items-center gap-0.5">
              <Text
                style={{
                  color: m.color,
                  fontSize: size,
                  opacity: i.lit ? 1 : cue ? 0.9 : dim,
                  textDecorationLine: i.how === "overrode" ? "underline" : "none",
                }}
              >
                {m.glyph}
              </Text>
              {!compact ? (
                <Text
                  style={{ color: cue ? "#F59E0B" : m.color, opacity: i.lit || cue ? 1 : 0.45 }}
                  className={`text-[7.5px] ${cue ? "font-bold" : ""}`}
                >
                  {custodian ? m.name : m.label}
                  {" · "}
                  {i.lit ? HOW_WORD[i.how!] : cue ? (custodian ? "NEEDS YOU" : "in review") : "—"}
                </Text>
              ) : cue ? (
                <Text style={{ color: "#F59E0B" }} className="text-[7px] font-bold">!</Text>
              ) : null}
            </View>
          );
        })}
        {compact ? (
          <Text className="text-[#6B7280] text-[7.5px]">{p.count}/{LEDGER_PARTIES.length}</Text>
        ) : null}
      </View>
      {!compact ? (
        <Text className="text-[#6B7280] text-[7.5px] mt-0.5">
          {p.next
            ? `${p.count} of ${LEDGER_PARTIES.length} perspectives · next: ${custodian ? PARTY_META[p.next].name : PARTY_META[p.next].label}`
            : "all five perspectives in"}
        </Text>
      ) : null}
    </View>
  );
}
