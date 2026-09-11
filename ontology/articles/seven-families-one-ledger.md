# Seven Families, One Ledger — how a house gets a grammar

**Slug:** `seven-families-one-ledger`
**Category:** `technology`
**Status:** draft — ready for the cowork to post
**Canonical:** DEV (`dev.to/salparvez`) — this is platform writing, for developers; see [`../source-brief.md`](../source-brief.md) and [`../../deconstruction-lab/syndication.md`](../../deconstruction-lab/syndication.md)
**Companion:** [`../master-ledger-workflow.html`](../master-ledger-workflow.html) · [`../families.json`](../families.json) · [`../../docs/the-seven-families.md`](../../docs/the-seven-families.md)

---

## A house means different things to different parties

To an assessor a house is a valuation. To a lender it is collateral. To a deconstruction crew it
is tonnage. To an architect it is a plan set. To a robot, eventually, it is a sequence of
manipulable members. Every one of those descriptions is correct, and every one of them uses
different words for the same rafter.

ML Systems runs a value chain — Loan Origination → Deconstruction → Construction, closed into an
equity loop when the homeowner chooses to keep building — and seven software minds work it. If
each of them kept its own vocabulary, the company would have seven databases that could not talk.
So there is one grammar. This is what it looks like, what it got wrong until this week, and how
it is being fixed.

## Codes, not storage

Every fact the system holds about a home is tagged with a code of the form
**`SECTION:task`** — an uppercase phase, a colon, a lowercase task token:

```
DES:footprint    BLD:load-path    VER:code-compliance
FIN:budget       DEC:sequence     LUP:decision
```

The prefix **is** the phase. That one convention does a surprising amount of work. The whole
ledger for a home is a single JSON document; a new fact is a new key in that document, never a new
table. Labels title-case themselves from the task token. Units infer from the measure name. The
question the orchestrator asks the homeowner falls back to the slot's meaning. **A new code costs
no schema, no migration, and no label.** The ontology grows by extending its codes, not its
storage.

## The seven families

Until now the public documentation named three families: `DES` (design), `BLD` (build) and `VER`
(verification). The engine has always shipped seven.

| Code | Family | Owning mind | The question it answers |
|---|---|---|---|
| **FIN** | Finance | PIT LORD | What can this homeowner afford, and what will lenders compete to fund? |
| **DEC** | Deconstruction | REAPER | What is already here, and in what order does it come apart so every layer survives? |
| **DES** | Design | CDA | What is the best thing we can build on what is here? |
| **BLD** | Build | MURPHY | What is the critical path to completion? |
| **MKT** | Market | MIA | What does the market say — about this home, and about what comes out of it? |
| **VER** | Verify | VERA | What is true about this house, and how sure are we? |
| **LUP** | Equity Loop | PI · PIT LORD · REAPER | What did this cycle create — and does the homeowner want to go again? |

They form a small directed graph — `FIN → DEC → DES → BLD → VER → LUP`, with `MKT` hanging off
deconstruction — and one edge points backward: **`LUP → FIN`**. That edge is the only reason this
is a loop and not a line. `LUP` is not an acronym; it is *loop*. It is where the homeowner's
choice lives as a code — `LUP:decision`: expand this home again, open another value-chain home, or
hold. The system never assumes the answer. It asks.

## Four of them were starving

Here is the honest part. Count the slots each family actually had in the shipped template:

| Family | Shipped slots |
|---|---|
| DES | 18 |
| VER | 10 |
| BLD | 7 |
| DEC | 4 |
| LUP | 4 |
| FIN | 1 |
| MKT | 1 |

Design and verification were rich. Finance, deconstruction, market and the loop itself were
nearly empty. That is not a prioritisation choice. It is a structural consequence of one line of
code.

## Who is allowed to speak

On the ledger, a fact is not a value. It is a **claim** — a value, plus who made it, plus the grade
of evidence behind it. Several claims sit on the same entry, and the ledger decides which one
stands, shows every one that dissented, and refuses to present a contested number as fact.

The type that says who may make a claim looks like this:

```ts
type VcClaimant = "custodian" | "homeowner" | "vera" | "cda" | "pi" | "record";
```

Six names. Look at who is missing. **REAPER, PIT LORD, MURPHY and MIA — the minds that own
deconstruction, finance, construction and market — cannot put their name on a claim.** The phases
they own had nowhere to speak. Of course FIN had one slot.

