import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions, Modal, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { compressHome, compressValueChain, confirmHomeFacts, genomePlates, clampFootprint, maxFootprintSF, reverseTakeoff, reverseTonnage, recomposeAssemblies, structuralHeights, codeRegimeForYear, stateBuildingCode, generation, custodianOverlook, assessCodeCompliance, blueprintReadiness, HOME_REBUILD_MULTIPLIER, ledgerPackets, type HomeConfirmation, type HomeGenome, type VcOntology } from "@ml-systems/types";
import { FloorPlanSketch } from "@/components/jspace-builder";
import { clearApproved } from "@/lib/spec-review-store";
import { EditableValue } from "@/components/record-panel";
// Blueprint output (the hero) + the build-logic narration (collapsed) — the two
// surfaces under the ledger spine; each wraps the existing cards, unchanged.
import { LedgerPlansHero } from "@/components/ledger-plans-hero";
import { resolvePlanGenome } from "@/lib/plan-set-index";
import { BuildLogicGroup } from "@/components/build-logic-group";
import { useDeepFindings } from "@/lib/deep-search-store";
import { factsFromFindings } from "@/lib/findings-facts";
import { buildTrace, swarmRebuildStages, custodianOverlookStage } from "@/lib/build-trace";
import { wallsForHome } from "@/lib/wall-recovery";
import { useDeconAnswer } from "@/lib/decon-intent-store";
import { RoofPlanSvg, LoadSectionSvg, WallSectionSvg, WeightPlanSvg } from "@/components/roof-structure-svgs";
import { tileHome, applySwaps, applyRoomTypes, applyResize, applyRoomNames, resizeNeighbors, resizeEdgeKey, levelLabel, EDITABLE_KINDS } from "@/lib/jspace";
import { rebuildWithSwarm } from "@/lib/plan-swarm";
import { computeRoof, computeLoadPath, roofWeightDistribution, roofClassification } from "@/lib/roof-structure";
import { LedgerSpine } from "@/components/ledger-spine";
import { BlueprintReadinessCard } from "@/components/blueprint-readiness-card";
import { ledgerView } from "@/lib/ledger-view";
import { veraExtract } from "@/lib/vera-extract";
import { buildClaims } from "@/lib/ledger-claims";
import { useStagedReveal } from "@/lib/use-staged-reveal";
import { ElevationSet } from "@/components/elevation-svg";
import { FacadePhotoCard } from "@/components/facade-photo-card";
import { trpc } from "@/lib/trpc";
import { fidelityForHome } from "@/lib/plan-fidelity";
import { fetchBlueprint, type Blueprint } from "@/lib/blueprint";
import { fetchPropertyBones, fetchNeighborhood, type Neighborhood } from "@/lib/vera-property";
import { fetchAssessorCard } from "@/lib/vera-assessor";
import { getPlan, upsertPlan, usePlan } from "@/lib/plan-store";
import { pickAndIngest } from "@/lib/vera-photo";
import { normalizeAddress, mergeFacts, hasBones, type BuilderFacts } from "@/lib/jspace-facts";
import { useLocalHome } from "@/lib/home-store";

/**
 * Plan Builder — the homeowner's build room, inside the in-app Design Studio.
 *
 * Full simple customization, no Photoshop, no CAD: style chips, bed/bath steppers,
 * footprint steppers, garage/office toggles. Every tap re-renders the REAL studio
 * blueprint (deterministic archetype math — milliseconds, zero AI spend) and
 * auto-saves the plan per address; there is no save button. The same facts the
 * homeowner can *speak* in "Let's build" are the knobs here — one source of truth,
 * and the next chat message silently carries the customized numbers (silent merge).
 */

const CDA = "#60A5FA";
const FIN = "#22C55E";
const AMBER = "#F59E0B";

const STYLES: { key: string; label: string; levels: number }[] = [
  { key: "ranch", label: "Ranch", levels: 1 },
  { key: "colonial", label: "Colonial", levels: 2 },
  { key: "cape", label: "Cape", levels: 2 },
];

/** The explicit blank-canvas starter — applied ONLY when the homeowner taps for it,
 *  and labeled STARTER until real facts arrive. Never a silent seed (VERA-first). */
const STARTER_FACTS: BuilderFacts = { style: "ranch", levels: 1, footprintW: 50, footprintD: 30, beds: 3, baths: 2, garage: true };

