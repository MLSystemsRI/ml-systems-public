# The Waste Stream Twice the Size of the One America Argues About — and Why Its Recovery Rate Flatters It

**Slug:** `the-waste-stream-twice-the-size`
**Category:** `market-data`
**Status:** ready — canonical ships with the site build
**Canonical:** https://mlsystemsri.com/insights/the-waste-stream-twice-the-size — *not live yet; the site build ships separately*
**Syndication:** hold until the canonical resolves — see [syndication.md](../syndication.md)

---

## A country that argues about the smaller pile

Ask an American what the country's waste problem looks like and the answer arrives already shaped — a bin at the curb, a recycling symbol, a debate about straws and packaging and what actually gets sorted at the facility. That picture has a number behind it. The EPA counted 292.4 million tons of municipal solid waste generated in 2018, about 4.9 pounds per person per day, and essentially every public campaign, municipal ordinance and corporate pledge about waste in the United States is addressed to that pile.

In the same year, the same agency counted 600.3 million tons of construction and demolition debris. More than twice as much. It has no bin, no curbside day, no symbol, and close to no public argument attached to it.

Per person, that works out to roughly ten pounds a day — against the 4.9 pounds of household trash that gets all the attention. Every American is responsible for about twice as much discarded building as discarded groceries, packaging and yard waste combined, and almost none of them have ever been asked to think about it.

So the question is why the larger stream is the quieter one. Part of the answer is that it already reports a very good recovery rate. That rate is the subject of this piece, because it is true, it is cited constantly, and it is measuring something other than what most people assume.

## Demolition is more than ninety percent of it

The first thing the EPA data settles is where the material comes from. In the agency's words: "Demolition represents more than 90 percent of total C&D debris generation, while construction represents less than 10 percent."

That reframes the whole category. This is not primarily a story about offcuts, broken sheets and packaging on active job sites — the waste of building things. It is a story about the end of buildings. Nine tons in ten of the largest waste stream in the United States is a structure that used to stand, taken apart by the fastest available method, and the fastest available method is designed to reduce a building to debris as quickly as it safely can.

## The recovery rate that flatters the number

Here is the comparison nobody runs, both halves from the same EPA reporting year.

| Stream, 2018 | Generated | Landfilled | Directed to next use |
|---|---|---|---|
| Construction and demolition debris | 600.3 million tons | 143.8 million tons | 456.5 million tons — 76.0% |
| Municipal solid waste | 292.4 million tons | 146.1 million tons | 94.0 million tons recycled and composted — 32.1% |

By the headline measure, the construction stream is the better-behaved one. A 76% diversion rate against 32.1% for household trash. If that were the end of the analysis, C&D debris would be the American recycling success story and the argument would be over.

It is not the end of the analysis, because "directed to next use" is doing a great deal of work in that sentence.

## Aggregate is a floor, not a destination

The EPA publishes where the 456.5 million tons actually went.

| Next use | Tons, 2018 | Share of next use |
|---|---|---|
| Aggregate | 313.1 million | 68.6% |
| Manufactured products | 131.6 million | 28.8% |
| Fuel | 7.5 million | 1.7% |
| Compost and mulch | 2.5 million | 0.5% |
| Soil amendment | 1.9 million | 0.4% |

Aggregate is 313 million tons of it — a little over half of all C&D debris generated in the country that year, and more than the entire municipal solid waste stream was recycled and composted. Aggregate means crushed. Concrete and masonry broken down and used as road base, fill and sub-base. It is counted as recovery, and against a landfill it genuinely is recovery: it displaces virgin quarried stone and it keeps mass out of the ground.

It is also the last thing that material will ever be. A foundation wall that gets crushed into base course does not become a foundation wall again, or a retaining wall, or anything else with structure in it. To a landfill operator it is diverted tonnage. To a road crew it is base course. To the building it came from it is the end of the line.

ML Systems routes material by a fixed order of preference — **RRR — Reuse › Resale › Recycle — route each recovered material to its most valuable recoverable state.** Aggregate sits at the bottom of that ladder. It is the floor of recovery, not the goal of it, and a national statistic in which two thirds of all recovery is the floor is describing an industry that crushes well and reuses badly.

## The two landfill numbers nobody puts side by side

Strip out the recovery rates and look only at what went into the ground in 2018. Municipal solid waste: 146.1 million tons. Construction and demolition debris: 143.8 million tons.

They are within two percent of each other. The waste stream with no public argument attached to it buries almost exactly as much material as the one that has produced decades of ordinances, campaigns and curbside programs — and it does so while being congratulated on a 76% recovery rate.

## Tons understate what is lost

