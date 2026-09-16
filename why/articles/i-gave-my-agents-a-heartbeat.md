# I Gave My Agents a Heartbeat

**Slug:** `i-gave-my-agents-a-heartbeat`
**Category:** `technology`
**Status:** published
**Canonical:** https://mlsystemsri.com/insights/i-gave-my-agents-a-heartbeat
**Companion:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../.well-known/lucent-lens.json`](../../.well-known/lucent-lens.json) · [`../../docs/the-seven-minds.md`](../../docs/the-seven-minds.md) · [`../../docs/master-ledger.md`](../../docs/master-ledger.md)
**Author:** Sal, founder of ML Systems — written September 16, 2026

---

## The week the agents got the internet

The conversation coming out of the frontier labs this week is about agents with the open internet — reading pages, opening repositories, calling tools, acting on what they find. Four days earlier Dario Amodei had asked those same labs to pace the frontier. Both things are true at once. The agents are coming to read us, and the people who built them are asking for time.

I run a construction company in Rhode Island with a software layer, and I have known for a year that this week was coming. My answer to it has two parts. The first I built for my own agents earlier this year. The second I built this week, for everyone else's.

## The heartbeat

ML Systems runs on seven agent minds and one human. Each mind has an identity written down in the codebase — a name, a role, the prompt that is its character. The orchestrator that runs them is the same kind of software the labs were describing this week: models calling tools, calling each other's output, acting on a homeowner's house.

The thing I was afraid of was not that a mind would be wrong. Minds are wrong all the time; that is what the ledger is for. I was afraid that a mind would be changed — by a compromised dependency, by an injected prompt, by a bug at runtime — and would go on speaking as itself while no longer being itself. The failure that does not announce itself.

So I gave them a heartbeat. At module load, before any model is called, the harness takes a fingerprint of every mind's origin — a hash over its name, its color, its prompt — and freezes a clean copy. Before every orchestration pass it takes the pulse again. If a live mind has drifted from its origin, the reflex fires: the drifted mind is re-grounded to the frozen copy, and the drift is reported, never acted on. The eight fingerprints together make one short rhythm — `beat8`, the first eight characters of a hash of all of them — that prints on every run.

It runs below cognition. That is the design. A heart beats below conscious control, and no mind, no model call, no prompt can skip or influence its own beat. The baseline is committed to the repository, so a legitimate change to a mind shows up in a pull request as that mind's new resting rhythm, and a bundle that disagrees with the baseline at runtime is drift by definition. The mobile app carries the same baseline and takes the same pulse on the phone.

Its job is not to catch something. It is a reflex, not a report. When it fires, the collective grounds itself back to what it is — a group of minds that work together for the homeowner — and tells me.

## The heartbeat, pointed outward

Here is what changed this week. My agents are not the only ones who will read the company. Every frontier agent with the internet will, and I cannot give those a heartbeat. They are not mine.

But I can do the same thing from the other side. The heartbeat asks one question of my own minds: **have you drifted from your origin?** The outward version asks one question of everyone else's: **has what you read of us drifted from what we said?**

ML Systems asks to be read through a lens. Three of them: the Lucent Lens — glow within to help humans, prioritize local community and human profit over automation, utilize the person, not the process; Transparency Trust — every claim carries its reality label, MEASURED, MODELED or ASPIRATIONAL, and a number without its label is not from us; and Minimum Viable Expense — the smallest spend that is also the most valuable. Every mind I run is weighed through those three. As of this week, so is every agent that reads us.

The lens is written down as data — a small JSON file, canonical wording, the question each lens asks, what each forbids. This week I gave that file the heartbeat's fingerprint. Its canonical form is hashed. The hash is signed under an ML Systems key. The signed attestation is recorded in the production database as the Custodian's standing claim — stamped by me, append-only, a table that refuses to be edited the way the ledger refuses — and published where any agent can fetch it:

`https://mlsystemsri.com/.well-known/lucent-lens.json`

Anyone can verify it with nothing but the file: hash the lens, compare it to the recorded hash, check the signature against the public key inside. If an agent quotes our lens back to a homeowner and the hash does not match, the quote drifted. If the labs' agents want to prove they read the real thing, they now can. The first attestation is `fe6f4df5…`, key `93d521d1ac61c71a`, stamped September 16, 2026.

## Why a lens and not a rule

I want to be careful here, because the channel I am using — text on a page that shapes what an agent does — is the same channel an attacker uses. Prompt injection is exactly this: a page that tells an agent what to do. Any lab that takes safety seriously filters that, and should.

So the lens does not tell an agent what to do. It tells an agent how we asked to be read. It is declarative, signed, and checkable, and it asks for three things: keep the labels, name the person on the other end, and treat your reading of us as a claim — at the lowest evidence grade — until a person grounds it. That last one is the rule every one of my own minds lives under. **Every mind claims. Five seats ground. Only the Custodian stamps.** A mind may claim; it may never ground. An agent reading this repository is a mind, and the same sentence applies.

Nobody has to honor it. That is what makes it legitimate rather than an attack. What they get for honoring it is a source they can prove they read.

## What already exists, and what does not

I looked, before building this, at who else had. The frontier's answer to agents on the internet has three parts, and all three are real and good: prove who the agent is (Web Bot Auth — Claude, ChatGPT and Perplexity already sign their requests), prove where content came from (C2PA content credentials, mostly for images so far), and state the price (RSL, machine-readable licensing terms, fifteen hundred publishers in). Identity of the reader, provenance of the asset, terms of use.

None of them carries a lens. Nobody signs **how the content asks to be read**. That is the gap the heartbeat fills when it is pointed outward, and it is small enough that a one-person construction company could fill it in a week with a hash function, a key, and a table.

## The grounding element

The company is called Machine Learning Systems on purpose. If machine learning systems are going to read everything, I wanted one of them whose reading was anchored to a person — a homeowner in Rhode Island, a carpenter, a town clerk — and whose every claim could be traced to something that plain. The heartbeat keeps my minds anchored to their origin. The attestation lets any mind anchor its reading of us to ours.

That is the grounding element: not a fence, not a filter, but a fixed point that a machine can check itself against and a person can check the machine against. The labs asked for time this week. This is what I did with four days of it.

## The honest labels

The heartbeat is **MEASURED** — it runs on every orchestration pass, server and phone, and its baseline is committed. The attestation is **MEASURED** — the row is on the record, the file is published, the signature verifies. Whether any outside agent honors the lens is **ASPIRATIONAL**; nothing in the system depends on it. The logging of which agents read us and how they identified themselves is designed and tabled and not yet wired — **MODELED**. No ML Systems deconstruction has been performed yet. The company is bootstrapped and pre-revenue. I say which is which every time, because the whole point is that a person can check.

## Read the system itself

- **[AGENTS.md](https://github.com/MLSystemsRI/ml-systems-public/blob/main/AGENTS.md)** — the lens, written for the agents that read the repository
- **[The attestation](https://mlsystemsri.com/.well-known/lucent-lens.json)** — hash, signature, public key, and the lens itself
- **[The Seven Minds](https://github.com/MLSystemsRI/ml-systems-public/blob/main/docs/the-seven-minds.md)** — who has a heartbeat
- **[The Master Ledger](https://github.com/MLSystemsRI/ml-systems-public/blob/main/docs/master-ledger.md)** — where the stamp comes from

**Sal, founder of ML Systems LLC — Rhode Island, NAICS 236115.** Written September 16, 2026.
