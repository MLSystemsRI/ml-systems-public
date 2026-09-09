# Deconstruction Lab — Source Brief

> **Purpose.** This file is a self-contained writing brief for the Deconstruction Lab. If you are
> Claude Cowork (or any writer) drafting an article, post, or page about ML Systems'
> deconstruction work, read this first and treat it as the boundary of what you may say. Everything
> here is public. Anything not established here needs to be checked before it is written.

Companion files: [`method.md`](method.md) (the method itself) · [`syndication.md`](syndication.md)
(where a finished piece goes) · [`articles/_template.md`](articles/_template.md) (the shape of a
piece) · [`../llms.txt`](../llms.txt) and [`../knowledge/seo/seo-brief.md`](../knowledge/seo/seo-brief.md)
(company-wide context and SEO strategy).

---

## The one thing to get right

ML Systems is **pre-revenue and has not yet performed a deconstruction.** Every piece of writing
has to survive a reader who knows that.

This is not a weakness to write around — it is the brand's actual position, and stating it plainly
is what makes everything else credible. The company documents its own confidence level on every
claim, and a piece that quietly drops those labels is off-brand even when every sentence in it is
technically true.

## Reality labels

Every forward-looking claim carries one. Use them inline, in italics, after the claim.

| Label | Meaning |
|---|---|
| **MEASURED** | Validated / exists today |
| **MODELED** | Calibrated projection — real math, not yet proven in the field |
| **ASPIRATIONAL** | A goal, deliberately **not** encoded in system logic |

## Required phrasings

These are not stylistic preferences. Getting them wrong creates a claim the company cannot support.

| Write this | Never this |
|---|---|
| "designed to recover up to 80–90% of a home's materials" — *MODELED* | "we recover 80–90%" / "our process recovers 80–90%" |
| "51% resale is a soft goal — a direction, not a metric the system enforces" | "51% of materials go to resale" |
| "no ML Systems deconstruction has been performed yet" | any completed-project claim, any case study, any "we've done" |
| "a designed sequence" / "the method is intended to" | "our crews do" / "in practice we" |
| Public contact: **salparvez@mlsystemsri.com** | any personal email address |

**No completed-project claims. No customer names. No reviews, testimonials, or quotes from
anyone.** Do not invent a homeowner, a crew member, a job site, or a result — not even as an
illustrative example. If a piece needs a scenario, mark it explicitly as hypothetical.

## Canonical definitions — use verbatim

These are fixed wordings that must match across `llms.txt`, `knowledge/ai-context.json`, this repo
and the marketing sites. Do not paraphrase them.

- **Z1–Z8** — "ML Systems' material taxonomy for deconstruction streams."
- **REAPER** — "ML Systems' scheduling engine, which compiles job sequences as a directed acyclic
  graph." In product-facing prose REAPER is also described as the deconstruction mind: reverse
  takeoffs, bill of materials, RRR routing.
- **RRR** — "Reuse › Resale › Recycle — route each recovered material to its most valuable
  recoverable state."
- **MVE — Minimum Viable Expense** — one expense, four returns: recovered material value, ontology
  data, robot training signal, market intelligence.
- **Tagline** — "Tougher Problems Inspire Creative Solutions."

## What you may write about

Everything in [`method.md`](method.md) is cleared, plus:

- The six-phase sequence **PRE → ROOF → WALLS → FLOORS → FOUNDATION → POST**, and why
  deconstruction runs top-down while construction runs bottom-up.
- Sectioning and rigging *as method*: cutting at the rafter rather than between rafters, ridge-first
  cut order, the rafter-to-plate release cut, rigging attached before release.
- Bracing the top floor before any cut, because the roof is the diaphragm restraining the walls.
- Inverting a section at grade so disassembly runs in reverse-construction order with gravity, and
  the safety consequence of moving work from height to grade.
- Layer order and what damages each layer — **qualitatively**.
- Fastener strategy, especially ring-shank behavior and cutting rather than pulling.
- Safety and regulatory framing: `OSHA 1926 Subpart M` (fall protection), `Subpart CC` (cranes and
  derricks), `1926.1153` (silica). Contamination screening as a gate that can refuse a job.
- Grade A / B / C / D / salvage and the contamination vocabulary (`clean`, `lead`, `asbestos`,
  `mold`, `untested`), including that lead, asbestos and mold block a listing outright.
- The **ML Material ID** format `ML-{year}-{project}-{zone}{seq}` and public provenance records.
- The system vocabulary — Collective Ontology, Ontological Compression, HomeGenome, Master Ledger,
  the Seven Minds, the Value Chain, the equity loop. These are documented in [`../docs/`](../docs/)
  and are the differentiator; a piece that could have been written by any salvage contractor is not
  doing its job.
