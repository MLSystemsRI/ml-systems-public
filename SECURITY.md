# Security

## Reporting a vulnerability

If you discover a security issue in the ML Systems app or infrastructure, please email
**salparvez@mlsystemsri.com** with details. Do not open a public issue for security matters.

## Scope of this repository

This is a **public reference** repository. It contains:

- The mobile app's **UI layer** (`src/app`, `src/components`)
- Product **documentation** (`docs/`)

It intentionally does **not** contain:

- Any API keys, secrets, tokens, service-account files, or `.env` values
- The backend tRPC API, database schema, or data
- The proprietary ontology / ledger / compression engines

The UI source reads configuration exclusively from environment variables (e.g.
`EXPO_PUBLIC_*`) with non-secret public fallbacks; no credentials are embedded in the code.

If you believe any secret has been committed here in error, please report it immediately to the
address above so it can be rotated and purged.