## Claimants without seats

The fix was already sitting in that list. `cda` is there — the design mind can claim — but CDA
holds **no seat** on the ledger's party strip. That is deliberate. The five seats that can ground
an entry are the homeowner, the public record, VERA, PI and the Custodian. CDA is the model being
grounded; a design claim is the thing being checked, never a check.

That standing extends cleanly to the other four. **A V2 mind may claim; it may never ground.** Its
claim enters as `modeled`, the lowest grade on the evidence ladder. It can be confirmed only if an
independent party agrees. It can never win a standoff against a tape measure. And its name never
lights a seat — because *lit means input, not agreement*, and a seat that lit for its own model
would be the ledger agreeing with itself.

Every mind claims. Five seats ground. VERA gates. Only the Custodian stamps.

## Whose word wins on whose fact

The ledger does not rank claimants globally. It ranks them **per kind of fact** — what it calls a
domain. Four ship today:

| Domain | Meaning | Who leads, after the Custodian |
|---|---|---|
| `interior` | what the homeowner can see and touch inside | the homeowner |
| `legal-record` | recorded facts — stories, year, recorded square footage | the record |
| `exterior-geo` | exterior geometry measured by instrument | VERA |
| `derived` | computed from other facts; nobody observes it | VERA |

The Custodian leads every domain — a stamp is the review. Below that, a tape measure inside the
house outranks a satellite; the assessor's card outranks memory on the year it was built; the
instrument outranks everyone on the roof pitch.

Now put a finance code through it. Nothing routes `FIN:*` anywhere in particular, so it falls to
`derived` — and in `derived`, VERA outranks the homeowner. Which means that on the question *what
is the most you want to spend*, a model would outrank the person whose money it is.

So two domains are proposed alongside the new claimants. **`intent`** — a choice or a constraint
only the homeowner can set: budget, timeline, the loop decision — where the homeowner leads.
**`market`** — a price or a velocity observed in a market: comparable sales, a lender's bid,
absorption — where the record and MIA lead.

## What the four families get

Twenty-nine proposed slots, each with its domain, who may claim it, who verifies it, and which
minds consume it. A sample:

- **`FIN:budget`** — the homeowner's own ceiling for the cycle; the number the entire plan set must
  fit under. Homeowner claims, PI checks. *Domain: intent.*
- **`DEC:contamination`** — the lead / asbestos / mold screen. Positive routes to licensed
  abatement; untested is treated as positive. The intake gate — refusing a job is a feature.
- **`DEC:assembly-stack`** — each assembly's layer order, innermost first: the order it will be
  freed. Roof: rafters › sheathing › underlayment › shingles.
- **`MKT:comps`** — recent comparable sales in the locality; the mirror the assessment curve is
  checked against. MIA reflects; she never decides.
- **`LUP:equity-delta`** — equity created this cycle: post-build value less principal. Physical
  improvement, not market timing.
- **`LUP:decision`** — expand, start another, or hold. The flywheel, as a row in a file.

The full table, with every slot marked **shipped** or **proposed**, is in the repository's
`ontology/families.json`, and the diagram that goes with it is `master-ledger-workflow.html`.

## What is real here

Reality labels, because this company labels everything:

- The seven families, the `SECTION:task` grammar, the claim model, the four domains, the five
  seats, the two-key stamp — **MEASURED.** They ship in the engine and run on every compile.
- The 46 shipped slots — **MEASURED.** They are in the template today.
- The four new claimants, the two new domains, the 29 new slots — **proposed.** Design, written
  down, with the exact list of code changes it would take. Not yet in the engine.
- Any slot that depends on a job having run — recovery tonnage, diversion, absorption — is
  **ASPIRATIONAL.** No ML Systems deconstruction has been performed yet.

The ontology is the connective tissue that lets a fact discovered on a job site inform a financing
decision without losing its meaning. For four of its seven families, that tissue was there but the
nerve was not connected. The fix is small. The reason it matters is not.

---

*ML Systems LLC · Rhode Island · NAICS 236115 · [mlsystemsri.com](https://mlsystemsri.com) ·
[github.com/MLSystemsRI/ml-systems-public](https://github.com/MLSystemsRI/ml-systems-public)*