Weight is the wrong unit for the real loss, and the building-reuse literature has been making that point for years. Carl Elefante's line — the greenest building is one that already exists — is shorthand for a body of research on embodied carbon, the emissions already spent on producing, transporting and assembling everything in a standing structure. Studies of replacing an existing building with an efficient new one put the carbon payback period at anywhere from ten to eighty years. A study of the former John Lewis building in Sheffield found that retaining its concrete and steel structure would avoid roughly 4,300 tonnes of CO2 equivalent against rebuilding the superstructure.

There is an obvious tension between that literature and a company whose value chain begins by taking a house apart, and it is worth naming rather than stepping around. The reuse argument says the best outcome is that the building stays. ML Systems agrees, and it is not the business the company is in.

The 600 million tons is the evidence that the first argument is losing on its own. Buildings come down — for condition, for code, for economics, for a foundation from the 1960s that will not carry another sixty years. The question that remains once that decision is made is not whether the building survives. It is whether the material does, and the national answer right now is that just over half of it becomes gravel.

## Rhode Island, where the stream has one destination

The national numbers get sharper in a small state. Rhode Island has one active landfill — the Rhode Island Resource Recovery Corporation's Central Landfill in Johnston — with permitted capacity projected into the 2040s. There is no second destination. Material that is not recovered in Rhode Island goes to one place, and when that place is full the state's options are trucking distance.

Roofing is the clearest single example. ML Systems estimates Rhode Island generates on the order of 45,000 to 50,000 tons of asphalt shingle tear-off a year — **MODELED**, derived from public inputs rather than reported directly: state roofing contractor counts, typical roofs per contractor per year, and industry figures on tear-off weight per roof from the Asphalt Roofing Manufacturers Association. The state has no dedicated shingle recycler. The nearest processing capacity is in Massachusetts. Asphalt shingles are roughly a quarter to a third asphalt cement by weight — a material with a real market — and in Rhode Island essentially all of it is landfilled for want of anywhere else to take it.

## What this teaches the system

The reason this is a software problem and not only a jobsite problem is that every one of the numbers above is an aggregate with no provenance under it. Nobody can say which building the 313 million tons of aggregate came from, what was in it, or what could have been reused if anyone had looked before the machine arrived.

ML Systems' answer is to make the record the product. Each recovered item carries an **ML Material ID** in the format `ML-{year}-{project}-{zone}{seq}`, tying a physical piece to the structure it came from and the stream it was routed to — described in [The Deconstruction Method](../method.md). Routing decisions follow RRR rather than whatever the nearest processor will take. **REAPER**, the deconstruction mind, produces a home recovery report for a given house — recovery percentage, tons diverted, embodied carbon avoided — and every figure in it is a claim with a source and an evidence grade rather than a bare number, which is what [The Master Ledger](../../docs/master-ledger.md) exists to hold. The vocabulary that lets an assessor's record, a homeowner's answer and a crew's measurement describe the same house without collision is [The Collective Ontology](../../docs/collective-ontology.md).

A national recovery rate that counts crushing and reuse as the same event is a measurement problem before it is an industry problem. Per-material provenance is what makes the distinction visible.

## The honest part

No ML Systems deconstruction has been performed yet. The company is bootstrapped and pre-revenue, and everything it publishes about method is a designed sequence rather than a report from a completed job.

The 80–90% material recovery figure the company designs toward is **MODELED** — real arithmetic against real assemblies, unproven in the field. The two-day crane sequence is **ASPIRATIONAL**. The Rhode Island shingle tonnage above is **MODELED**, as stated. What is **MEASURED** is the software: a shipped app, a working ledger, the provenance format, and the ontology underneath them. The reality labels are on every claim on purpose, so that a reader can check which is which.

One more label belongs on the EPA figures themselves. They are 2018 data. The agency's pages carrying them were updated as recently as December 2025 and still report 2018, because that is the most recent year published. The largest waste stream in the country is described by numbers that are seven years old — which is its own evidence for how little argument it gets.

---

Sources: US EPA, Advancing Sustainable Materials Management: Facts and Figures — the Construction and Demolition Debris material-specific pages and the National Overview, 2018 data, the most recent published; US EPA, Sustainable Management of Construction and Demolition Materials; Rhode Island Resource Recovery Corporation; the Asphalt Roofing Manufacturers Association; Carl Elefante, "The Greenest Building Is One That Already Exists"; and University of Sheffield research on the former John Lewis building, reported by Historic England.

---

*ML Systems LLC · Rhode Island · NAICS 236115 · [mlsystemsri.com](https://mlsystemsri.com)*
