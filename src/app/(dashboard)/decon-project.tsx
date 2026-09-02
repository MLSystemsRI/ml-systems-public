import { View, Text, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useLocalHome } from "@/lib/home-store";
import { useMeasurements, setMeasurement, type Measurements } from "@/lib/measurements-store";
import { reverseTakeoff, reverseTonnage, recomposeAssemblies } from "@ml-systems/types";
import { normalizeAddress } from "@/lib/jspace-facts";
import { useSolarRoof } from "@/lib/solar-geometry";
import { AppHeader } from "@/components/app-header";

/**
 * Decon Lab · Project — the page BEFORE the camera scan. Shows the value-chain home,
 * REAPER's recovery + spec-resolved tonnage, and the reverse assembly stack (foundation →
 * roof) with a "Capture" button per assembly. The homeowner GATHERS what they know — the
 * exact linear feet of exterior + interior walls, roof/floor SF — and those measurements
 * override the modeled geometry, flipping the touched lines to "measured" (heavier numbers).
 */

const DECON = "#F97316";
const usd = (cents: number) => "$" + Math.round(cents / 100).toLocaleString();

/** A compact numeric gather field — type it, or nudge by `step`. */
function Gather({ label, unit, value, step, onChange }: {
  label: string; unit: string; value?: number; step: number; onChange: (n: number | undefined) => void;
}) {
  const v = value ?? 0;
  return (
    <View className="flex-1 rounded-xl px-3 py-2.5 border" style={{ borderColor: "#262626", backgroundColor: "#111111" }}>
      <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider mb-1">{label} <Text className="text-[#4B5563]">{unit}</Text></Text>
      <View className="flex-row items-center gap-1.5">
        <TouchableOpacity onPress={() => onChange(Math.max(0, v - step) || undefined)} className="rounded-lg w-7 h-7 items-center justify-center border" style={{ borderColor: "#374151" }}>
          <Text className="text-[#9CA3AF] text-[14px]">−</Text>
        </TouchableOpacity>
        <TextInput
          value={value != null ? String(value) : ""}
          onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ""), 10); onChange(Number.isFinite(n) && n > 0 ? n : undefined); }}
          placeholder="—"
          placeholderTextColor="#4B5563"
          keyboardType="number-pad"
          className="flex-1 text-center text-[#F9FAFB] text-[15px] font-bold"
        />
        <TouchableOpacity onPress={() => onChange(v + step)} className="rounded-lg w-7 h-7 items-center justify-center" style={{ backgroundColor: `${DECON}22`, borderWidth: 1, borderColor: `${DECON}55` }}>
          <Text style={{ color: DECON }} className="text-[14px]">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DeconProjectScreen() {
  const home = useLocalHome();
  const equity = trpc.equity.getMine.useQuery(undefined, { retry: 0 });
  const project = equity.data?.project ?? null;
  const profile = trpc.deconSessions.getProfileByProject.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id, retry: 0 },
  );
  const address = home?.address ?? project?.property?.addressLine1 ?? undefined;
  const meas = useMeasurements(address);
  const set = (key: keyof Measurements) => (n: number | undefined) => { if (address) setMeasurement(address, key, n); };

  // Reverse takeoff + spec-resolved tonnage, sharpened by the homeowner's measurements
  // and VERA's 3-D roof scan (sensed — beats the model, loses to the tape).
  const solarRoof = useSolarRoof(address ? normalizeAddress(address) : undefined);
  const grossSF = home?.sqft;
  const reverse = grossSF
    ? reverseTakeoff({ grossSF, levels: 1, ...(solarRoof?.sensedPitchDeg ? { roofPitchDeg: solarRoof.sensedPitchDeg } : {}) })
    : null;
  const geo = {
    ...(grossSF ? { grossSF } : {}),
    ...(meas.extWallLF ? { measuredExtWallLF: meas.extWallLF } : {}),
    ...(meas.intWallLF ? { measuredIntWallLF: meas.intWallLF } : {}),
    ...(meas.roofSF ? { measuredRoofSF: meas.roofSF } : {}),
    ...(meas.floorSF ? { measuredFloorSF: meas.floorSF } : {}),
    ...(solarRoof ? { sensedRoofSF: solarRoof.sensedRoofSF, sensedPitchDeg: solarRoof.sensedPitchDeg } : {}),
  };
  const tons = reverseTonnage(reverse, geo);
  // REAPER's pass 2 — MIA's systems read made stageable (sections, not sticks).
  const recompose = recomposeAssemblies(reverse, geo);
  const stageSections = trpc.deconSessions.stageSections.useMutation({
    onSuccess: () => profile.refetch(),
  });

  const p = profile.data;

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <AppHeader href="/decon-project" title="Decon Lab · Project" subtitle="The home in the value chain" />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}>
        {/* The value-chain home. */}
        <View className="rounded-2xl border p-4 mt-2 mb-4" style={{ borderColor: `${DECON}33`, backgroundColor: `${DECON}0D` }}>
          <Text style={{ color: DECON }} className="text-[9.5px] font-mono uppercase tracking-widest mb-1">⛏ Decon Lab</Text>
          {address ? (
            <>
              <Text className="text-[#F9FAFB] text-[15px] font-bold" numberOfLines={1}>{address}</Text>
              <Text className="text-[#6B7280] text-[11px] mt-0.5">
                {project ? `Cycle ${project.cycleNumber} · in the value chain` : "Loaded home · not yet in a project"}
              </Text>
            </>
          ) : (
            <TouchableOpacity onPress={() => router.push("/add-home")}>
              <Text className="text-[#F9FAFB] text-[14px] font-bold">Load your home to begin</Text>
              <Text className="text-[#6B7280] text-[11px] mt-0.5">The Decon Lab needs an address to gather from.</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recovery snapshot. */}
        {p ? (
          <View className="flex-row justify-between mb-4">
            <Snap label="Recovery" value={p.recoveryScore != null ? `${p.recoveryScore}%` : "—"} />
            <Snap label="Materials" value={String(p.materialsCount ?? 0)} />
            <Snap label="Ready for market" value={p.materialsCount ? usd(p.estValueCents ?? 0) : "—"} />
            {/* High-ticket isolation — pre-deploy API responses just lack the field (falsy → hidden). */}
            {p.highTicketCount ? (
              <Snap label="⭐ High-ticket" value={`${usd(p.highTicketValueCents ?? 0)} · ${p.highTicketCount}`} />
            ) : tons ? (
              <Snap label="Spec-resolved" value={`${tons.recoveredTons} t`} />
            ) : null}
          </View>
        ) : tons ? (
          <View className="flex-row justify-between mb-4">
            <Snap label="Spec-resolved" value={`${tons.recoveredTons} t`} />
            <Snap label="On" value={`${grossSF?.toLocaleString()} SF`} />
            <Snap label="Measured" value={`${tons.measuredShare}%`} />
          </View>
        ) : null}

        {/* The data gather — the homeowner's known exact quantities. */}
        {address ? (
          <View className="mb-4">
            <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-1">Do you know the exact numbers?</Text>
            <Text className="text-[#4B5563] text-[10px] mb-2.5">Measured quantities beat the model — they add heavier, exact weight to the estimate{tons ? ` (${tons.measuredShare}% measured so far)` : ""}.</Text>
            <View className="flex-row gap-2 mb-2">
              <Gather label="Exterior wall" unit="LF" value={meas.extWallLF} step={10} onChange={set("extWallLF")} />
              <Gather label="Interior walls" unit="LF" value={meas.intWallLF} step={10} onChange={set("intWallLF")} />
            </View>
            <View className="flex-row gap-2">
              <Gather label="Roof" unit="SF" value={meas.roofSF} step={50} onChange={set("roofSF")} />
              <Gather label="Floor" unit="SF" value={meas.floorSF} step={50} onChange={set("floorSF")} />
            </View>
          </View>
        ) : null}

        {/* Sellable sections — REAPER's pass 2: the members regrouped into their systematic
            function, so MIA sells the wall section in lieu of the loose wood/sheathing/drywall. */}
        {recompose ? (
          <View className="rounded-2xl border p-4 mb-4" style={{ borderColor: "#F5D06044", backgroundColor: "#F5D06008" }}>
            <View className="flex-row items-center mb-1">
              <Text style={{ color: "#F5D060" }} className="text-[10px] font-bold uppercase tracking-wider flex-1">
                ⬒ Sellable sections — MIA's pass 2
              </Text>
              <Text style={{ color: "#F5D060" }} className="text-[11px] font-bold">{usd(recompose.sectionsValueCents)}</Text>
            </View>
            <Text className="text-[#6B7280] text-[10px] mb-2">
              Lifted intact, sold as systems — not sticks. {usd(recompose.partsValueCents)} as parts →{" "}
              {usd(recompose.sectionsValueCents)} as assemblies (embodied labor).
            </Text>
            {recompose.sections.map((s) => (
              <View key={s.kind} className="flex-row justify-between py-0.5">
                <Text className="text-[#E5E7EB] text-[10.5px] flex-1" numberOfLines={1}>
                  {s.count} × {s.label}{s.rated ? ` · ${s.rated}` : ""}{s.measured ? " · measured" : ""}
                </Text>
                <Text style={{ color: "#F5D060" }} className="text-[10.5px] ml-2">{usd(s.sectionValueCentsEach)} ea</Text>
              </View>
            ))}
            {project?.id ? (
              <TouchableOpacity
                onPress={() =>
                  !stageSections.isPending &&
                  stageSections.mutate({
                    projectId: project.id,
                    sections: recompose.sections.map((s) => ({
                      name: s.label,
                      count: s.count,
                      valueCents: s.sectionValueCentsEach,
                      dims: s.dims,
                    })),
                  })
                }
                className="rounded-xl py-2.5 items-center mt-2.5"
                style={{ backgroundColor: "#F5D06018", borderWidth: 1, borderColor: "#F5D06055" }}
              >
                <Text style={{ color: "#F5D060" }} className="text-[11px] font-bold">
                  {stageSections.isPending
                    ? "Staging…"
                    : stageSections.data?.alreadyStaged || stageSections.data?.created
                      ? `✓ ${stageSections.data.total} section lots staged for MIA`
                      : `Stage ${recompose.totalSections} sections for MIA`}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* The assembly stack — capture each one. */}
        {reverse?.lines.length ? (
          <View className="mb-4">
            <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-2">Assemblies · capture on site</Text>
            {reverse.lines.map((l, i) => {
              const first = i === 0 || reverse.lines[i - 1]!.assembly !== l.assembly;
              const rt = tons?.lines.find((x) => x.order === l.order && x.member === l.member);
              return (
                <View key={`${l.member}-${i}`}>
                  {first ? <Text style={{ color: DECON }} className="text-[8px] tracking-wider mt-2 mb-1 uppercase">{l.order} · {l.assembly}</Text> : null}
                  <View className="flex-row items-center justify-between py-1 rounded-lg px-2" style={{ backgroundColor: "#111111" }}>
                    <View className="flex-1 pr-2">
                      <Text className="text-[#E5E7EB] text-[11px]" numberOfLines={1}>{l.member}</Text>
                      <Text className="text-[#6B7280] text-[9px]" numberOfLines={1}>{l.spec}{rt ? ` · ${rt.tons}t${rt.measured ? " · measured" : ""}` : ""}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push(`/lab?assembly=${encodeURIComponent(l.member)}` as never)}
                      className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: `${DECON}1A`, borderWidth: 1, borderColor: `${DECON}55` }}
                    >
                      <Text style={{ color: DECON }} className="text-[10px] font-bold">Capture →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            {tons ? (
              <Text style={{ color: DECON }} className="text-[9px] mt-2">⛏ ~{tons.recoveredTons} t recoverable · {tons.measuredShare}% measured · {tons.statedShare}% stated specs{tons.roofSource === "sensed" ? " · roof from the 3-D scan" : ""}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Ad-hoc capture. */}
        <TouchableOpacity
          onPress={() => router.push("/lab")}
          className="rounded-2xl p-4 flex-row items-center justify-between"
          style={{ backgroundColor: "#111111", borderWidth: 1, borderColor: `${DECON}4D` }}
        >
          <View>
            <Text style={{ color: DECON }} className="text-[10px] font-bold uppercase tracking-wider mb-1">⬡ Camera</Text>
            <Text className="text-[#F9FAFB] text-[14px] font-bold">Capture any material or assembly</Text>
            <Text className="text-[#6B7280] text-[11px] mt-0.5">Camera → material scoring → recovery estimate</Text>
          </View>
          <Text style={{ color: DECON }} className="text-[15px]">→</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Snap({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider">{label}</Text>
      <Text style={{ color: DECON }} className="text-[15px] font-bold mt-0.5">{value}</Text>
    </View>
  );
}
