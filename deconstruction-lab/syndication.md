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
| **Bluesky** | [@mlsystems.bsky.social](https://bsky.app/profile/mlsystems.bsky.social) | Same one-idea post as X; the builder/tech audience skews here now | Tech, open-source |
| **Threads** | [@ml_systemsllc](https://www.threads.com/@ml_systemsllc) | Conversational; pairs with the Instagram visual | Broad |
| **Substack** | [mlsystemsri.substack.com](https://mlsystemsri.substack.com) | Newsletter mirror of DEV via RSS once the publisher agreement is signed — not a separate canonical | Subscribers |
| **Hacker News** | [Salparvezml](https://news.ycombinator.com/user?id=Salparvezml) | **Show HN only when there is a real hook** — a shipped artifact, never a repost | Developers |
| **Instagram · Facebook · Product Hunt · Wellfound** | see [README](../README.md#where-ml-systems-keeps-its-work) | Reach and listings, not depth | Broad |

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
| [The Most Dangerous Cut on a Deconstruction](articles/the-most-dangerous-cut.md) | [/insights](https://mlsystemsri.com/insights/the-most-dangerous-cut) — **not live yet**; the `insights.ts` entry is written but unshipped, so syndicate nothing until it resolves | pending: LinkedIn (founder — the strongest single idea is that the section becomes progressively less attached while a person is still working on it) · X · Bluesky · Medium. **Not** DEV/Hashnode: no systems angle, and the ontology framing was already spent on the first roof post — link back to it rather than re-explain. **Rewrite rule for every channel version: this piece states a problem and deliberately withholds the sequence. Short versions must not fill that gap to make a punchier post.** |
| [The Waste Stream Twice the Size](articles/the-waste-stream-twice-the-size.md) | [/insights](https://mlsystemsri.com/insights/the-waste-stream-twice-the-size) — **not live yet**; ships with the `insights.ts` entry, so syndicate nothing until it resolves | pending: LinkedIn (founder — the strongest single idea is that 313 of the 456 million tons EPA counts as recovered is crushing, not reuse) · X · Bluesky · Threads · Medium. **Not** DEV/Hashnode unless the provenance angle is written as its own piece — this is market data for homeowners and press, not platform writing; link [The Master Ledger](../docs/master-ledger.md) rather than re-explain it. Hacker News only as a comment on a waste or circular-economy thread, never a Show HN. **Rewrite rule for every channel version: the 76% recovery rate is real and must not be flattened into "demolition landfills everything" to make a punchier post — the argument is downcycling, not landfilling, and the shorter the version the more tempting the wrong claim gets.** |
| [Pace the Frontier, Pace the House](../why/articles/pace-the-frontier-pace-the-house.md) | [/insights](https://mlsystemsri.com/insights/pace-the-frontier-pace-the-house) — live September 13, 2026 | per [`why/channel-versions.md`](../why/channel-versions.md): LinkedIn (founder) · X thread · Bluesky · Threads · Medium (builder's version) · DEV only if the "embedded evaluators at house scale" angle is written; thread replies included |
| [I Gave My Agents a Heartbeat](../why/articles/i-gave-my-agents-a-heartbeat.md) | [/insights](https://mlsystemsri.com/insights/i-gave-my-agents-a-heartbeat) — live September 16, 2026 | pending: DEV (builder's version — the fingerprint, the reflex, the signed attestation, with the verify snippet) · Hacker News comment on the agents-with-internet thread · LinkedIn (founder) · X thread · Bluesky · Threads |
| [The Language Modeler](../why/articles/the-language-modeler.md) | [GitHub](https://github.com/MLSystemsRI/ml-systems-public/blob/main/why/articles/the-language-modeler.md) for now — `/insights` if it earns it | pending: **DEV** first (this is the developer-forum audience; distinct framing, link the Master Ledger post rather than re-explain it) · Hacker News as a comment on the vibe-coding thread of the week, never a Show HN · LinkedIn (founder: "the first job I'll hire for is carpenter + Language Modeler — not yet") · X thread · Bluesky · Threads |
| [An Ontology on Three Blue Notepads](../ontology/articles/an-ontology-on-three-blue-notepads.md) | [/insights](https://mlsystemsri.com/insights/an-ontology-on-three-blue-notepads) — live September 13, 2026 | pending: LinkedIn (founder, with the photo) · X thread · Bluesky · Threads · DEV builder's version ("a controlled vocabulary on paper: what the codes became") — link the existing Master Ledger and Seven Minds DEV posts, do not re-explain them |
| [AI Is Not Valuable. Your Context Window Is.](../why/articles/ai-is-not-valuable-your-context-window-is.md) | [/insights](https://mlsystemsri.com/insights/ai-is-not-valuable-your-context-window-is) — live. The R&D passage was cut entirely on 2026-09-22, so there is no counsel gate and no scrub finding; the Recycle beat hands off to the RRR piece instead. | Long cut is the canonical; the [short cut](../why/articles/ai-is-not-valuable-your-context-window-is-short.md) (~1,570 words) is what syndicates across all thirteen channels. **Rewrite rule for every channel version: the 23% and 37% figures must keep "on our own runs". Dropping that scoping turns two MEASURED numbers about our own system into a comparative benchmark claim about other people's stacks.** Second rule: the piece names no apparatus and describes no mechanism — do not let a short version reintroduce one. |
| [I Stole RRR from Elon Musk and SpaceX](../why/articles/i-stole-rrr-from-elon-musk-and-spacex.md) | [/insights](https://mlsystemsri.com/insights/i-stole-rrr-from-elon-musk-and-spacex) — ready; ships with its `insights.ts` entry | **DEV** first (the reusability-economics angle is the developer read) · Hashnode (Original URL set) · LinkedIn (founder — strongest single idea: recovering a booster and scrapping it for aluminium would still have been recovery, and would not have moved cost per ton at all) · X thread · Bluesky · Threads · Medium. Hacker News only as a comment on a reusability or circular-economy thread, never a Show HN. **Rewrite rules: the piece credits Musk — do not cut the attribution to make it punchier, because the attribution is the point of the title. And 80–90% stays labelled MODELED in every cut.** |
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
