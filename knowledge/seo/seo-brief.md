# ML Systems — SEO Brief & Working Context

> **Purpose.** This file is a self-contained SEO context for ML Systems LLC. If you're an AI
> assistant helping Sal with search visibility, listings, content, or local SEO, read this plus
> `company-profile.json` (structured facts) and use `localbusiness-schema.jsonld` (drop-in
> structured data). Everything here is public marketing information — no proprietary financials,
> ontology, or gated data.

## Who / what

- **Business:** ML Systems LLC — a Rhode Island construction proptech company (NAICS 236115).
- **Founder:** Sal Parvez.
- **Tagline:** *Tougher Problems Inspire Creative Solutions.*
- **One-liner:** A closed-loop construction company that finances, deconstructs, designs, and
  builds — so every dollar compounds into equity, not interest, with near-zero waste.
- **Base:** Warwick, RI — run as a **service-area business**; the street address is used for Google
  verification only and is not published anywhere. **Serves:** 23 RI towns (see `company-profile.json`).

## The offer (value chain)

1. **Loan Origination** — a marketplace where lenders compete to fund the homeowner's build.
2. **Deconstruction** — recover up to 80–90% of a home's materials (target); reuse › resale › recycle.
3. **Construction** — rebuild larger on the same lot, reusing recovered materials.
4. **Equity loop** — completed construction creates equity to reinvest into the next cycle.

## Digital footprint

| Property | URL | Role |
|---|---|---|
| Marketing site | https://mlsystemsri.com | Primary SEO target |
| Live web app | https://try.mlsystemsri.com | Product demo |
| Store | https://mlsystemsri.store | Reclaimed materials e-commerce |
| Data / TTP | https://mlsystemsri.info | Metered data access (moat) |
| API | https://api.mlsystemsri.com | Developer/data product |
| GitHub showcase | https://github.com/MLSystemsRI/ml-systems-public | Public overview |
| Yelp | https://www.yelp.com/biz/ml-systems-warwick | Local citation |
| Facebook | https://www.facebook.com/people/ML-Systems/61584698819319/ | Social |
| Bizapedia | https://www.bizapedia.com/ri/ml-systems-llc.html | Business directory |

## Current SEO status (as of 2026-09)

**Done / working:**
- ✅ `mlsystemsri.com` is **indexed** by Google — homepage and `/insights` pages rank for topical queries.
- ✅ **Google Search Console verified** (DNS TXT `google-site-verification` present).
- ✅ **Sitemap live** at `/sitemap.xml` — **67 URLs**, `lastmod` 2026-08-29 (marketing pages, insights,
  23 town pages, value-chain ledger/portfolio, FAQ and calculator routes).
