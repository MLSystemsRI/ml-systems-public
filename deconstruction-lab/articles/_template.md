# [Title — specific, not a category label]

**Slug:** `kebab-case-slug`
**Category:** `deconstruction` | `loan-origination` | `construction` | `materials` | `technology` | `market-data`
**Status:** draft | ready | published
**Target:** `mlsystemsri.com/insights` (canonical), then per channel — see [syndication.md](../syndication.md)

---

## [Open with the problem, not the company]

Two or three paragraphs establishing what is actually wrong with how this is done today. Concrete,
specific, and fair to the conventional approach — say why it exists and when it is the right answer
before saying what it costs.

End the opening with the question the piece answers.

## [Section headings are narrative phrases]

Not "Benefits" or "Our Approach." The docs in this repo use headings like *"The core idea: claims,
not facts"* and *"Stamp or override — two keys, lapsing signatures."* A heading should carry an idea.

Body paragraphs run three to five lines. Bold the defined term the first time it appears. Use
tables for anything with more than three parallel items.

## [The distinctive middle]

The part only ML Systems can write. If the piece could have been published by any contractor in the
state, it is not finished.

## What this teaches the system

Most pieces should land here: how the physical work becomes structured data. Tie to the public
vocabulary and link into `../../docs/`:

- **Collective Ontology** — the shared grammar
- **Ontological Compression** / **HomeGenome** — the compact record
- **Master Ledger** — claims, sources, evidence grades, reconciliation
- **The Seven Minds** — REAPER for deconstruction, and the others by role
- **RRR** and **ML Material ID** — routing and provenance

## The honest part

Every piece carries this, in some form. State plainly what has not happened yet:

> No ML Systems deconstruction has been performed yet. Everything described here is a designed
> sequence, not a report from a completed job.

Reality labels — *MEASURED*, *MODELED*, *ASPIRATIONAL* — on every forward-looking claim.

---

*ML Systems LLC · Rhode Island · NAICS 236115 · [mlsystemsri.com](https://mlsystemsri.com)*

---
---

## Notes for the writer — delete before publishing

**Read first:** [`../source-brief.md`](../source-brief.md). It carries the required phrasings, the
canonical definitions, and the twelve do-not-publish categories. This template does not repeat them.

**Markdown subset.** The site's prose renderer supports only: `##` and `###` headings, `-` bullets,
`1.` numbered lists, `|` tables, `**bold**`, `` `code` ``, and `[links](url)`. No images, no
blockquotes, no nested lists, no HTML. Anything else renders as literal text.

**Publishing to `/insights`** means appending one object to the site's insights source in the
private monorepo:

```
{
  slug:        "kebab-case-slug",
  title:       "…",
  description: "One to two sentences. This becomes the meta description and the OG description.",
  keywords:    ["…", "…"],          // 6–12, from the source brief
  category:    "deconstruction",
  publishedAt: "YYYY-MM-DD",
  content:     `…`,                  // the body above, backtick-quoted
}
```

That single edit generates the sitemap entry, `Article` structured data, and the OG/Twitter tags.
No other file needs to change.

**Before shipping:** run `npm run scrub-check` from the repo root — it must print `clean`.
