# The Deconstruction Method

**Construction builds bottom-up. Deconstruction runs top-down.**

Demolition treats a house as one object and reduces it to debris. Deconstruction treats a house
as what it actually is — a stack of assemblies, each applied in a known order, each still holding
most of the value it had the day it went on. Recovery works that order backwards at the scale of
the building, and inside-out at the scale of each assembly.

This page describes how ML Systems sequences that reversal: the phases, the material streams they
feed, and the vocabulary the system uses to describe what came out. It is the deconstruction half
of the [value chain](../docs/value-chain.md), written out.

> Reality labels used below: **MEASURED** (exists today) · **MODELED** (calibrated projection) ·
> **ASPIRATIONAL** (a goal, not encoded in system logic). No ML Systems deconstruction has been
> performed yet — everything here is method, not result.

---

## The phase sequence

Six phases, in order. The middle four are the building, taken apart in the reverse of the order it
was assembled. The first and last are the logistics that make the middle four possible.

| Phase | What it covers |
|---|---|
| **PRE** | Structural assessment, contamination screening, disconnects, bracing |
| **ROOF** | Roof assembly — the most exposed, most weather-dependent, highest-risk work |
| **WALLS** | Exterior and interior walls, windows, doors, cladding |
| **FLOORS** | Floor systems and their framing |
| **FOUNDATION** | Slab, footings, foundation walls |
| **POST** | Sorting, staging, site cleanup, records |

The roof goes first for the same reason it went on last. It is the assembly most exposed to
weather, the one whose failure modes are least forgiving, and the one that has to come off before
anything below it can be worked in controlled conditions. Get it down to grade, and the rest of
the house becomes ordinary work at ordinary heights.

**FOUNDATION is the phase that does not yet fit.** Concrete resists clean separation in a way
framing does not, and the foundation is the reason a whole-house sequence runs long. That is a
known constraint, not a solved one.

## The layer stack is the unit of value

The useful unit is not the building and not the material — it is the **assembly**, and an assembly
is a stack.

A roof is rafters, then sheathing, then underlayment, then shingles. A wall is studs, then
sheathing, then a weather barrier, then cladding. Each layer was applied over the one beneath it
and fastened through it. That fastening is what makes the layers a single structure, and it is
also what destroys them when the structure is removed carelessly.

So the method has one rule underneath all the others: **work the stack from the inside out, and
free each layer before disturbing the one beneath it.**

Inside out is the operative phrase. Demolition and tear-off both work *outside in* — breaking
through each layer to reach the next, which is why nothing survives the trip. Deconstruction
reverses the direction of attack: it starts at the innermost surface, the one that faced the
interior and that nobody could reach while the building was standing, and works outward.

**The two scales run in opposite directions, and this is the thing most easily got backwards:**

| Scale | Direction | Order |
|---|---|---|
| The building — between assemblies | Reverse of construction | Roof → walls → floors → foundation |
| An assembly — between layers | Inside out | Innermost layer → outermost layer |

A tear-off is what runs reverse order *within* an assembly — shingles first, because shingles went
on last — and that is precisely the order that destroys everything. Working an assembly inside out
means running the same sequence it was built in, reached from the side that used to face the
interior.

Getting to the inside face is the whole problem, and it is why an assembly is often **reoriented**
rather than worked in place: a section separated from the structure can be turned over on the
ground so its interior face is on top and gravity assists the disassembly instead of opposing it.
Everything else — how a section is cut, which way it is turned, which tool takes the fastener
out — is in service of that rule.

The distinction that matters: the goal is not to *remove* an assembly. It is to **free every layer
in it.** Removal is easy and a machine can do it. Freeing four layers so all four survive is the
work.

## Fasteners determine grade

The thing that decides whether a recovered board is Grade A or firewood is almost never the board.
It is the fastener, and the choice of how to defeat it.

