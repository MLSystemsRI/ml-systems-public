# Ontology — Source Brief

> **Purpose.** Writing brief for posts about the Collective Ontology, the Master Ledger and the Seven
> Minds. If you are Claude Cowork drafting or posting on this subject, read this first, then
> [`../deconstruction-lab/source-brief.md`](../deconstruction-lab/source-brief.md) — it carries the
> company-wide rules (reality labels, required phrasings, tone, and the twelve do-not-publish
> categories) and is not repeated here. This file adds what is specific to the ontology.

Companion files: [`families.json`](families.json) (the seven families, every slot, generated — do
not hand-edit) · [`master-ledger-workflow.html`](master-ledger-workflow.html) (the diagram) ·
[`articles/`](articles/) (drafts) · [`../docs/the-seven-families.md`](../docs/the-seven-families.md),
[`../docs/collective-ontology.md`](../docs/collective-ontology.md), [`../docs/master-ledger.md`](../docs/master-ledger.md).

---

## Facts you may state as MEASURED

- There are **seven** code families: `FIN · DEC · DES · BLD · MKT · VER · LUP`. Until 2026-09 the
  public docs named three (`DES`, `BLD`, `VER`); the engine has always shipped seven.
- Code grammar is **`SECTION:task`** — uppercase phase, one colon, lowercase task token. The prefix
  is the phase. *Extend codes, not storage.*
- The shipped template has **46 slots** (45 fixed plus a dynamic `BLD:<assembly>` row). Per family:
  DES 18 · VER 10 · BLD 7 · DEC 4 · LUP 4 · FIN 1 · MKT 1.
- A ledger entry holds **claims**, not values. A claim = who made it + the evidence grade + the
  value. Evidence ladder: `measured 90 · sensed 85 · stated 80 · record 70 · modeled 60`.
- **Claimants today:** `custodian · homeowner · vera · cda · pi · record`. REAPER, PIT LORD, MURPHY
  and MIA cannot author a claim today.
- **Five seats** ground an entry: 🏠 homeowner · 📋 record · 🦉 VERA · 🌱 PI · ⚖ Custodian.
  *Lit means input, not agreement.* CDA holds no seat, by design.
- **Four authority domains:** `interior` (homeowner leads) · `legal-record` (record leads) ·
  `exterior-geo` (VERA leads) · `derived` (VERA leads). The Custodian leads every domain.
- Reconciliation states: `confirmed · reconciled · single-source · conflict · unverified`. A
  `conflict` is quarantined and may not be consumed downstream.
- Two keys: the homeowner's and the Custodian's, bound to a content hash. Change the content, both
  lapse. *Stamp or override* — an override enters the record as the Custodian's own claim.
- Topology: `FIN → DEC → DES → BLD → VER → LUP`, `MKT` off `DEC`, and **`LUP → FIN`** — the loop.

## Facts you must state as PROPOSED (design, not shipped)

- Four new claimants — `reaper · pit-lord · murphy · mia` — as **claimants without seats**.
- Two new domains — `intent` (homeowner-led) and `market` (record / MIA-led).
- The **29 proposed slots** in `families.json` marked `status: proposed`. Name them freely; never
  imply they are live.

Say "proposed" or "designed", never "now supports" or "has added", for anything in this list.

## Canonical wording — use verbatim

- **LUP** is *loop*, not an acronym. "The equity loop — the homeowner's choice to keep building,
  on this home or another."
- **Claimants without seats** — "a mind may claim; it may never ground."
- **The rule** — "Every mind claims. Five seats ground. VERA gates. Only the Custodian stamps."
- **Lit means input, not agreement.**
- **Extend codes, not storage.**
- The family names: Finance · Deconstruction · Design · Build · Market · Verify · Equity Loop.
- The code is **`DEC`**, never `DCON`. The prose name is Deconstruction.
- REAPER, canonically: "ML Systems' scheduling engine, which compiles job sequences as a directed
  acyclic graph" — and, in product prose, the deconstruction mind.

## Do not publish (ontology-specific additions to the twelve categories)

1. **File paths, function names, table names or migration names** from the private engine. Say
   "the engine" or "the template". The public `families.json` has these stripped on purpose.
2. **The Custodian's example values** per slot (the calibrated example home) beyond what
   `docs/ontological-compression.md` already states.
3. **Agent-minds internals** — boot files, skill sheets, Lucent scoring weights. The minds' *roles*
   are public; their internals are the moat.
4. **Any specific home, address or homeowner** — including as an "illustrative" example. The
   ledger's failure cases may be described generically ("a raised ranch read as one level") and
   never attributed.
5. **TTP scoring factors or weights.** Bands L0–L4 and what they unlock are public.

## Where this goes

Ontology writing is **platform / engineering writing** — its canonical home is **DEV**
(`dev.to/salparvez`), per the repo README ("canonical for most posts"). Hashnode carries a distinct
framing with the Original URL field set; Medium gets the builder's version; Substack mirrors DEV by
RSS; LinkedIn, X, Bluesky and Threads get one idea each; Hacker News only as a Show HN with a
shipped artifact. `/insights` is optional for this subject — if used, it must be a *different* piece
(homeowner framing: "who gets to say what your house is"), not a copy. Distribution rules and the
per-channel checklist: [`../deconstruction-lab/syndication.md`](../deconstruction-lab/syndication.md).

Existing DEV posts already cover the Master Ledger ("Claims, Not Facts") and the Seven Minds ("My AI
agents don't talk to each other"). **Link to them; do not re-explain them.** This piece's job is
the seven families and the claimant gap.

## Before a piece ships

1. Every shipped/proposed distinction is intact — grep the draft for "supports", "now has", "added".
2. Reality labels present; "no ML Systems deconstruction has been performed yet" appears once.
3. No engine paths or identifiers.
4. Canonical definitions verbatim.
5. `npm run scrub-check` from the repo root prints `clean`.

---

See also: [Deconstruction Lab source brief](../deconstruction-lab/source-brief.md) ·
[The Seven Families](../docs/the-seven-families.md) · [Syndication](../deconstruction-lab/syndication.md)
