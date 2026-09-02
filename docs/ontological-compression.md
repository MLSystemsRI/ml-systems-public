# Ontological Compression

**Turning a whole house into a genome.**

Ontological compression is the process of reducing everything the system knows about a home —
every claim in the [Master Ledger](master-ledger.md), every assessor field, every vision read,
every takeoff — into a compact, canonical **HomeGenome**: the smallest complete description
from which the full home can be reconstructed.

It is "compression" in the information-theoretic sense (drop redundancy, keep the signal) and
in the biological metaphor (a genome encodes an organism). The genome is the home's DNA.

---

## What gets compressed

The raw material is verbose and contradictory: a homeowner's chat, ~30 harvested VGSI fields,
StreetView and satellite vision, a reconciled sketch, roof planes from Google Solar, FEMA
flood zone, Census tract, soil bearing, and the assembly takeoffs. Compression:

1. **Reconciles** conflicting claims into the [ledger's](master-ledger.md) resolved states.
2. **Grounds** each fact in real primitives (member specs, not adjectives).
3. **Ranks** by evidence grade: `MEASURED > STATED > RECORD > MODELED`.
4. **Emits** a `HomeGenome` + an `ontology` object, persisted per `(property, cycle)`.

The result is the first place the HomeGenome is actually *stored* — the device builds it at
intake-confirm, and verification stamps it with `VER:` codes.

## The calibrated core: the 1.43× multiplier

The most consequential compressed number is the **construction value multiplier**. Rather than
a hand-waved "renovation adds value," it is derived from real geometry (a competitor proforma
from a local RI construction firm, plus the ML Systems construction model):

```
Baseline RI home:      $500,000  ·  2,000 SF total  ·  2 levels (1,000 SF/floor)
After one cycle:       +10% footprint (1,000 → 1,100 SF)  +  1 added level (3 floors)
New total SF:          1,100 SF × 3 floors = 3,300 SF
Floors 1–2 value:      2,200 SF × $250/SF = $550,000
Floor 3 (conservative 60%):  1,100 SF × $150/SF = $165,000
New property value:    $715,000

multiplier = 715,000 / 500,000 = 1.43×   (MODELED — conservative, compounding)
```

Compounded over five cycles: `$500k → $715k → $1,022k → $1,461k → $2,089k → $2,988k`.

> The multiplier is **MODELED**: the math is real; it has not yet been proven in the field,
> because no ML Systems cycle has completed. The honesty of that label is the point.

## Why compress at all

A compressed genome is what makes the rest of the system tractable:

- **The Loan Pit** underwrites against a compact, verifiable collateral description.
- **REAPER** derives a salvage bank and recovery report from the genome's assembly stack.
- **MURPHY** schedules a build from the compressed sequence.
- **The Collective Ontology** licenses ground-truth data that is only valuable *because* it's
  been compressed to signal — 81 task codes, ~1,480 executions, a construction DAG.
- **The orchestrator's self-learning loop** (the "AI operations efficiency" signal) is a
  *floor-learning / compression* loop over our own runs — it learns to compress better.

## The self-learning signal

The **AI operations efficiency score (0–100)** is often mistaken for a construction KPI. It
isn't. It's the orchestrator's **self-learning signal on ML Systems' own runs** — how well the
compression loop is converging. Keep the score; it measures the compressor, not the crew.

See also: [Master Ledger](master-ledger.md) · [Collective Ontology](collective-ontology.md) · [Value Chain](value-chain.md)
