import { useMemo, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, router } from "expo-router";
import { buildChain, wallInventoryFromFacts, deriveSystemTakeoff, custodianOverlook } from "@ml-systems/types";
import { trpc } from "@/lib/trpc";
import { useDrawer } from "@/lib/drawer";
import { useViewMode, useLeanHomeowner } from "@/lib/view-mode";
import { useLocalHome } from "@/lib/home-store";
import { OrbitalPortfolio } from "@/components/orbital-portfolio";
import { ValueChain } from "@/components/value-chain";
import { LoanPitCard, type MyLoan } from "@/components/pit/loan-pit-card";
import { DeconGateCard } from "@/components/pit/decon-gate-card";
import { RebuildAssessmentCard } from "@/components/pit/rebuild-assessment-card";
import { useDeconAnswer } from "@/lib/decon-intent-store";
import { isBridge } from "@/lib/pit-bridge";
import { PORTFOLIO_THEMES, PORTFOLIO_ORDER } from "@/lib/portfolio-theme";
import { useSavedPlans } from "@/lib/plan-store";
import { normalizeAddress, dedupeAddressKey } from "@/lib/jspace-facts";
import { useMeasurements } from "@/lib/measurements-store";
import { useDeepFindings } from "@/lib/deep-search-store";
import { factsFromFindings } from "@/lib/findings-facts";
import { useHomeLedger } from "@/lib/use-home-ledger";
import { ensureDeepSearch } from "@/lib/auto-deep-search";
import { LedgerSpine } from "@/components/ledger-spine";
import { LedgerOpenTasks } from "@/components/ledger-open-tasks";
import { FacadePhotoCard } from "@/components/facade-photo-card";
import { veraExtract } from "@/lib/vera-extract";
import { computeRoof } from "@/lib/roof-structure";
import { BuildTraceCard } from "@/components/build-trace-card";
import { CustodianBuildGuideCard } from "@/components/custodian-build-guide-card";
import { RecordPanel } from "@/components/record-panel";
import { DeepSearchCard } from "@/components/deep-search-card";
import { SymbiosisCard } from "@/components/symbiosis-card";
import { ReverseTakeoffCard } from "@/components/reverse-takeoff-card";
import { FidelityCard } from "@/components/fidelity-card";
import { BlueprintReadinessCard } from "@/components/blueprint-readiness-card";
import { MurphyTrackerCard } from "@/components/murphy-tracker-card";
import { ProjectRequestCard } from "@/components/project-request-card";
import { LedgerPlansHero } from "@/components/ledger-plans-hero";
import { resolvePlanGenome } from "@/lib/plan-set-index";

/** The first homeowner journey — input → the minds → decon → rebuild → this page. */
const JOURNEY_STAGES = ["Homeowner input", "The minds", "Decon", "Rebuild", "Portfolio"] as const;
const STAGE_BY_STATUS: Record<string, number> = {
  lead: 0,
  loan_origination: 1,
  deconstruction: 2,
  construction: 3,
  complete: 4,
  resold: 4,
};

// The heavy cosmic Three.js scenes are served from the marketing site (whose CSP
// allows the jsdelivr Three.js the scenes use). The phone's primary view is the
// native OrbitalPortfolio below; this is the optional "full scene" link-out.
const BASE = "https://mlsystemsri.com";

