import { useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { maxFootprintSF, genomePlates, type HomeGenome, type RecordAttributes } from "@ml-systems/types";
import { BlueprintKeypad } from "@/components/blueprint-keypad";
import type { BuilderFacts } from "@/lib/jspace-facts";
import { useProposedCorrection, proposeCorrection, clearCorrection } from "@/lib/record-review-store";

/**
 * RecordPanel — "Your home's record", editable.
 *
 * The tax card + Building Layout are the plan's foundation; this panel shows the
 * record with its provenance and lets the homeowner INPUT their own values where
 * it matters (living SF, levels). Overrides become the homeowner's claims — VERA's
 * fidelity + VERIFIED chips show the divergence from the record honestly; the
 * record itself (the genome) is never mutated.
 */

const VERA = "#34D399";
const CDA = "#60A5FA";
const AMBER = "#F59E0B";
const REAPER = "#F97316";
const PIT = "#EF4444";

/**
 * Tap the value → the blueprint keypad opens (an in-app pad, NO OS keyboard —
 * the screen cannot jump). Commits clamped on ✓.
 */
export function EditableValue({
  value,
  min,
  max,
  unit,
  label = "value",
  color = "#F9FAFB",
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  unit?: string;
  label?: string;
  color?: string;
  onCommit: (n: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={{ color }} className="text-[15px] font-extrabold">
          {value.toLocaleString()}
          {unit ? <Text className="text-[#6B7280] text-[10px]"> {unit}</Text> : null}
        </Text>
      </Pressable>
      <BlueprintKeypad
        visible={open}
        label={label}
        initial={value}
        min={min}
        max={max}
        {...(unit ? { unit } : {})}
        onCommit={onCommit}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function Row({ label, tag, children }: { label: string; tag?: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between py-1.5 border-b" style={{ borderColor: "#14171c" }}>
      <View className="flex-1">
        <Text className="text-[#9CA3AF] text-[11px]">{label}</Text>
        {tag ? <Text className="text-[#4B5563] text-[8px]">⟨{tag}⟩</Text> : null}
      </View>
      {children}
    </View>
  );
}

const usd = (n: number): string => "$" + Math.round(n).toLocaleString();
const usdShort = (n: number): string => (n >= 1000 ? "$" + Math.round(n / 1000) + "k" : usd(n));

/** One labeled attribute line, its value tinted by the mind that reads it. */
function AttrLine({ label, value, color = "#E5E7EB" }: { label: string; value: string; color?: string }) {
  return (
    <View className="flex-row items-center justify-between py-1 border-b" style={{ borderColor: "#14171c" }}>
      <Text className="text-[#9CA3AF] text-[11px] flex-1 pr-2" numberOfLines={1}>{label}</Text>
      <Text style={{ color }} className="text-[11px] font-semibold" numberOfLines={1}>{value}</Text>
    </View>
  );
}

function GroupLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return <Text style={{ color }} className="text-[8px] tracking-[0.14em] mt-2.5 mb-0.5 uppercase">{children}</Text>;
}

/**
 * Everything the card holds beyond the plan's geometry — grouped by the mind that
 * reads it. REAPER's envelope materials, PIT LORD's sale + valuation basis, CDA's
 * layout precision, and the title/identity spine. Assessor provenance throughout.
 */
function AttributesBlock({ a }: { a: RecordAttributes }) {
  const materials: [string, string][] = [];
  if (a.exteriorWall) materials.push(["Exterior wall", a.exteriorWall]);
  if (a.roofCover) materials.push(["Roof cover", a.roofCover]);
  if (a.interiorWall) materials.push(["Interior wall", a.interiorWall]);
  const hvac = [a.heatFuel, a.heatType].filter(Boolean).join(" · ");
  if (hvac) materials.push(["Heat", hvac]);
  if (a.acType) materials.push(["A/C", a.acType]);

  const layout: [string, string][] = [];
  if (a.fullBaths != null) layout.push(["Baths", `${a.fullBaths} full${a.halfBaths ? ` · ${a.halfBaths} half` : ""}`]);
  if (a.fireplaces) layout.push(["Fireplaces", String(a.fireplaces)]);
  if (a.basementGarages) layout.push(["Basement garage", `${a.basementGarages}-car`]);
  if (a.grade) layout.push(["Grade", a.grade]);

  const vh = a.valuationHistory;
  const trend =
    vh && vh.length >= 2 ? `${vh[vh.length - 1]!.year} ${usdShort(vh[vh.length - 1]!.total)} → ${vh[0]!.year} ${usdShort(vh[0]!.total)}` : null;

  const showPit = a.lastSalePrice || a.improvementsValue || trend;
  const showId = a.parcelId || a.owner || a.landUseDesc || (a.outbuildings && a.outbuildings.length);

  return (
    <View className="mt-1">
      {materials.length ? (
        <>
          <GroupLabel color={REAPER}>⛏ Envelope materials — the salvage read</GroupLabel>
          {materials.map(([l, v]) => <AttrLine key={l} label={l} value={v} color={REAPER} />)}
        </>
      ) : null}

      {showPit ? (
        <>
          <GroupLabel color={PIT}>◆ Sale &amp; valuation — the equity basis</GroupLabel>
          {a.lastSalePrice ? (
            <AttrLine label="Last sale" value={`${usd(a.lastSalePrice)}${a.lastSaleDate ? ` · ${a.lastSaleDate}` : ""}`} color={PIT} />
          ) : null}
          {trend ? <AttrLine label="Assessed trend" value={trend} color={PIT} /> : null}
          {a.improvementsValue && a.landValue ? (
            <AttrLine label="Improvements / land" value={`${usdShort(a.improvementsValue)} / ${usdShort(a.landValue)}`} color={PIT} />
          ) : null}
          {a.replacementCost ? <AttrLine label="Replacement cost" value={usd(a.replacementCost)} color={PIT} /> : null}
        </>
      ) : null}

      {layout.length ? (
        <>
          <GroupLabel color={CDA}>◇ Layout detail — plan fidelity</GroupLabel>
          {layout.map(([l, v]) => <AttrLine key={l} label={l} value={v} color={CDA} />)}
        </>
      ) : null}

      {showId ? (
        <>
          <GroupLabel color={VERA}>🦉 Identity — the title spine</GroupLabel>
          {a.parcelId ? <AttrLine label="Parcel (map/block/lot)" value={a.parcelId} /> : null}
          {a.owner ? <AttrLine label="Owner of record" value={a.owner} /> : null}
          {a.landUseDesc ? <AttrLine label="Land use" value={a.landUseDesc} /> : null}
          {a.outbuildings?.map((o, i) => (
            <AttrLine key={`ob${i}`} label={`Outbuilding · ${o.description}`} value={o.value ? usd(o.value) : o.sizeSF ? `${o.sizeSF} SF` : "—"} />
          ))}
        </>
      ) : null}
    </View>
  );
}

export function RecordPanel({
  facts,
  genome,
  onLivingSF,
  onLevels,
  onReset,
  readOnly,
  addressKey,
}: {
  facts: BuilderFacts;
  genome: HomeGenome;
  /** Homeowner types their own living SF — becomes their claim vs the record. */
  onLivingSF?: (sf: number) => void;
  /** Homeowner picks the level count — drops the record's plate massing. */
  onLevels?: (levels: number) => void;
  /** One tap back to truth — restore the record's values + massing. */
  onReset?: () => void;
  /** Read-only (the portfolio home page): the assessor is truth. No inline edits — the
   *  homeowner SUBMITS a correction for review instead. */
  readOnly?: boolean;
  /** Address key for the record-review store (required when readOnly). */
  addressKey?: string;
}) {
  const ro = !!readOnly;
  // Read-only shows the assessor TRUTH (genome), not the homeowner's local override.
  const livingSF = ro ? Math.round(genome.grossSF?.v ?? 0) : Math.round(facts.grossSF ?? genome.grossSF?.v ?? 0);
  const levels = ro ? Math.max(1, Math.round(genome.levels.v)) : Math.max(1, Math.round(facts.levels ?? genome.levels.v));
  const lotSF = genome.lotSF?.v;
  const edited = genome.grossSF && livingSF !== Math.round(genome.grossSF.v);
  const levelsDiverged = facts.levels != null && Math.round(facts.levels) !== Math.round(genome.levels.v);
  const bedsDiverged = genome.beds && facts.beds != null && Math.round(facts.beds) !== Math.round(genome.beds.v);
  const bathsDiverged = genome.baths && facts.baths != null && Math.round(facts.baths) !== Math.round(genome.baths.v);
  const anyDiverged =
    edited || levelsDiverged || bedsDiverged || bathsDiverged || (!!genomePlates(genome) && !facts.plates);

  // Read-only review: the assessor is truth, so a disputed value is SUBMITTED for review.
  const pendingCorrection = useProposedCorrection(addressKey);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [keypad, setKeypad] = useState<
    null | { field: string; label: string; current: number; min: number; max: number; unit?: string }
  >(null);
  const correctable: { field: string; label: string; current: number; min: number; max: number; unit?: string }[] = [];
  if (genome.grossSF) correctable.push({ field: "grossSF", label: "Living area", current: Math.round(genome.grossSF.v), min: 200, max: 20000, unit: "SF" });
  correctable.push({ field: "levels", label: "Levels", current: Math.max(1, Math.round(genome.levels.v)), min: 1, max: 3 });
  if (genome.beds) correctable.push({ field: "beds", label: "Beds", current: Math.round(genome.beds.v), min: 0, max: 12 });
  if (genome.baths) correctable.push({ field: "baths", label: "Baths", current: Math.round(genome.baths.v), min: 1, max: 12 });
  const submitCorrection = (f: { field: string; label: string; current: number; unit?: string }, n: number) => {
    if (!addressKey) return;
    proposeCorrection(addressKey, {
      field: f.field,
      label: f.label,
      current: `${f.current}${f.unit ? " " + f.unit : ""}`,
      proposed: `${n}${f.unit ? " " + f.unit : ""}`,
      proposedAt: new Date().toISOString(),
    });
    setKeypad(null);
    setPickerOpen(false);
  };

  return (
    <View className="rounded-xl p-3 border mb-4" style={{ borderColor: `${VERA}33`, backgroundColor: `${VERA}0A` }}>
      <View className="flex-row items-center gap-2 mb-1">
        <Text style={{ color: VERA }} className="text-[9px] tracking-wider flex-1">
          {ro ? "🦉 YOUR HOME'S RECORD — TAX ASSESSOR (TRUTH)" : "🦉 YOUR HOME'S RECORD — TAP A VALUE TO CHANGE IT"}
        </Text>
        {!ro && anyDiverged ? (
          <Pressable onPress={onReset} className="rounded-lg px-2 py-0.5 border" style={{ borderColor: `${VERA}55` }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: VERA }} className="text-[9px] font-bold">↺ record</Text>
          </Pressable>
        ) : null}
        <Text style={{ color: AMBER }} className="text-[7.5px] tracking-wider border rounded px-1 py-0.5">PUBLIC RECORD</Text>
      </View>

      <Row label="Living area" tag={ro ? genome.grossSF?.src : edited ? "your input — record says " + Math.round(genome.grossSF!.v).toLocaleString() : genome.grossSF?.src}>
        {ro ? (
          <Text className="text-[15px] font-extrabold text-[#F9FAFB]">{livingSF.toLocaleString()}<Text className="text-[#6B7280] text-[10px]"> SF</Text></Text>
        ) : (
          <EditableValue value={livingSF} min={200} max={20000} unit="SF" label="Living area" color={edited ? CDA : "#F9FAFB"} onCommit={(n) => onLivingSF?.(n)} />
        )}
      </Row>

      <Row
        label="Levels"
        tag={ro ? genome.levels.src : levelsDiverged ? `your input — record says ${Math.round(genome.levels.v)}` : facts.plates ? "record massing" : genome.levels.src}
      >
        {ro ? (
          <Text className="text-[12px] font-semibold text-[#E5E7EB]">{levels}</Text>
        ) : (
          <View className="flex-row gap-1.5">
            {[1, 2, 3].map((n) => {
              const on = levels === n;
              const col = on ? (levelsDiverged ? CDA : VERA) : "#6B7280";
              return (
                <Pressable
                  key={n}
                  onPress={() => onLevels?.(n)}
                  className="rounded-lg px-2.5 py-1 border"
                  style={{ borderColor: on ? col : "#374151", backgroundColor: on ? `${col}18` : "transparent" }}
                >
                  <Text style={{ color: col }} className="text-[11px] font-bold">{n}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Row>

      {genome.beds || genome.baths ? (
        <Row
          label="Beds · baths"
          tag={
            bedsDiverged || bathsDiverged
              ? `your input — record says ${genome.beds ? Math.round(genome.beds.v) : "—"} / ${genome.baths ? Math.round(genome.baths.v) : "—"}`
              : genome.beds?.src ?? genome.baths?.src
          }
        >
          <Text style={{ color: !ro && (bedsDiverged || bathsDiverged) ? CDA : "#E5E7EB" }} className="text-[12px] font-semibold">
            {Math.round((ro ? undefined : facts.beds) ?? genome.beds?.v ?? 0)} / {Math.round((ro ? undefined : facts.baths) ?? genome.baths?.v ?? 0)}
          </Text>
        </Row>
      ) : null}

      {genome.finishedBasementSF ? (
        <Row label="Finished basement" tag={genome.finishedBasementSF.src}>
          <Text className="text-[#E5E7EB] text-[12px] font-semibold">{Math.round(genome.finishedBasementSF.v).toLocaleString()} SF</Text>
        </Row>
      ) : null}

      {lotSF ? (
        <Row label="Lot" tag={genome.lotSF!.src}>
          <Text className="text-[#E5E7EB] text-[12px] font-semibold">
            {Math.round(lotSF).toLocaleString()} SF
            <Text className="text-[#6B7280] text-[9px]">  · max footprint {maxFootprintSF(lotSF).toLocaleString()} SF (40% · MODELED)</Text>
          </Text>
        </Row>
      ) : null}

      {genome.yearBuilt || genome.assessedValue ? (
        <View className="flex-row justify-between pt-1.5">
          {genome.yearBuilt ? <Text className="text-[#6B7280] text-[9.5px]">built {genome.yearBuilt.v}</Text> : null}
          {genome.assessedValue ? (
            <Text className="text-[#6B7280] text-[9.5px]">assessed ${Math.round(genome.assessedValue.v).toLocaleString()} (≠ market)</Text>
          ) : null}
        </View>
      ) : null}

      {genome.attributes ? <AttributesBlock a={genome.attributes} /> : null}

      {/* Read-only review: submit a correction rather than silently overriding the assessor. */}
      {ro && addressKey ? (
        <View className="mt-2">
          {pendingCorrection ? (
            <View className="rounded-lg border px-2.5 py-2" style={{ borderColor: `${AMBER}66`, backgroundColor: `${AMBER}14` }}>
              <Text style={{ color: AMBER }} className="text-[9px] tracking-wider mb-1">⏳ CORRECTION IN REVIEW — {pendingCorrection.label}</Text>
              <Text className="text-[#D1D5DB] text-[11px]">
                {pendingCorrection.current} → <Text style={{ color: VERA }} className="font-semibold">{pendingCorrection.proposed}</Text>
              </Text>
              <Pressable onPress={() => clearCorrection(addressKey)} className="self-start rounded-lg px-2 py-1 mt-1.5 border" style={{ borderColor: "#4B5563" }}>
                <Text className="text-[#9CA3AF] text-[10px]">Withdraw</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setPickerOpen(true)} className="rounded-lg border border-dashed px-3 py-2 items-center" style={{ borderColor: `${VERA}55` }}>
              <Text style={{ color: VERA }} className="text-[11px] font-semibold">Propose a correction → review</Text>
            </Pressable>
          )}
          <Text className="text-[#6B7280] text-[8.5px] mt-1">The assessor record is the truth — a correction is reviewed, not applied silently.</Text>
        </View>
      ) : null}

      {/* Which record value is wrong? */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable onPress={() => setPickerOpen(false)} className="flex-1 items-center justify-center px-6" style={{ backgroundColor: "#000000AA" }}>
          <Pressable onPress={() => {}} className="w-full rounded-2xl border p-4" style={{ borderColor: `${VERA}55`, backgroundColor: "#0B1220" }}>
            <Text style={{ color: VERA }} className="text-[10px] tracking-wider mb-2">🦉 WHICH VALUE IS WRONG?</Text>
            {correctable.map((f) => (
              <Pressable
                key={f.field}
                onPress={() => { setPickerOpen(false); setKeypad(f); }}
                className="rounded-lg border px-3 py-2.5 mb-2"
                style={{ borderColor: "#374151" }}
              >
                <Text className="text-[#E5E7EB] text-[12px] font-semibold">
                  {f.label} <Text className="text-[#6B7280] text-[10px]">· record {f.current}{f.unit ? " " + f.unit : ""}</Text>
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setPickerOpen(false)} className="items-center mt-1 py-1"><Text className="text-[#6B7280] text-[11px]">Cancel</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {keypad ? (
        <BlueprintKeypad
          visible
          label={`Correct ${keypad.label}`}
          initial={keypad.current}
          min={keypad.min}
          max={keypad.max}
          {...(keypad.unit ? { unit: keypad.unit } : {})}
          onCommit={(n) => submitCorrection(keypad, n)}
          onClose={() => setKeypad(null)}
        />
      ) : null}
    </View>
  );
}
