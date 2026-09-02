# The Master Ledger

**One home. One auditable record. Many authors.**

The Master Ledger is the single source of truth for a property as it moves through the
[value chain](value-chain.md). It is not a spreadsheet of numbers — it is a **record of
claims about a house**, each claim carrying its source, its evidence grade, and its
verification state. Think of it as the town files, re-imagined as a living, multi-author,
cryptographically-stamped document.

---

## The core idea: claims, not facts

A house accumulates *claims* from many parties:

- The **homeowner** ("it has 3 bedrooms, the roof is 5 years old")
- The **assessor record** (VGSI / town valuation data)
- The **[Seven Minds](the-seven-minds.md)** (VERA's vision reads, CDA's takeoffs, REAPER's tonnage)
- **ML Systems staff** and the **Custodian**

These claims frequently *disagree*. The ledger's job is not to pick a winner blindly, but to
**reconcile by authority and evidence** and then record the outcome transparently.

## Domain-scoped authority

A flat "measured beats stated beats record" ordering is wrong — it would let a homeowner
saying "ranch" override the assessor on the number of stories. So authority is **scoped to a
domain**: the assessor is authoritative on legal/valuation facts; VERA's vision is
authoritative on the visible envelope; the homeowner is authoritative on intent and
recent work. Within each domain, evidence is ordered:

```
MEASURED  >  STATED  >  RECORD  >  MODELED
```

## Reconciliation states

Every entry resolves into one of:

| State | Meaning |
|---|---|
| **confirmed** | Multiple independent sources agree |
| **reconciled** | Sources disagreed; resolved by domain authority + evidence grade |
| **single-source** | Only one source; recorded but flagged |
| **conflict** | Genuine standoff — surfaced, not hidden |
| **unverified** | No verification stamp yet |

A **standoff is gated on evidence grade, not rank** — a high-authority party with weak
evidence does not automatically beat a low-authority party with strong evidence. Suspect
claims are **demoted**, not deleted.

## Verification and lapsing signatures

The ledger is **two-key**: entries can be stamped by both the **homeowner** and the
**Custodian**. A verification stamp (`VER:...`) is **bound to the content it signed** (an
`entryHash`). Change a number and the signature **lapses** automatically — you cannot silently
edit a verified claim and keep its stamp. This is what makes the ledger auditable rather than
merely editable.

The Custodian oversight console derives a review queue across every home (quarantined ›
lapsed › unverified › awaiting-stamp › unstamped › stamped) so nothing goes unreviewed
just because no one touched it.

## Record-first UI

In the app, the ledger is presented **record-first**: pins, the record, and the score in a
flat order, with rating-verifier glyphs (⚖ shown dim until stamped). The building envelope
absorbs individual wall claims so the record reads as a house, not a pile of line items.

## Why it matters

The Master Ledger is the substrate the rest of the system runs on:

- It's what gets **compressed** into a [HomeGenome](ontological-compression.md).
- It's what the [Loan Pit](value-chain.md#stage-1--loan-origination-the-loan-pit) underwrites against.
- It's what [REAPER](the-seven-minds.md) turns into a salvage bank and marketplace feed.
- Its verified, ground-truth entries are what make the [Collective Ontology](collective-ontology.md)
  trustworthy enough to license.

See also: [Collective Ontology](collective-ontology.md) · [Ontological Compression](ontological-compression.md)
