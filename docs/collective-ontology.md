# The Collective Ontology

**How the system agrees on what a house *is*.**

A house means different things to different parties. To an assessor it's a valuation. To a
lender it's collateral. To a deconstruction crew it's tonnage. To a robot it's a sequence of
manipulable members. The **Collective Ontology** is the shared grammar that lets all of these
views describe the *same* house without talking past each other.

It is the framework — created by the founder — that **governs how the [three neural nets](neural-net-architecture.md)
communicate**, and how the [Seven Minds](the-seven-minds.md) contribute claims to one
[Master Ledger](master-ledger.md) without collision.

---

## Why "collective"

No single mind owns the truth of a house. The ontology is **collective** in two senses:

1. **Multi-author.** VERA contributes what she *sees*, CDA what the plans *imply*, REAPER what
   can be *recovered*, PIT LORD what it can be *financed for*, MURPHY what it takes to *build*,
   the homeowner their *intent*, and the Custodian the *oversight stamp*. The ontology is the
   contract that makes those contributions composable.

2. **Convergent.** When minds disagree, the ontology provides the reconciliation grammar
   (see [Master Ledger → domain-scoped authority](master-ledger.md#domain-scoped-authority)).
   Multiple lenses (correctness, structure, recovery) converge by commonality and surface
   conflict rather than averaging it away.

## The building blocks

The ontology grounds every abstract concept in **real primitives** — actual member specs,
not vibes. A wall is not "a wall"; it's a wall *class* with framing, sheathing, LF, and a
place in a decon sequence. The primitives roll up into structured objects:

- **HomeGenome** — the compressed, canonical description of one home (see
  [Ontological Compression](ontological-compression.md))
- **Envelope** — the building shell that absorbs individual wall/opening claims
- **Assembly stack** — foundation → floors → walls → roof, each with a takeoff
- **Value-chain ontology row** — the per-property, per-cycle persisted ontology
- **RecordAttributes** — the ~30 harvested assessor fields (materials, sale history,
  valuation curve, parcel, owner, outbuildings)

## Codes, not storage

The ontology grows by **extending its codes, not its storage**. Claims and outputs are tagged
with stable codes — for example:

| Code family | Meaning |
|---|---|
| `DES:*` | Design/geometry facts (e.g. `DES:roof-form`, `DES:heights`, `DES:perimeter`) |
| `BLD:*` | Build facts (e.g. `BLD:load-path`, `BLD:footing`, `BLD:bom`) |
| `VER:*` | Verification stamps (e.g. `VER:code-compliance`, `VER:overlook`) |

New knowledge becomes a new code, not a new table. That keeps the ontology **extensible
without schema churn** and keeps every claim traceable to the mind that made it.

## From ontology to ground truth

The reason the ontology is built with such discipline is its endgame: **ontology licensing**.
The most valuable thing ML Systems can sell is not a house — it's the **ground-truth
construction sequence data** that robotics companies need to train humanoid robots to build.
81 task codes, ~1,480 executions, a construction DAG, and robot parameters: nobody else has
this, because nobody else runs the same home through decon-and-rebuild cycles and records
every member.

That endgame only works if the ontology is trustworthy — which is why it's built on a
verifiable [Master Ledger](master-ledger.md) with honest [reality labels](../README.md#reality-labels).

See also: [Ontological Compression](ontological-compression.md) · [Neural-Net Architecture](neural-net-architecture.md)
