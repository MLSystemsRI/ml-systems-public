# Security

## Reporting a vulnerability

If you discover a security issue in the ML Systems app or infrastructure, please email
**salparvez@mlsystemsri.com** with details. Do not open a public issue for security matters.

## Scope of this repository

This is a **public reference** repository. It contains:

- The mobile app's **UI layer** (`src/app`, `src/components`)
- Product **documentation** (`docs/`)
- The **Deconstruction Lab** — method, writing brief, and articles (`deconstruction-lab/`)
- **AI and SEO context** for agents and search (`knowledge/`)
- The **ontology tranche** — families, workflow diagram, brief, articles (`ontology/`, generated from a private copy with engine paths stripped)

It intentionally does **not** contain:

- Any API keys, secrets, tokens, service-account files, or `.env` values
- The backend tRPC API, database schema, or data
- The proprietary ontology / ledger / compression engines
- R&D device mechanisms, patent claim material, feedstock specifications, or Transparency Trust
  Protocol scoring internals

## The private → public boundary

Content here is hand-copied across a boundary from a private codebase, so the boundary is
**checked, not remembered**: `npm run scrub-check` runs before every push and fails on forbidden
files, credential-shaped strings, private terms, and private imports.

The check also loads an optional, untracked `.scrub-private-terms.json` if one is present, so
protected terms can be enforced locally without publishing the list itself. Writers should read
`deconstruction-lab/source-brief.md`, which states the do-not-publish boundary in categories.

The UI source reads configuration exclusively from environment variables (e.g.
`EXPO_PUBLIC_*`) with non-secret public fallbacks; no credentials are embedded in the code.

If you believe any secret has been committed here in error, please report it immediately to the
address above so it can be rotated and purged.
