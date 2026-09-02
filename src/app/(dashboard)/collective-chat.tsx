import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/lib/clerk-shim";
import { streamCollective, type ChatMessage, type StrandPayload, type StrandPhysical, type RecoveryPayload, type BuildPayload, type LoanPayload, type VerifyPayload, type HeartbeatPayload } from "@/lib/ai";
import { trpc } from "@/lib/trpc";
import { useLocalHome, homeContextString } from "@/lib/home-store";
import { useMeasurements } from "@/lib/measurements-store";
import { homeFactsFromLocal } from "@/lib/home-facts";
import { fetchBlueprint } from "@/lib/blueprint";
import { addOutput } from "@/lib/outputs-store";
import { parseChatFacts, mergeFacts, hasBones, normalizeAddress, dedupeAddressKey, type BuilderFacts } from "@/lib/jspace-facts";
import { compressHome, confirmHomeFacts, genomePlates, climateProfile, wallInventoryFromFacts, wallSummary, reverseTakeoff, reverseTonnage, recomposeAssemblies, encodeGenomeParam } from "@ml-systems/types";
import { upsertPlan, getPlan } from "@/lib/plan-store";
import { tileHome, applySwaps } from "@/lib/jspace";
import { rebuildWithSwarm } from "@/lib/plan-swarm";
import { fetchPropertyBones, fetchNeighborhood, type Neighborhood, type PropertyBones } from "@/lib/vera-property";
import { fetchAssessorCard, findAddressCandidates, fetchAssessorCardByPid, type AssessorCard, type StreetCandidate } from "@/lib/vera-assessor";
import { StreetConfirmCard } from "@/components/street-confirm-card";
import { verifyFacts, type AssessorState } from "@/lib/vera-checks";
import { veraCapabilities } from "@/lib/vera-capabilities";
import { fidelityForHome } from "@/lib/plan-fidelity";
import { wallsForHome } from "@/lib/wall-recovery";
import { buildTrace, deepPassStages } from "@/lib/build-trace";
import { useSolarRoof } from "@/lib/solar-geometry";
import { useDeconAnswer } from "@/lib/decon-intent-store";
import { useIntake } from "@/lib/intake-store";
import { VeraIntakeCard } from "@/components/vera-intake-card";
import { buildVcCompression, shouldSyncOntology, openingsFromFacts, siteFromFacts } from "@/lib/vc-ontology-sync";
import { buildClaims } from "@/lib/ledger-claims";
import { roofClassification, computeRoof } from "@/lib/roof-structure";
import { useHomeLedger } from "@/lib/use-home-ledger";
import { veraExtract } from "@/lib/vera-extract";
import { ensureDeepSearch } from "@/lib/auto-deep-search";
import { computeRecovery, type LocalRecovery } from "@/lib/recovery";
import { JSpaceBuilder, type BonesStatus } from "@/components/jspace-builder";
import { AppHeader } from "@/components/app-header";

/**
 * Homeowner chat — "Let's build. Ask me something."
 *
 * The multilayered, multidimensional answer is produced server-side (streamCollective →
 * /api/orchestrate). That orchestration is the IP: the UI shows NO indication of how the answer is
 * assembled — no minds, no agents, no "collective." The only thing surfaced is honest transparency
 * in the **cost of compute** (a small line under each reply). If a person asks in the chat how it
 * works, the model can explain — but the app chrome never advertises it.
 */

type Msg = {
  role: "user" | "assistant";
  content: string;
  /** Total tokens the answer took (the honest gauge — replaces the $ compute line). */
  tokens?: number;
  strand?: StrandPayload;
  // REAPER's j-space recovery takeoff — recovery %, RRR split, salvage value.
  recovery?: RecoveryPayload;
  // MURPHY's j-space build takeoff — schedule bands, milestones, next-cycle SF.
  build?: BuildPayload;
  // PIT LORD's j-space loan-pit takeoff — tier, fee, subsidies, network + live bids.
  loan?: LoanPayload;
  // VERA's verification spine, surfaced subtly: input-gate integrity + the gate score.
  verify?: { input?: VerifyPayload; output?: VerifyPayload };
  veraAvg?: number;
  // The autonomic heartbeat — minds attested against origin before this answer.
  heartbeat?: HeartbeatPayload;
};

/** The Design Studio owns the real drawn plan set (design.mlsystemsri.com pattern from
 *  takeoff-card.tsx / design.tsx). The physical panel links out to it with the home. */
const STUDIO_URL = "https://design.mlsystemsri.com";

