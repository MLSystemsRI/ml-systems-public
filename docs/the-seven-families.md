# The Seven Families

**Every mind claims. Five seats ground. VERA gates. Only the Custodian stamps.**

The [Collective Ontology](collective-ontology.md) tags every fact about a home with a code. This
page is about the codes' *families* — the seven phases of the value chain each code belongs to —
and about a gap that was structural, not accidental: four of the seven had almost nothing in them,
because the minds that own those phases were not allowed to speak on the record.

> Reality labels used below: **MEASURED** (exists today) · **MODELED** (calibrated projection) ·
> **ASPIRATIONAL** (a goal, not encoded in system logic). Anything marked *proposed* is design
> written down, not shipped code.

---

## The grammar

```
SECTION:task        DES:footprint · FIN:budget · LUP:decision
```

An uppercase phase, one colon, a lowercase task token. The prefix **is** the phase. The whole
record for a home is one document; a new fact is a new key in it, never a new table. Labels
title-case themselves from the task token, units infer from the measure name, and the question PI
asks the homeowner falls back to the slot's meaning. **Extend codes, not storage.** — *MEASURED*

## The families

Until September 2026 this repository named three families. The engine has always had seven.

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
deconstruction — and one edge points backward: **`LUP → FIN`**. That edge is the only reason the
value chain is a loop and not a line.

`LUP` is not an acronym. It is *loop*: the equity cycle, the homeowner's choice to keep building on
this home or another. It is where that choice lives as a code — `LUP:decision` — and the system
never assumes the answer. `DEC` is the code and *Deconstruction* is the name.

## Four of them were thin

Slots per family in the shipped template — *MEASURED*:

| DES | VER | BLD | DEC | LUP | FIN | MKT |
|---|---|---|---|---|---|---|
| 18 | 10 | 7 | 4 | 4 | 1 | 1 |

Design and verification were rich. Finance, deconstruction, market and the loop were nearly
empty. The cause is one line in the engine: the list of who may put their name on a claim is
`custodian · homeowner · vera · cda · pi · record`. **REAPER, PIT LORD, MURPHY and MIA — the minds
that own FIN, DEC, BLD and MKT — cannot author a ledger claim today.** The phases they own had
nowhere to speak.

## Claimants without seats

On the [Master Ledger](master-ledger.md) a fact is not a value; it is a **claim** — a value, who
made it, and the grade of evidence behind it. Several claims sit on one entry, the ledger decides
which stands, and every dissent stays visible.

Five **seats** can ground an entry: 🏠 the homeowner · 📋 the public record · 🦉 VERA · 🌱 PI · ⚖ the
Custodian. **Lit means input, not agreement.** CDA — the design mind — holds no seat on purpose: the
design is the model being grounded, and a design claim is the thing being checked, never a check.

That standing extends cleanly. The proposal is that the other four V2 minds get exactly CDA's
position: **claimants without seats** — *proposed*.

- A V2 mind **may claim** — its output enters the record as `modeled`, the lowest grade on the
  evidence ladder (`measured 90 · sensed 85 · stated 80 · record 70 · modeled 60`).
- It **may never ground** — it cannot corroborate its own entry, it cannot win a standoff against
  a tape measure, and its name never lights a seat. A seat that lit for its own model would be
  the ledger agreeing with itself.

Every mind claims. Five seats ground. VERA gates. Only the Custodian stamps.

## Whose word wins on whose fact

The ledger does not rank claimants globally. It ranks them **per kind of fact** — a *domain*. Four
ship today — *MEASURED*:

| Domain | Meaning | Leads, after the Custodian |
|---|---|---|
| `interior` | what the homeowner can see and touch inside | the homeowner |
| `legal-record` | recorded facts — stories, year, recorded square footage | the record |
| `exterior-geo` | exterior geometry measured by instrument | VERA |
| `derived` | computed from other facts; nobody observes it | VERA |

The Custodian leads every domain — a stamp is the review. Below that, a tape measure inside the
house outranks a satellite; the assessor's card outranks memory on the year it was built; the
instrument outranks everyone on the roof pitch.

A finance code has no rule of its own, so it falls to `derived` — where VERA outranks the
homeowner. On the question *what is the most you want to spend*, a model would outrank the person
whose money it is. Two domains are therefore proposed alongside the new claimants — *proposed*:

| Domain | Meaning | Leads, after the Custodian |
|---|---|---|
| `intent` | a choice or constraint only the homeowner can set — budget, timeline, the loop decision | the homeowner |
| `market` | a price or velocity observed in a market — comparable sales, a lender's bid, absorption | the record, then MIA |

## What the thin families get

Twenty-nine proposed slots, each with its domain, who may claim it, who verifies it, and which
minds consume it — the full table, with every slot marked **shipped** or **proposed**, is
[`ontology/families.json`](../ontology/families.json), and the diagram that goes with it is
[`ontology/master-ledger-workflow.html`](../ontology/master-ledger-workflow.html). A sample:

| Code | Meaning | Domain | Claims · verifies |
|---|---|---|---|
| `FIN:budget` | The homeowner's ceiling for the cycle — the number the whole plan set must fit under | intent | homeowner · PI |
| `DEC:contamination` | Lead / asbestos / mold screen. Positive routes to licensed abatement; untested is treated as positive. The intake gate | legal-record | record, VERA · Custodian |
| `DEC:assembly-stack` | Each assembly's layer order, innermost first — the order it will be freed | derived | REAPER · VERA |
| `MKT:comps` | Recent comparable sales in the locality — the mirror the assessment curve is checked against | market | MIA, record · VERA |
| `LUP:equity-delta` | Equity created this cycle: post-build value less principal. Physical improvement, not market timing | derived | PI, PIT LORD · VERA |
| `LUP:decision` | Expand this home again, open another value-chain home, or hold. The flywheel | intent | homeowner · PI |

## What is real here

- The seven families, the grammar, the claim model, the four domains, the five seats, the two-key
  stamp, the 46 shipped slots — **MEASURED.**
- The four new claimants, the two new domains, the 29 new slots — **proposed.** Design, written
  down with the exact list of engine changes it would take. Not yet in the engine.
- Any slot that depends on a job having run — recovery tonnage, diversion, absorption — is
  **ASPIRATIONAL.** No ML Systems deconstruction has been performed yet.

The ontology is the connective tissue that lets a fact found on a job site inform a financing
decision without losing its meaning. For four of its seven families the tissue was there and the
nerve was not connected.

---

See also: [The Collective Ontology](collective-ontology.md) · [The Master Ledger](master-ledger.md) ·
[The Seven Minds](the-seven-minds.md) · [`ontology/`](../ontology/) · [Glossary](glossary.md)
