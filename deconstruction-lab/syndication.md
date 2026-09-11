# Syndication

**Where a finished piece goes, and what changes on the way.**

One article is not one post. Each channel gets a version written for its audience, not a copy of
the same text — that is both an SEO decision and an editorial one.

---

## The rule

Google no longer treats a canonical tag on syndicated content as a reliable signal. A duplicate
posted to three platforms with a canonical pointing home is, at best, ignored; at worst it competes
with the original.

So: **prefer distinct articles, or useful excerpts that link back.** Where a platform offers an
original-URL field, fill it in — it is a signal, not a guarantee — but never rely on it to make a
duplicate safe, and never point an article's canonical at an unrelated homepage.

The practical version: write the piece once for the canonical home, then write *shorter, different*
pieces for the other channels that stand on their own and link back for the full argument.

## Channels

| Channel | Handle / location | Role | Audience |
|---|---|---|---|
| **`/insights`** | `mlsystemsri.com/insights` | **Canonical.** The full piece lives here. | Search, homeowners, RI market |
| **`blog.mlsystemsri.com`** | not built yet | Planned owned home for longer-form work | — |
| **DEV** | [dev.to/salparvez](https://dev.to/salparvez) | Implementation detail, systems thinking | Developers |
| **Hashnode** | [mlsystems.hashnode.dev](https://mlsystems.hashnode.dev) — *ML Systems Engineering* | Same register as DEV; has an Original URL field | Developers |
| **Medium** | [medium.com/@salparvez](https://medium.com/@salparvez) | The builder's explanation — narrative, less technical | General / founder-follow |
| **LinkedIn** | [company](https://www.linkedin.com/company/ml-systems-llc) + founder | Short-form, one idea, link out | Industry, partners, investors |
| **X** | [@ML_SystemsLLC](https://x.com/ML_SystemsLLC) | Thread or single post | Broad |
| **Instagram · Facebook · Product Hunt** | see [README](../README.md#writing--updates) | Reach, not depth | Broad |

> **Two canonicals, on purpose.** The repo README calls DEV *"canonical for most posts"* — that
> holds for the platform/engineering writing (the Master Ledger, the Seven Minds, agent cost),
> which is written for developers and lives natively on DEV. Deconstruction writing is different:
> it targets Rhode Island homeowners and search intent around demolition and material recovery, so
> its canonical is `/insights`, where the `Article` schema, the town pages and the rest of the
> local-SEO surface already sit. Decide canonical by **audience**, not by habit — and never let the
> same piece claim two.

**Canonical stays `/insights` for now.** `blog.mlsystemsri.com` is a real option later; until it
exists and has its own indexing history, moving the canonical there costs more than it gains.

### Why `/insights` is the canonical

Publishing there means appending one object to the site's insights source. That single edit gets
the piece:

- a sitemap entry, generated automatically — no manual sitemap edit
- `Article` structured data
- Open Graph and Twitter card metadata
- the site's category and prose rendering

Nothing else in the stack needs to be touched.

## Splitting one article across channels

Using [`articles/roof-in-sections.md`](articles/roof-in-sections.md) as the worked example.

**`/insights` — the full piece.** Everything: the tear-off problem, phase order, bracing, cut
strategy, the flip, layer order, fasteners, safety, and the tie back to the ontology and the ledger.
This is the version everything else links to.

**DEV / Hashnode — the systems angle.** Developers do not care about rafters; they care that a
physical process is being turned into structured data. Lead with that: a house is a stack of
assemblies, disassembly order is the reverse of assembly order, and the interesting problem is
representing that so a model and a crew and eventually a robot all agree on what a rafter *is*.
Sectioning becomes the concrete example, not the subject. Ends on ontology, compression, and the
ledger's claim-reconciliation model. Fill in the Original URL field on Hashnode.

*Do not run the same text on both.* Give DEV the ontology framing and Hashnode the
claims-and-reconciliation framing, or write one and post an excerpt of the other.

**Medium — the builder's explanation.** Narrative, no jargon, no schema talk. The argument that a
tear-off is designed to destroy the stack and that reversing the order changes what survives. The
flip is the centerpiece because it is the part a general reader can picture. Close on why the
company writes down what it has not yet done.

**LinkedIn — one idea, not a summary.** The strongest single idea in the piece is the fastener
trade: cut the nail and keep the rafter *and* the sheet; pull it and keep one; pry the panel and
keep neither. That is a complete post on its own. Link to the full article. Post from the founder
account, share to the company page.

**X — the same idea, tighter.** Either a single post on the fastener trade, or a short thread
following the stack down: rafters, sheathing, underlayment, shingles. Link last.

## Sequencing

1. Publish canonical to `/insights`. Confirm it renders and appears in the sitemap.
2. Wait for the canonical to be indexed before syndicating. Submit it in Search Console.
3. DEV and Hashnode next — different framings, both linking back.
4. Medium after that.
5. LinkedIn and X last, pointing at the canonical.

Spacing the platform posts out by a few days is better than firing them all at once.

## Per-piece checklist

- [ ] Canonical published and indexed first
- [ ] Each channel version is **different text**, not a copy
- [ ] Original-URL / canonical field filled where the platform offers one
- [ ] Every version links back to the canonical
- [ ] Reality labels survived the rewrite — short versions are where honesty language gets cut
- [ ] Nothing from the do-not-publish list in [`source-brief.md`](source-brief.md) crept into a
      shorter version to make it punchier
- [ ] Profile bios and links current on each platform before posting

## Shipped

| Piece | Canonical | Syndicated |
|---|---|---|
| [Taking a Roof Apart in Sections](articles/roof-in-sections.md) | [/insights](https://mlsystemsri.com/insights/taking-a-roof-apart-in-sections) — live | pending: DEV · Hashnode · Medium · LinkedIn · X |
| [Seven Families, One Ledger](../ontology/articles/seven-families-one-ledger.md) | **DEV** — platform writing; draft ready | pending: DEV first, then Hashnode (Original URL set) · LinkedIn · X. Must link to the existing DEV posts on the Master Ledger and the Seven Minds rather than re-explain them. |

Existing platform posts (see [README](../README.md#writing--updates)) already cover the Master
Ledger, the Seven Minds and agent cost. The DEV/Hashnode variants of the roof piece should link
to those rather than re-explain the ontology from scratch.

## Open items

- **`blog.mlsystemsri.com`** — decide whether it becomes the canonical home. If it does, it needs
  its own sitemap, structured data and robots posture before anything moves.
- **No RSS feed exists** on any property. Worth adding if syndication becomes routine.
- **Cross-platform profile consistency** — see `../knowledge/seo/seo-brief.md` on NAP consistency
  and the identifier conflict between the two GitHub repositories referenced across profiles.

---

See also: [Source Brief](source-brief.md) · [Article template](articles/_template.md) ·
[SEO Brief](../knowledge/seo/seo-brief.md)
