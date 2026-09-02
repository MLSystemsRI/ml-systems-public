import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState, useCallback } from "react";
import { analyzeMaterialPhoto, reaperScanPhoto, type MaterialScan } from "@/lib/ai";
import { trpc } from "@/lib/trpc";
import { useMode } from "@/lib/view-mode";
import { CompartmentChrome } from "@/components/compartment-chrome";
import { AppHeader } from "@/components/app-header";
import { InvestorPointer } from "@/components/investor-pointer";
import { AGENT_MINDS } from "@/lib/agents";

// The presiding mind personalizes its own lab: REAPER's ember-orange accent + chrome.
// Resolved by slug (not route) — the "Decon Lab" entry now lands on /deconstruction,
// so /lab is no longer a compartment route; the camera still wears REAPER's chrome.
const REAPER = AGENT_MINDS.find((m) => m.slug === "reaper");
const DECON = REAPER?.color ?? "#F97316";
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";

// Homeowner lens — warm, plain-language recovery framing tied to their equity.
const HOME_PROMPT = `You are ML Systems' Decon Lab, speaking warmly and simply to a HOMEOWNER. Look at this photo of materials in or around their home. In plain, friendly language (no jargon): say what the materials are, and what we can recover and reuse in their rebuild. Add one short line on how recovering materials lowers their rebuild cost and grows their equity faster. Keep it encouraging and scannable, then end with one simple next step.`;

type Phase = "camera" | "review" | "result";

/** Decon Lab — point the camera at a site, capture, and get an on-device material
 *  recovery assessment from Gemini vision. Lens-aware: homeowner gets a warm
 *  "what we can recover for your rebuild" read; custodian gets REAPER's structured
 *  field assessment; investor gets a Single Star Bond pointer. */