export default function Portfolio() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  const mode = useViewMode();
  // The LEAN SANDBOX (Sal 9/1): the admin's homeowner toggle is a working fresh
  // install — it starts zeroed, and his walkthrough home (the sandbox slice of
  // home-store/plan-store) drives this page exactly like a real user's would.
  // SERVER data (his real account: loans, equity, market, project ids) stays out,
  // and nothing compiled here persists to the server — the Custodian's Whitehall
  // ledger is never touched from this lens.
  const lean = useLeanHomeowner();

  // The REAL home drives the portfolio — the chain is built AFTER the saved plan
  // resolves (below), so VERA's assessed value can power it when the homeowner
  // never typed an estimate. In lean this hook already returns the SANDBOX home.
  const localHome = useLocalHome();
  // Current journey stage from the live project status (fail-soft to stage 0).
  const equityQ = trpc.equity.getMine.useQuery(undefined, { retry: 0 });
  // Lean = the fresh install: the journey starts at "Homeowner input", whatever this
  // account's real project has reached.
  const stageIdx = lean ? 0 : STAGE_BY_STATUS[String(equityQ.data?.project?.status ?? "")] ?? 0;

  // MIA — the portfolio's hand-off to the Builder's Open House: this home's live
  // market state (homeCatalogue) + the second-pass systems read (assemblies, not
  // sticks), derived on-device from the home's facts. Pure + fail-soft.
  const hcQ = trpc.store.homeCatalogue.useQuery(undefined, { retry: 0 });
  const feedHomes: any[] = Array.isArray(hcQ.data?.homes) ? hcQ.data.homes : [];
  const marketHome = lean
    ? null // fresh install — no harvest on the market yet
    : feedHomes.find((h) => equityQ.data?.project?.id && h.projectId === equityQ.data.project.id) ??
      feedHomes[0] ?? null;
  const systems = useMemo(() => {
    if (!localHome?.sqft) return null;
    const walls = wallInventoryFromFacts({ grossSF: localHome.sqft, levels: 2 });
    if (!walls) return null;
    const sys = deriveSystemTakeoff(walls);
    return sys.lines.length ? sys : null;
  }, [localHome]);
  const sysUpliftPct = systems && systems.totals.pieceValueCents > 0
    ? Math.round((systems.totals.upliftCents / systems.totals.pieceValueCents) * 100)
    : 0;

  // Deep-link params (e.g. Hub "See in 3D"): ?theme=&phase=&name= pick which
  // full web scene the optional launcher opens.
  const params = useLocalSearchParams<{ theme?: string; phase?: string; name?: string; projectId?: string }>();

  // ── Custodian lens with no route params lands on THE active VC home — the one the
  // console holds up (the flagship home; the rest are saved). Server truth, not whichever
  // home this device last held. Admin-gated query, fail-soft for everyone else.
  const vcListQ = trpc.vc.list.useQuery(undefined, { enabled: mode === "custodian", retry: 0 });
  const vcHomes = Array.isArray(vcListQ.data?.homes)
    ? (vcListQ.data.homes as { projectId: string; address: string | null; vcArchivedAt?: string | null }[])
    : [];
  const activeVc =
    mode === "custodian" && !params.projectId && !params.name
      ? vcHomes.find((h) => !h.vcArchivedAt)
      : undefined;

  // This home's loan pit(s) — the same LP surface as under the Hub value-chain home.
  const loansQ = trpc.pit.getMyLoans.useQuery(undefined, { retry: 0 });
  // Lean: a fresh install has no loans — the account's real pits stay out of the preview.
  const homeLoans = lean
    ? []
    : (Array.isArray(loansQ.data) ? (loansQ.data as MyLoan[]) : []).filter(
        (m) => !params.projectId || m.projectId === params.projectId,
      );
  // PIT LORD's decon gate — this page and the Hub are the two control surfaces.
  // Own home (or a local record) without a bridge → ask: are you deconstructing?
  const ownProjectId = equityQ.data?.project?.id ?? null;
  const isOwnView = !params.projectId || params.projectId === ownProjectId || params.projectId.startsWith("local:");
  // Lean = the SANDBOX home (or nothing yet); custodian defaults to the console's
  // one active VC home. Route params still win, so a lean surface can deep-link its
  // own walkthrough home.
  const gateAddress = params.name ?? (lean ? null : activeVc?.address) ?? localHome?.address ?? null;
  const hasBridge = homeLoans.some((m) => isBridge(m.loan.loanType));
  const showDeconGate = isOwnView && !!gateAddress && !hasBridge;

  // ── The compiled output — ALL the J-Space agent output, dumped into this home's
  // value-chain entry. The saved plan (the same build the collective/Plan Builder
  // grew) recomputes into the identical artifacts, so this page IS the compiled
  // record: Layer 1 (the build trace), Layer 2 (the deep pass), the reverse takeoff,
  // fidelity, and MURPHY's project tracker. No plan for this address → a soft CTA.
  const plans = useSavedPlans();
  const artifactAddress = gateAddress ?? undefined;
  // THE plan for this home, across spellings ("Dr" ≡ "Drive", street line vs full
  // address): match on dedupeAddressKey, then let the PLAN's own address drive
  // every per-address store — measurements, findings, decon intent stay aligned
  // even when navigation used the catalogue spelling.
  const savedPlan = useMemo(() => {
    if (!artifactAddress) return null;
    const key = dedupeAddressKey(artifactAddress);
    return plans.find((p) => dedupeAddressKey(p.address) === key) ?? null;
  }, [plans, artifactAddress]);
  const planAddress = savedPlan?.address ?? artifactAddress;
  const addressKey = savedPlan?.addressKey ?? (artifactAddress ? normalizeAddress(artifactAddress) : "");
  // Layer 2 — once decon is real (bridge holds or answered yes), PIT LORD assesses
  // the REBUILD with MURPHY: avg-cost assessment + the construction draft lanes.
  const deconAnswer = useDeconAnswer(planAddress ?? undefined);
  const showRebuild = isOwnView && (hasBridge || deconAnswer === "yes");
  const meas = useMeasurements(planAddress);
  // One address = the whole collection (Sal 9/1): homes that arrived via add-home get
  // the same auto sweep the chat fires — idempotent, findings are the marker.
  useEffect(() => {
    if (planAddress) ensureDeepSearch(planAddress);
  }, [planAddress]);
  // The self-update seam: when VERA's owl lands Layer-2 findings, they translate
  // into facts (findings-facts.ts) and merge into the plan BEFORE the artifact
  // recompute — so REAPER's tonnage, MIA's systems, the trace and deep pass all
  // refresh in place. Homeowner tape always wins: the satellite-measured roof
  // only fills roofSF when there's no real measurement.
  // The ONE compile, shared with the chat and the Plan Builder (lib/use-home-ledger.ts).
  // This screen's assembly was the correct one; it now lives in the hook so it cannot be
  // copied wrong a fourth time. Same merge, same artifacts, same persisted ledger.
  const ledger = useHomeLedger({
    address: planAddress,
    // The route already carries which home this is (?projectId= from the Hub and VC
    // Homes). Nothing read it, so the ledger resolved to the caller's NEWEST project
    // instead — a different house, or none. That is why this page was blank.
    // Lean carries NOTHING — no address above, no project here — so the view is the
    // zeroed template. Custodian with no params pins to the console's active home.
    ...(!lean && typeof params.projectId === "string" && !params.projectId.startsWith("local:")
      ? { projectId: params.projectId }
      : !lean && activeVc?.projectId
        ? { projectId: activeVc.projectId }
        : {}),
    savedFacts: savedPlan?.facts,
    hasSavedPlan: !!savedPlan,
    // Never write a ledger while looking at someone else's home.
    persist: isOwnView && !lean,
    ...(deconAnswer ? { deconAnswer } : {}),
  });
  const planFacts = ledger.facts;
  const artifacts = ledger.artifacts;
  const hasCompiled = ledger.hasCompiled;

  // The compression + persist now happen inside the hook, so every surface writes the
  // same bytes and the stored record can't flip depending on who synced last.
  const storedOnt = ledger.stored;

  // ── The blueprint OUTPUT, shared with the Plan Builder. Same recipe (resolvePlanGenome),
  //    same doors (LedgerPlansHero) — so the hero at the bottom of this page opens the
  //    byte-identical studio plan set. cycle is a read-only preview selector here.
  const planGenome = useMemo(
    () =>
      resolvePlanGenome({
        localGenome: planFacts.genome,
        storedGenome: ledger.stored?.genome,
        storedOntology: ledger.stored?.ontology,
        localAddress: planFacts.address,
      }),
    [planFacts.genome, planFacts.address, ledger.stored],
  );
  const [cycle, setCycle] = useState(1);
  // VERA's extraction rows — the readable top half of the spine (address, footprint,
  // height, roof, elevations), each carrying the source that earned it.
  const ledgerRows = useMemo(
    () =>
      veraExtract({
        facts: planFacts,
        // The drawn layout (RoofLayout), which already carries the classification's
        // form/pitch/heights — the same object the Plan Builder's spine reads.
        roof: computeRoof(planFacts),
        planes: artifacts.roof?.planes ?? [],
        genome: planFacts.genome,
      }),
    [planFacts, artifacts.roof],
  );

  // ── The REAL chain — once VERA runs, the portfolio shows THE ENTRY, not the
  // example. Value falls back through the honest sources: the homeowner's typed
  // estimate → VERA's assessed value on the saved plan's genome → the catalogue's
  // harvest estimate. Only when ALL are absent does the badged example render.
  const chainValueDollars =
    localHome?.estValueDollars ??
    (planFacts.genome?.assessedValue?.v != null ? Math.round(planFacts.genome.assessedValue.v) : undefined) ??
    (marketHome?.estValueCents ? Math.round(marketHome.estValueCents / 100) : undefined);
  const chainAddress = planAddress ?? localHome?.address;
  const chainHome = useMemo(
    () =>
      chainValueDollars != null && chainAddress
        ? {
            address: [chainAddress, localHome?.city].filter(Boolean).join(" · "),
            acquisitionPrice: chainValueDollars,
            expansions: 1,
          }
        : null,
    [chainValueDollars, chainAddress, localHome?.city],
  );
  const realChain = useMemo(() => (chainHome ? buildChain([chainHome]) : null), [chainHome]);
  const isReal = !!realChain;
  // REAL or nothing (Sal 9/1: the example chain is removed everywhere). The orbital
  // simply doesn't render until this homeowner's own chain exists — no fictional
  // houses, no example numbers, whatever the lens.
  const chain = realChain;
  const qs: string[] = [];
  if (params.phase) qs.push(`phase=${encodeURIComponent(params.phase)}`);
  if (params.name) qs.push(`name=${encodeURIComponent(params.name)}`);
  const qStr = qs.length ? `?${qs.join("&")}` : "";
  const openScene = (file: string, accent: string) =>
    WebBrowser.openBrowserAsync(`${BASE}/time-matrix/${file}${qStr}`, {
      toolbarColor: "#0A0A0A",
      controlsColor: accent,
    });

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pt-3 pb-1">
        <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text className="text-[#93a89b] text-2xl leading-none">☰</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[#F9FAFB] text-lg font-extrabold leading-tight">The Value Chain Portfolio</Text>
          <Text style={{ color: "#22C55E" }} className="text-[11px]">Orbital · your Value Chain in motion</Text>
        </View>
        <Text
          style={{ color: "#22C55E", borderColor: "#22C55E40", backgroundColor: "#22C55E1A" }}
          className="text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1 border"
        >
          {mode === "homeowner" ? "Homeowner" : "Custodian"}
        </Text>
      </View>

      <View className="px-4 pt-2">
        {/* ── THE LEDGER LEADS. It is the source of truth this whole page grounds on, so
            the homeowner meets it first: VERA's extraction rows, then the coded entries
            with their confidence bars — the same spine the Plan Builder draws from. ── */}
        {ledger.view.hasData || ledger.view.missing.length ? (
          <View className="mb-3">
            <LedgerSpine
              extract={ledgerRows}
              view={ledger.view}
              revealed={ledgerRows.length + 99}
              showLink={false}
              address={planAddress ?? undefined}
            />
          </View>
        ) : null}

        {/* The answerable asks now live INSIDE the ledger above. What stays out here is
            the one ask no agent can ever close: walking into the town hall for the
            plans on file. It is a different kind of thing from a tap-to-answer chip. */}
        <LedgerOpenTasks
          openTasks={(ledger.ontology ?? ledger.stored?.ontology)?.openTasks}
          address={planAddress ?? undefined}
          only="town"
          title="THE ONE THING ONLY YOU CAN GET"
        />

        {/* ── The real front elevation, ON the ledger — the facade CDA reads against.
            Rides the persisted genome (vc_ontology.genome); renders only when set. ── */}
        <FacadePhotoCard genome={ledger.facts.genome} />

        {/* ── Then the record it is built on — the tax assessor's card. Read-only here;
            a disagreement goes in as a correction rather than an edit. ── */}
        {planFacts.genome ? (
          <View className="mb-4">
            <RecordPanel facts={planFacts} genome={planFacts.genome} readOnly addressKey={addressKey} />
          </View>
        ) : null}

        {/* The First Homeowner Journey — this page is the OUTPUT of the loop. */}
        <View className="rounded-2xl px-4 py-3.5 mb-4" style={{ backgroundColor: "#111111", borderWidth: 1, borderColor: "#22C55E33" }}>
          <Text className="text-[#22C55E] text-[10px] font-bold uppercase tracking-wider mb-1.5">
            The First Homeowner Journey{params.name ? ` · ${params.name}` : ""}
          </Text>
          <View className="flex-row items-center flex-wrap mb-1.5">
            {JOURNEY_STAGES.map((stage, i) => (
              <View key={stage} className="flex-row items-center">
                <Text
                  style={{ color: i <= stageIdx ? "#22C55E" : "#4B5563" }}
                  className={`text-[10.5px] ${i === stageIdx ? "font-extrabold" : "font-semibold"}`}
                >
                  {stage}
                </Text>
                {i < JOURNEY_STAGES.length - 1 ? (
                  <Text className="text-[#374151] text-[10px] mx-1.5">→</Text>
                ) : null}
              </View>
            ))}
          </View>
          <Text className="text-[#6B7280] text-[10.5px] leading-snug">
            This portfolio is the output — you put your home in, the agents do their magic,
            we decon and rebuild, and the value chain compounds.
          </Text>
        </View>

        {/* MIA — on the market: the portfolio flows into the Builder's Open House
            compilation. Live market state + the second-pass systems read. */}
        <TouchableOpacity
          onPress={() => router.push("/store" as any)}
          activeOpacity={0.85}
          className="rounded-2xl px-4 py-3.5 mb-4"
          style={{ backgroundColor: "#14B8A60D", borderWidth: 1, borderColor: "#14B8A633" }}
        >
          <View className="flex-row items-center gap-2 mb-1">
            <Text style={{ color: "#14B8A6", fontSize: 13 }}>◈</Text>
            <Text className="text-[#F9FAFB] text-[12.5px] font-bold flex-1">On the market — Builder's Open House</Text>
            <Text style={{ color: "#14B8A6" }} className="text-[13px]">→</Text>
          </View>
          {marketHome ? (
            <Text style={{ color: "#14B8A6" }} className="text-[10.5px]">
              {marketHome.materialsCount ?? 0} material{(marketHome.materialsCount ?? 0) === 1 ? "" : "s"} catalogued
              {marketHome.activeListingCount ? ` · ${marketHome.activeListingCount} live` : ""}
              {marketHome.estValueCents ? ` · est. $${Math.round(marketHome.estValueCents / 100).toLocaleString()} harvest` : ""}
            </Text>
          ) : (
            <Text className="text-[#6B7280] text-[10.5px]">the record compiles here as the harvest stages</Text>
          )}
          {systems ? (
            <Text className="text-[#9CA3AF] text-[10px] mt-1">
              🪞 second pass · {systems.lines.reduce((n, l) => n + l.count, 0)} sellable systems — as assemblies $
              {Math.round(systems.totals.assemblyValueCents / 100).toLocaleString()} vs sticks $
              {Math.round(systems.totals.pieceValueCents / 100).toLocaleString()} (+{sysUpliftPct}%)
            </Text>
          ) : null}
        </TouchableOpacity>

        {/* Projects you need done — the homeowner's free-form intake. A request
            enters the chain as a real record and routes to the minds; a whole-home
            decon+rebuild threads into the gate / assessment / tracker below. */}
        <View className="mb-4">
          <ProjectRequestCard address={planAddress ?? gateAddress} projectId={lean ? null : params.projectId ?? ownProjectId} />
        </View>

        {/* This home's Loan Pit — financing communicates from the home it funds.
            No bridge yet on your own home → PIT LORD's decon gate asks the one
            question; yes = he builds the $10k bridge. */}
        {homeLoans.length || showDeconGate || showRebuild ? (
          <View className="mb-4">
            <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#EF4444]">🐉 This home's loan pit</Text>
            {homeLoans.map((m) => <LoanPitCard key={m.loan.id} m={m} />)}
            {showDeconGate ? (
              <View className={homeLoans.length ? "mt-1.5" : undefined}>
                <DeconGateCard address={planAddress ?? gateAddress} projectId={params.projectId ?? ownProjectId} />
              </View>
            ) : null}
            {showRebuild ? (
              <View className="mt-1.5">
                <RebuildAssessmentCard
                  address={planAddress ?? gateAddress}
                  projectId={params.projectId ?? ownProjectId}
                  homeLoans={homeLoans}
                  currentValueDollars={chainValueDollars}
                  geo={{
                    grossSF: planFacts.grossSF ?? planFacts.genome?.grossSF?.v,
                    levels: planFacts.levels ?? planFacts.genome?.levels?.v,
                    footprintW: planFacts.footprintW ?? planFacts.genome?.footprintW?.v,
                    footprintD: planFacts.footprintD ?? planFacts.genome?.footprintD?.v,
                    cycle: planFacts.genome?.cycle,
                  }}
                  reverse={artifacts.reverse}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── The compiled output — every mind's read, dumped into this entry. ── */}
        <View className="mb-4">
          <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#60A5FA]">
            ◇ The build logic{params.name ? ` · ${params.name}` : ""}
          </Text>
          {/* The ledger and the assessor card now lead this page — see the top. This
              section is what the agents DERIVED from them. */}
          {hasCompiled ? (
            <>
              {/* The Custodian leads the build logic — on top, carrying his overlook. */}
              <CustodianBuildGuideCard
                overlook={custodianOverlook({
                  genome: planFacts.genome,
                  fidelity: artifacts.fidelity,
                  swarm: {
                    commonalities: artifacts.swarmReport.commonalities.length,
                    conflicts: artifacts.swarmReport.conflicts.length,
                    opsApplied: artifacts.swarmReport.opsApplied,
                  },
                })}
                stageCount={artifacts.trace.length}
                hasHome
              />
              {/* Layer 1 — the first pass, intake → fidelity. */}
              <BuildTraceCard trace={artifacts.trace} />
              {/* Layer 2 — MERGED BY THE CUSTODIAN: his overlook of the VERA × CDA
                  handshake → the symbiosis (swarm) → the deep pass → the owl's sources,
                  one panel. */}
              <DeepSearchCard address={artifactAddress} addressKey={addressKey} deepPass={artifacts.layer2} />
              {/* Layer 2 — the deeper server-side VERA ⇄ CDA symbiosis (Claude vision). */}
              <SymbiosisCard address={artifactAddress} styleName={planFacts.style} />
              {/* VERA's reverse takeoff + fidelity — read-only here (Plan Builder edits). */}
              <ReverseTakeoffCard reverse={artifacts.reverse} tonnage={artifacts.reverseTons} />
              {artifacts.fidelity ? <FidelityCard report={artifacts.fidelity} /> : null}
              {/* The blueprint-readiness gate — how close this ledger is to a full CD set,
                  per discipline. The Custodian's read of the CDA handoff. */}
              {ledger.readiness ? <BlueprintReadinessCard readiness={ledger.readiness} /> : null}
              {/* MURPHY — the project tracker off his rebuild sequence. On the
                  homeowner's OWN verified project it flips live: server milestones
                  + backend-synced scheduling, VERA bounding the stated numbers. */}
              <MurphyTrackerCard
                addressKey={addressKey}
                reverse={artifacts.reverse}
                currentValueDollars={savedPlan?.facts.genome?.assessedValue?.v ?? localHome?.estValueDollars}
                grossSF={savedPlan?.facts.grossSF ?? savedPlan?.facts.genome?.grossSF?.v}
                serverProjectId={isOwnView ? ownProjectId : null}
                address={planAddress ?? null}
                geo={{
                  footprintW: planFacts.footprintW ?? planFacts.genome?.footprintW?.v,
                  footprintD: planFacts.footprintD ?? planFacts.genome?.footprintD?.v,
                  levels: planFacts.levels ?? planFacts.genome?.levels?.v,
                  ...(planFacts.grossSF ?? planFacts.genome?.grossSF?.v
                    ? { grossSF: planFacts.grossSF ?? planFacts.genome?.grossSF?.v }
                    : {}),
                  ...(ledger.measurements ?? {}),
                }}
              />
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    (artifactAddress
                      ? `/plan-builder?plan=${encodeURIComponent(addressKey)}`
                      : "/plan-builder") as any,
                  )
                }
                activeOpacity={0.85}
                className="rounded-2xl px-4 py-3.5 flex-row items-center"
                style={{ backgroundColor: "#60A5FA0D", borderWidth: 1, borderColor: "#60A5FA33" }}
              >
                <Text className="text-[#9CA3AF] text-[11.5px] flex-1 pr-3">
                  No build logic yet for this home — open it in the Plan Builder and the minds
                  compile the record here.
                </Text>
                <Text style={{ color: "#60A5FA" }} className="text-lg">→</Text>
              </TouchableOpacity>
              {/* VERA belongs on the entry from day one — the owl only needs an
                  address; her findings persist here before any plan compiles. */}
              {artifactAddress ? <DeepSearchCard address={artifactAddress} addressKey={addressKey} /> : null}
            </>
          )}
        </View>

        {/* The native orbital — driven by the REAL Value Chain once VERA runs; the
            example renders badged ONLY for a home we know nothing about. A known home
            with no price shows no orbital rather than someone else's numbers. */}
        {chain ? (
          <OrbitalPortfolio chain={chain} isReal={isReal} mode={mode === "homeowner" ? "homeowner" : "custodian"} />
        ) : null}

        {/* Value Chain — the equity journey, fed the SAME resolved home. */}
        <View className="mt-6">
          <ValueChain home={chainHome ?? undefined} />
        </View>

        {/* 3D renders — pick any cosmic scene (opens the full WebGL in browser). */}
        <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mt-6 mb-3">
          3D Renders · {PORTFOLIO_ORDER.length} scenes
        </Text>
        <View className="flex-row flex-wrap justify-between">
          {PORTFOLIO_ORDER.map((key) => {
            const th = PORTFOLIO_THEMES[key];
            return (
              <TouchableOpacity
                key={key}
                onPress={() => openScene(th.file, th.accent)}
                activeOpacity={0.85}
                className="rounded-2xl p-3.5 mb-3"
                style={{ width: "48.5%", borderWidth: 1, borderColor: `${th.accent}40`, backgroundColor: `${th.accent}10` }}
              >
                <View className="flex-row items-center gap-2 mb-1.5">
                  <Text style={{ color: th.accent, fontSize: 16 }}>✦</Text>
                  <Text className="text-[#F9FAFB] text-[13px] font-bold flex-1" numberOfLines={1}>
                    {th.label}
                  </Text>
                  <Text style={{ color: th.accent }} className="text-[11px]">↗</Text>
                </View>
                <Text className="text-[#6B7280] text-[10.5px] leading-snug">{th.blurb}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text className="text-[#374151] text-[10px] text-center mt-1">
          Heavy WebGL · opens in browser
        </Text>

        {/* ── YOUR BLUEPRINTS — the compiled output, identical to the Plan Builder's hero.
            Same genome, same doors: "View full plan set" / "Deep plan" open the exact same
            studio render. Renders once the ledger has compiled and a genome exists. ── */}
        {hasCompiled && planGenome ? (
          <View className="mt-6">
            <LedgerPlansHero
              genome={planGenome}
              facts={planFacts}
              footprintW={planFacts.footprintW ?? artifacts.tiled.footprintW}
              footprintD={planFacts.footprintD ?? artifacts.tiled.footprintD}
              cycle={cycle}
              onSelectCycle={setCycle}
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