export default function PlanBuilderScreen() {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const home = useLocalHome();
  const { plan: planKey } = useLocalSearchParams<{ plan?: string }>();

  // ── VERA-first seeding: saved plan (a real build) → the loaded home's ADDRESS
  //    only (VERA's search populates the numbers) → nothing. No demo numbers, ever.
  const [facts, setFacts] = useState<BuilderFacts>(() => {
    if (planKey) {
      const saved = getPlan(planKey);
      if (saved) return { ...saved.facts };
    }
    if (home?.address) return { address: home.address };
    return {};
  });
  const [starter, setStarter] = useState(false); // the blank canvas, chosen explicitly
  const address = facts.address ?? home?.address ?? "My plan";
  const addressKey = normalizeAddress(address);
  const deepFindings = useDeepFindings(addressKey);
  const built = hasBones(facts) || starter;

  // ── Live shared truth: when the chat or a VERA pass updates THIS address, fold the
  //    VERA-derived fields in (genome / plates / geometry) WITHOUT clobbering local
  //    homeowner edits (stated specs, swaps, heights). `lastSelfSaveRef` skips our own
  //    autosaves so there's no feedback loop. This is how the Plan Builder + CDA respond
  //    to VERA's passes made anywhere (chat, portfolio, the owl). ──
  const livePlan = usePlan(addressKey);

  // ── The persisted MASTER LEDGER genome. CDA builds the full plans FROM it: the
  //    accumulated record (+ the facade photo) that survives a cleared store or a
  //    second device. Address-guarded so a different newest-project can't bleed in;
  //    the local genome (homeowner edits) still wins, the photo overlays from the ledger.
  const ledgerQ = trpc.vc.myOntology.useQuery(facts.address ? { address: facts.address } : undefined, { retry: 0 });
  // ── CDA's update packets. VERA + the Custodian rate each entry by review-board
  //    breadth (ledger-rating); CDA takes only the board-verified ones (≥2 independent
  //    verifiers, never disputed) and grounds the plan geometry with them.
  const packets = useMemo(
    () => ledgerPackets({ ontology: (ledgerQ.data?.ontology ?? null) as VcOntology | null }),
    [ledgerQ.data],
  );
  const planGenome = useMemo<HomeGenome | undefined>(
    () =>
      resolvePlanGenome({
        localGenome: facts.genome,
        storedGenome: (ledgerQ.data?.genome ?? null) as HomeGenome | null,
        storedOntology: (ledgerQ.data?.ontology ?? null) as VcOntology | null,
        localAddress: facts.address,
      }),
    [facts.genome, facts.address, ledgerQ.data],
  );

  const lastSelfSaveRef = useRef<string>("");
  useEffect(() => {
    if (!livePlan || livePlan.updatedAt <= lastSelfSaveRef.current) return;
    const inc = livePlan.facts;
    setFacts((f) =>
      mergeFacts(f, {
        ...(inc.genome ? { genome: inc.genome } : {}),
        ...(inc.plates ? { plates: inc.plates } : {}),
        ...(inc.footprintW ? { footprintW: inc.footprintW } : {}),
        ...(inc.footprintD ? { footprintD: inc.footprintD } : {}),
        ...(inc.outline ? { outline: inc.outline } : {}),
        ...(inc.yearBuilt ? { yearBuilt: inc.yearBuilt } : {}),
        ...(inc.attributesSource ? { attributesSource: inc.attributesSource } : {}),
      }),
    );
  }, [livePlan]);

  const [level, setLevel] = useState(0);
  // Default to the interactive blueprint-styled plan (tap to move rooms) — the studio
  // server SVG is one tap away as the hi-fi "render". "sketch" = the editable plan.
  const [view, setView] = useState<"studio" | "sketch" | "roof" | "structure" | "elevation">("sketch");
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [fetching, setFetching] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [hood, setHood] = useState<Neighborhood | null>(null);
  // Custom room rename (the bottom-up floor populator): target id + input + modal.
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const commitRename = () => {
    const id = renameTarget;
    if (!id) return;
    const name = renameText.trim();
    setFacts((f) => {
      const rn = { ...(f.roomNames ?? {}) };
      if (name) rn[id] = name;
      else delete rn[id];
      return { ...f, roomNames: rn };
    });
    setRenameTarget(null);
    setSelectedRoom(null);
  };

  // The deterministic local build — instant, offline, 0¢: VERA tiles the foundation,
  // CDA's swarm rebuilds the interior, then the homeowner's edits apply LAST (they win).
  const { tiled, swarmReport } = useMemo(() => {
    const foundation = tileHome(facts);
    const { home: rebuilt, report } = rebuildWithSwarm(foundation);
    const withEdits = applyRoomNames(applyResize(applyRoomTypes(applySwaps(rebuilt, facts.swaps), facts.roomTypes), facts.roomEdgeAdj), facts.roomNames);
    return { tiled: withEdits, swarmReport: report };
  }, [facts]);

  // VERA's reverse takeoff — the record reverse-engineered into the assembly stack
  // (foundation → roof) so CDA can reverse the plans; same feed as the chat J-Space.
  const reverse = useMemo(() => {
    const g = facts.genome;
    const a = g?.attributes;
    const grossSF = facts.grossSF ?? g?.grossSF?.v;
    const enclosed = g?.enclosedSF?.v;
    const basementSF = enclosed && grossSF && enclosed > grossSF ? enclosed - grossSF : undefined;
    return reverseTakeoff({
      archetype: g?.archetype?.v ?? facts.style,
      levels: facts.levels ?? g?.levels?.v,
      footprintW: facts.footprintW ?? g?.footprintW?.v,
      footprintD: facts.footprintD ?? g?.footprintD?.v,
      ...(grossSF ? { grossSF } : {}),
      yearBuilt: g?.yearBuilt?.v ?? facts.yearBuilt,
      ...(basementSF ? { basementSF } : {}),
      finishedBasementSF: g?.finishedBasementSF?.v,
      exteriorWall: a?.exteriorWall,
      roofCover: a?.roofCover,
      interiorWall: a?.interiorWall,
      stated: {
        foundation: facts.statedFoundation,
        joist: facts.statedJoist,
        studs: facts.statedStuds,
        extSheathing: facts.statedExtSheathing,
        roofSheathing: facts.statedRoofSheathing,
        subfloor: facts.statedSubfloor,
        drywall: facts.statedDrywall,
        girder: facts.statedGirder,
        girderSpec: facts.statedGirderSpec,
        garageBeam: facts.statedGarageBeam,
      },
    });
  }, [facts]);
  const reverseTons = useMemo(() => {
    const g = facts.genome;
    const grossSF = facts.grossSF ?? g?.grossSF?.v;
    return reverseTonnage(reverse, {
      footprintW: facts.footprintW ?? g?.footprintW?.v,
      footprintD: facts.footprintD ?? g?.footprintD?.v,
      levels: facts.levels ?? g?.levels?.v,
      ...(grossSF ? { grossSF } : {}),
    });
  }, [reverse, facts]);
  // The structural story — roof layout + the load path, recomputed on every change.
  // VERA's Layer-2 findings translated into facts, so the roof VERA MEASURED (per-plane
  // pitch/azimuth → real ridges and form) reaches the drawing. The homeowner's own facts
  // are spread last and always win; nothing here is written back to the saved plan.
  const found = useMemo(() => factsFromFindings(deepFindings), [deepFindings]);
  const roofFacts = useMemo(() => ({ ...found, ...facts }), [found, facts]);
  const roof = useMemo(() => computeRoof(roofFacts), [roofFacts]);
  const loadPath = useMemo(() => computeLoadPath(roofFacts), [roofFacts]);
  // The homeowner's ceiling answer resolves the ridge (board vs beam) — the one thing
  // the roof geometry can't see. Undefined = we assume; "flat"/"vaulted" = they told us.
  const [ceiling, setCeiling] = useState<"flat" | "vaulted" | "partial" | undefined>(undefined);
  const weightDist = useMemo(
    () => roofWeightDistribution(roofFacts, ceiling ? { ceiling } : undefined),
    [roofFacts, ceiling],
  );
  // Structural heights — code/era grounded (RI), homeowner-correctable. The math falls
  // back to today's 9'/8' when unset, so numbers never change until a height is chosen.
  const yearBuilt = facts.genome?.yearBuilt?.v ?? facts.yearBuilt;
  const heights = useMemo(() => structuralHeights(yearBuilt, "RI"), [yearBuilt]);
  const f2f = facts.floorToFloorFt ?? heights.floorToFloorFt;
  const foundH = facts.foundationWallHeightFt ?? heights.foundationWallHeightFt;
  const setFloorToFloor = (next: number) =>
    setFacts((prev) => ({ ...prev, floorToFloorFt: Math.min(12, Math.max(7, Math.round(next * 2) / 2)) }));

  // ── The one idea: the EXISTING home's plans (extracted from VERA's record, refreshed by
  //    pass 1 → pass 2) ⇄ the REBUILD's new set (next cycle). Rebuild is a preview stub. ──
  const [planMode, setPlanMode] = useState<"existing" | "rebuild">("existing");
  const passTwo = deepFindings.length > 0; // VERA's deep pass has run → CDA's plans are refreshed
  const rebuild = useMemo(() => {
    const g = facts.genome;
    if (!g) return null;
    const cur = Math.max(1, Math.round(facts.cycle ?? g.cycle ?? 1));
    const next = generation(g, cur + 1);
    const w = next.footprintW?.v ? Math.round(next.footprintW.v) : undefined;
    const d = next.footprintD?.v ? Math.round(next.footprintD.v) : undefined;
    const lv = Math.max(1, Math.round(next.levels.v));
    const sf = w && d ? Math.round(w * d * lv) : undefined;
    const curVal = g.assessedValue?.v;
    const nextVal = curVal ? Math.round(curVal * HOME_REBUILD_MULTIPLIER) : undefined;
    return { cur, nextCycle: cur + 1, w, d, lv, sf, curVal, nextVal };
  }, [facts.genome, facts.cycle]);
  // VERA scores the TILED plan against the compressed record — every edit re-scores.
  const fidelity = useMemo(() => fidelityForHome(tiled, facts.genome), [tiled, facts.genome]);
  // Layer 2 — REAPER's envelope + MIA's recomposition, so the Plan Builder's build logic
  // carries the same second-pass depth the chat computes (walls weighed, sections staged).
  const walls = useMemo(() => (hasBones(facts) ? wallsForHome(tiled) : null), [tiled, facts]);
  const recompose = useMemo(() => {
    const g = facts.genome;
    const grossSF = facts.grossSF ?? g?.grossSF?.v;
    return recomposeAssemblies(
      reverse,
      {
        footprintW: facts.footprintW ?? g?.footprintW?.v,
        footprintD: facts.footprintD ?? g?.footprintD?.v,
        levels: facts.levels ?? g?.levels?.v,
        ...(grossSF ? { grossSF } : {}),
      },
      walls,
    );
  }, [reverse, facts, walls]);

  // ── VERA's search, ON this screen: address → real bones + tax card populate the
  //    build room (both cached if the chat already ran them; fail-soft). Same query
  //    derivation as the chat card. The j-space is built FROM records, never demos.
  const [veraFetching, setVeraFetching] = useState(false);
  // Stage-1 field verifications — sources cross-confirmed the moment they land.
  const [confirmation, setConfirmation] = useState<HomeConfirmation | null>(null);
  // The build logic, stage by stage — reads the artifacts, narrates the method.
  // PIT LORD's finance stage gates on the homeowner's decon answer (Hub/portfolio).
  const deconAnswer = useDeconAnswer(facts.address);
  const trace = useMemo(
    () => buildTrace({ facts, tiled, confirmation, fidelity, walls, reverse, reverseTons, recompose, deconAnswer }),
    [facts, tiled, confirmation, fidelity, walls, reverse, reverseTons, recompose, deconAnswer],
  );
  // Layer 2, merged by the Custodian — his overlook of the VERA×CDA handshake opens,
  // then the symbiosis (swarm). The deep-pass stages stay off this working surface (the
  // owl's sources below are for running searches); the overlook + swarm fold into one card.
  const layer2 = useMemo(() => {
    const overlook = custodianOverlookStage({ genome: facts.genome, fidelity, report: swarmReport });
    return [...(overlook ? [overlook] : []), ...swarmRebuildStages({ facts, tiled, report: swarmReport })];
  }, [facts, tiled, fidelity, swarmReport]);
  // The Custodian's read — leads the build logic below.
  const overlook = useMemo(
    () =>
      custodianOverlook({
        genome: facts.genome,
        fidelity,
        swarm: { commonalities: swarmReport.commonalities.length, conflicts: swarmReport.conflicts.length, opsApplied: swarmReport.opsApplied },
      }),
    [facts.genome, fidelity, swarmReport],
  );
  // ── The LIVE value-chain ledger — compiled on-device from THIS home's artifacts
  //    (compressValueChain), the same grammar the Custodian persists. It's the spine
  //    CDA extracts from: rows fill as VERA lands data, each with its confidence bar.
  //    Recomputes on every fact change → the ledger + blueprint compile live. ──
  // The room-level code pass — needs the tiled geometry, so it's computed here and fed to
  // the compression (same input the persisted ledger uses in useHomeLedger).
  const codeCompliance = useMemo(() => {
    if (!tiled.rooms.length) return null;
    const ceilingHeightFt = (facts.floorToFloorFt && facts.floorToFloorFt > 0 ? facts.floorToFloorFt : 9) - 1;
    return assessCodeCompliance(tiled.rooms, {
      ceilingHeightFt,
      footprintW: tiled.footprintW,
      footprintD: tiled.footprintD,
    });
  }, [tiled, facts.floorToFloorFt]);

  const ontology = useMemo(
    () =>
      hasBones(facts)
        ? compressValueChain({
            address: facts.address ?? "",
            cycle: Math.max(1, Math.round(facts.cycle ?? facts.genome?.cycle ?? 1)),
            genome: facts.genome ?? null,
            reverse,
            reverseTons,
            walls,
            recompose,
            fidelity,
            rooms: tiled.rooms.length,
            roof: roofClassification(roofFacts),
            intakeConfirmed: false, // the live preview isn't the verified persisted record
            deconIntent: deconAnswer === "yes" || facts.deconIntent === true,
            // The conformity layer's inputs — competing reads (record vs homeowner vs
            // VERA-sensed) so codes reconcile/quarantine instead of reading single-source.
            claimsPerCode: buildClaims({ facts: roofFacts, genome: facts.genome, roof }),
            // The discipline passes the blueprint set reads — code compliance + the load
            // path (footing sizing). Same inputs the persisted ledger carries.
            codeCompliance,
            structure: {
              foundationPlf: loadPath.foundationPlf,
              footingWidthFt: loadPath.footingWidthFt,
              footingUtilization: loadPath.footingUtilization,
              stated: false,
            },
          })
        : null,
    [facts, reverse, reverseTons, walls, recompose, fidelity, tiled, roofFacts, roof, deconAnswer, codeCompliance, loadPath],
  );
  const ledger = useMemo(() => ledgerView(ontology, overlook), [ontology, overlook]);
  // How close this live ledger is to a full ~75-sheet CD set, per discipline — the
  // CDA-handoff gate, computed off the SAME ontology the ledger renders.
  const readiness = useMemo(
    () =>
      ontology || facts.genome
        ? blueprintReadiness({
            genome: facts.genome ?? null,
            codes: ontology ? Object.values(ontology.codes) : [],
            overlook,
          })
        : null,
    [ontology, facts.genome, overlook],
  );
  const ledgerTotal = useMemo(() => ledger.groups.reduce((n, g) => n + g.codes.length, 0), [ledger]);
  const ledgerRevealed = useStagedReveal(`${facts.address ?? ""}|${ledgerTotal}|${ledger.totals.confirmed}`, ledgerTotal, 90);
  // VERA's per-plane Google Solar map — the north/south faces + per-face pitch.
  const roofPlanes = useMemo(() => roofClassification(roofFacts)?.planes ?? [], [roofFacts]);
  // Layer 1 of the spine — the raw values VERA extracts (address, footprint, height,
  // roof, N/S elevations from the Google run, floor heights), each with its source.
  const veraRows = useMemo(
    () => veraExtract({ facts: roofFacts, roof, planes: roofPlanes, genome: facts.genome }),
    [roofFacts, roof, roofPlanes, facts.genome],
  );
  const veraTried = useRef<Set<string>>(new Set());
  // Recalled plans saved before the plates layer: re-attach the record's massing
  // (only when the homeowner hasn't explicitly chosen a different level count).
  useEffect(() => {
    setFacts((f) => {
      if (!f.genome || f.plates) return f;
      const plates = genomePlates(f.genome);
      return plates && (f.levels == null || Math.round(f.levels) === plates.length) ? { ...f, plates } : f;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const addr = facts.address;
    if (!addr) return;
    // Schema-aware gate: a plan saved before the sub-areas layer (genome without
    // enclosedSF, or none at all) re-runs VERA's search — Stage-1 re-verifies on
    // recall. Fetches are cached + fail-soft; veraTried keeps it to one attempt.
    if (facts.outline && facts.genome?.enclosedSF) return;
    const query =
      home?.address === addr
        ? [home.address, home.city, home.state ?? "RI", home.zip].filter(Boolean).join(", ")
        : /,|\b\d{5}\b/.test(addr)
          ? addr
          : `${addr}, ${home?.city ?? "Rhode Island"}`;
    if (veraTried.current.has(query)) return;
    veraTried.current.add(query);
    setVeraFetching(true);
    const town = home?.city ?? /,\s*([A-Za-z ]{3,25})(?:,|$)/.exec(addr)?.[1] ?? "warwick";
    void Promise.all([fetchPropertyBones(query), fetchAssessorCard(addr, town).catch(() => null)]).then(
      ([bones, card]) => {
        setVeraFetching(false);
        if (bones) {
          setFacts((f) =>
            mergeFacts(f, {
              footprintW: bones.footprintW,
              footprintD: bones.footprintD,
              outline: bones.outline,
              bonesSource: bones.source,
              grossSF: f.grossSF ?? Math.round(bones.areaSF * Math.max(1, f.levels ?? 1)),
            }),
          );
        }
        if (card) {
          setFacts((f) =>
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
        }
        // The Custodian compresses the record into the plan's genome the moment
        // VERA lands it — the raw bones/card would otherwise dissolve into the
        // merged facts. Record wins inside; f only fills gaps the record misses.
        if (bones || card) {
          setConfirmation(confirmHomeFacts({ bones, card }));
          setFacts((f) => {
            const genome = compressHome({ bones, card, homeowner: f, address: addr, cycle: f.cycle });
            if (!genome) return f;
            // VERA's reconciled corrections flow back into the facts — the sketch
            // tiles the TRUE house (the outline still overlays the deck wing) —
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
        }
      },
    );
  }, [facts.address, facts.outline, home]);

  // VERA reads the homes next door once per address (cached, fail-soft).
  useEffect(() => {
    if (!facts.address) return;
    void fetchNeighborhood(facts.address).then((h) => setHood(h));
  }, [facts.address]);

  // Tap one room, tap another → they trade places (persisted via facts.swaps).
  const pressRoom = (id: string) => {
    if (!selectedRoom) return setSelectedRoom(id);
    if (selectedRoom === id) return setSelectedRoom(null);
    const pair: [string, string] = [selectedRoom, id];
    setFacts((f) => ({ ...f, swaps: [...(f.swaps ?? []), pair] }));
    setSelectedRoom(null);
  };

  // ── Debounced: refetch the studio blueprint + auto-save on every change. ────
  // Gated on `built` — no fetch/save until VERA found the home or the homeowner
  // explicitly chose the blank canvas (nothing demo ever draws or persists).
  const seq = useRef(0);
  useEffect(() => {
    if (!built) return;
    const mine = ++seq.current;
    setFetching(true);
    const t = setTimeout(() => {
      fetchBlueprint({
        beds: facts.beds,
        baths: facts.baths,
        grossSF: facts.grossSF,
        footprintW: facts.footprintW,
        footprintD: facts.footprintD,
        style: facts.style,
        garage: facts.garage,
        office: facts.office,
        level: level + 1,
      }).then((bp) => {
        if (seq.current !== mine) return; // stale response — a newer edit superseded it
        setBlueprint(bp);
        setFetching(false);
      });
      // Auto-save — the plan is always saved; My Plans reflects it immediately.
      // Record our own updatedAt so the live-merge effect doesn't echo our write back.
      const saved = upsertPlan(address, { ...facts, address });
      lastSelfSaveRef.current = saved.updatedAt;
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts, level, built]);

  const levels = blueprint?.levels ?? tiled.levels;
  const grossSF = blueprint?.meta.grossSF ?? facts.grossSF ?? tiled.grossSF;
  const rooms = blueprint?.meta.rooms ?? tiled.rooms.length;
  const fpW = blueprint?.meta.footprintW ?? facts.footprintW ?? tiled.footprintW;
  const fpD = blueprint?.meta.footprintD ?? facts.footprintD ?? tiled.footprintD;

  // ── Control mutators — every path funnels through setFacts (auto-save follows). ──
  const setStyle = (s: (typeof STYLES)[number]) => {
    setFacts((f) => {
      // An explicit style choice is the homeowner's massing call — the record's
      // plates step aside (the genome keeps the record; fidelity shows the gap).
      const out: BuilderFacts = { ...f, style: s.key, levels: s.levels };
      delete out.plates;
      return out;
    });
    setLevel(0);
  };
  const setLevels = (n: number) => {
    setFacts((f) => {
      const out: BuilderFacts = { ...f, levels: n };
      delete out.plates;
      return out;
    });
    setLevel(0);
  };
  const setValue = (key: "beds" | "baths" | "footprintW" | "footprintD", next: number) =>
    setFacts((f) => {
      const out: BuilderFacts = { ...f, [key]: next };
      // Footprint edits re-derive gross SF from geometry — drop the stale spoken
      // value — and can never exceed the lot's coverage allowance (the record's lot).
      if (key === "footprintW" || key === "footprintD") {
        const c = clampFootprint(
          key === "footprintW" ? next : (f.footprintW ?? 50),
          key === "footprintD" ? next : (f.footprintD ?? 30),
          f.genome?.lotSF?.v,
        );
        out.footprintW = c.w;
        out.footprintD = c.d;
        delete out.grossSF;
      }
      return out;
    });
  const step = (key: "beds" | "baths" | "footprintW" | "footprintD", delta: number, min: number, max: number) => {
    const cur = (facts[key] as number | undefined) ?? (STARTER_FACTS[key] as number);
    setValue(key, Math.min(max, Math.max(min, cur + delta)));
  };
  const toggle = (key: "garage" | "office") => setFacts((f) => ({ ...f, [key]: !f[key] }));
  // One tap back to truth: restore the record's values + massing, drop overrides.
  const resetToRecord = () => {
    setFacts((f) => {
      const g = f.genome;
      if (!g) return f;
      const out: BuilderFacts = {
        ...f,
        ...(g.beds ? { beds: Math.round(g.beds.v) } : {}),
        ...(g.baths ? { baths: Math.round(g.baths.v) } : {}),
        ...(g.footprintW ? { footprintW: Math.round(g.footprintW.v) } : {}),
        ...(g.footprintD ? { footprintD: Math.round(g.footprintD.v) } : {}),
        ...(g.grossSF ? { grossSF: Math.round(g.grossSF.v) } : {}),
        levels: Math.round(g.levels.v),
        style: g.archetype.v,
      };
      const plates = genomePlates(g);
      if (plates) out.plates = plates;
      else delete out.plates;
      delete out.swaps;
      return out;
    });
    setLevel(0);
    setSelectedRoom(null);
  };
  const lotSF = facts.genome?.lotSF?.v;
  const atLotCap = !!lotSF && (facts.footprintW ?? 0) * (facts.footprintD ?? 0) >= maxFootprintSF(lotSF);

  // ── Photos enter the chain: the tax card grounds the genome (VERA), a style
  //    home shapes the build (CDA). VERA and CDA merge and recreate. ──
  const [photoBusy, setPhotoBusy] = useState<"card" | "style" | null>(null);
  // What the photo DID — silence reads as failure, so every outcome speaks.
  const [photoNote, setPhotoNote] = useState<{ text: string; warn?: boolean } | null>(null);
  const ingestPhoto = async (kind: "card" | "style") => {
    setPhotoBusy(kind);
    setPhotoNote(null);
    const res = await pickAndIngest(kind);
    setPhotoBusy(null);
    if (!res) return;
    const card = res.card;
    if (card) {
      const grounded = facts.genome?.enclosedSF ? facts.genome : null;
      if (grounded) {
        // A VGSI-grounded genome stays the truth — the photo is a SECOND source.
        // Say whether it agrees; never silently re-ground.
        const g = grounded;
        const sfOk =
          !card.livingAreaSF || !g.grossSF || Math.abs(card.livingAreaSF - g.grossSF.v) <= Math.max(25, g.grossSF.v * 0.02);
        const bedsOk = !card.beds || !g.beds || Math.round(card.beds) === Math.round(g.beds.v);
        const bathsOk = !card.baths || !g.baths || Math.round(card.baths) === Math.round(g.baths.v);
        setPhotoNote(
          sfOk && bedsOk && bathsOk
            ? { text: "🦉 record already grounded (VGSI) — your card photo confirms it" }
            : {
                text: `⚠ your card photo reads ${card.livingAreaSF?.toLocaleString() ?? "?"} SF vs record ${g.grossSF ? Math.round(g.grossSF.v).toLocaleString() : "?"} — check the address, or ↺ record`,
                warn: true,
              },
        );
        setFacts((f) => mergeFacts(f, { attributesSource: card.source }));
      } else {
        // The photo card GROUNDS the genome (towns off VGSI, or no address yet).
        setConfirmation(confirmHomeFacts({ card }));
        setPhotoNote({ text: `🦉 grounded from your tax card — ${card.subAreas?.length ?? 0} sub-area rows read` });
        setFacts((f) => {
          const genome = compressHome({ card, homeowner: f, address: f.address, cycle: f.cycle });
          const plates = genome ? genomePlates(genome) : undefined;
          return mergeFacts(f, {
            beds: card.beds,
            baths: card.baths,
            levels: card.stories,
            grossSF: card.livingAreaSF,
            style: card.style?.toLowerCase(),
            assessedValue: card.assessedValue,
            yearBuilt: card.yearBuilt,
            attributesSource: card.source,
            ...(genome ? { genome } : {}),
            ...(plates ? { plates } : {}),
            ...(genome?.levels.src === "reconciled" ? { levels: genome.levels.v } : {}),
          });
        });
      }
    }
    if (res.styleRead) {
      const sr = res.styleRead;
      setPhotoNote({
        text: `◇ style read — ${sr.style ?? "unclear"}${sr.stories ? ` · ${sr.stories} story` : ""}${sr.roof ? ` · ${sr.roof} roof` : ""}`,
      });
      setFacts((f) => {
        const out = mergeFacts(f, {
          ...(sr.style ? { style: sr.style } : {}),
          ...(sr.garage != null ? { garage: sr.garage } : {}),
          ...(sr.stories ? { levels: sr.stories } : {}),
        });
        // An explicit style read is the homeowner's massing pick — the record's
        // plates step aside when the level counts disagree.
        if (sr.stories && out.plates && out.plates.length !== sr.stories) delete out.plates;
        return out;
      });
    }
  };

  // The two studio doors ("full plan set" / "deep plan") are wired inside LedgerPlansHero
  // via the shared plan-set-index helpers, so this screen and the VC Portfolio open the
  // byte-identical render. See <LedgerPlansHero> in the OUTPUT section below.

  const sheetW = winW - 32;

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}>
        {/* Header */}
        <View className="flex-row items-center gap-3 mb-1">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ color: CDA }} className="text-[15px] font-bold">‹</Text>
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[#F9FAFB] text-lg font-extrabold leading-tight">Plan Builder</Text>
            <Text className="text-[#6B7280] text-[11px]" numberOfLines={1}>{address} · auto-saves as you build</Text>
          </View>
          {starter && !facts.outline && !facts.attributesSource ? (
            <Text style={{ color: AMBER }} className="text-[8.5px] tracking-wider border rounded px-1 py-0.5">STARTER — not your home</Text>
          ) : (
            <Text style={{ color: AMBER }} className="text-[8.5px] tracking-wider border rounded px-1 py-0.5">MODELED</Text>
          )}
        </View>
        <Text className="text-[#4B5563] text-[10.5px] mb-4 ml-6">
          Tap to shape it — the blueprint redraws itself. No CAD, no Photoshop.
        </Text>

        {/* ── The value-chain ledger — the compiled record CDA extracts from, filling
             live as VERA lands data. The spine of this whole screen. ── */}
        {built ? <LedgerSpine extract={veraRows} view={ledger} revealed={ledgerRevealed} address={facts.address} /> : null}

        {/* The blueprint-readiness gate — can CDA draw the full ~75-sheet CD set from this
            ledger yet, per discipline. Sits right under the spine it reads from. */}
        {built && readiness ? <BlueprintReadinessCard readiness={readiness} /> : null}

        {/* ── VERA-first: nothing draws until she finds the home (or the homeowner
             explicitly picks the blank canvas). No demo numbers, ever. ── */}
        {!built ? (
          <View className="rounded-2xl border px-5 py-8 items-center" style={{ borderColor: "#182135", backgroundColor: "#080b11" }}>
            {veraFetching ? (
              <>
                <ActivityIndicator color="#34D399" />
                <Text className="text-[#34D399] text-[12px] font-bold mt-3">Reading the public record…</Text>
                <Text className="text-[#6B7280] text-[10.5px] text-center mt-1">{address}</Text>
              </>
            ) : (
              <>
                <Text className="text-[#F9FAFB] text-[15px] font-extrabold text-center">Your plan builds from your real home.</Text>
                <Text className="text-[#9CA3AF] text-[11.5px] text-center leading-snug mt-2 mb-5">
                  Share your address and I pull the actual footprint and tax-card facts —
                  the plan starts from records, not guesses.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/collective-chat" as never)}
                  activeOpacity={0.85}
                  className="rounded-xl py-3 px-6 items-center mb-2 self-stretch"
                  style={{ backgroundColor: "#34D39922", borderWidth: 1, borderColor: "#34D39966" }}
                >
                  <Text className="text-[#34D399] text-[12.5px] font-bold">Share your address in Let&apos;s build →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push("/add-home" as never)}
                  activeOpacity={0.85}
                  className="rounded-xl py-3 px-6 items-center mb-4 self-stretch"
                  style={{ backgroundColor: `${CDA}14`, borderWidth: 1, borderColor: `${CDA}40` }}
                >
                  <Text style={{ color: CDA }} className="text-[12.5px] font-bold">Load your home →</Text>
                </TouchableOpacity>
                {/* Photos are a first-class door in: card = VERA, style = CDA. */}
                <View className="flex-row gap-2 mb-4 self-stretch">
                  <TouchableOpacity
                    onPress={() => void ingestPhoto("card")}
                    activeOpacity={0.85}
                    className="flex-1 rounded-xl py-3 items-center"
                    style={{ backgroundColor: "#34D39914", borderWidth: 1, borderColor: "#34D39944" }}
                  >
                    <Text className="text-[#34D399] text-[11.5px] font-bold">{photoBusy === "card" ? "🦉 reading…" : "📷 Snap your tax card"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void ingestPhoto("style")}
                    activeOpacity={0.85}
                    className="flex-1 rounded-xl py-3 items-center"
                    style={{ backgroundColor: `${CDA}14`, borderWidth: 1, borderColor: `${CDA}44` }}
                  >
                    <Text style={{ color: CDA }} className="text-[11.5px] font-bold">{photoBusy === "style" ? "◇ reading…" : "🏠 A style you love"}</Text>
                  </TouchableOpacity>
                </View>
                {photoNote ? (
                  <Text style={{ color: photoNote.warn ? AMBER : "#34D399" }} className="text-[9.5px] mb-3 text-center">{photoNote.text}</Text>
                ) : null}
                <TouchableOpacity
                  onPress={() => { setFacts((f) => ({ ...STARTER_FACTS, ...f })); setStarter(true); }}
                  activeOpacity={0.7}
                >
                  <Text className="text-[#6B7280] text-[10.5px]">or start from a blank canvas (a starter, not your home) →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
        <>
        {/* ── The one idea: Existing home (extracted from VERA's record) ⇄ Rebuild (new set). ── */}
        <View className="flex-row gap-2 mb-2">
          {([
            { key: "existing" as const, label: "Existing home" },
            { key: "rebuild" as const, label: "Rebuild →" },
          ]).map((m) => {
            const on = planMode === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => setPlanMode(m.key)}
                className="flex-1 rounded-xl py-2 items-center border"
                style={{ borderColor: on ? CDA : "#262626", backgroundColor: on ? `${CDA}18` : "#111111" }}
              >
                <Text style={{ color: on ? CDA : "#9CA3AF" }} className="text-[11px] font-bold">{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {planMode === "existing" ? (
          <Text className="text-[#6B7280] text-[9px] mb-2">
            The existing home, extracted from the public record.
            {passTwo ? <Text style={{ color: "#34D399" }}> · ✓ updated from the deep pass</Text> : null}
          </Text>
        ) : (
          <View className="rounded-xl border p-3 mb-2" style={{ borderColor: `${FIN}33`, backgroundColor: `${FIN}0A` }}>
            <Text style={{ color: FIN }} className="text-[9px] tracking-wider mb-1">◆ REBUILD — CYCLE {rebuild?.nextCycle ?? 2} (PREVIEW)</Text>
            {rebuild ? (
              <>
                <Text className="text-[#D1D5DB] text-[11px]">
                  {rebuild.sf ? `${rebuild.sf.toLocaleString()} SF` : "—"} · {rebuild.w && rebuild.d ? `${rebuild.w}×${rebuild.d}'` : "—"} · {rebuild.lv} level{rebuild.lv > 1 ? "s" : ""}
                </Text>
                <Text className="text-[#9CA3AF] text-[9.5px] mt-0.5">
                  +10% footprint · +1 level · value ×{HOME_REBUILD_MULTIPLIER}
                  {rebuild.nextVal ? ` → ~$${rebuild.nextVal.toLocaleString()}` : ""}
                </Text>
              </>
            ) : (
              <Text className="text-[#9CA3AF] text-[10px]">Find the home first — the rebuild grows from its record.</Text>
            )}
            <Text style={{ color: AMBER }} className="text-[9px] mt-1.5">The rebuild plan set is coming next — for now the plans below are the existing home.</Text>
          </View>
        )}
        {/* ── View tabs: Plan · Roof · Structure ── */}
        <View className="flex-row gap-2 mb-2">
          {(
            [
              { key: "studio", label: "Plan" },
              { key: "elevation", label: "Elevation" },
              { key: "roof", label: "Roof" },
              { key: "structure", label: "Structure" },
            ] as const
          ).map((t) => {
            const on = t.key === "studio" ? view === "studio" || view === "sketch" : view === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setView(t.key === "studio" ? "sketch" : t.key)}
                className="flex-1 rounded-xl py-2 items-center border"
                style={{ borderColor: on ? CDA : "#262626", backgroundColor: on ? `${CDA}18` : "#111111" }}
              >
                <Text style={{ color: on ? CDA : "#9CA3AF" }} className="text-[11px] font-bold">{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── The blueprint stage ── */}
        <View className="rounded-2xl overflow-hidden border" style={{ borderColor: "#182135", backgroundColor: "#080b11" }}>
          {view === "elevation" ? (
            <View className="items-center p-2">
              {/* The N/E/S/W elevations — compiled from VERA's Google Solar roof (the
                   north/south faces carry her sensed pitch). No button — auto-renders. */}
              <ElevationSet roof={roof} planes={roofPlanes} footprintW={tiled.footprintW} footprintD={tiled.footprintD} levels={tiled.levels} width={Math.min(sheetW, 360)} facadeWindows={roofFacts.facadeWindows} />
              {/* The real front elevation from the master ledger — the photo CDA's
                   computed elevations are checked against. Renders only when set. */}
              <View className="w-full mt-2">
                <FacadePhotoCard genome={planGenome} />
              </View>
            </View>
          ) : view === "roof" ? (
            <View className="items-center">
              <RoofPlanSvg roof={roof} footprintW={tiled.footprintW} footprintD={tiled.footprintD} width={Math.min(sheetW, 360)} />
            </View>
          ) : view === "structure" ? (
            <View className="items-center">
              <WallSectionSvg
                width={Math.min(sheetW, 360)}
                levels={tiled.levels}
                floorToFloorFt={f2f}
                foundationWallHeightFt={foundH}
                frostDepthIn={heights.frostDepthIn}
                reverse={reverse}
                regimeLabel={codeRegimeForYear(yearBuilt, "RI")}
              />
              <LoadSectionSvg
                roof={roof}
                load={loadPath}
                levels={tiled.levels}
                spanFt={roof.ridgeAlongW ? tiled.footprintD : tiled.footprintW}
                width={Math.min(sheetW, 360)}
              />
              {/* The PLAN-view weight distribution — bearing lines the roof loads land on. */}
              <WeightPlanSvg
                dist={weightDist}
                roof={roof}
                footprintW={tiled.footprintW}
                footprintD={tiled.footprintD}
                {...(tiled.outline ? { outline: tiled.outline } : {})}
                width={Math.min(sheetW, 360)}
              />
              <View className="w-full px-3 pb-3">
                <Text className="text-[10px] font-semibold" style={{ color: "#FFE500" }}>
                  {weightDist.headline}
                </Text>
                {weightDist.bearing.map((b) => (
                  <Text key={b.id} className="text-[9px] mt-0.5" style={{ color: "#9CA3AF" }}>
                    ▸ {b.role.replace(/-/g, " ")} · {b.plf.toLocaleString()} plf — {b.carries}
                  </Text>
                ))}
                {/* The one thing the roof geometry can't see — the homeowner answers it. */}
                <Text className="text-[9px] mt-2" style={{ color: "#6B7280" }}>
                  Your top-floor ceiling? — this sets the ridge (board vs beam):
                </Text>
                <View className="flex-row gap-2 mt-1">
                  {(["flat", "vaulted", "partial"] as const).map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setCeiling(ceiling === c ? undefined : c)}
                      className="rounded-lg px-3 py-1.5"
                      style={{ backgroundColor: ceiling === c ? "#FFE50022" : "#ffffff10", borderWidth: 1, borderColor: ceiling === c ? "#FFE500" : "#ffffff20" }}
                    >
                      <Text className="text-[10px] font-semibold" style={{ color: ceiling === c ? "#FFE500" : "#9CA3AF" }}>
                        {c === "flat" ? "Flat ceiling" : c === "vaulted" ? "Vaulted" : "Part-vaulted"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text className="text-[8px] mt-2" style={{ color: "#6B7280" }}>
                  {weightDist.caveat}
                </Text>
              </View>
            </View>
          ) : view === "studio" ? (
            // The studio render — drawn on-phone from the SAME tiled model as the editable
            // plan (dimension chains + title block), so switching back and forth translates
            // exactly (massing + facts). Read-only.
            <View className="items-center" style={{ backgroundColor: "#fff", width: "100%", paddingVertical: 6 }}>
              <FloorPlanSketch
                home={tiled}
                level={level}
                width={Math.min(sheetW, 360)}
                revealed={tiled.rooms.filter((r) => r.level === level).length}
                levelName={levelLabel(level, !!facts.plates)}
                variant="studio"
              />
            </View>
          ) : (
            // The editable plan — blueprint-styled + tappable. Tap two rooms to swap.
            <View className="items-center" style={{ backgroundColor: "#fff", width: "100%", paddingVertical: 6 }}>
              <FloorPlanSketch
                home={tiled}
                level={level}
                width={Math.min(sheetW, 360)}
                revealed={tiled.rooms.filter((r) => r.level === level).length}
                selectedId={selectedRoom}
                onRoomPress={pressRoom}
                levelName={levelLabel(level, !!facts.plates)}
                variant="blueprint"
              />
            </View>
          )}
          {fetching ? (
            <View className="absolute top-2 right-2 flex-row items-center gap-1.5 rounded-full px-2 py-1" style={{ backgroundColor: "rgba(10,10,10,0.75)" }}>
              <ActivityIndicator size="small" color={CDA} />
              <Text style={{ color: CDA }} className="text-[9px] font-bold">drawing…</Text>
            </View>
          ) : null}
        </View>

        {/* Tap-to-swap hint + structural honesty line, view-dependent. */}
        {view === "sketch" ? (
          selectedRoom ? (
            <Text style={{ color: CDA }} className="text-[9.5px] mt-1.5 font-semibold">
              ✦ {tiled.rooms.find((r) => r.id === selectedRoom)?.name ?? "room"} selected — tap another room to swap, or change its type / size below
            </Text>
          ) : (
            <Text className="text-[#9CA3AF] text-[9.5px] mt-1.5">
              Tap a room to select it — tap another to swap places, or change its type / size.
            </Text>
          )
        ) : null}

        {/* Selected-room editor — change its type and resize it (share a boundary with a neighbor). */}
        {view === "sketch" && selectedRoom
          ? (() => {
              const room = tiled.rooms.find((r) => r.id === selectedRoom);
              const nb = resizeNeighbors(tiled, selectedRoom);
              const bumpEdge = (neighborId: string, step: number) =>
                setFacts((f) => {
                  const key = resizeEdgeKey(selectedRoom, neighborId);
                  return { ...f, roomEdgeAdj: { ...(f.roomEdgeAdj ?? {}), [key]: (f.roomEdgeAdj?.[key] ?? 0) + step } };
                });
              return (
                <View className="mt-2 rounded-xl border p-2.5" style={{ borderColor: `${CDA}33`, backgroundColor: `${CDA}0A` }}>
                  {/* The room's name — rename it (Utility → "Laundry", Family Room → "Man Cave"). */}
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-[#E5E7EB] text-[12px] font-bold" numberOfLines={1}>{room?.name ?? "Room"}</Text>
                    <TouchableOpacity
                      onPress={() => { setRenameTarget(selectedRoom); setRenameText(room?.name ?? ""); }}
                      className="rounded-lg px-2 py-1 border"
                      style={{ borderColor: `${CDA}55` }}
                    >
                      <Text style={{ color: CDA }} className="text-[10px] font-semibold">✎ Rename</Text>
                    </TouchableOpacity>
                  </View>
                  <Text className="text-[#9CA3AF] text-[9px] uppercase tracking-wider mb-1.5">Change room type</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {EDITABLE_KINDS.map((k) => {
                      const cur = room?.kind === k;
                      return (
                        <TouchableOpacity
                          key={k}
                          onPress={() => {
                            setFacts((f) => ({ ...f, roomTypes: { ...(f.roomTypes ?? {}), [selectedRoom]: k } }));
                            setSelectedRoom(null);
                          }}
                          className="rounded-lg px-2.5 py-1 border"
                          style={{ borderColor: cur ? CDA : "#374151", backgroundColor: cur ? `${CDA}18` : "transparent" }}
                        >
                          <Text style={{ color: cur ? CDA : "#9CA3AF" }} className="text-[10px] font-semibold capitalize">{k}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Resize — nudge the shared boundary with the right / bottom neighbor. */}
                  {nb.right || nb.down ? (
                    <View className="flex-row items-center gap-4 mt-2.5 pt-2 border-t" style={{ borderColor: `${CDA}22` }}>
                      <Text className="text-[#9CA3AF] text-[9px] uppercase tracking-wider">Resize</Text>
                      {nb.right ? (
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-[#6B7280] text-[10px]">W</Text>
                          <TouchableOpacity onPress={() => bumpEdge(nb.right!, -1)} className="rounded-md w-6 h-6 items-center justify-center border" style={{ borderColor: "#374151" }}>
                            <Text className="text-[#9CA3AF] text-[12px]">−</Text>
                          </TouchableOpacity>
                          <Text style={{ color: CDA }} className="text-[11px] font-bold w-8 text-center">{Math.round(room?.w ?? 0)}′</Text>
                          <TouchableOpacity onPress={() => bumpEdge(nb.right!, 1)} className="rounded-md w-6 h-6 items-center justify-center border" style={{ borderColor: "#374151" }}>
                            <Text className="text-[#9CA3AF] text-[12px]">+</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                      {nb.down ? (
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-[#6B7280] text-[10px]">H</Text>
                          <TouchableOpacity onPress={() => bumpEdge(nb.down!, -1)} className="rounded-md w-6 h-6 items-center justify-center border" style={{ borderColor: "#374151" }}>
                            <Text className="text-[#9CA3AF] text-[12px]">−</Text>
                          </TouchableOpacity>
                          <Text style={{ color: CDA }} className="text-[11px] font-bold w-8 text-center">{Math.round(room?.d ?? 0)}′</Text>
                          <TouchableOpacity onPress={() => bumpEdge(nb.down!, 1)} className="rounded-md w-6 h-6 items-center justify-center border" style={{ borderColor: "#374151" }}>
                            <Text className="text-[#9CA3AF] text-[12px]">+</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })()
          : null}

        {/* Rename a room — the custom name overrides the kind default (persists in facts.roomNames). */}
        <Modal visible={renameTarget !== null} transparent animationType="fade" onRequestClose={() => setRenameTarget(null)}>
          <Pressable onPress={() => setRenameTarget(null)} className="flex-1 items-center justify-center px-6" style={{ backgroundColor: "#000000AA" }}>
            <Pressable onPress={() => {}} className="w-full rounded-2xl border p-4" style={{ borderColor: `${CDA}55`, backgroundColor: "#0B1220" }}>
              <Text style={{ color: CDA }} className="text-[10px] tracking-wider mb-2">✎ RENAME ROOM</Text>
              <TextInput
                value={renameText}
                onChangeText={setRenameText}
                placeholder="e.g. Man Cave, Laundry"
                placeholderTextColor="#4B5563"
                autoFocus
                className="rounded-lg border px-3 py-2.5 text-[13px]"
                style={{ borderColor: `${CDA}55`, color: "#E5E7EB" }}
                onSubmitEditing={commitRename}
                returnKeyType="done"
              />
              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity onPress={commitRename} className="flex-1 rounded-lg px-3 py-2.5 items-center" style={{ backgroundColor: `${CDA}22` }}>
                  <Text style={{ color: CDA }} className="text-[12px] font-semibold">Save name</Text>
                </TouchableOpacity>
                {renameTarget && facts.roomNames?.[renameTarget] ? (
                  <TouchableOpacity onPress={() => { setRenameText(""); commitRename(); }} className="rounded-lg px-3 py-2.5 items-center border" style={{ borderColor: "#4B5563" }}>
                    <Text className="text-[#9CA3AF] text-[12px]">Reset</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {view === "structure" ? (
          <View className="mt-2 gap-1">
            {/* Wall height — code/era default, homeowner-correctable; re-draws the section + loads. */}
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-[#9CA3AF] text-[11px] flex-1">
                Floor-to-floor
                {facts.floorToFloorFt == null ? <Text className="text-[#4B5563]"> · {heights.floorToFloorFt}' default</Text> : null}
              </Text>
              <TouchableOpacity onPress={() => setFloorToFloor(f2f - 0.5)} className="rounded-lg w-7 h-7 items-center justify-center border" style={{ borderColor: "#374151" }}>
                <Text className="text-[#E5E7EB] text-[14px]">−</Text>
              </TouchableOpacity>
              <Text style={{ color: CDA }} className="text-[12px] font-bold w-12 text-center">{f2f.toFixed(1)}'</Text>
              <TouchableOpacity onPress={() => setFloorToFloor(f2f + 0.5)} className="rounded-lg w-7 h-7 items-center justify-center border" style={{ borderColor: "#374151" }}>
                <Text className="text-[#E5E7EB] text-[14px]">+</Text>
              </TouchableOpacity>
            </View>
            {/* RI state building-code spec (MODELED). */}
            {(() => {
              const c = stateBuildingCode("RI");
              return (
                <Text className="text-[#6B7280] text-[9px] leading-snug mb-1">
                  🦉 RI code ({c.activeCodeRegime}) · {c.frostDepthInches}" frost · {c.groundSnowLoadPSF} psf snow · {c.designWindMPH} mph wind · SDC {c.seismicCategory} · {c.minCeilingHeightInches}" min ceiling
                </Text>
              );
            })()}
            {loadPath.stops.map((s) => (
              <View key={s.id} className="flex-row items-start gap-2">
                <Text style={{ color: "#FFE500" }} className="text-[10px] font-bold w-20">{s.label}</Text>
                <Text className="text-[#9CA3AF] text-[10px] flex-1 leading-snug">{s.story}</Text>
              </View>
            ))}
            <Text style={{ color: AMBER }} className="text-[9px] mt-1">
              MODELED · an engineer must confirm — never a stamped design
            </Text>
          </View>
        ) : null}
        {view === "roof" && hood ? (
          <Text className="text-[#34D399] text-[9.5px] mt-1.5">
            🦉 VERA · street median ≈ {hood.medianAreaSF.toLocaleString()} SF footprint · yours {Math.round(tiled.footprintW * tiled.footprintD).toLocaleString()} SF
          </Text>
        ) : null}

        {/* ── Existing mode: the bottom-up floor populator — walk each floor, confirm its rooms. ── */}
        {planMode === "existing" && (view === "sketch" || view === "studio") ? (
          <View className="mt-2 mb-3 rounded-xl border p-2.5" style={{ borderColor: `${CDA}33`, backgroundColor: `${CDA}0A` }}>
            <View className="flex-row items-center gap-2 mb-2">
              <TouchableOpacity
                onPress={() => { setSelectedRoom(null); setLevel((l) => Math.max(0, l - 1)); }}
                disabled={level <= 0}
                className="rounded-lg w-7 h-7 items-center justify-center border"
                style={{ borderColor: "#374151", opacity: level <= 0 ? 0.35 : 1 }}
              >
                <Text className="text-[#E5E7EB] text-[13px]">▽</Text>
              </TouchableOpacity>
              <View className="flex-1 items-center">
                <Text style={{ color: CDA }} className="text-[12px] font-bold">{levelLabel(level, !!facts.plates)} floor</Text>
                <Text className="text-[#6B7280] text-[8.5px]">floor {level + 1} of {levels} · bottom-up</Text>
              </View>
              <TouchableOpacity
                onPress={() => { setSelectedRoom(null); setLevel((l) => Math.min(levels - 1, l + 1)); }}
                disabled={level >= levels - 1}
                className="rounded-lg w-7 h-7 items-center justify-center border"
                style={{ borderColor: "#374151", opacity: level >= levels - 1 ? 0.35 : 1 }}
              >
                <Text className="text-[#E5E7EB] text-[13px]">△</Text>
              </TouchableOpacity>
            </View>
            {/* The rooms on this floor — tap to rename / retype (populate the floor). */}
            <View className="flex-row flex-wrap gap-1.5">
              {tiled.rooms.filter((r) => r.level === level).map((r) => {
                const sel = r.id === selectedRoom;
                return (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => setSelectedRoom(sel ? null : r.id)}
                    className="rounded-lg px-2.5 py-1 border"
                    style={{ borderColor: sel ? CDA : "#374151", backgroundColor: sel ? `${CDA}18` : "transparent" }}
                  >
                    <Text style={{ color: sel ? CDA : "#D1D5DB" }} className="text-[10px] font-semibold">{r.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="text-[#6B7280] text-[8.5px] mt-1.5">Tap a room to rename it (Utility → “Laundry”) or change its type.</Text>
            <TouchableOpacity
              onPress={() => {
                setFacts((f) => ({ ...f, floorsConfirmed: Array.from(new Set([...(f.floorsConfirmed ?? []), level])) }));
                setSelectedRoom(null);
                if (level < levels - 1) setLevel(level + 1);
              }}
              className="rounded-lg px-3 py-2 mt-2 items-center border"
              style={{ borderColor: `${FIN}55`, backgroundColor: `${FIN}14` }}
            >
              <Text style={{ color: FIN }} className="text-[11px] font-semibold">
                {(facts.floorsConfirmed ?? []).includes(level) ? "✓ Confirmed" : "✓ Confirm this floor"}{level < levels - 1 ? " → next floor △" : ""}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Stage controls: level tabs + sketch/studio toggle + reset layout */}
        <View className="flex-row items-center gap-2 mt-2 mb-4">
          {planMode !== "existing" && levels > 1 && (view === "studio" || view === "sketch")
            ? Array.from({ length: levels }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => { setSelectedRoom(null); setLevel(i); }}
                  className="rounded-lg px-2.5 py-1 border"
                  style={{ borderColor: level === i ? CDA : "#374151", backgroundColor: level === i ? `${CDA}18` : "transparent" }}
                >
                  <Text style={{ color: level === i ? CDA : "#6B7280" }} className="text-[10px] font-bold">{levelLabel(i, !!facts.plates)}</Text>
                </TouchableOpacity>
              ))
            : null}
          {(facts.swaps?.length ||
            (facts.roomTypes && Object.keys(facts.roomTypes).length) ||
            (facts.roomEdgeAdj && Object.keys(facts.roomEdgeAdj).length) ||
            facts.statedFoundation || facts.statedStuds || facts.statedExtSheathing ||
            facts.statedDrywall || facts.statedJoist || facts.statedSubfloor || facts.statedRoofSheathing) &&
          (view === "studio" || view === "sketch") ? (
            <TouchableOpacity
              onPress={() => {
                setSelectedRoom(null);
                clearApproved(addressKey); // reopen the RFI rounds
                setFacts((f) => ({
                  ...f,
                  swaps: [], roomTypes: {}, roomEdgeAdj: {},
                  statedFoundation: undefined, statedStuds: undefined, statedExtSheathing: undefined,
                  statedDrywall: undefined, statedJoist: undefined, statedSubfloor: undefined, statedRoofSheathing: undefined,
                }));
              }}
              className="rounded-lg px-2.5 py-1 border"
              style={{ borderColor: `${AMBER}55` }}
            >
              <Text style={{ color: AMBER }} className="text-[10px]">↺ reset</Text>
            </TouchableOpacity>
          ) : null}
          <View className="flex-1" />
          {view === "studio" || view === "sketch" ? (
            <TouchableOpacity onPress={() => setView((v) => (v === "studio" ? "sketch" : "studio"))} className="rounded-lg px-2.5 py-1 border" style={{ borderColor: `${CDA}44` }}>
              <Text style={{ color: CDA }} className="text-[10px]">{view === "studio" ? "editable plan ⇄" : "studio render ⇄"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* VERA's home record now lives on the home's Value Chain Portfolio page (read-only,
            assessor truth + submit-for-review). The Plan Builder is for shaping the PLANS. */}

        {/* Photos keep working after the build starts — re-ground or restyle. */}
        <View className="flex-row gap-2 mb-1">
          <TouchableOpacity onPress={() => void ingestPhoto("card")} activeOpacity={0.85} className="rounded-lg px-2.5 py-1.5 border" style={{ borderColor: "#34D39944" }}>
            <Text className="text-[#34D399] text-[10px]">{photoBusy === "card" ? "🦉 reading…" : "📷 Tax card"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void ingestPhoto("style")} activeOpacity={0.85} className="rounded-lg px-2.5 py-1.5 border" style={{ borderColor: `${CDA}44` }}>
            <Text style={{ color: CDA }} className="text-[10px]">{photoBusy === "style" ? "◇ reading…" : "🏠 Style photo"}</Text>
          </TouchableOpacity>
        </View>
        {photoNote ? (
          <Text style={{ color: photoNote.warn ? AMBER : "#34D399" }} className="text-[9.5px] mb-3">{photoNote.text}</Text>
        ) : (
          <View className="mb-3" />
        )}


        {/* ── Design controls — hidden in Existing mode (the existing home comes from the
            record, populated floor-by-floor above, not from archetype toggles). ── */}
        {planMode !== "existing" ? (
        <>
        {/* ── Style chips ── */}
        <Text className="text-[#6B7280] text-[10px] uppercase tracking-[0.16em] mb-2">Style</Text>
        <View className="flex-row gap-2 mb-4">
          {STYLES.map((s) => {
            const on = (facts.style ?? "ranch") === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                onPress={() => setStyle(s)}
                className="flex-1 rounded-xl py-2.5 items-center border"
                style={{ borderColor: on ? CDA : "#262626", backgroundColor: on ? `${CDA}18` : "#111111" }}
              >
                <Text style={{ color: on ? CDA : "#9CA3AF" }} className="text-[12px] font-bold">{s.label}</Text>
                <Text className="text-[#4B5563] text-[9px] mt-0.5">{s.levels === 1 ? "1 story" : "2 story"}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Steppers — tap a value to type it (max 6 beds · 5 baths · lot-capped dims). ── */}
        <View className="flex-row gap-2 mb-2">
          <Stepper label="Beds" value={facts.beds ?? 3} min={1} max={6} onCommit={(n) => setValue("beds", n)} onMinus={() => step("beds", -1, 1, 6)} onPlus={() => step("beds", +1, 1, 6)} />
          <Stepper label="Baths" value={facts.baths ?? 2} min={1} max={5} onCommit={(n) => setValue("baths", n)} onMinus={() => step("baths", -1, 1, 5)} onPlus={() => step("baths", +1, 1, 5)} />
        </View>
        <View className="flex-row gap-2 mb-1">
          <Stepper label="Width" value={facts.footprintW ?? 50} unit="ft" min={20} max={120} onCommit={(n) => setValue("footprintW", n)} onMinus={() => step("footprintW", -2, 20, 120)} onPlus={() => step("footprintW", +2, 20, 120)} />
          <Stepper label="Depth" value={facts.footprintD ?? 30} unit="ft" min={20} max={80} onCommit={(n) => setValue("footprintD", n)} onMinus={() => step("footprintD", -2, 20, 80)} onPlus={() => step("footprintD", +2, 20, 80)} />
        </View>
        {atLotCap ? (
          <Text style={{ color: AMBER }} className="text-[9px] mb-3">
            ⚠ capped by your lot — footprint held at 40% coverage of {Math.round(lotSF!).toLocaleString()} SF (MODELED)
          </Text>
        ) : (
          <View className="mb-3" />
        )}

        {/* ── Toggles ── */}
        <View className="flex-row gap-2 mb-5">
          <Toggle label="Garage" on={facts.garage !== false} onPress={() => toggle("garage")} />
          <Toggle label="Office" on={!!facts.office} onPress={() => toggle("office")} note="coming to blueprints" />
        </View>
        </>
        ) : null}

        {/* ── Live metrics ── */}
        <View className="flex-row gap-2 mb-2">
          {[
            { label: "Gross", value: `${Math.round(grossSF).toLocaleString()} SF` },
            { label: "Footprint", value: `${Math.round(fpW)}×${Math.round(fpD)}'` },
            { label: "Rooms", value: String(rooms) },
          ].map((m) => (
            <View key={m.label} className="flex-1 rounded-xl px-3 py-2 border" style={{ borderColor: "#1E3A5F", backgroundColor: "#0B1220" }}>
              <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider">{m.label}</Text>
              <Text style={{ color: CDA }} className="text-[14px] font-black mt-0.5">{m.value}</Text>
            </View>
          ))}
        </View>
        {/* CDA's verified packets — the board-grounded ledger entries feeding the plans. */}
        {built && packets.applied ? (
          <View className="flex-row items-center mb-2 rounded-lg px-2.5 py-1.5 border" style={{ borderColor: `${CDA}33`, backgroundColor: `${CDA}0A` }}>
            <Text style={{ color: CDA }} className="text-[9.5px] flex-1" numberOfLines={1}>
              ◆ {packets.applied} verified packet{packets.applied === 1 ? "" : "s"} → plans
            </Text>
            <Text className="text-[#6B7280] text-[8px]" numberOfLines={1}>
              {packets.packets.slice(0, 3).map((p) => p.code.replace("DES:", "")).join(" · ")}
            </Text>
          </View>
        ) : null}
        {/* ── YOUR BLUEPRINTS — the merged output. Everything CDA compiles from the
            value-chain ledger + the genome: the generations, the full NCS plan-set index
            on the phone, and the doors to the studio's hi-fi render. This is the hero. ── */}
        {built ? (
          <LedgerPlansHero
            genome={planGenome}
            facts={facts}
            footprintW={fpW}
            footprintD={fpD}
            cycle={Math.max(1, Math.round(facts.cycle ?? 1))}
            onSelectCycle={(n) => setFacts((f) => ({ ...f, cycle: n }))}
          />
        ) : null}

        {/* ── Doors out ── */}
        <TouchableOpacity
          onPress={() => router.push(`/collective-chat?plan=${encodeURIComponent(addressKey)}` as never)}
          activeOpacity={0.85}
          className="rounded-2xl py-3.5 items-center mb-2.5"
          style={{ backgroundColor: `${FIN}1F`, borderWidth: 1.5, borderColor: `${FIN}66` }}
        >
          <Text style={{ color: FIN }} className="text-[13px] font-extrabold">Talk it through with the collective →</Text>
        </TouchableOpacity>

        {/* Build logic — how CDA drew this (Layer 1 + Layer 2), collapsed and out of the
            way so the blueprint output leads. Kept, not cut — one tap opens the narration. */}
        <BuildLogicGroup
          trace={trace}
          deepPass={layer2}
          address={facts.address ?? home?.address}
          addressKey={addressKey}
          onListingShot={() => void ingestPhoto("card")}
        />
        </>
        )}
      </ScrollView>
    </View>
  );
}

function Stepper({ label, value, unit, min, max, onCommit, onMinus, onPlus }: { label: string; value: number; unit?: string; min: number; max: number; onCommit: (n: number) => void; onMinus: () => void; onPlus: () => void }) {
  return (
    <View className="flex-1 rounded-xl px-3 py-2.5 border flex-row items-center" style={{ borderColor: "#262626", backgroundColor: "#111111" }}>
      <View className="flex-1">
        <Text className="text-[#6B7280] text-[9px] uppercase tracking-wider">{label}</Text>
        <EditableValue value={value} min={min} max={max} label={label} {...(unit ? { unit } : {})} onCommit={onCommit} />
      </View>
      <TouchableOpacity onPress={onMinus} className="rounded-lg w-8 h-8 items-center justify-center border mr-1.5" style={{ borderColor: "#374151" }}>
        <Text className="text-[#9CA3AF] text-[15px]">−</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPlus} className="rounded-lg w-8 h-8 items-center justify-center" style={{ backgroundColor: `${CDA}22`, borderWidth: 1, borderColor: `${CDA}55` }}>
        <Text style={{ color: CDA }} className="text-[15px]">+</Text>
      </TouchableOpacity>
    </View>
  );
}

function Toggle({ label, on, onPress, note }: { label: string; on: boolean; onPress: () => void; note?: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-1 rounded-xl px-3 py-2.5 border flex-row items-center justify-between"
      style={{ borderColor: on ? `${CDA}55` : "#262626", backgroundColor: on ? `${CDA}12` : "#111111" }}
    >
      <View>
        <Text style={{ color: on ? CDA : "#9CA3AF" }} className="text-[12px] font-bold">{label}</Text>
        {note ? <Text className="text-[#4B5563] text-[8.5px] mt-0.5">{note}</Text> : null}
      </View>
      <View className="rounded-full w-9 h-5 px-0.5 justify-center" style={{ backgroundColor: on ? CDA : "#262626" }}>
        <View className="rounded-full w-4 h-4" style={{ backgroundColor: "#0A0A0A", alignSelf: on ? "flex-end" : "flex-start" }} />
      </View>
    </TouchableOpacity>
  );
}
