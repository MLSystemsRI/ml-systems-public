# The Master Ledger

**One home. One auditable record. Many authors.**

The Master Ledger is the single source of truth for a property as it moves through the
[value chain](value-chain.md). It is not a spreadsheet of numbers — it is a **record of
claims about a house**, each claim carrying its source, its evidence grade, and its
verification state. Think of it as the town files, re-imagined as a living, multi-author
document whose stamps are bound to the content they signed.

Many minds claim; one record stands.

---

## The core idea: claims, not facts

A house accumulates *claims* from many parties:

- The **homeowner** ("it has 3 bedrooms, the roof is 5 years old")
- The **assessor record** (VGSI / town valuation data)
- The **[Seven Minds](the-seven-minds.md)** (VERA's vision reads, CDA's takeoffs, REAPER's tonnage)
- **ML Systems staff** and the **Custodian**

These claims frequently *disagree*. The ledger's job is not to pick a winner blindly, but to
**reconcile by authority and evidence** and then record the outcome transparently. Losing
claims ride along as visible dissent; nothing resolves silently.

## The five seats

Every entry shows a **party strip** — five fixed seats, one glyph each:

| Seat | Party | What lights it |
|---|---|---|
| 🏠 | **Homeowner** | a photo read, a typed answer, a tape measure, or their signed key |
| 📋 | **Record** | the assessor's card / town valuation, read at the source |
| 🦉 | **Verification** | instrument reads — solar geometry, elevation, street imagery, the sketch |
| 🌱 | **PI** | the orchestrator's own cross-check (its arithmetic, its record read) |
| ⚖ | **Custodian** | a stamp or an override, against the *current* content |

Two rules make the strip honest:

- **Lit means input, not agreement.** A seat lights for weighing in — whether it won,
  agreed, or dissented. An entry where the record says one thing and the homeowner
  another is *better known* than one nobody but the card has touched: those are
  perspectives on the board, and disagreement is information.
- **The ⚖ seat stays dim until the Custodian has stamped *this* entry.** Having a seat on
  the board is not the same as approval.

**CDA — the design mind — is deliberately not a party.** It is the model, the blueprint
that the parties ground. A design claim is the thing being checked, never a check.

An example placeholder lights nothing (it is nobody's perspective), a suspect instrument
read lights nothing (it is evidence of a problem, not a perspective), and a lapsed
signature lights nothing until it is renewed.

Ledger-wide, the record reports its **party coverage** — how many entries have all five
perspectives in.

## Sorted by how many people have weighed in

The ledger and the Custodian's review board share one comparator, so the homeowner and
the operator are never looking at the same house in two different orders:

1. **Examples sort last, always.** A placeholder never leads the record.
2. **The house's identity is pinned first** — footprint, heights, roof form, ridge lines.
   A record that opens on "fireplace count" is not a record of a house.
3. **Then breadth of input:** how many of the five parties have weighed in. Breadth of
   *people*, not the confidence of any one of them.
4. **Agreement breaks ties**, then evidence grade.

No single source gets a standing head start — the tax record is one seat among five, not
the top of the file.

## The ledger reads like the town file

The record-first layout, top to bottom:

- **One photo spot** at the very top. Photos are about the *house* — a single facade
  photo is read into the whole record (roof form, siding, stories, openings), never filed
  against one entry.
- **The home**, always open: address, footprint, height, roof, elevations — each line
  with its source chip, its confidence bar, and its party strip.
- **The entries**, collapsed behind a coverage header: how many claimed, how many
  verified, how many with all five perspectives in.
- **The scaffold**: the slots the record still owes render greyed below the compiled
  rows, marked *not yet claimed* — and every one of them opens into a typing box.

Headings name the **fact, not the agent** that fetched it. The ledger ships as a stable
canonical template (~40 slots spanning design, build, verification, and finance codes)
that starts empty and fills as real sources land.

## Answering on the row

"Add your input" no longer leaves the ledger. Every row, every unclaimed slot, and every
question the system asks carries the same inline answer block: quick-pick chips for
member specs (ordered by what's typical for the home's era — a shortcut, never a fence),
a one-line text box, and save.

The crucial design decision: **a typed answer is a claim, not an overwrite.** It enters
the record as the homeowner's stated claim *beside* the instrument's read — it goes
through the same reconciliation as everything else, and it can be withdrawn. PI judges
the answer inline ("typical for this home ✓" / "unusual — double-check?") so the
homeowner gets an immediate read on their own input.

Every entry can also open its own page — a full review board showing the value, the
party strip, who claimed what (with dissent underneath), the open question, and what's
already on file.

## PI's questions are the ledger's blanks

The orchestrator mind doesn't keep a separate to-do list. **PI reads the master ledger
itself**: it walks the owed, answerable slots in leverage order and asks for them in
plain English ("How many outside doors — front, back, sliders, garage bays?"), with the
example value as a hint. The same ask appears as a card above the chat composer and in
PI's spoken voice, because both are generated from the same record. Fill a slot anywhere
and the question disappears everywhere.

## Domain-scoped authority

A flat "measured beats stated beats record" ordering is wrong — it would let a homeowner
saying "ranch" override the assessor on the number of stories. So authority is **scoped
to a domain**: the assessor record is authoritative on legal/valuation facts (stories,
year built, recorded square footage); verification instruments are authoritative on the
visible envelope (roof planes, pitch, footprint); the homeowner is authoritative on the
interior — what they can see and touch — and on intent and recent work.

Separately, an **evidence ladder** grades each individual claim's honesty:

```
MEASURED  >  SENSED  >  STATED  >  RECORD  >  MODELED
```

The ladder grades *one claim's evidence*; the domain table decides *who is
authoritative*. A modeled value is never authoritative. A suspect claim (an instrument
that snapped to the neighbor's building) can never win — it is demoted to visible
dissent so the disagreement stays on the board.

## Reconciliation states

Every entry resolves into one of:

| State | Meaning |
|---|---|
| **confirmed** | Two independent sources agree within tolerance |
| **reconciled** | Sources disagreed; resolved by domain authority + evidence grade, visibly |
| **single-source** | Only one source; real, but flagged as uncorroborated |
| **conflict** | Genuine standoff — surfaced and quarantined, not hidden |
| **unverified** | Modeled or example only; the record *asks* rather than asserts |

A **standoff is gated on evidence grade, not rank** — a high-authority party with weak
evidence does not automatically beat a low-authority party with strong evidence.

The math is honest about disagreement in both directions: a **quarantined entry's
confidence bar drops below an honest model's** — a disputed number that looks confident
is the exact failure this layer exists to prevent. And agreement has an **anti-echo
rule**: a model concurring with the value it was derived from, or a party agreeing with
itself, is shown as concurrence but never counted as an independent vote.

## Stamp or override — two keys, lapsing signatures

The ledger is **two-key**: entries are signed by both the **homeowner** and the
**Custodian**. A verification stamp is **bound to the content it signed** via a content
fingerprint (`entryHash`). Change a number and the signature **lapses** automatically —
you cannot silently edit a verified claim and keep its stamp. An amended drawing needs a
new stamp. (The fingerprint is a drift detector computed identically on device and
server — tamper-evidence against silent edits, not a cryptographic signature.)

The Custodian's key turns two ways: **stamp** (the compiled value stands) or **override**
("your value stands" — the correction enters the record as the Custodian's own claim and
settles the standoff rather than joining it). Signatures bind to the entry *without* the
Custodian's own claim, so an override can never lapse the very stamp that carries it.

Behind each entry sits a **run record** of the automated gather passes, with honest
vocabulary — *landed · empty · failed · skipped* — and an explicit terminal state for
"the machines are exhausted and the entry is still weak: only a human can move this."
That is when the ⚖ seat brightens and asks.

The Custodian's oversight console derives a review queue across every home (quarantined
› lapsed › unverified › awaiting-stamp › unstamped › stamped) so nothing goes unreviewed
just because no one touched it. And the Custodian's overall read of a home is scaled by
how much of it he has actually stamped — an unreviewed ledger never presents his
blessing.

## Two lenses, one record

The same ledger renders through two vocabularies:

- **The homeowner's lens** uses capability words: *you · the record · verification · PI
  · the Custodian*. The agents stay backend.
- **The operator's lens** (admin-only) names the minds — it is the Custodian's console.

Same glyphs, same order, same data. Only the words change.

Until a real source lands, every empty slot carries the **Custodian's example** — a
plain, calibrated placeholder drawn from one deliberately generic starting structure (a
2,000 SF, two-level Rhode Island home at the state's average assessment), so the
examples agree with each other and the ledger is never a wall of dashes. An example is
honest about what it is: it renders as an example, sorts last, lights no seat, can never
win a reconciliation or count as verified, and disappears the moment a real claim takes
the slot.

## Why it matters

The Master Ledger is the substrate the rest of the system runs on:

- It's what gets **compressed** into a [HomeGenome](ontological-compression.md).
- It's what the [Loan Pit](value-chain.md#stage-1--loan-origination-the-loan-pit) underwrites against.
- It's what [REAPER](the-seven-minds.md) turns into a salvage bank and marketplace feed.
- Its verified, ground-truth entries are what make the [Collective Ontology](collective-ontology.md)
  trustworthy enough to license.

See also: [Collective Ontology](collective-ontology.md) · [Ontological Compression](ontological-compression.md)