export default function DeconLabScreen() {
  const insets = useSafeAreaInsets();
  const { isHome, isInvestor } = useMode();
  // Per-assembly capture — REAPER's project page routes here scoped to one assembly.
  const { assembly } = useLocalSearchParams<{ assembly?: string }>();
  const assemblyName = typeof assembly === "string" && assembly.trim() ? assembly.trim() : null;

  // Lens copy (homeowner vs custodian/operator).
  const L = isHome
    ? { subtitle: "Scan · recover · rebuild", capture: "Scan a material in your home", analyzing: "Seeing what we can recover…", resultLabel: "What we can recover" }
    : { subtitle: "Point · capture · recover", capture: "Capture a material or assembly", analyzing: "Assessing materials & recovery…", resultLabel: "Field Assessment" };

  const Header = <AppHeader mind={REAPER} title="Decon Lab" subtitle={assemblyName ? `Capturing · ${assemblyName}` : L.subtitle} />;
  const rdLink = (
    <TouchableOpacity onPress={() => router.push("/deconstruction")} activeOpacity={0.7} className="self-center mt-3">
      <Text style={{ color: DECON }} className="text-[11px] font-bold">R&D potential products →</Text>
    </TouchableOpacity>
  );

  // The camera scanner is native-only; the public web preview shows a pointer.
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
        {Header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: "#6B7280", fontSize: 12, textAlign: "center", lineHeight: 18 }}>
            The on-site camera material scanner runs in the ML Systems mobile app.
          </Text>
        </View>
      </View>
    );
  }

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [phase, setPhase] = useState<Phase>("camera");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string>("");
  const [scan, setScan] = useState<MaterialScan | null>(null);
  const [error, setError] = useState<string>("");

  // REAPER governance: persist the scan (recovery ledger + itemized materials).
  const ledger = trpc.deconSessions.getMine.useQuery(undefined, { retry: 0 });
  const saveScan = trpc.deconSessions.saveScan.useMutation({ onSuccess: () => ledger.refetch() });
  const saveToLedger = useCallback(() => {
    if (!scan?.materials?.length) return;
    saveScan.mutate({
      scan: {
        recoveryScore: scan.recoveryScore,
        hazmatStop: scan.hazmatStop,
        homeownerSummary: assemblyName ? `[${assemblyName}] ${scan.homeownerSummary ?? ""}`.trim() : scan.homeownerSummary,
        materials: scan.materials.map((m) => ({
          name: m.name,
          species: m.species,
          category: m.category,
          grade: m.grade,
          contamination: m.contamination,
          recoveryPotential: m.recoveryPotential,
          dimensions: m.dimensions,
          separationPath: m.separationPath,
          notes: m.notes,
        })),
      },
    });
  }, [scan, saveScan]);

  const capture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const shot = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4 });
      if (!shot?.base64) {
        setError("Couldn't capture the photo — try again.");
        return;
      }
      setPhotoUri(shot.uri);
      setError("");
      setAnalyzing(true);
      setPhase("result");
      try {
        // REAPER reads it once, structured. Both lenses render the same scan —
        // the operator sees grades and separation paths, the homeowner sees the
        // warm summary REAPER writes alongside them.
        const s = await reaperScanPhoto({ apiKey: GEMINI_KEY }, shot.base64);
        setScan(s);
        // A scan that couldn't be parsed still has the model's text in it; fall
        // back to that rather than showing an empty screen in the field.
        if (!s.materials.length) {
          setResult(
            isHome
              ? await analyzeMaterialPhoto({ apiKey: GEMINI_KEY }, shot.base64, HOME_PROMPT)
              : s.raw ?? "",
          );
        }
      } catch (e: any) {
        setError(e?.message ?? "Analysis failed. Check the Gemini key / connection.");
      } finally {
        setAnalyzing(false);
      }
    } catch (e: any) {
      setError(e?.message ?? "Camera error.");
    }
  }, [isHome]);

  const reset = useCallback(() => {
    setPhotoUri(null);
    setResult("");
    setScan(null);
    setError("");
    setAnalyzing(false);
    setPhase("camera");
  }, []);

  // ── Investor lens — light pointer, not the scanner ──
  if (isInvestor) {
    return (
      <View className="flex-1 bg-[#0A0A0A]">
        {Header}
        <View className="px-4 mt-4 gap-3">
          <Text className="text-[#9CA3AF] text-[13px] leading-5">
            Decon Lab's material recovery (80–90%, 51% resale/reuse) is a core margin driver — recovered
            materials cut build cost on every cycle.
          </Text>
          <InvestorPointer line="Material recovery underwrites the ML Systems margin." />
          {rdLink}
        </View>
        <CompartmentChrome href="/deconstruction" />
      </View>
    );
  }

  // ── Permission gate ──
  if (!permission) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator color={DECON} />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View className="flex-1 bg-[#0A0A0A]">
        {Header}
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Text className="text-[#93a89b] text-sm text-center">
            {isHome
              ? "Scan your home's materials to see what we can recover and reuse in your rebuild."
              : "Decon Lab uses the camera to identify materials and assess recovery on-site."}
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            className="rounded-xl px-6 py-3"
            style={{ backgroundColor: DECON }}
            activeOpacity={0.85}
          >
            <Text className="text-[#06210F] font-bold text-sm">Enable camera</Text>
          </TouchableOpacity>
          {rdLink}
        </View>
      </View>
    );
  }

  // ── Camera ──
  if (phase === "camera") {
    return (
      <View className="flex-1 bg-black">
        {Header}
        <View className="flex-1 mx-4 mb-4 rounded-2xl overflow-hidden">
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        </View>
        {error ? <Text className="text-[#EF4444] text-xs text-center mb-2">{error}</Text> : null}
        <View className="items-center pb-4" style={{ paddingBottom: insets.bottom + 16 }}>
          <TouchableOpacity
            onPress={capture}
            activeOpacity={0.8}
            className="rounded-full items-center justify-center"
            style={{ width: 72, height: 72, backgroundColor: DECON }}
          >
            <View className="rounded-full bg-white" style={{ width: 58, height: 58 }} />
          </TouchableOpacity>
          <Text className="text-[#6B7280] text-[11px] mt-3">{L.capture}</Text>
        </View>
        <CompartmentChrome mind={REAPER} ambient={false} />
      </View>
    );
  }

  // ── Review + Result ──
  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <ScrollView
        className="flex-1"
        style={{ zIndex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {Header}
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={{ width: "92%", aspectRatio: 4 / 3, alignSelf: "center", borderRadius: 16 }}
          />
        ) : null}

        <View className="px-4 mt-4">
          {analyzing ? (
            <View className="flex-row items-center gap-3 bg-[#111111] border border-[#262626] rounded-xl p-4">
              <ActivityIndicator color={DECON} />
              <Text className="text-[#93a89b] text-[13px]">{L.analyzing}</Text>
            </View>
          ) : error ? (
            <Text className="text-[#EF4444] text-[13px]">{error}</Text>
          ) : (
            <>
              {/* REAPER's rule is stop and flag, so a suspected contaminant is a
                  warning across the top — never a bullet buried in a list. Shown
                  in both lenses; a homeowner needs this more than an operator. */}
              {scan?.hazmatStop ? (
                <View
                  className="rounded-xl p-4 mb-3"
                  style={{ backgroundColor: "#EF44441A", borderWidth: 1, borderColor: "#EF444466" }}
                >
                  <Text style={{ color: "#EF4444" }} className="text-[13px] font-bold mb-1">
                    ⚠ Stop — possible hazardous material
                  </Text>
                  <Text className="text-[#F2D5D5] text-[12.5px] leading-snug">
                    {isHome
                      ? "Something here should be tested by a professional before any work starts. Don't disturb it in the meantime."
                      : "Suspected lead, asbestos or mould. Do not disturb. Flag for testing before any separation work."}
                  </Text>
                </View>
              ) : null}

              {/* Homeowner: REAPER's warm summary. Operator: his structured read. */}
              {isHome ? (
                <View className="bg-[#111111] border rounded-xl p-4" style={{ borderColor: `${DECON}33` }}>
                  <Text className="text-[10px] uppercase tracking-wider mb-2" style={{ color: DECON }}>
                    {L.resultLabel}
                  </Text>
                  <Text className="text-[#E8F2EC] text-[13px] leading-relaxed">
                    {scan?.homeownerSummary || result}
                  </Text>
                </View>
              ) : scan?.materials.length ? (
                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-[10px] uppercase tracking-wider" style={{ color: DECON }}>
                      {L.resultLabel}
                    </Text>
                    <Text
                      className="text-[11px] font-bold"
                      style={{ color: scan.recoveryScore < 60 ? "#F59E0B" : DECON }}
                    >
                      {Math.round(scan.recoveryScore)}% recovery
                      {scan.recoveryScore < 60 ? " · LOW" : ""}
                    </Text>
                  </View>
                  {scan.materials.map((m, i) => (
                    <View
                      key={`${m.name}-${i}`}
                      className="bg-[#111111] border rounded-xl p-3.5 mb-2"
                      style={{ borderColor: `${DECON}33` }}
                    >
                      <View className="flex-row items-start justify-between mb-1">
                        <Text className="text-[#F9FAFB] text-[13.5px] font-bold flex-1 pr-2">
                          {m.name}
                          {m.species ? <Text className="text-[#93a89b] font-normal"> · {m.species}</Text> : null}
                        </Text>
                        <View className="flex-row items-center gap-1.5">
                          <Text
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ color: DECON, backgroundColor: `${DECON}1A` }}
                          >
                            {m.grade}
                          </Text>
                          <Text className="text-[10px] text-[#93a89b]">{Math.round(m.recoveryPotential)}%</Text>
                        </View>
                      </View>
                      <Text className="text-[#93a89b] text-[11px] mb-1">
                        {m.category}
                        {m.dimensions ? ` · ${m.dimensions}` : ""}
                        {m.contamination !== "clean" ? ` · ${m.contamination}` : ""}
                      </Text>
                      <Text className="text-[#E8F2EC] text-[12.5px] leading-snug">{m.separationPath}</Text>
                      {m.notes ? (
                        <Text className="text-[#93a89b] text-[11.5px] leading-snug mt-1">{m.notes}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                // Parse failed — show what came back rather than nothing.
                <View className="bg-[#111111] border rounded-xl p-4" style={{ borderColor: `${DECON}33` }}>
                  <Text className="text-[10px] uppercase tracking-wider mb-2" style={{ color: DECON }}>
                    {L.resultLabel}
                  </Text>
                  <Text className="text-[#E8F2EC] text-[13px] leading-relaxed">{result || scan?.raw}</Text>
                </View>
              )}
            </>
          )}

          {/* REAPER governance — operator persists the scan to the recovery ledger */}
          {!isHome && !analyzing && scan?.materials?.length ? (
            <View className="mt-5">
              {/* his orange scythe-weave accent (slash signature) */}
              <View className="mb-2">
                <View style={{ height: 2, backgroundColor: DECON, opacity: 0.9 }} />
                <View style={{ height: 1.5, marginTop: 2, backgroundColor: DECON, opacity: 0.4 }} />
                <View style={{ height: 1, marginTop: 2, backgroundColor: DECON, opacity: 0.15 }} />
              </View>
              <TouchableOpacity
                onPress={saveToLedger}
                disabled={saveScan.isPending}
                className="rounded-xl py-3.5 items-center"
                style={{ backgroundColor: DECON, opacity: saveScan.isPending ? 0.6 : 1 }}
                activeOpacity={0.85}
              >
                <Text className="text-[#06210F] font-bold text-sm">
                  {saveScan.isPending ? "Saving…" : "⤓ Save to the recovery ledger"}
                </Text>
              </TouchableOpacity>
              {saveScan.isError ? (
                <Text className="text-[#EF4444] text-[11px] mt-2 text-center">
                  {String(saveScan.error?.message ?? "").includes("FORBIDDEN")
                    ? "Operator account required to save."
                    : "Couldn't save — try again."}
                </Text>
              ) : saveScan.isSuccess ? (
                <Text style={{ color: DECON }} className="text-[11px] mt-2 text-center">
                  ✓ Saved · {saveScan.data?.materialsCreated ?? 0} materials to the recovery ledger.
                </Text>
              ) : (
                <Text className="text-[#6B7280] text-[10px] mt-2 text-center">
                  {ledger.data?.length ?? 0} scans in REAPER's ledger · itemized to decon.mlsystemsri.com
                </Text>
              )}
            </View>
          ) : null}

          <TouchableOpacity
            onPress={reset}
            className="rounded-xl py-3.5 items-center mt-4 border"
            style={{ borderColor: DECON }}
            activeOpacity={0.85}
          >
            <Text style={{ color: DECON }} className="font-bold text-sm">↺ Capture another</Text>
          </TouchableOpacity>
          {rdLink}
        </View>
      </ScrollView>
      <CompartmentChrome mind={REAPER} />
    </View>
  );
}