export default function HomeownerChatScreen() {
  const { getToken, isSignedIn } = useAuth();
  const home = useLocalHome();
  // REAPER's Decon Lab data gather — the homeowner's measured LF/SF for THIS home.
  const meas = useMeasurements(home?.address);
  // The homeowner's place in the equity loop → the dual panels project the next cycle.
  const equity = trpc.equity.getMine.useQuery(undefined, { retry: 0 });
  const cycle = equity.data?.project?.cycleNumber ?? 1;
  // Out-of-market waitlist — REAPER's Home Recovery Report captures the lead when we
  // don't yet operate in the homeowner's market (persists to the sourcing pipeline).
  const waitlistJoin = trpc.waitlist.join.useMutation();
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  // REAPER's report is dense — collapsed by default so it doesn't take the chat screen.
  const [reaperOpen, setReaperOpen] = useState<Record<number, boolean>>({});

  // The physical panel is numbers; the full drawn plan set lives in the Design Studio.
  // Hit the plan-set API directly with the SAME payload as the Plan Builder — the
  // compressed record + reconciled sketch massing ride the genome — so from CHAT too
  // CDA builds every discipline (Specs/Structural/Architectural/MEP/Civil) on the
  // real reverse-engineered plan, not just the studio home page's archetype guess.
  const openPlanSet = (physical?: StrandPhysical) => {
    const f = builderFacts;
    const q = new URLSearchParams();
    const address = f.address ?? home?.address;
    const beds = f.beds ?? home?.beds;
    const baths = f.baths ?? home?.baths;
    const fpW = f.footprintW ?? physical?.footprintW;
    const fpD = f.footprintD ?? physical?.footprintD;
    const grossSF = f.grossSF ?? physical?.grossSF ?? home?.sqft;
    if (beds != null) q.set("beds", String(beds));
    if (baths != null) q.set("baths", String(baths));
    if (fpW) q.set("w", String(Math.round(fpW)));
    if (fpD) q.set("d", String(Math.round(fpD)));
    if (f.style) q.set("style", f.style);
    if (f.garage === false) q.set("garage", "0");
    if (grossSF) q.set("sqft", String(Math.round(grossSF)));
    if (address) q.set("address", address);
    if (f.genome) {
      q.set(
        "genome",
        encodeGenomeParam({
          ...f.genome,
          ...(f.outline ? { outline: f.outline } : {}),
          ...(f.massing ? { massing: f.massing } : {}),
        }),
      );
    }
    WebBrowser.openBrowserAsync(`${STUDIO_URL}/api/design/plan-set?${q.toString()}`, {
      toolbarColor: "#0A0A0A",
      controlsColor: "#60A5FA",
    });
  };

  const params = useLocalSearchParams<{ q?: string; plan?: string }>();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState(typeof params.q === "string" ? params.q : "");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // ── The J-Space Builder's ONE set of facts — LocalHome → chat text → server STRAND,
  //    latest-wins. The sketch + both strands derive from this single source. ──
  const [builderFacts, setBuilderFacts] = useState<BuilderFacts>({});
  // VERA's 3-D roof scan for this address — sensed geometry for REAPER's takeoff/tonnage.
  const solarRoof = useSolarRoof(builderFacts.address ? normalizeAddress(builderFacts.address) : undefined);
  const [builderBlueprint, setBuilderBlueprint] = useState<{ floorPlanSvg: string; sectionSvg?: string } | null>(null);
  useEffect(() => {
    // VERA-first (Sal 8/11): NO numeric seeds — the j-space starts EMPTY. The loaded
    // home contributes only its ADDRESS (the trigger for VERA's search: bones → tax
    // card → street) + the equity cycle. Every number comes from what VERA finds or
    // what the homeowner explicitly says in chat — never a demo/local leftover.
    setBuilderFacts((f) =>
      mergeFacts(home?.address ? { address: home.address } : undefined, { cycle }, f),
    );
  }, [home, cycle]);

  // ── Saved plans — the thread persists to the Design Studio tab, ONE per address. ──
  // Recall: /collective-chat?plan=<addressKey> re-seeds the builder from the saved plan.
  const recalled = useRef(false);
  useEffect(() => {
    if (recalled.current || typeof params.plan !== "string") return;
    const saved = getPlan(params.plan);
    if (saved) {
      recalled.current = true;
      setBuilderFacts((f) => mergeFacts(f, saved.facts)); // saved plan wins over seeds; live chat still wins after
    }
  }, [params.plan]);
  // Auto-save (debounced): as the j-space grows with an address attached, it IS the plan.
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => {
    const addr = builderFacts.address;
    if (!addr || !hasBones(builderFacts)) return;
    const t = setTimeout(() => {
      const plan = upsertPlan(addr, builderFacts);
      setSavedAt(plan.updatedAt);
    }, 1000);
    return () => clearTimeout(t);
  }, [builderFacts]);

  // ── VERA in the background: an address → the REAL bones from public records. ──
  // One lookup per address (cached in vera-property too); fail-soft to today's flow.
  const [bonesStatus, setBonesStatus] = useState<BonesStatus>("idle");
  // The raw record layers, kept as fetched — mergeFacts dissolves them into the
  // facts; the Custodian's genome compression needs them whole.
  const [bones, setBones] = useState<PropertyBones | null>(null);
  const bonesTried = useRef<Set<string>>(new Set());
  const bonesAddress = builderFacts.address ?? home?.address;
  useEffect(() => {
    if (!bonesAddress) return;
    // Full locality from the loaded home when we have it; a chat address that already
    // carries its own locality (comma or ZIP) goes to the geocoder AS TYPED.
    const chatHasLocality = /,|\b\d{5}\b/.test(bonesAddress);
    const query =
      home?.address === bonesAddress || !builderFacts.address
        ? [home?.address, home?.city, home?.state ?? "RI", home?.zip].filter(Boolean).join(", ")
        : chatHasLocality
          ? bonesAddress
          : `${bonesAddress}, ${home?.city ?? "Rhode Island"}`;
    // Keyed on the RESOLVED query — a fuller address is a new lookup, even after a miss.
    if (bonesTried.current.has(query)) return;
    bonesTried.current.add(query);
    setBonesStatus("fetching");
    void fetchPropertyBones(query).then((bones) => {
      if (!bones) {
        setBonesStatus("miss");
        return;
      }
      setBones(bones);
      setBuilderFacts((f) =>
        mergeFacts(f, {
          footprintW: bones.footprintW,
          footprintD: bones.footprintD,
          outline: bones.outline,
          bonesSource: bones.source,
          // Real area × known levels fills grossSF only when the homeowner hasn't said it.
          grossSF: f.grossSF ?? Math.round(bones.areaSF * Math.max(1, f.levels ?? 1)),
        }),
      );
      setBonesStatus("found");
      // The address is real — PI fires the FULL collection (street/solar/lot + FEMA/
      // census/RIGIS + the sketch), and the master ledger live-compiles as it lands.
      ensureDeepSearch(bonesAddress);
      // The homes next door ride along — VERA's street-conformity read (fail-soft).
      void fetchNeighborhood(query, { lat: bones.lat, lon: bones.lon }).then((h) => setNeighborhood(h));
    });
  }, [bonesAddress, home, builderFacts.address]);

  // ── VERA layer 2: the assessor's property card — the facts the listing sites mirror.
  // Town from the loaded home's city (or the chat address's locality). Fail-soft; the
  // card's REAL beds/baths/stories/living-area fold in and CDA re-tiles the interior.
  const [assessor, setAssessor] = useState<AssessorState>({ status: "idle" });
  // VERA's "did you mean?" — populated when the address as typed misses but the town
  // lists a near-match (nonstandard suffix / small typo). Cleared once the homeowner picks.
  const [addrCandidates, setAddrCandidates] = useState<{ town: string; list: StreetCandidate[] } | null>(null);
  const cardTried = useRef<Set<string>>(new Set());
  const foldCard = (card: AssessorCard) => {
    setAssessor({ status: "found", card });
    setBuilderFacts((f) =>
      mergeFacts(f, {
        beds: card.beds,
        baths: card.baths,
        levels: card.stories,
        grossSF: card.livingAreaSF,
        style: card.style?.toLowerCase(),
        assessedValue: card.assessedValue,
        yearBuilt: card.yearBuilt,
        attributesSource: card.source,
      }),
    );
  };
  useEffect(() => {
    const addr = builderFacts.address ?? home?.address;
    if (!addr) return;
    // Town from the loaded home, else the geocode (addressdetails), else the typed
    // string itself — comma-delimited OR the no-comma tail between the street suffix
    // and the state token ("…terr North Kingstown ri"). A trailing state token is
    // stripped so ", north kingstown ri" doesn't feed "north kingstown ri" to VGSI.
    // NO Warwick fallback (Sal 9/1): with no town resolved we DEFER — the geocode
    // lands bones.city and this effect re-fires (bones is a dep; the tried-guard is
    // keyed addr|town, so the correct-town retry is never swallowed).
    const stripState = (t: string | undefined): string | undefined =>
      t?.replace(/\s*,?\s*(?:RI|R\.I\.|Rhode\s+Island)\.?\s*$/i, "").trim() || undefined;
    const commaTown = stripState(/,\s*([A-Za-z ]{3,25})(?:,|$)/.exec(addr)?.[1]?.trim());
    const tailTown = stripState(
      /\b(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|way|boulevard|blvd|circle|cir|terrace|terr|ter|place|pl|square|sq|trail|trl|highway|hwy|parkway|pkwy)\.?\s+([A-Za-z][A-Za-z ]{2,25}?)\s*,?\s*(?:RI|R\.I\.|Rhode\s+Island)\b/i.exec(addr)?.[1]?.trim(),
    );
    const town = home?.city ?? bones?.city ?? commaTown ?? tailTown;
    if (!town) return; // defer until the geocode names the town — never guess Warwick
    const key = `${addr}|${town}`.toLowerCase();
    if (cardTried.current.has(key)) return;
    cardTried.current.add(key);
    setAssessor({ status: "fetching" });
    void fetchAssessorCard(addr, town).then((card: AssessorCard | null) => {
      if (!card) {
        setAssessor({ status: "miss", card: null });
        // The address as typed isn't on the rolls — offer the town's near-matches.
        void findAddressCandidates(addr, town).then((list) => {
          if (list.length) setAddrCandidates({ town, list });
        });
        return;
      }
      foldCard(card);
      // Tax card on the rolls = the address is real — PI fires the full collection.
      ensureDeepSearch(addr);
    });
  }, [builderFacts.address, home, bones]);

  // The homeowner picked a "did you mean?" candidate — pull that exact parcel and adopt
  // its canonical address so every downstream lookup uses the town's spelling.
  const onPickCandidate = (c: StreetCandidate) => {
    const town = addrCandidates?.town;
    setAddrCandidates(null);
    setAssessor({ status: "fetching" });
    void fetchAssessorCardByPid(c.pid, town).then((card) => {
      if (!card) {
        setAssessor({ status: "miss", card: null });
        return;
      }
      foldCard(card);
      // Adopt the canonical address (won't re-trigger candidates; it resolves directly).
      const canonical = town ? `${c.label}, ${town}` : c.label;
      setBuilderFacts((f) => mergeFacts(f, { address: canonical }));
      ensureDeepSearch(canonical);
    });
  };

  // ── The Custodian compresses the record the moment either layer lands: the genome
  //    survives the merges, powers VERA's fidelity score, and rides with the plan. ──
  useEffect(() => {
    const card = assessor.card ?? null;
    if (!bones && !card) return;
    setBuilderFacts((f) => {
      const genome = compressHome({
        bones,
        card,
        homeowner: f,
        address: f.address ?? home?.address,
        cycle: f.cycle,
      });
      if (!genome) return f;
      // VERA's reconciled corrections flow back into the facts — the sketch tiles
      // the TRUE house (bounding-box depth re-derived, basement level counted) —
      // and the record's plates carry the real massing (garage DOWN).
      const plates = genomePlates(genome);
      return mergeFacts(f, {
        genome,
        ...(plates ? { plates } : {}),
        ...(genome.footprintD?.src === "reconciled"
          ? { footprintW: genome.footprintW?.v, footprintD: genome.footprintD.v }
          : {}),
        ...(genome.levels.src === "reconciled" ? { levels: genome.levels.v } : {}),
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bones, assessor.card]);

  // Stage-1 field verifications — recomputed as record layers land (pure).
  const confirmation = useMemo(
    () => (bones || assessor.card ? confirmHomeFacts({ bones, card: assessor.card ?? null }) : null),
    [bones, assessor.card],
  );

  // ── The minds' dimensions: VERA verifies continuously; REAPER joins on decon talk. ──
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const veraChecks = useMemo(
    () => (hasBones(builderFacts) ? verifyFacts(builderFacts, bonesStatus, neighborhood, assessor) : []),
    [builderFacts, bonesStatus, neighborhood, assessor],
  );
  // The foundation, rebuilt: VERA tiles the sketch-massing footprint, then CDA's
  // cost-effective swarm rebuilds the interior (0¢, deterministic). Every downstream
  // consumer (fidelity, walls, trace) reads THIS so the numbers match the drawn plan.
  const chatFoundation = useMemo(() => rebuildWithSwarm(tileHome(builderFacts)), [builderFacts]);
  // VERA's plan-vs-record fidelity — CDA's tiled output scored against the genome.
  const fidelity = useMemo(
    () =>
      builderFacts.genome && hasBones(builderFacts)
        ? fidelityForHome(applySwaps(chatFoundation.home, builderFacts.swaps), builderFacts.genome)
        : null,
    [builderFacts, chatFoundation],
  );
  // VERA's capability checklist — her isolated surface (tap the emerald strip).
  const capabilities = useMemo(
    () =>
      veraCapabilities(
        builderFacts,
        bonesStatus,
        assessor,
        !!neighborhood,
        fidelity ? fidelity.independentScore ?? fidelity.score : undefined,
      ),
    [builderFacts, bonesStatus, assessor, neighborhood, fidelity],
  );
  // The home's town — home.city, else the address locality (no default: an unknown
  // town must read as "no location" so marketStatus doesn't falsely mark it served).
  const resolveTown = useCallback((): string | undefined => {
    const addr = builderFacts.address ?? home?.address;
    return home?.city ?? /,\s*([A-Za-z ]{3,25})(?:,|$)/.exec(addr ?? "")?.[1]?.trim() ?? undefined;
  }, [builderFacts.address, home]);

  // Persist the homeowner onto the recovery-report waitlist (out-of-market). Uses the
  // report's own numbers as the lead snapshot; idempotent server-side.
  const joinWaitlist = useCallback(
    (rec: RecoveryPayload) => {
      const addressLine1 = builderFacts.address ?? home?.address;
      const city = home?.city ?? resolveTown();
      const state = home?.state ?? rec.market?.code ?? undefined;
      if (!addressLine1 || !city || !state) return;
      waitlistJoin.mutate(
        {
          addressLine1,
          city,
          state,
          ...(home?.zip ? { zip: home.zip } : {}),
          recoveryScore: rec.recoveryScore,
          estSalvageValue: rec.estSalvageValue,
          ...(rec.landfillDivertedTons != null ? { landfillDivertedTons: rec.landfillDivertedTons } : {}),
          ...(rec.carbonAvoidedTons != null ? { carbonAvoidedTons: rec.carbonAvoidedTons } : {}),
          ...(rec.climate?.zone ? { climateZone: rec.climate.zone } : {}),
        },
        { onSuccess: () => setWaitlistJoined(true) },
      );
    },
    [builderFacts.address, home, resolveTown, waitlistJoin],
  );

  const [serverRecovery, setServerRecovery] = useState<LocalRecovery | null>(null);
  // REAPER joins as the home takes shape — his salvage takeoff computes the moment there's
  // geometry to stand on (VERA's records or a spoken size), not only on decon intent.
  const recovery = useMemo(
    () =>
      hasBones(builderFacts) || builderFacts.grossSF
        ? serverRecovery ??
          computeRecovery({ ...builderFacts, town: resolveTown(), ...(home?.state ? { state: home.state } : {}) })
        : null,
    [builderFacts, serverRecovery, resolveTown, home],
  );
  // REAPER's wall-resolved envelope takeoff — every wall classified, weighed, routed
  // (partitions → envelope → bearing, shored last). CDA reads the same segments as layout
  // truth in the deep plan. Computes as soon as the plan tiles (no decon intent needed).
  const walls = useMemo(
    () =>
      hasBones(builderFacts)
        ? wallsForHome(applySwaps(chatFoundation.home, builderFacts.swaps))
        : null,
    [builderFacts],
  );

  // The reverse takeoff — VERA's record reverse-engineered into the assembly stack, in
  // construction order (foundation → roof), so CDA can reverse the plans. Member sizes
  // come from the code era + span; the homeowner's stated specs (facts.stated*) win.
  const reverse = useMemo(() => {
    const g = builderFacts.genome;
    const a = g?.attributes;
    const grossSF = builderFacts.grossSF ?? g?.grossSF?.v;
    const enclosed = g?.enclosedSF?.v;
    const basementSF = enclosed && grossSF && enclosed > grossSF ? enclosed - grossSF : undefined;
    return reverseTakeoff({
      archetype: g?.archetype?.v ?? builderFacts.style,
      levels: builderFacts.levels ?? g?.levels?.v,
      footprintW: builderFacts.footprintW ?? g?.footprintW?.v,
      footprintD: builderFacts.footprintD ?? g?.footprintD?.v,
      ...(grossSF ? { grossSF } : {}),
      yearBuilt: g?.yearBuilt?.v ?? builderFacts.yearBuilt,
      ...(basementSF ? { basementSF } : {}),
      finishedBasementSF: g?.finishedBasementSF?.v,
      exteriorWall: a?.exteriorWall,
      roofCover: a?.roofCover,
      interiorWall: a?.interiorWall,
      // The card's mechanical facts ground the expanded Mechanical assembly.
      heatFuel: a?.heatFuel,
      heatType: a?.heatType,
      acType: a?.acType,
      fireplaces: a?.fireplaces,
      // VERA's 3-D roof scan (Google Solar) — the measured pitch cites in the roof basis.
      ...(solarRoof?.sensedPitchDeg ? { roofPitchDeg: solarRoof.sensedPitchDeg } : {}),
      stated: {
        foundation: builderFacts.statedFoundation,
        joist: builderFacts.statedJoist,
        studs: builderFacts.statedStuds,
        extSheathing: builderFacts.statedExtSheathing,
        roofSheathing: builderFacts.statedRoofSheathing,
        subfloor: builderFacts.statedSubfloor,
        drywall: builderFacts.statedDrywall,
        windows: builderFacts.statedWindows,
        insulation: builderFacts.statedInsulation,
        heating: builderFacts.statedHeating,
        girder: builderFacts.statedGirder,
        girderSpec: builderFacts.statedGirderSpec,
        garageBeam: builderFacts.statedGarageBeam,
      },
    });
  }, [builderFacts, solarRoof]);

  // REAPER's spec-resolved tonnage — the reverse takeoff's real member sizes turned into
  // weight (sharper than the per-SF estimate; grows as VERA/homeowner/custodian fill specs).
  const reverseTons = useMemo(() => {
    const g = builderFacts.genome;
    const grossSF = builderFacts.grossSF ?? g?.grossSF?.v;
    return reverseTonnage(reverse, {
      footprintW: builderFacts.footprintW ?? g?.footprintW?.v,
      footprintD: builderFacts.footprintD ?? g?.footprintD?.v,
      levels: builderFacts.levels ?? g?.levels?.v,
      ...(grossSF ? { grossSF } : {}),
      // Homeowner MEASUREMENTS (Decon Lab gather) override the modeled geometry — exact numbers.
      ...(meas.extWallLF ? { measuredExtWallLF: meas.extWallLF } : {}),
      ...(meas.intWallLF ? { measuredIntWallLF: meas.intWallLF } : {}),
      ...(meas.roofSF ? { measuredRoofSF: meas.roofSF } : {}),
      ...(meas.floorSF ? { measuredFloorSF: meas.floorSF } : {}),
      // SENSED roof (VERA's 3-D scan) — beats the model, loses to the homeowner's tape.
      ...(solarRoof ? { sensedRoofSF: solarRoof.sensedRoofSF, sensedPitchDeg: solarRoof.sensedPitchDeg } : {}),
    });
  }, [reverse, builderFacts, meas, solarRoof]);

  // REAPER's pass-2 manifest — MIA's systems read made stageable (walls ride the SAME wall
  // inventory the trace shows; floors + roof extend it; measured lengths set the counts).
  const recompose = useMemo(() => {
    const g = builderFacts.genome;
    const grossSF = builderFacts.grossSF ?? g?.grossSF?.v;
    return recomposeAssemblies(
      reverse,
      {
        footprintW: builderFacts.footprintW ?? g?.footprintW?.v,
        footprintD: builderFacts.footprintD ?? g?.footprintD?.v,
        levels: builderFacts.levels ?? g?.levels?.v,
        ...(grossSF ? { grossSF } : {}),
        ...(meas.extWallLF ? { measuredExtWallLF: meas.extWallLF } : {}),
        ...(meas.intWallLF ? { measuredIntWallLF: meas.intWallLF } : {}),
        ...(meas.roofSF ? { measuredRoofSF: meas.roofSF } : {}),
        ...(meas.floorSF ? { measuredFloorSF: meas.floorSF } : {}),
        ...(solarRoof ? { sensedRoofSF: solarRoof.sensedRoofSF, sensedPitchDeg: solarRoof.sensedPitchDeg } : {}),
      },
      walls,
    );
  }, [reverse, builderFacts, meas, walls, solarRoof]);

  // The build logic, stage by stage — grounded in the reverse takeoff + measured tonnage
  // (MURPHY's rebuild sequence rests on the real members REAPER pulls). Defined after
  // reverse/reverseTons so it can consume them. PIT LORD's finance stage gates on the
  // homeowner's decon answer (Hub/portfolio gate).
  const chatDeconAnswer = useDeconAnswer(builderFacts.address);
  // VERA's intake gate — with an address on the table, every turn runs in the
  // INTAKE stage (server holds financing) until the homeowner confirms her record.
  const chatAddress = builderFacts.address ?? home?.address;
  const intake = useIntake(chatAddress);
  const trace = useMemo(
    () =>
      hasBones(builderFacts)
        ? buildTrace({
            facts: builderFacts,
            tiled: applySwaps(chatFoundation.home, builderFacts.swaps),
            confirmation,
            fidelity,
            walls,
            reverse,
            reverseTons,
            recompose,
            deconAnswer: chatDeconAnswer,
          })
        : null,
    [builderFacts, confirmation, fidelity, walls, reverse, reverseTons, chatDeconAnswer],
  );
  // ── Top-down ledger origin — the collective chat MAKES the value-chain entry.
  // When the homeowner signs VERA's record (intake confirmed) and has no project yet,
  // create it from the VERA-resolved locality (geocode city/state/zip). projects.create
  // fans out the entry to every app (DS · LP · DL · Builders Collective · BOH ·
  // Construction). The server's one-entry rule is respected silently — an unverified
  // existing entry throws PRECONDITION_FAILED, caught here fail-soft (we just keep
  // planning). Attempted once per address.
  const mineQ = trpc.equity.getMine.useQuery(undefined, { enabled: !!isSignedIn, retry: 0 });
  const createProject = trpc.projects.create.useMutation({
    onError: () => {},
    onSuccess: () => void mineQ.refetch(),
  });
  const ledgerTried = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!intake.confirmed || !isSignedIn || !chatAddress || mineQ.data?.project) return;
    const city = bones?.city ?? home?.city;
    const state = bones?.state ?? home?.state ?? "RI";
    const zip = bones?.zip ?? home?.zip;
    if (!city || !zip || zip.length < 5) return; // need a real locality to seed the ledger
    const key = normalizeAddress(chatAddress);
    if (ledgerTried.current.has(key)) return;
    ledgerTried.current.add(key);
    const houseStreet = /^([^,]+)/.exec(chatAddress)?.[1]?.trim() ?? chatAddress;
    createProject.mutate({
      addressLine1: houseStreet,
      city,
      state,
      zip,
      ...(builderFacts.genome?.assessedValue?.v ? { currentAssessedValue: Math.round(builderFacts.genome.assessedValue.v * 100) } : {}), // genome = dollars; API = cents
      ...(builderFacts.genome?.archetype?.v ? { buildingType: String(builderFacts.genome.archetype.v) } : {}),
      ...(builderFacts.genome?.yearBuilt?.v ? { yearBuilt: Math.round(builderFacts.genome.yearBuilt.v) } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intake.confirmed, isSignedIn, chatAddress, bones, mineQ.data]);

  // ── The Custodian's ontological compression — the moment the homeowner signs
  // VERA's record (intake confirmed), THIS home's value chain compresses into the
  // ontology grammar and persists to the record (vc.compress → vc_ontology, one
  // row per property+cycle). Re-fires only when the compression GROWS. Fail-soft.
  // The compile is SHARED (lib/use-home-ledger.ts), not repeated here. This screen used
  // to build its own compression from `builderFacts` — facts that had never been merged
  // with VERA's deep-search findings — so `roofClassification` saw no roof planes and no
  // ground datum and fell back to `levels × 9`. It then persisted that modeled height over
  // the Portfolio's sensed one, and the home's height flipped depending on which screen
  // synced last. One hook, one merge, one ledger: it no longer matters who saves.
  const ledger = useHomeLedger({
    address: chatAddress,
    savedFacts: builderFacts,
    hasSavedPlan: intake.confirmed === true && hasBones(builderFacts),
    ...(chatDeconAnswer ? { deconAnswer: chatDeconAnswer } : {}),
  });
  // The general ledger's readable top — VERA's extraction rows (address, footprint, height,
  // roof, elevations), each carrying its source. Same derivation the Portfolio uses, so the
  // inline ledger in the J-Space and the full Portfolio ledger show the identical spine.
  const ledgerRows = useMemo(
    () =>
      veraExtract({
        facts: ledger.facts,
        roof: computeRoof(ledger.facts),
        planes: ledger.artifacts.roof?.planes ?? [],
        genome: ledger.facts.genome,
      }),
    [ledger.facts, ledger.artifacts.roof],
  );
  // Financing only opens once the record is signed AND the homeowner is ready to build —
  // the same gate the server uses to open PIT LORD's pit. Frames his ledger sub-line.
  const financingOpen = intake.confirmed === true && chatDeconAnswer === "yes";

  // Layer 2 — the minds' deep read (second pass). Same input as the trace; it flows
  // into the Deep Pass card above the owl's sources (the merged Layer 2).
  const deepPass = useMemo(
    () =>
      hasBones(builderFacts)
        ? deepPassStages({
            facts: builderFacts,
            tiled: applySwaps(chatFoundation.home, builderFacts.swaps),
            confirmation,
            fidelity,
            walls,
            reverse,
            reverseTons,
            recompose,
            deconAnswer: chatDeconAnswer,
          })
        : null,
    [builderFacts, confirmation, fidelity, walls, reverse, reverseTons, recompose, chatDeconAnswer],
  );

  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40);

  const patchLast = (fn: (m: Msg) => Msg) =>
    setMessages((prev) => {
      const u = [...prev];
      const last = u[u.length - 1];
      if (last?.role === "assistant") u[u.length - 1] = fn(last);
      return u;
    });

  const send = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || loading) return;
      // The j-space reacts the moment the homeowner speaks — facts parsed from the
      // message fold in NOW, before the collective answers (the render starts forming).
      const spoken = parseChatFacts(content);
      if (Object.keys(spoken).length) {
        setBuilderFacts((f) => {
          // A NEW ADDRESS = a NEW HOME = a FRESH J-SPACE. mergeFacts is latest-wins
          // and never clears, so without this the old home's outline/genome/plates
          // would ride under the new address (and corrupt its saved plan). The old
          // plan is already auto-saved; VERA's search re-runs for the new address and
          // the per-address intake store re-locks financing until it's confirmed.
          if (
            spoken.address &&
            f.address &&
            dedupeAddressKey(spoken.address) !== dedupeAddressKey(f.address)
          ) {
            setBones(null);
            setBonesStatus("idle");
            setAssessor({ status: "idle" });
            return mergeFacts({ cycle: f.cycle }, spoken);
          }
          return mergeFacts(f, spoken);
        });
      }
      const history: Msg[] = [...messages, { role: "user", content }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setInput("");
      setLoading(true);
      scrollToEnd();

      const apiMessages: ChatMessage[] = history.map((m) => ({ role: m.role, content: m.content }));
      let answer = "";
      const veraScores: number[] = [];

      // ── Silent merge: the customized plan rides into the request invisibly. The
      // builder's geometry (Plan Builder edits + chat + strand) overlays the local
      // home's facts, and one plan line grounds the prose — PI answers on the
      // homeowner's ACTUAL current plan with zero chat noise. ──
      const mergedFacts = (() => {
        const f = { ...(homeFactsFromLocal(home, cycle) ?? {}) };
        if (builderFacts.grossSF) f.grossSF = Math.round(builderFacts.grossSF);
        if (builderFacts.footprintW) f.footprintW = builderFacts.footprintW;
        if (builderFacts.footprintD) f.footprintD = builderFacts.footprintD;
        if (builderFacts.levels) f.levels = builderFacts.levels;
        if (builderFacts.cycle) f.cycle = builderFacts.cycle;
        // Location gates REAPER's decon go-ahead on the server; fall back to the parsed
        // address locality when there's no loaded home (mirrors the assessor lookup).
        const town = resolveTown();
        if (!f.town && town) f.town = town;
        if (!f.state && home?.state) f.state = home.state;
        return Object.keys(f).length ? f : undefined;
      })();
      // The ONE square footage everything shows — the record SF (assessor living area =
      // genome.grossSF), the SAME number the J-Space header + record panel display. Passing
      // it here (and overriding the local home's sqft below) stops PI quoting a stale figure.
      const recordSF = builderFacts.genome?.grossSF?.v ?? builderFacts.grossSF;
      const planLine = hasBones(builderFacts)
        ? `Their current plan: ${[
            recordSF ? `${Math.round(recordSF).toLocaleString()} SF` : null,
            builderFacts.beds != null ? `${builderFacts.beds}bd` : null,
            builderFacts.baths != null ? `${builderFacts.baths}ba` : null,
            builderFacts.style,
            builderFacts.footprintW && builderFacts.footprintD ? `${builderFacts.footprintW}×${builderFacts.footprintD} ft` : null,
            builderFacts.garage === false ? "no garage" : builderFacts.garage ? "garage" : null,
            builderFacts.office ? "office" : null,
          ]
            .filter(Boolean)
            .join(" · ")}.`
        : undefined;
      // Align the loaded-home context to the record SF so both prose sources agree.
      const homeForContext = home ? { ...home, ...(recordSF ? { sqft: Math.round(recordSF) } : {}) } : undefined;
      const context = [homeForContext ? homeContextString(homeForContext) : undefined, planLine].filter(Boolean).join("\n") || undefined;

      await streamCollective(
        apiMessages,
        () => getToken(),
        {
          onToken: (t) => {
            answer += t;
            patchLast((m) => ({ ...m, content: m.content + t }));
            scrollToEnd();
          },
          // Transparency: tokens, not dollars (the token-compression gauge).
          onTokens: (n) => patchLast((m) => ({ ...m, tokens: n })),
          // The collective's STRAND refines the builder's one set of facts.
          onStrand: (s) => {
            patchLast((m) => ({ ...m, strand: s }));
            const phys = s.physical;
            setBuilderFacts((f) =>
              mergeFacts(f, {
                grossSF: phys?.grossSF,
                footprintW: phys?.footprintW,
                footprintD: phys?.footprintD,
                levels: phys?.levels,
                cycle: s.cycle ?? phys?.cycle,
              }),
            );
            // The studio's drawn sheet refines the sketch when reachable (fail-soft).
            if (phys && home) {
              fetchBlueprint({
                beds: home.beds,
                baths: home.baths,
                grossSF: phys.grossSF,
                footprintW: phys.footprintW,
                footprintD: phys.footprintD,
              }).then((bp) => {
                if (bp) setBuilderBlueprint({ floorPlanSvg: bp.floorPlanSvg, ...(bp.sectionSvg ? { sectionSvg: bp.sectionSvg } : {}) });
              });
            }
          },
          // REAPER's j-space recovery takeoff — his live decon contribution. The
          // server's numbers refine the builder's on-device strip (server wins) and
          // decon talk that reached the collective marks the intent dimension active.
          onRecovery: (r) => {
            patchLast((m) => ({ ...m, recovery: r }));
            setBuilderFacts((f) => (f.deconIntent ? f : { ...f, deconIntent: true }));
            // Wall breakdown: the server's when it carries one; else the local
            // estimator on the same gross SF (offline parity, older servers).
            const fallbackWalls = r.walls ? null : wallSummary(wallInventoryFromFacts({ grossSF: r.grossSF, levels: 1 }));
            setServerRecovery({
              grossSF: r.grossSF,
              recoveryScore: r.recoveryScore,
              estSalvageValue: r.estSalvageValue,
              rrr: r.rrr,
              topLines: [...r.lines]
                .sort((a, b) => b.salvageValue - a.salvageValue)
                .slice(0, 2)
                .map((l) => ({ assembly: l.assembly, material: l.material, disposition: l.disposition as "reuse" | "resale" | "recycle", salvageValue: l.salvageValue })),
              landfillDivertedTons: r.landfillDivertedTons ?? 0,
              carbonAvoidedTons: r.carbonAvoidedTons ?? 0,
              // Wire payloads' code/zone are plain strings; at runtime they match the enums.
              climate: (r.climate ?? climateProfile(home?.state)) as LocalRecovery["climate"],
              walls: (r.walls ?? fallbackWalls ?? []) as LocalRecovery["walls"],
              wallTons:
                r.wallTons ?? Math.round((fallbackWalls ?? []).reduce((n, l) => n + l.tons, 0) * 100) / 100,
              market: (r.market ?? { served: true, code: null, name: null }) as LocalRecovery["market"],
              modeled: true,
            });
          },
          // MURPHY's j-space build takeoff — his live construction contribution.
          onBuild: (b) => patchLast((m) => ({ ...m, build: b })),
          // PIT LORD's j-space loan-pit takeoff — his live finance contribution.
          onLoan: (l) => patchLast((m) => ({ ...m, loan: l })),
          // VERA's verification spine — running gate average + the input/output verdicts.
          onPerspective: (p) => {
            veraScores.push(p.veraScore);
            const avg = Math.round(veraScores.reduce((a, b) => a + b, 0) / veraScores.length);
            patchLast((m) => ({ ...m, veraAvg: avg }));
          },
          onVerify: (v) =>
            patchLast((m) => ({ ...m, verify: { ...m.verify, [v.stage]: v } })),
          // The autonomic heartbeat — the server minds' pre-cognition attestation.
          onHeartbeat: (hb) => patchLast((m) => ({ ...m, heartbeat: hb })),
          onError: (e) => patchLast((m) => (m.content ? m : { ...m, content: `⚠ ${e}` })),
          onDone: () => {
            setLoading(false);
            scrollToEnd();
            // The Hub is the ultimate output — capture every substantive answer.
            const a = answer.trim();
            if (a.length >= 40) addOutput({ question: content, answer: a });
          },
        },
        // The homeowner's loaded home + customized plan → real figures + grounding.
        mergedFacts,
        context,
        // Pacing: intake until the homeowner confirms VERA's record; then confirmed.
        chatAddress ? (intake.confirmed ? "confirmed" : "intake") : undefined,
        // Decon intent — spoken decon words (this message included) or the decon-gate
        // "yes". Financing only opens server-side once confirmed AND intent is real.
        builderFacts.deconIntent === true || spoken.deconIntent === true || chatDeconAnswer === "yes",
      );
    },
    [input, loading, messages, getToken, home, cycle, builderFacts, chatAddress, intake.confirmed, chatDeconAnswer],
  );

  const canSend = !loading && !!input.trim();

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <AppHeader href="/" title="Let's build" subtitle="Ask me something." hideToggle />

      {/* "padding" on BOTH platforms — Android edge-to-edge ignores adjustResize, so
          without it the keyboard covers the input bar. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {/* The Value Chain · J-Space Builder — ONE unit: the render + both strands,
            forming live as the homeowner discusses the home. */}
        <JSpaceBuilder
          facts={builderFacts}
          blueprint={builderBlueprint}
          bonesStatus={bonesStatus}
          saved={!!savedAt}
          veraChecks={veraChecks}
          capabilities={capabilities}
          fidelity={fidelity}
          confirmation={confirmation}
          recovery={recovery}
          walls={walls}
          trace={trace}
          deepPass={deepPass}
          ledgerExtract={ledgerRows}
          ledgerView={ledger.view}
          ledgerAddress={chatAddress ?? undefined}
          financingOpen={financingOpen}
          onCycleChange={(c) => setBuilderFacts((f) => ({ ...f, cycle: c }))}
          onViewPlan={home ? () => openPlanSet(undefined) : undefined}
          onCustomize={() => {
            const addr = builderFacts.address ?? home?.address;
            router.push(
              (addr
                ? `/plan-builder?plan=${encodeURIComponent(normalizeAddress(addr))}`
                : "/plan-builder") as never,
            );
          }}
        />
        <ScrollView ref={scrollRef} className="flex-1" contentContainerStyle={{ padding: 18, gap: 18 }} keyboardShouldPersistTaps="handled">
          {messages.length === 0 ? (
            <View className="pt-4 gap-2">
              <Text className="text-[#F9FAFB] text-xl font-extrabold">Let's build. Start with your home.</Text>
              <Text className="text-[#6B7280] text-[13px] leading-5">
                I'm PI — I'll be your guide the whole way. Tell me the <Text style={{ color: "#86EFAC" }}>address</Text> of
                the home you're putting into the value chain, and I'll pull its record and take it from there.
              </Text>
              {/* The Value Chain General Ledger — what compiling that home builds toward, in
                  plain words. Selecting the home comes first; the ledger is the result. */}
              <View className="mt-3 rounded-2xl px-3.5 py-3 border" style={{ backgroundColor: "rgba(20,184,166,0.06)", borderColor: "rgba(20,184,166,0.28)" }}>
                <Text style={{ color: "#F5D060" }} className="text-[10px] font-bold uppercase tracking-widest mb-1">⚖ Your Value Chain General Ledger</Text>
                <Text className="text-[#D1D5DB] text-[12px] leading-5">
                  From your address I compile one verified record of your home — checked by us and by you.
                  The more of it we verify together, the less your build costs.
                </Text>
              </View>
              {/* The one instruction that moves things forward. Home first, everything else follows. */}
              <Text className="text-[#4B5563] text-[11px] leading-4 mt-2">
                No address yet? Describe the home — "3 bed 2 bath ranch, about 50×30" — and I'll start the ledger from that.
              </Text>
            </View>
          ) : (
            messages.map((m, i) => (
              <View key={i} className={m.role === "user" ? "items-end" : "items-start"}>
                {m.role === "user" ? (
                  // Claude-style user turn — a quiet neutral bubble, right-aligned
                  <View className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-[#1F1F23] border border-[#2A2A2E]">
                    <Text selectable className="text-[#F9FAFB] text-[15px]" style={{ lineHeight: 22 }}>
                      {m.content}
                    </Text>
                  </View>
                ) : (
                  // Claude-style assistant turn — no bubble, the answer just flows
                  <Text selectable className="text-[#E5E7EB] text-[15px] w-full" style={{ lineHeight: 23 }}>
                    {m.content || (loading ? "…" : "")}
                  </Text>
                )}

                {/* REAPER's j-space recovery takeoff — his live decon contribution.
                    The numbers always show (informational); the MARKET gate decides
                    whether it's a green-light (served) or an amber waitlist (out-of-market).
                    RI only at launch — served grows as ML Systems expands. */}
                {m.role === "assistant" && m.recovery ? (() => {
                  const mkt = m.recovery.market;
                  const served = mkt?.served !== false; // absent verdict (older server) = served
                  const accent = served ? "#F97316" : "#F59E0B"; // orange vs amber
                  const where = mkt?.town
                    ? `${mkt.name ?? mkt.code ?? "RI"} · ${mkt.town}`
                    : mkt?.name ?? mkt?.code ?? "RI";
                  const rec = m.recovery;
                  const open = reaperOpen[i] ?? false;
                  return (
                  <View className="mt-2 w-[88%] rounded-2xl border p-3" style={{ borderColor: `${accent}33`, backgroundColor: `${accent}10` }}>
                    <Pressable
                      onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setReaperOpen((o) => ({ ...o, [i]: !open })); }}
                      className="flex-row items-center"
                    >
                      <Text style={{ color: accent }} className="text-[9.5px] font-mono uppercase tracking-widest flex-1">
                        ⛏ REAPER · {rec.recoveryScore}% · ${rec.estSalvageValue.toLocaleString()} salvage
                      </Text>
                      <Text style={{ color: accent }} className="text-[10px] ml-2">{open ? "▾" : "▸"}</Text>
                    </Pressable>
                    {open ? (
                    <View className="mt-2">
                    {served ? (
                      <Text style={{ color: "#34D399" }} className="text-[9px] mb-2">◆ {where} · served</Text>
                    ) : (
                      <Text style={{ color: accent }} className="text-[10px] mb-2">◆ Not in your market yet — RI only at launch. Your report is shown for reference.</Text>
                    )}
                    <View className="flex-row justify-between mb-2">
                      <RecStat label="Recovery" value={`${rec.recoveryScore}%`} />
                      <RecStat label="Salvage" value={`$${rec.estSalvageValue.toLocaleString()}`} />
                      <RecStat label="On" value={`${rec.grossSF.toLocaleString()} SF`} />
                    </View>
                    {/* Impact stats — universally valuable, shown in-market and out. */}
                    {rec.landfillDivertedTons != null || rec.carbonAvoidedTons != null ? (
                      <View className="flex-row justify-between mb-2">
                        {rec.landfillDivertedTons != null ? (
                          <RecStat label="♻ Diverted" value={`${rec.landfillDivertedTons.toLocaleString()} t`} />
                        ) : null}
                        {rec.carbonAvoidedTons != null ? (
                          <RecStat label="🌿 CO₂e avoided" value={`${rec.carbonAvoidedTons.toLocaleString()} t`} />
                        ) : null}
                        {rec.climate ? <RecStat label="Climate" value={rec.climate.label} /> : null}
                      </View>
                    ) : null}
                    <Text className="text-[#9CA3AF] text-[10px] mb-1.5">
                      Reuse ${rec.rrr.reuse.toLocaleString()} › Resale ${rec.rrr.resale.toLocaleString()} › Recycle ${rec.rrr.recycle.toLocaleString()}
                    </Text>
                    {[...rec.lines].sort((a, b) => b.salvageValue - a.salvageValue).slice(0, 3).map((l) => (
                      <View key={l.assembly} className="flex-row justify-between">
                        <Text className="text-[#6B7280] text-[10px] flex-1" numberOfLines={1}>{l.material} · {l.disposition}</Text>
                        <Text style={{ color: accent }} className="text-[10px] ml-2">${l.salvageValue.toLocaleString()}</Text>
                      </View>
                    ))}
                    {rec.climate ? (
                      <Text className="text-[#6B7280] text-[8.5px] mt-1.5 italic">{rec.climate.note}</Text>
                    ) : null}
                    {/* Spec-resolved tonnage — off the reverse takeoff's real member sizes. */}
                    {reverseTons ? (
                      <Text style={{ color: accent }} className="text-[9px] mt-1.5">⛏ spec-resolved: ~{reverseTons.recoveredTons} t off your framing · {reverseTons.statedShare}% from stated specs</Text>
                    ) : null}
                    {served ? (
                      <Text className="text-[#4B5563] text-[8.5px] mt-1.5">MODELED · to most valuable recoverable state · hazmat flagged as a stop</Text>
                    ) : (
                      <>
                        <Text style={{ color: accent }} className="text-[8.5px] mt-1.5 mb-2">MODELED · ML Systems deconstructs in RI at launch — join the waitlist and we'll reach you as we expand.</Text>
                        <Pressable
                          onPress={() => joinWaitlist(rec)}
                          disabled={waitlistJoined || waitlistJoin.isPending}
                          className="rounded-xl py-2 items-center"
                          style={{ backgroundColor: waitlistJoined ? "#10B98122" : `${accent}22`, borderWidth: 1, borderColor: waitlistJoined ? "#10B98155" : `${accent}66` }}
                        >
                          <Text style={{ color: waitlistJoined ? "#34D399" : accent }} className="text-[11px] font-semibold">
                            {waitlistJoined ? "✓ On the waitlist — we'll reach you" : waitlistJoin.isPending ? "Joining…" : "Join the waitlist →"}
                          </Text>
                        </Pressable>
                      </>
                    )}
                    </View>
                    ) : null}
                  </View>
                  );
                })() : null}

                {/* MURPHY's j-space build takeoff — his live construction contribution */}
                {m.role === "assistant" && m.build ? (
                  <View className="mt-2 w-[88%] rounded-2xl border p-3" style={{ borderColor: "#84CC1633", backgroundColor: "#84CC1610" }}>
                    <Text style={{ color: "#84CC16" }} className="text-[9.5px] font-mono uppercase tracking-widest mb-2">
                      🐕 MURPHY · build takeoff
                    </Text>
                    <View className="flex-row justify-between mb-2">
                      <RecStat label="Next cycle" value={`${m.build.nextCycleSF.toLocaleString()} SF`} />
                      <RecStat label="Schedule" value={`${m.build.totalWeeks} wks`} />
                      <RecStat label="Milestones" value={`${m.build.totalMilestones}`} />
                    </View>
                    <Text className="text-[#9CA3AF] text-[10px] mb-1.5">
                      Cycle {m.build.nextCycleN} · {m.build.nextCycleLevels} levels · value ~${m.build.marketValue.toLocaleString()}
                    </Text>
                    {m.build.schedule.map((b) => (
                      <View key={b.phase} className="flex-row justify-between">
                        <Text className="text-[#6B7280] text-[10px] flex-1" numberOfLines={1}>{b.phase}</Text>
                        <Text style={{ color: "#84CC16" }} className="text-[10px] ml-2">{b.weeks}wk · {b.milestones} ms</Text>
                      </View>
                    ))}
                    <Text className="text-[#4B5563] text-[8.5px] mt-1.5">MODELED · efficiency band {m.build.efficiencyBand.low}–{m.build.efficiencyBand.high} · not a contract schedule</Text>
                  </View>
                ) : null}

                {/* PIT LORD's j-space loan-pit takeoff — his live finance contribution.
                    Modeled tier/fee/subsidies/network; live competing bids when a pit is open. */}
                {m.role === "assistant" && m.loan ? (
                  <View className="mt-2 w-[88%] rounded-2xl border p-3" style={{ borderColor: "#EF444433", backgroundColor: "#EF444410" }}>
                    <Text style={{ color: "#F87171" }} className="text-[9.5px] font-mono uppercase tracking-widest mb-2">
                      🐉 PIT LORD · loan pit
                    </Text>
                    <View className="flex-row justify-between mb-2">
                      <RecStat label="Tier" value={m.loan.tier} />
                      <RecStat label="Bid fee" value={`$${(m.loan.bidFeeCents / 100).toLocaleString()}`} />
                      <RecStat
                        label={m.loan.openPit ? "Best bid" : "Monthly"}
                        value={
                          m.loan.openPit && m.loan.bestRateBps != null
                            ? `${(m.loan.bestRateBps / 100).toFixed(2)}%`
                            : m.loan.monthlyPayment != null
                              ? `$${m.loan.monthlyPayment.toLocaleString()}`
                              : "—"
                        }
                      />
                    </View>
                    {m.loan.openPit ? (
                      <Text className="text-[#9CA3AF] text-[10px] mb-1.5">
                        {m.loan.bidCount === 0
                          ? "Pit open · waiting on the first competing bid"
                          : `${m.loan.bidCount} lender${m.loan.bidCount === 1 ? "" : "s"} competing right now`}
                        {m.loan.equityAtClose != null ? ` · ~$${m.loan.equityAtClose.toLocaleString()} equity at close` : ""}
                      </Text>
                    ) : (
                      <Text className="text-[#9CA3AF] text-[10px] mb-1.5">
                        {m.loan.networkTotal} lenders across {m.loan.networkCategories} categories compete in a reverse auction
                        {m.loan.equityAtClose != null ? ` · ~$${m.loan.equityAtClose.toLocaleString()} equity at close` : ""}
                      </Text>
                    )}
                    <Text className="text-[#6B7280] text-[10px]" numberOfLines={1}>
                      Subsidies stack: {m.loan.subsidies.join(" · ")}
                    </Text>
                    <Text className="text-[#6B7280] text-[10px]" numberOfLines={1}>
                      Live now: {m.loan.liveNow.join(", ")} · AI lanes: {m.loan.aiLanes.slice(0, 2).join(", ")}
                    </Text>
                    <Pressable
                      onPress={() => router.push("/pit")}
                      className="mt-2 self-start rounded-full border px-3 py-1.5"
                      style={{ borderColor: "#EF444455", backgroundColor: "#EF444418" }}
                    >
                      <Text style={{ color: "#F87171" }} className="text-[11px] font-semibold">
                        {m.loan.openPit ? "See competing bids →" : "Open a pit →"}
                      </Text>
                    </Pressable>
                    <Text className="text-[#4B5563] text-[8.5px] mt-1.5">MODELED · real bids come from opening a pit · not a rate quote</Text>
                  </View>
                ) : null}

                {/* VERA's verification — subtle emerald trust line (input gate + 10/10 gate),
                    plus the autonomic heartbeat: minds attested against origin before answering. */}
                {m.role === "assistant" && (m.verify || m.veraAvg != null || m.heartbeat) ? (
                  <Text className="text-[#34D399] text-[9.5px] mt-1 ml-1" style={{ opacity: 0.9 }}>
                    🦉 VERA verified
                    {m.verify?.input ? ` · input ${m.verify.input.verdict === "pass" ? "✓" : "⚠"}` : ""}
                    {m.veraAvg != null ? ` · gate ${m.veraAvg}/100` : ""}
                    {m.verify?.output?.verdict === "revise" ? " · revised" : ""}
                    {m.heartbeat?.grounded ? " · ♥ grounded" : ""}
                    {m.heartbeat && !m.heartbeat.grounded ? (
                      <Text style={{ color: "#F59E0B" }}> · ♥ re-grounded: {m.heartbeat.regrounded.join(", ")}</Text>
                    ) : null}
                  </Text>
                ) : null}

                {/* Token transparency — the honest gauge (shown once the server emits it) */}
                {m.role === "assistant" && m.tokens != null ? (
                  <Text className="text-[#4B5563] text-[9.5px] mt-1 ml-1">⧗ {m.tokens.toLocaleString()} tokens</Text>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>

        {/* VERA's "did you mean?" — the address as typed missed the town rolls but a
            near-match exists; the homeowner picks the real parcel. Pinned above intake. */}
        {addrCandidates ? (
          <View className="px-3">
            <StreetConfirmCard
              candidates={addrCandidates.list}
              onConfirm={onPickCandidate}
              onDismiss={() => setAddrCandidates(null)}
            />
          </View>
        ) : null}
        {/* VERA's intake confirm — pinned above the input until the homeowner signs
            the record off; every turn until then runs the INTAKE stage (no financing). */}
        {chatAddress && confirmation?.fields.length && !intake.confirmed ? (
          <View className="px-3">
            <VeraIntakeCard address={chatAddress} confirmation={confirmation} />
          </View>
        ) : null}
        {/* The moment VERA's record is signed, the pinned tab becomes the way into the
            Value Chain Ledger — the verified record the 8 agents build on (the Custodian's
            guidance now lives inside the ledger screen). PI keeps guiding in the chat itself. */}
        {chatAddress && intake.confirmed ? (
          <View className="px-3">
            <Pressable
              onPress={() => router.push((chatAddress ? `/portfolio?name=${encodeURIComponent(chatAddress)}` : "/portfolio") as never)}
              className="rounded-xl px-3 py-2.5 flex-row items-center gap-2 border mb-1"
              style={{ borderColor: "#F5D06044", backgroundColor: "#F5D0600D" }}
            >
              <Text style={{ color: "#F5D060" }} className="text-[12px]">⚖</Text>
              <Text style={{ color: "#F5D060" }} className="text-[10px] font-bold tracking-widest flex-1" numberOfLines={1}>
                YOUR VALUE CHAIN LEDGER
              </Text>
              <Text style={{ color: "#F5D060" }} className="text-[11px]">→</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Input — one rounded pill with a circular send, Claude-style */}
        <View className="px-3 pt-1 pb-3">
          <View className="flex-row items-end gap-2 bg-[#111111] border border-[#262626] rounded-3xl pl-4 pr-2 py-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Let's build. Ask me something."
              placeholderTextColor="#6B7280"
              multiline
              editable={!loading}
              onSubmitEditing={() => send()}
              className="flex-1 text-[#F9FAFB] text-[15px] max-h-28 py-1.5"
            />
            <Pressable
              onPress={() => send()}
              disabled={!canSend}
              className="w-9 h-9 rounded-full items-center justify-center mb-0.5"
              style={{ backgroundColor: canSend ? "#22C55E" : "#22C55E4D" }}
            >
              {loading ? <ActivityIndicator size="small" color="#0A0A0A" /> : <Text className="text-black font-bold text-[16px]">↑</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** One compact stat in REAPER's recovery card. */
function RecStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[#6B7280] text-[8.5px] uppercase tracking-wider">{label}</Text>
      <Text style={{ color: "#F9FAFB" }} className="text-[13px] font-extrabold">{value}</Text>
    </View>
  );
}