Ring-shank nails are the clearest case. They are engineered specifically not to withdraw — that is
the entire point of the rings — so any strategy that pulls against them trades the sheet for the
framing or the framing for the sheet. Cutting the fastener instead of pulling it costs a little
time per sheet and preserves both. That trade, deliberately made, is the whole of
[MVE](#the-four-returns) in miniature: a small chosen cost that protects a larger recoverable value.

Adhesives, engineered fasteners and composite connectors are the harder version of the same
problem, and they are an active research area rather than a settled one.

## RRR — Reuse › Resale › Recycle

Full resale of everything is not possible, so the goal is not a single recovery number. The goal is
to route each material to its **most valuable recoverable state**, and the ordering is strict:

- **Reuse** — the material goes back into a build as the thing it already is.
- **Resale** — it goes to another builder through the secondary market.
- **Recycle** — it is broken down to feedstock.

A recovered rafter that becomes a rafter beats one sold as lumber, which beats one ground for
fiber. The system is designed to recover up to 80–90% of a home's materials — *MODELED*, a target
— but RRR is what determines whether that recovery is worth anything.

## The Z1–Z8 material streams

Recovered material sorts into eight streams:

| Stream | Materials |
|---|---|
| **Z1** | Kitchen & appliances |
| **Z2** | Lumber |
| **Z3** | Doors, windows & trim |
| **Z4** | Sheathing & drywall |
| **Z5** | Flooring & fixtures |
| **Z6** | Hardware & metals |
| **Z7** | Concrete & heavy |
| **Z8** | Roofing & siding |

The streams are not the disassembly order — they are where material *goes*, not the order it comes
off. A single phase feeds several streams at once, and a single stream fills across several phases.

There is a second, quieter idea in the zones: **placement is retail logic.** A crew has to set
recovered material down somewhere regardless, so where it sets it down is the only decision, and
that decision can be made to match how the material will be sold — heavy stock where a truck can
reach it, finish material where a buyer can browse it. Staged that way, the site becomes a store at
the end of the job without anyone doing a second pass. The staging plan *is* the store layout, at
zero additional labor.

## What a recovered material carries

Every recovered material gets an **ML Material ID**:

```
ML-{year}-{project}-{zone}{sequence}
ML-2026-001-R042
```

— brand prefix, recovery year, project number, a zone letter for the assembly it came out of, and
a sequence within that zone. The ID resolves to a public provenance record.

Against that ID the system records a **grade** and a **contamination status**:

| Grade | Meaning |
|---|---|
| **A** | Excellent — like new, no visible damage |
| **B** | Good — minor wear, structurally sound |
| **C** | Fair — visible wear, usable with prep |
| **D** | Poor — significant damage, limited reuse |
| **salvage** | Salvage only — recycle or parts |

Contamination is recorded as `clean`, `lead`, `asbestos`, `mold`, or `untested`. **Lead, asbestos
and mold block a listing outright** — material with any of those statuses cannot be sold through
the marketplace, regardless of grade.

That gate runs before the work does, not after. A structure that screens as contaminated is routed
to licensed abatement rather than deconstructed, and an inconclusive screen is treated as positive.
**Refusing a job is a feature, not a bug** — it is how the method avoids handing a homeowner a
regulatory problem, and how it keeps the recovered stream honest enough to be worth buying.

## The four returns

Deconstruction is expensive in ways demolition is not, and it only makes sense because a single
expense returns more than one thing. Every dollar spent on a job is designed to produce four:

1. **Recovered material value** — the physical stock that reduces the cost of the next build.
2. **Ontology data** — what this house was, how it came apart, what each assembly actually yielded.
3. **Robot training signal** — a fully specified disassembly sequence, which is the training data
   for the [physical neural net](../docs/neural-net-architecture.md). *ASPIRATIONAL.*
4. **Market intelligence** — what recovered material is worth, learned by selling it.

That is **MVE — Minimum Viable Expense**: not the cheapest option, but the one expense that pays
back along the most axes at once.

## What the job returns to the system

A deconstruction is also a measurement. Each job produces:

- **Ontology rows** — the assemblies, described in the shared grammar of the
  [Collective Ontology](../docs/collective-ontology.md), so every mind and every trade describes
  the same house the same way.
- **Ledger claims** — each recovered assembly posts a claim to the
  [Master Ledger](../docs/master-ledger.md), carrying its source and its evidence grade, to be
  reconciled against what the assessor, the homeowner and the model each believed was there.
- **A compressed record** — what is learned collapses into the home's HomeGenome, which is how
  [Ontological Compression](../docs/ontological-compression.md) turns a whole house into something
  a model can reason over.
- **A reverse takeoff and BOM** — compiled by REAPER, one of the
  [Seven Minds](../docs/the-seven-minds.md), along with the RRR routing for every line.

This is the part that compounds. Material recovery pays for the job; the record it generates is
what makes the next one cheaper to plan.

---

See also: [The Value Chain](../docs/value-chain.md) · [The Seven Minds](../docs/the-seven-minds.md) ·
[Taking a roof apart in sections](articles/roof-in-sections.md) · [Glossary](../docs/glossary.md)
