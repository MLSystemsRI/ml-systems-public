import { useState } from "react";
import { View, Text, Pressable, LayoutAnimation, Modal, TextInput } from "react-native";
import { validateSpec } from "@ml-systems/types";
import type { ReverseTakeoff, ReverseTonnage, SpecKind, SpecVerdict } from "@ml-systems/types";
import { EDITABLE_MEMBERS, type MemberField } from "@/lib/spec-review";
import { useProposedChange, useApprovedSpecs, propose, clearProposed, appendApproved } from "@/lib/spec-review-store";

/** Map a stated field to the plausibility kind VERA validates against. */
const KIND_FOR: Record<MemberField, SpecKind> = {
  statedFoundation: "foundation",
  statedStuds: "studs",
  statedExtSheathing: "extSheathing",
  statedDrywall: "drywall",
  statedJoist: "joist",
  statedSubfloor: "subfloor",
  statedRoofSheathing: "roofSheathing",
  statedWindows: "windows",
  statedInsulation: "insulation",
  statedHeating: "heating",
};

const RFI_ROUNDS = 3;

/**
 * ReverseTakeoffCard — VERA's record reverse-engineered into the assembly stack, in
 * construction order (foundation → roof), so CDA can reverse the plans. Member sizes
 * come from the code era + span; the homeowner's stated specs win (green). REAPER's
 * spec-resolved tonnage rides alongside each line when present. One card, shared by the
 * chat J-Space and the Plan Builder so the two never drift. Self-contained collapse.
 *
 * Read-only by default. Pass `editable` + `addressKey` + `onApprove` (Plan Builder) and
 * each stated-capable line becomes tappable: pick from three common types or enter
 * "Other", and the change goes for review — pending until approved (one at a time).
 */

const CDA = "#60A5FA";
const AMBER = "#F59E0B";
const GREEN = "#22C55E";

