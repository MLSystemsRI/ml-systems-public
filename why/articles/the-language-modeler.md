# The Language Modeler

**Slug:** `the-language-modeler`
**Category:** `technology`
**Status:** published — GitHub is the home for now; `/insights` on mlsystemsri.com is available if it earns it
**Canonical:** https://github.com/MLSystemsRI/ml-systems-public/blob/main/why/articles/the-language-modeler.md
**Companion:** [`../../docs/neural-net-architecture.md`](../../docs/neural-net-architecture.md) · [`../../docs/master-ledger.md`](../../docs/master-ledger.md) · [`../../docs/the-seven-minds.md`](../../docs/the-seven-minds.md) · [`../../ontology/articles/an-ontology-on-three-blue-notepads.md`](../../ontology/articles/an-ontology-on-three-blue-notepads.md)
**Author:** Sal, founder of ML Systems — written September 13, 2026
**Subtitle:** Vibe coding names a mood. The job has a name, and it is older than the tools.

---

## The fight that never names the role

There is a standing fight on every developer forum about what to call a person who builds software by writing English and letting a model write the code. The two sides talk past each other. One side says it is creation and not engineering. The other says the engineering did not disappear, it moved. Both are describing the same person and refusing to name the role.

At ML Systems we do not say vibe coding. The role is **Language Modeler**. It is not a nickname; it is a named node — `LM` — in the company's [Financial Neural Net](../../docs/neural-net-architecture.md), beside the Financial Architect and the Accounting Engineer, and it is the title on the founder's line of the record.

## What the term means

A Language Modeler models the system in language. Not the syntax of the system, the system itself: what it is, what it is made of, what it is allowed to do, who may write to it, and what counts as true inside it. The output of that work is a model, written in English, precise enough that it can be carried across into code without losing anything that matters.

The AI is a moderator between the English language and the coding language. That is the whole of its job in this arrangement. It stands between two languages and carries the model from one to the other. It does not own the English, because the Modeler wrote it. It does not own the code, because the code is a translation of the English, and a translation is judged against its source.

Once you see the AI as a moderator, the accountability question that dominates these threads answers itself. A moderator between two languages is never the author of record. If the English was wrong, the Language Modeler owns it. If the translation was wrong, review catches it, or the Modeler owns that too. Nobody gets to say the AI did it, and nobody needs to.

## Why "vibe" was the wrong word

Vibe describes a mood. It says something about how the person felt while typing, and nothing about what they produced. A mood cannot be reviewed, cannot be handed to the next person, and cannot be held responsible for a production incident at two in the morning.

A model can be. A model has parts you can point at. This constraint was stated. That invariant was not. This party may assert that value and that party may not. When the code fails, you go back to the model and ask which of those was missing or wrong, and the answer is a sentence in English that a person wrote and can fix.

The critics of vibe coding are right that shipping unreviewed output into anything that touches money or personal data is negligent. They are wrong that the fix is to send everyone back to the language reference for two weeks. The fix is to demand the model. Show me the English. If the English is precise, the review of the code is a check on translation, which is a bounded task. If the English does not exist, there is nothing to review against, and no amount of reading the code will tell you what it was supposed to do.

## What the Modeler has to know

Not every line of the target language. Enough to read the translation, and much more importantly, enough to write the source precisely. That means knowing the domain cold, because the model is written in the domain's vocabulary, not the language's.

I spent three years as a frame-to-finish carpenter on custom residential work and two years estimating rough-carpentry packages for multi-level commercial buildings before this. The vocabulary I model in is the building's: rafter, sheathing, ring-shank, town record, appraisal, permit. The system I model is a house record, the [Master Ledger](../../docs/master-ledger.md), that seven AI agents write to alongside one human. The model says, in English:

- that the record stores **claims, not facts** — every value carries who made it, an evidence grade, and the value itself
- that evidence is graded on a ladder — **measured › sensed › stated › record › modeled** — and a modeled value is never authoritative
- that a model agreeing with the value it was derived from is shown as concurrence and never counted as an independent vote
- that every mind claims, **five seats ground**, VERA gates, and **only the Custodian stamps**
- that a stamp is two keys — the homeowner's and the Custodian's — bound to a fingerprint of the content, so both lapse the moment the content changes; a drift detector, not a cryptographic signature
- that two credible sources disagreeing is a state called **conflict**, which is quarantined and never averaged

None of that is code. All of it became code. The AI moderated the translation, and every time the code did something the English did not say, the English was the thing I went back to. The homeowner never sees the code. They talk to [PI](../../docs/the-seven-minds.md), the orchestrator, and PI is the Language Modeler's voice in the product — the English, spoken back.

## Where the skill actually lives

The people defending vibe coding usually describe decomposing a problem, orchestrating tools, validating outputs, and checking that what came back solves the problem. That is modeling. They already do the job. They have been using a word that undersells it, and the word is what the critics are reacting to.

The people attacking vibe coding usually describe reading every line and interrogating the model about its choices. That is review of a translation. It is necessary and it is bounded, and it is much easier when the source exists.

The Language Modeler does both, and the model in between is what makes either one possible.

## The first hire

Here is the part that is specific to a construction company.

The job at ML Systems is a **layer**, not a title swap. The person is a carpenter first and a Language Modeler on top of it, because the model is written in the building's vocabulary and you cannot write precisely in a vocabulary you have not carried. The first ontology this company runs on was written on [three blue notepads](../../ontology/articles/an-ontology-on-three-blue-notepads.md) by a laborer who did not know the word — two-letter task codes, a definition the first time each appeared, a score at the bottom of the day. That is what the layer looks like before anyone calls it software: a person on the tools, modeling the work in language as it happens.

So the first role ML Systems will hire for is exactly that — **carpenter and Language Modeler**, one person, both halves. Someone who can cut a bastard valley in the morning and, in the afternoon, write down in plain English what a wall assembly is allowed to be so a model can turn it into a ledger entry the crew will recognize.

We are not hiring right now. The company is bootstrapped and pre-revenue, and I say so on every page. I am putting the role in the record now so that when the position opens, nobody has to guess what it is, and so that anyone already doing this job on another crew knows it has a name.

## The honest labels

Because the whole argument here is about what counts as true, the labels go on this piece too. The software is **MEASURED**: a shipped app, a working ledger, an ontology that seven agents and one human speak fluently. **No ML Systems deconstruction has been performed yet**; the 80–90% recovery target for a house is **MODELED** and the two-day crane sequence is **ASPIRATIONAL**. The term Language Modeler is a position, not a standard. I am putting it in the record so it can be argued with.

## Read the system itself

- **[Neural Net Architecture](../../docs/neural-net-architecture.md)** — where `LM` sits, beside `FA` and `AE`
- **[Master Ledger](../../docs/master-ledger.md)** — the model the English describes: claims, the evidence ladder, five seats, two keys
- **[The Seven Minds](../../docs/the-seven-minds.md)** — the agents that write to it, and PI as the Modeler's voice
- **[An Ontology on Three Blue Notepads](../../ontology/articles/an-ontology-on-three-blue-notepads.md)** — the layer, before it had a name

**Sal, founder of ML Systems LLC — Rhode Island, NAICS 236115.** Written September 13, 2026. Public contact: salparvez@mlsystemsri.com.