- Publicly sourced market context — Rhode Island housing stock, construction and demolition waste,
  landfill capacity — **with the source named**, and only where the figure is genuinely public.

## What you may not write about

This list is deliberately stated as **categories, not names.** This file is public; a list that
spelled out what it is protecting would be the disclosure it is trying to prevent. If you need to
know whether something specific falls inside one of these, ask before writing — do not guess.

1. **Any named apparatus, device, machine, or process from the R&D line.** ML Systems has
   inventions in development, some at patent counsel and **none yet filed**. Naming one, describing
   its mechanism, geometry, operating parameters, or claim language in public can forfeit rights.
   This includes concepts, working names, and "something we're building that does X."
2. **Any figure, specification, or threshold tied to an unfiled or pending application** — operating
   ranges, tolerances, material specs, process parameters, prototype results.
3. **Grading, contamination, or purity specifications for resale feedstock** — the qualitative
   vocabulary above is public; the numeric thresholds that determine what a stream is worth are not.
4. **Downstream processing economics** — equipment, financing structures, tipping arrangements,
   per-ton pricing, or the commercial model for any recovered material stream.
5. **Competitor analysis by name**, and any positioning relative to another company's patents.
6. **Transparency Trust Protocol scoring internals.** The band names L0–L4 and what each band
   unlocks are public. The factors, weights and decay mechanics are not — publishing them makes the
   score gameable.
7. **Agent-minds internals.** The private agent layer — skill data sheets, material science library,
   scoring weights, boot files, orchestration internals. The *minds* are public and documented in
   [`../docs/the-seven-minds.md`](../docs/the-seven-minds.md); their internals are the moat.
8. **Anything gated behind TTP** — full construction ontology, per-material provenance at depth,
   efficiency benchmarks, API feeds. It is a paid product. Do not publish it to chase SEO traffic.
9. **Funding, grant, and entity material** — applications, budgets, letters, insurance quotes,
   carrier or broker names, licensing and royalty structures, cap table, valuations.
10. **Anything sourced under an NDA, a third-party login, or a procurement portal**, and any
    third-party personal information.
11. **Internal labor structure and compensation mechanics** — shift cadence, pay bands, worker
    classification. The *philosophy* (better-paid people doing less bodily damage) is public; the
    mechanics are not.
12. **Real addresses, production identifiers, internal table or migration names, and personal
    contact details.** The company's town is public; its street address is not.

## Tone

Read [`../docs/master-ledger.md`](../docs/master-ledger.md) and
[`../docs/collective-ontology.md`](../docs/collective-ontology.md) before writing — they are the
register.

- **Third person.** The company is "ML Systems," not "we." No first-person founder voice unless the
  piece is explicitly bylined as one.
- **Declarative and specific.** Short assertive sentences. Concrete nouns. Em-dashes are the house
  punctuation.
- **No marketing verbs.** No "excited to announce," no "revolutionary," no "game-changing," no
  superlatives, no exclamation points.
- **Aphorism earns its place.** The docs land on lines like *"Many minds claim; one record stands"*
  and *"the boundary is checked, not remembered."* One per piece, at most, and only if it is true.
- **The escalating-parallel move** is the house rhetorical device — *"To an assessor it's a
  valuation. To a lender it's collateral. To a deconstruction crew it's tonnage."* Use it sparingly.
- **Honesty is the differentiator.** The most on-brand thing a piece can do is say clearly what has
  not happened yet.

## Keywords

**Primary:** deconstruction vs demolition · home deconstruction Rhode Island · material recovery
construction · reclaimed building materials Rhode Island · sustainable home building RI.

**Roof-specific:** roof deconstruction · roof tear-off alternative · salvage roof sheathing ·
reclaimed rafters · old-growth lumber recovery · ring-shank nail removal · construction waste
diversion.

**System vocabulary** (the terms nobody else can rank for, and the reason to write here at all):
collective ontology · ontological compression · HomeGenome · master ledger · reverse takeoff ·
RRR routing · material provenance · ML Material ID.

Full keyword lists live in [`../knowledge/seo/company-profile.json`](../knowledge/seo/company-profile.json)
→ `seoKeywords`.

## Before a piece ships

1. Every forward-looking claim carries a reality label.
2. No recovery claim reads as completed fact — search the draft for "we recover" and "recovers 80."
3. Nothing from the twelve categories above appears, including by implication.
4. Canonical definitions are verbatim.
5. Contact address is the `mlsystemsri.com` one.
6. Run `npm run scrub-check` from the repo root. It must print `clean`.

---

See also: [The Deconstruction Method](method.md) · [Syndication](syndication.md) ·
[The Value Chain](../docs/value-chain.md) · [SEO Brief](../knowledge/seo/seo-brief.md)