export function ReverseTakeoffCard({
  reverse,
  tonnage,
  editable,
  addressKey,
  onApprove,
}: {
  reverse?: ReverseTakeoff | null;
  tonnage?: ReverseTonnage | null;
  editable?: boolean;
  addressKey?: string;
  onApprove?: (field: MemberField, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Hooks stay unconditional — in read-only mode these are null / empty.
  const proposal = useProposedChange(addressKey ?? "");
  const approved = useApprovedSpecs(addressKey ?? "");
  const [picker, setPicker] = useState<{ member: string; field: MemberField; current: string } | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [showBlocked, setShowBlocked] = useState(false);

  const canEdit = !!editable && !!addressKey;

  if (!reverse?.lines.length) return null;

  // VERA's context for judging a pick, and the RFI-round budget (3 total).
  const specCtx = { yearBuilt: reverse.yearBuilt, spanFt: reverse.spanFt, hasBasement: reverse.hasBasement };
  const roundsUsed = Math.min(approved.length, RFI_ROUNDS);
  const rfiClosed = canEdit && roundsUsed >= RFI_ROUNDS;
  const proposalVerdict: SpecVerdict | null = proposal ? validateSpec(KIND_FOR[proposal.field], proposal.to, specCtx) : null;
  const vColor = (lvl: SpecVerdict["level"]): string => (lvl === "typical" ? GREEN : lvl === "uncommon" ? AMBER : "#F87171");
  const vMark = (lvl: SpecVerdict["level"]): string => (lvl === "typical" ? "✓" : "⚠");

  const closePicker = () => {
    setPicker(null);
    setOtherOpen(false);
    setOtherText("");
  };

  const submitPick = (to: string) => {
    if (!picker || !addressKey) return closePicker();
    const value = to.trim();
    // No-op or too-short entries just close without proposing.
    if (value.length < 2 || value === picker.current) return closePicker();
    propose(addressKey, {
      id: picker.field,
      member: picker.member,
      field: picker.field,
      from: picker.current,
      to: value,
      proposedAt: new Date().toISOString(),
    });
    setShowBlocked(false);
    closePicker();
  };

  const approve = () => {
    if (!proposal || !addressKey) return;
    onApprove?.(proposal.field, proposal.to);
    appendApproved(addressKey, {
      member: proposal.member,
      field: proposal.field,
      from: proposal.from,
      to: proposal.to,
      approvedAt: new Date().toISOString(),
    });
    clearProposed(addressKey);
    setShowBlocked(false);
  };

  const reject = () => {
    if (!addressKey) return;
    clearProposed(addressKey);
    setShowBlocked(false);
  };

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
          ◇ REVERSE TAKEOFF — RECORD → CONSTRUCTION ORDER{reverse.yearBuilt ? ` · ${reverse.yearBuilt}` : ""}
        </Text>
        {canEdit ? (
          <Text style={{ color: rfiClosed ? "#F87171" : AMBER }} className="text-[8px] tracking-wider mr-1">
            {rfiClosed ? "RFI CLOSED" : `RFI ROUND ${roundsUsed + 1}/${RFI_ROUNDS}`}
          </Text>
        ) : null}
        <Text className="text-[#4B5563] text-[11px]">{open ? "▾" : "▸"}</Text>
      </Pressable>

      {/* Review gate — a proposed spec change, pending until approved. Visible even
          when the list is collapsed so the homeowner can act on it. */}
      {proposal ? (
        <View className="mx-3 mb-1 rounded-lg border px-2.5 py-2" style={{ borderColor: `${AMBER}66`, backgroundColor: `${AMBER}14` }}>
          <Text style={{ color: AMBER }} className="text-[9px] tracking-wider mb-1">⏳ IN REVIEW — {proposal.member}</Text>
          <Text className="text-[#D1D5DB] text-[11px]" numberOfLines={2}>
            {proposal.from} <Text style={{ color: AMBER }}>→</Text> <Text style={{ color: GREEN }} className="font-semibold">{proposal.to}</Text>
          </Text>
          {/* VERA's plausibility read on the pick — advise; require confirm on a flag. */}
          {proposalVerdict && proposalVerdict.level !== "typical" ? (
            <View className="mt-1.5">
              <Text style={{ color: vColor(proposalVerdict.level) }} className="text-[9.5px] leading-3">
                {proposalVerdict.level}{proposalVerdict.note ? ` — ${proposalVerdict.note}` : ""}
              </Text>
              {proposalVerdict.suggestion && proposalVerdict.suggestion !== proposal.to ? (
                <Pressable
                  onPress={() => addressKey && propose(addressKey, { ...proposal, to: proposalVerdict.suggestion! })}
                  className="self-start rounded-lg px-2 py-1 mt-1 border"
                  style={{ borderColor: `${GREEN}55`, backgroundColor: `${GREEN}12` }}
                >
                  <Text style={{ color: GREEN }} className="text-[10px] font-semibold">Suggested: {proposalVerdict.suggestion} →</Text>
                </Pressable>
              ) : null}
            </View>
          ) : proposalVerdict ? (
            <Text style={{ color: GREEN }} className="text-[9.5px] mt-1.5">Typical for this home ✓</Text>
          ) : null}
          <View className="flex-row gap-2 mt-2">
            <Pressable onPress={approve} className="rounded-lg px-3 py-1.5 border flex-1 items-center" style={{ borderColor: `${GREEN}66`, backgroundColor: `${GREEN}18` }}>
              <Text style={{ color: GREEN }} className="text-[11px] font-semibold">
                {proposalVerdict && proposalVerdict.level !== "typical" ? "Use anyway" : "✓ Approve"}
              </Text>
            </Pressable>
            <Pressable onPress={reject} className="rounded-lg px-3 py-1.5 border flex-1 items-center" style={{ borderColor: "#4B5563" }}>
              <Text className="text-[#9CA3AF] text-[11px]">✕ Reject</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {open ? (
        <View className="px-3 pb-2.5">
          {reverse.lines.map((l, i) => {
            const first = i === 0 || reverse.lines[i - 1]!.assembly !== l.assembly;
            // REAPER's tons for this member — spec-resolved weight, when computed.
            const rt = tonnage?.lines.find((x) => x.order === l.order && x.member === l.member);
            const em = canEdit ? EDITABLE_MEMBERS[l.member] : undefined;
            // VERA's read on a homeowner-set (stated) line — advisory badge + note.
            const lineVerdict = em && l.source === "stated" ? validateSpec(KIND_FOR[em.field], l.spec, specCtx) : null;
            const flagged = !!lineVerdict && lineVerdict.level !== "typical";
            const row = (
              <View className="flex-row items-center justify-between py-0.5">
                <Text className="text-[#9CA3AF] text-[10.5px] flex-1 pr-2" numberOfLines={1}>
                  {l.member}
                  {l.finish ? <Text className="text-[#6B7280]"> · {l.finish}</Text> : null}
                </Text>
                <Text style={{ color: l.source === "stated" ? GREEN : "#E5E7EB" }} className="text-[10.5px] font-semibold" numberOfLines={1}>
                  {l.spec}
                </Text>
                {rt ? (
                  <Text style={{ color: "#F97316" }} className="text-[9px] ml-1.5 w-9 text-right" numberOfLines={1}>{rt.tons}t</Text>
                ) : null}
                {em ? (
                  <Text style={{ color: rfiClosed ? "#4B5563" : flagged ? vColor(lineVerdict!.level) : CDA }} className="text-[10px] ml-1 w-9 text-right">
                    {flagged ? "⚠" : "✎"}
                  </Text>
                ) : (
                  <Text style={{ color: l.source === "stated" ? GREEN : "#6B7280" }} className="text-[7px] uppercase ml-1 w-9 text-right">
                    {l.source}
                  </Text>
                )}
              </View>
            );
            return (
              <View key={`${l.assembly}-${l.member}-${i}`}>
                {first ? (
                  <Text style={{ color: CDA }} className="text-[8px] tracking-wider mt-1.5 mb-0.5 uppercase">
                    {l.order} · {l.assembly}
                  </Text>
                ) : null}
                {em ? (
                  <Pressable
                    onPress={() => {
                      if (rfiClosed || proposal) {
                        setShowBlocked(true);
                        return;
                      }
                      setOtherOpen(false);
                      setOtherText("");
                      setPicker({ member: l.member, field: em.field, current: l.spec });
                    }}
                  >
                    {row}
                  </Pressable>
                ) : (
                  row
                )}
                {/* VERA flags a homeowner-set spec that's less common for this home. */}
                {flagged && lineVerdict!.note ? (
                  <Text style={{ color: vColor(lineVerdict!.level) }} className="text-[8.5px] leading-3 mb-0.5" numberOfLines={2}>
                    🦉 {lineVerdict!.note}
                  </Text>
                ) : null}
              </View>
            );
          })}

          {showBlocked && rfiClosed ? (
            <Text style={{ color: "#F87171" }} className="text-[9px] mt-1.5">
              RFI closed — you've used all {RFI_ROUNDS} rounds. Reset the layout to reopen.
            </Text>
          ) : showBlocked && proposal ? (
            <Text style={{ color: AMBER }} className="text-[9px] mt-1.5">
              One change is in review — approve or reject it first.
            </Text>
          ) : null}

          {tonnage ? (
            <Text style={{ color: "#F97316" }} className="text-[9px] mt-2">
              ⛏ ~{tonnage.recoveredTons} t recoverable · {tonnage.statedShare}% from your stated specs
            </Text>
          ) : null}
          {reverse.lines.some((l) => l.source === "inferred") ? (
            <Text className="text-[#6B7280] text-[9px] leading-3 mt-1">
              Inferred from the {reverse.yearBuilt ?? "era"} record ({reverse.era}) · {reverse.spanFt} ft span.
              {canEdit ? " Tap a ✎ line to correct it." : " Tell me if the foundation, joists, sheathing, or drywall differ."}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Spec picker — three common types + Other, on a tapped member line. */}
      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable onPress={closePicker} className="flex-1 items-center justify-center px-6" style={{ backgroundColor: "#000000AA" }}>
          <Pressable onPress={() => {}} className="w-full rounded-2xl border p-4" style={{ borderColor: `${CDA}55`, backgroundColor: "#0B1220" }}>
            {picker ? (
              <>
                <Text style={{ color: CDA }} className="text-[10px] tracking-wider mb-0.5">◇ {picker.member.toUpperCase()}</Text>
                <Text className="text-[#6B7280] text-[10px] mb-1">current · {picker.current}</Text>
                <Text className="text-[#6B7280] text-[8.5px] mb-2">Each option marked for this {reverse.yearBuilt ?? "era"} · {reverse.spanFt} ft-span home</Text>
                {EDITABLE_MEMBERS[picker.member]!.presets.map((p) => {
                  const isCurrent = p === picker.current;
                  const pv = validateSpec(KIND_FOR[picker.field], p, specCtx);
                  return (
                    <Pressable
                      key={p}
                      onPress={() => submitPick(p)}
                      className="rounded-lg border px-3 py-2.5 mb-2"
                      style={{ borderColor: isCurrent ? `${GREEN}66` : "#374151", backgroundColor: isCurrent ? `${GREEN}14` : "transparent" }}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text style={{ color: isCurrent ? GREEN : "#E5E7EB" }} className="text-[12px] font-semibold">
                          {p}{isCurrent ? "  ·  current" : ""}
                        </Text>
                        <Text style={{ color: vColor(pv.level) }} className="text-[9px] ml-2">{vMark(pv.level)} {pv.level}</Text>
                      </View>
                      {pv.level !== "typical" && pv.note ? (
                        <Text style={{ color: vColor(pv.level) }} className="text-[8.5px] leading-3 mt-1">{pv.note}</Text>
                      ) : null}
                    </Pressable>
                  );
                })}

                {otherOpen ? (
                  <View className="mt-1">
                    <TextInput
                      value={otherText}
                      onChangeText={setOtherText}
                      placeholder={EDITABLE_MEMBERS[picker.member]!.otherHint}
                      placeholderTextColor="#4B5563"
                      autoFocus
                      className="rounded-lg border px-3 py-2.5 text-[12px]"
                      style={{ borderColor: `${CDA}55`, color: "#E5E7EB" }}
                      onSubmitEditing={() => submitPick(otherText)}
                      returnKeyType="send"
                    />
                    <Pressable
                      onPress={() => submitPick(otherText)}
                      className="rounded-lg px-3 py-2.5 mt-2 items-center"
                      style={{ backgroundColor: otherText.trim().length >= 2 ? `${CDA}22` : "#1F2937" }}
                    >
                      <Text style={{ color: otherText.trim().length >= 2 ? CDA : "#4B5563" }} className="text-[12px] font-semibold">Send for review →</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => setOtherOpen(true)} className="rounded-lg border border-dashed px-3 py-2.5" style={{ borderColor: "#4B5563" }}>
                    <Text className="text-[#9CA3AF] text-[12px]">Other…</Text>
                  </Pressable>
                )}

                <Pressable onPress={closePicker} className="items-center mt-3 py-1">
                  <Text className="text-[#6B7280] text-[11px]">Cancel</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
