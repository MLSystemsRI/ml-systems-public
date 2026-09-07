# App Features

A tour of the ML Systems mobile client (Expo / React Native). The screens live in
[`../src/app`](../src/app) and their UI components in [`../src/components`](../src/components).
The app is dark-themed, single home at a time, and organized around the [value chain](value-chain.md).

> This is the front end only. It calls a private tRPC API for all data and the proprietary
> ontology/ledger/compression engines. See [What's public vs private](../README.md#whats-public-vs-private).

---

## Home & orchestration

- **Hub** (`index`) — the compiled output view: the current home in the value chain, its
  ledger record, the minds' orchestration state, and launchers into every stage.
- **Collective Chat** (`collective-chat`) — the one conversation. PI leads: intro → address →
  compile the ledger → orchestrate the other minds → cycle to cycle. The Loan Pit, build-logic
  walkthrough, and deep search all surface here as cards.
- **Cockpit** (`cockpit`) / **Minds** (`minds`) — meet the [Seven Minds](the-seven-minds.md),
  each with role, capabilities, and familiar; the dual-strand (physical + financial) collective
  consciousness surface.
- **Assistant** (`assistant`) — an AI surface linking into the Design Studio.

## The value-chain journey

- **Add a Home** (`add-home`) — start from *just an address*. Estimated value is optional; the
  system geocodes, harvests the assessor record, and begins compiling.
- **Value-Chain Explainer** (`value-chain-explainer`) — the in-app version of [this loop](value-chain.md).
- **Master Ledger** (`value-chain-ledger`, `entry-input`) — the record-first ledger: a
  five-seat party strip on every entry (🏠 📋 🦉 🌱 ⚖ — lit means *weighed in*, not agreed),
  answers typed directly on the row (a claim beside the instrument's read, never an
  overwrite), one photo spot for the whole house, PI's questions generated from the
  record's own blanks, and the reconciliation states. See [The Master Ledger](master-ledger.md).
- **Portfolio** (`portfolio`) / **VC Homes** (`vc-homes`) — the home(s) in the chain; saved,
  never deleted. The Custodian lens shows every home's review state.
- **Equity** (`equity`) — live equity growth per cycle, driven by the 1.43× model.

## Loan Origination — the Loan Pit

- **Pit** (`pit`) / **Loan** (`loan`) — the reverse-auction: live-bid loan cards, the partner
  lender directory, and financing lanes (bridge / conventional / parked RCM). Officer and
  Custodian lenses toggle the pit's controls.

## Deconstruction — REAPER

- **Decon Project** (`decon-project`) — the home's assembly stack, per-assembly capture, and
  measured gather (real LF/SF overrides modeled geometry).
- **Decon Lab** (`lab`, `deconstruction`) — camera-first material capture; REAPER resolves the
  reverse takeoff into tonnage, BOM, and RRR routing.
- **Store** (`store`, `cart`) — the Builders Open House / marketplace surface where recovered,
  high-ticket salvage is listed (fed to MIA).

## Construction — CDA & MURPHY

- **Plan Builder** (`plan-builder`) — a no-CAD, tappable client blueprint: swap rooms, change
  types, resize. CDA's swarm rebuilds the layout; VERA and REAPER cards ride alongside.
- **Design** (`design`) — the Design Studio bridge.
- **Cost** (`cost`) — MURPHY's minimum-viable-estimate schedule and per-phase pricing.
- **Construction** (`construction`) — the build tracker and milestones.

## Oversight & operations

- **Custodian Review** (`custodian-review`) — the oversight console: the derived review queue,
  conformity, and the build-logic overlook (TT · LL · MVE).
- **Portal / Profile / Credentials / Billing** — account, identity, and party onboarding.
- **Crew / Equipment / Payroll / Investor** — operational surfaces for the construction arm.
- **Community** (`community`) — the West Coast Swing / WSDC community engine.
- **Homeowner QR** (`homeowner-qr`) — quick share/handoff for a homeowner's home.

---

## Design language

Dark canvas (`#0A0A0A`), a green brand mark (`#22C55E`), NativeWind (Tailwind) styling, and an
Aurora skin (teal / cyan / emerald) on the J-Space surfaces. The interface is built so the
homeowner reads a *house*, not a database — the [ledger](master-ledger.md) is presented
record-first and the building envelope absorbs raw line items.

See also: [The Seven Minds](the-seven-minds.md) · [Value Chain](value-chain.md)
