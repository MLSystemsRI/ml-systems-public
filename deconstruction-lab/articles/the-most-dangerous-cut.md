# The Most Dangerous Cut on a Deconstruction — and Why the Obvious Place to Make It Is Wrong

**Slug:** `the-most-dangerous-cut`
**Category:** `deconstruction`
**Status:** ready — problem statement only. The sequence ML Systems uses is deliberately not published.
**Canonical:** https://mlsystemsri.com/insights/the-most-dangerous-cut — *not live yet; the site build ships separately*
**Syndication:** hold until the canonical resolves — see [syndication.md](../syndication.md)

---

## There is one moment when a building becomes a load

An earlier piece described taking a roof apart in sections rather than tearing it off — cutting at a
rafter rather than between two of them, rigging before the release cut, lifting each section down,
and working the stack from the inside out so every layer is freed instead of broken.

Inside that sequence there is a single instant that carries almost all of the risk, and it is one
cut.

Up to that point a roof section is **structure**. It is attached, it is carrying its own weight
through a path it has used for decades, and it is behaving the way the framing crew intended. After
that cut it is a **load** — an object with mass and a centre of gravity, held by whatever happens to
be holding it.

Everything about whether that transition is controlled or uncontrolled comes down to one question:
at the instant the blade goes through, what is carrying the section?

That question is the whole problem, and it is worth sitting with before reaching for an answer.

## The obvious place to cut is the seam

Ask where to separate a roof section from the house and almost everyone points to the same place:
where the rafters land on the wall. The rafter-to-plate connection.

It is an intuitive answer and it is a defensible one. It is the actual boundary between two
assemblies. It is the line a drawing would show. It is the smallest amount of cutting that gets the
job done, and it leaves the wall below apparently untouched.

It is also where a conventional roof removal makes its cut, which means there is a great deal of
practice behind it and very little argument about it.

## What cutting at the seam actually costs

Look at what that cut is doing, though, rather than where it is.

The rafter-to-plate connection is the **live end of a load path**. Gravity runs down the rafters,
into that connection, into the top plate, down the studs, into the foundation. While the roof is up,
that path is doing work continuously — and cutting there means severing a path while it is still
carrying.

Three things follow, and none of them are improved by better technique:

- **It releases rotation.** A rafter bearing on a plate is not just pressing down; it is a sloped
  member held at its foot. Cut that foot and the rafter wants to rotate about the connection. Do it
  to one rafter and it is a twitch. Do it across a section and it is a behaviour.
- **It destroys the connection.** The bird's mouth — the notch cut into the rafter so it can sit
  flat on the plate — is cut through or split in the process. So is whatever metal is holding it
  down. Both are recoverable material, and both are gone.
- **It happens one rafter at a time, at height.** The cut cannot be made in a single pass. It is a
  series of separate cuts, each one changing the structural state of the section slightly, made by
  someone working at the top of a wall.

The last one is the real cost. **The section becomes progressively less attached while a person is
still working on it.** There is no single moment of release to plan around, gate, or call out —
there is a gradient, and somewhere inside that gradient the thing stops being structure.

## The connection is the one detail nobody can see

There is a second problem layered on the first, and it is the one that turns a manageable risk into
an unpredictable one.

Nobody knows what is actually holding the roof down until they look.

A rafter might be secured with a hurricane tie. It might have a strap. It might sit in a hanger. It
might be held by nothing but three toe-nails driven at an angle by someone in 1962 who expected
them to be there forever. Those cases behave completely differently at the moment of release — and
through a finished ceiling, every one of them looks exactly the same.

Nor can the answer be looked up. Connection detail is the part of a building that public records
describe least and that varies most: by era, by town, by code cycle, by whoever happened to be on
the job that week. An assessor's card will not have it. A satellite image cannot see it. A model can
predict it from the era and the region — and that prediction is precisely the kind that needs
checking against the building before anyone cuts anything.

Which gives the one rule in this piece that is not negotiable:

**No release cut is made on a connection nobody has looked at.** Not inferred from the rafters on
either side of it. Not assumed from the age of the house. Not taken from a drawing. Looked at.

An undiscovered tie is the single thing most likely to turn a planned handoff into a load nobody is
holding.

## Order is the entire safety argument

Everything in a deconstruction sits inside a safety envelope, and with a cut like this one the
envelope is mostly a statement about **sequence**.

- **Rigging goes on before the release cut, never after.** A section freed from the structure and
  not yet held by the crane is a section nobody controls.
- **One voice to the crane.** The rigger signals; nobody else does.
- **Fall protection** for anyone on the roof until it is off — full tie-off, rated anchors, no
  unprotected edge work. `OSHA 1926 Subpart M`
- **A written lift plan**, reviewed by the operator and the rigger before the first pick, with a
  barricaded swing radius, full outrigger extension on firm ground, and hard power-line clearances.
  `OSHA 1926 Subpart CC`
- **A wind limit.** A roof section is a large flat plate — it is a sail long before it is heavy.
- **Silica and dust control** when cutting. `OSHA 1926.1153`
- **Nobody beneath or inboard of a section** that is about to be freed.

None of those are difficult individually. Their value is entirely in the order they happen in, and
that is the honest shape of this kind of work: **the danger is almost never in the difficulty of a
step. It is in doing a step before the one that was supposed to precede it.**

## What the connections teach the system

There is a reason ML Systems treats this as a data problem and not only a safety one.

A deconstruction is a recovery, and it is also a **measurement**. Examining every roof-to-wall
connection in a house produces something unusual and genuinely scarce: a complete, verified record
of how one building was actually held together — not how its era suggests it might have been.

That record does not stay on paper.

- **Ontology rows.** Each connection is described in the shared grammar of the
  [Collective Ontology](../../docs/collective-ontology.md), so the carpenter, the estimator, the
  model and eventually the robot all describe the same tie the same way.
- **Ledger claims.** Each one posts a claim to the [Master Ledger](../../docs/master-ledger.md),
  carrying its source and its evidence grade, then gets reconciled against what the assessor's
  record, the homeowner's memory and the model each believed was up there.
- **A compressed record.** What is learned collapses into the home's HomeGenome — the mechanism
  [Ontological Compression](../../docs/ontological-compression.md) uses to reduce a whole house to
  something a model can reason over.
- **A reverse takeoff.** REAPER, the deconstruction mind among the
  [Seven Minds](../../docs/the-seven-minds.md), compiles the bill of materials and routes every
  recovered line by **RRR — Reuse › Resale › Recycle**, to its most valuable recoverable state.

The most valuable output is the **disagreements**. A tie nobody predicted. A span that was wrong. A
fastener pattern that does not match the era the record claims. Each of those is a correction the
next house inherits for free, and each one exists only because somebody had to look before they
could cut.

**The prediction was made from a record, an image and a model. The connection is where the building
answers back.**

## The honest part

Two things to state plainly, because stating them is the point.

**No ML Systems deconstruction has been performed yet.** Everything above is reasoned from framing
practice and from the safety standards the work has to satisfy — *MODELED*, not measured. It is not
a report from a completed job, and the recovery figures modeled elsewhere in this system are targets
rather than results.

**And this piece describes a problem without publishing the answer to it.** That is deliberate, and
it would be dishonest to let it read as though there were simply nothing more to say. There is a
better place to make this cut than the seam, and reaching it is a matter of sequence rather than
technique. ML Systems has that sequence written down, is testing it, and is not publishing it yet.

What is published here is the part every deconstruction crew already has to reckon with, whatever
method they use: the release cut is the moment that matters, the connection is invisible until you
open it, and order is what makes the difference. Those are worth saying out loud on their own.

The rest will follow a real roof arguing with it.

---

*ML Systems LLC · Rhode Island · NAICS 236115 · [mlsystemsri.com](https://mlsystemsri.com)*
