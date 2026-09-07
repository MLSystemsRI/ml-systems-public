# src — mobile UI reference

This directory is the **front-end layer** of the ML Systems mobile app (Expo / React Native,
Expo Router, NativeWind), published as a **readable reference** — not a runnable build.

```
src/
  app/          Expo Router screens: (auth) + (dashboard) route groups
  components/    UI components used across the screens
```

## What it does and doesn't include

- ✅ **Screens and components** — the actual UI the app ships.
- ❌ **The private engine it calls into.** These imports resolve to a private repository:
  - `@/lib/*` — device stores, tRPC client, formatters, and glue
  - `@ml-systems/types` — the proprietary ontology, ledger, compression, and takeoff engines
- ❌ **No secrets.** Every key is read from `process.env` (`EXPO_PUBLIC_*`) with non-secret
  public fallbacks. Nothing in here is a credential.

## The boundary is checked, not remembered

Every refresh of this directory is a hand copy across a private→public line, so the line
is enforced by a script rather than by memory: `npm run scrub-check` fails on any secret-
shaped string, any file that must never be public, any import that would only resolve
privately (other than the two above, which are private by design), and any `process.env`
read that isn't `EXPO_PUBLIC_*`. It runs before every push.

## Why it won't `npm install && run`

Because the modules above are private, this source will not build as-is. That's intentional:
the purpose of this directory is to let people (and language models) **read** how the product's
front end is structured and how it presents the [concepts](../docs) — not to reproduce the app.

See the [top-level README](../README.md) and [App Features](../docs/app-features.md) for the guided tour.