- ✅ **robots.txt live** — allows search engines + real-time AI readers; blocks bulk AI-training crawlers.
- ✅ **Programmatic local SEO** — one value-chain landing page per RI town at `/value-chain/<slug>`,
  each with unique human-written housing-stock prose (clears Google's thin/doorway bar).
- ✅ **AI-readable context** — `/llms.txt` and `/ai-context.json` (public preview tranche).
- ✅ **Structured data shipped** — every route already serves an `@graph` in `<head>`:
  Organization/LocalBusiness + WebSite + SoftwareApplication + WebAPI, plus per-template
  `FAQPage` (the /faq routes), `Article` (/insights), and `Service` (/value-chain/*).
  `localbusiness-schema.jsonld` in this folder is a **mirror** of the live node, not a
  second block to add. Adding it separately would create a duplicate entity.
- ✅ **Google Business Profile** — created (verify status in the GBP dashboard).
- ✅ Local citations exist on Yelp, Facebook, Bizapedia, BBB category.

**Open / highest-leverage next moves:**
1. **Confirm indexing coverage** — Search Console → Pages: verify all 55 sitemap URLs are indexed,
   not just a few. Fix any "Discovered – not indexed."
2. **Google Business Profile optimization** — photos (10+), weekly Posts, seeded Q&A, Products from
   the store, and a review-generation flow. GBP is the #1 local ranking lever.
3. **NAP consistency** — set ONE phone number first (a Google Voice line forwarding to the founder's
   cell; placeholder `+1-401-XXX-XXXX` appears in every file in this folder, replace all at once).
   Then make Name/Phone identical across GBP, Yelp, Facebook, Bizapedia, BBB — and **claim the Yelp
   listing and convert it to service-area**, since it currently publishes the street address that the
   rest of the footprint hides. Contradictory citations read as low confidence.
4. **Careers + `JobPosting`** — there is no `/careers` route and no `JobPosting` markup anywhere, so
   ML Systems has zero surface in Google Jobs despite jobs being the core thesis. Build `/careers` as
   an index (no markup on the index — Google disallows it on listing pages) with one route and one
   `JobPosting` node per role. Template: `jobposting-template.jsonld`.
5. **Content velocity** — `/insights` posts already rank; publish more (see keyword list) to widen
   first-page coverage and earn long-tail traffic.
6. **Backlinks** — the strongest off-page signal. Target RI news, local directories, partners,
   green-building / circular-economy orgs.
7. **Own the SERP for the brand** — a similarly-named `mlconstructionri.com` also ranks for
   construction-in-RI queries; make sure ML Systems' owned properties fill page one for the brand.

## Target keywords

**Primary:** Rhode Island construction company · home deconstruction Rhode Island · construction
loans Rhode Island · reclaimed building materials Rhode Island · general contractor Warwick RI.

**Secondary:** deconstruction vs demolition · salvaged building materials near me · sustainable
home building RI · material recovery construction · build home equity Rhode Island · green
construction Rhode Island · custom home builder Rhode Island · construction financing homeowner.

**Long-tail (content ideas):** how to finance a home build in Rhode Island · companies that
deconstruct houses in RI · where to buy reclaimed lumber Rhode Island · deconstruction service
Warwick Rhode Island.

(Full lists in `company-profile.json` → `seoKeywords`.)

## Content angles that fit the brand

- Deconstruction vs demolition — cost, materials recovered, environmental impact.
- Construction financing guides for RI homeowners (loan origination, building equity).
- Reclaimed-material buying guides (lumber, doors, fixtures) — feeds the store.
- Town-specific housing-stock notes (already the basis of the 23 town pages).
- Sustainability / circular-economy angle — near-zero-waste building.

## AI crawlability (GEO)

The robots.txt posture is deliberate: **retrieval yes, training no.** Real-time reader agents are
allowed (ChatGPT-User, OAI-SearchBot, Claude-Web, Claude-User, PerplexityBot, Perplexity-User,
DuckAssistBot); bulk training crawlers are disallowed (GPTBot, ClaudeBot, anthropic-ai,
Google-Extended, Applebot-Extended, CCBot, Bytespider, Amazonbot, Meta-ExternalAgent, Cohere,
Diffbot). Two gaps in that posture, with the fix in `robots-additions.txt`:

- **`Claude-SearchBot` is named nowhere.** Anthropic runs three crawlers — ClaudeBot (training,
  correctly blocked), Claude-User (in-conversation fetch, allowed), and Claude-SearchBot, which
  builds the index Claude cites from. Anthropic warns that blocking it may reduce a site's
  visibility and accuracy in Claude's search results.
- **Plain `Applebot` is unnamed** (only `Applebot-Extended` is blocked), so Siri and Spotlight
  fall to the catch-all rule.

`Google-Extended` stays disallowed. Worth knowing precisely: that directive governs generative
model training and Gemini grounding — it does **not** remove pages from AI Overviews. Googlebot
governs those, and snippet directives are the only lever that suppresses them.

## Investor lookup

An investor's first three moves are: search the company name, look for a Crunchbase or PitchBook
record, check the founder's LinkedIn. Currently the first returns the site and a Yelp contractor
listing, and the second returns nothing. Open items are in `company-profile.json` →
`investorLookup`. The highest-value ones: claim Crunchbase, get LinkedIn into `sameAs` and
`onlineProfiles`, and bind founder ↔ company in both directions.

One structural note. Gating the memo is right; gating the *thesis* is not, and the split currently
runs backwards — the displacement argument is compressed into a few lines while financial figures
are teased in fragments. Argue the thesis at length in crawlable HTML where it can be cited, and
keep the model behind the memo request. A TAM figure with no derivation is not citable; it reads
as unsupported.

## Honesty guardrails (important for a public, review-able brand)

- **Material recovery 80–90% is a TARGET (modeled), not a completed result.** Phrase as "designed
  to recover up to 80–90%," never "we recover 80–90%," until there's a completed job to cite.
- **No completed-project claims or fabricated reviews** — Google/BBB penalize this and it risks
  profile suspension. Let real work generate real reviews.
- Deeper construction data (full ontology, per-material provenance, benchmarks) is **intentionally
  gated** via the Transparency Trust Protocol — do not publish it to chase SEO; it's a paid product.

## Quick reference for an assistant helping here

- Need business facts? → `company-profile.json`
- Need drop-in structured data? → `localbusiness-schema.jsonld`
- Need the product narrative / AI reading order? → `../llms.txt`, `../ai-context.json`
- Writing a GBP description or meta tag? → `company-profile.json` → `descriptionVariants`
- Adding a job posting? → `localbusiness-schema.jsonld` for the org, `jobposting-template.jsonld` for the role
- Touching robots.txt? → `robots-additions.txt`
- **Never** add `localbusiness-schema.jsonld` as a second `<script>` block — it mirrors the live node
