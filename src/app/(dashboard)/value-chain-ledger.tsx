import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * `/value-chain-ledger` — retired, kept as a redirect.
 *
 * There were two ledgers. This screen rendered the PERSISTED record for the caller's
 * newest project; the portfolio renders the master ledger for the home you actually
 * opened. Same codes, two destinations, and they disagreed whenever those were
 * different houses — which, for anyone holding more than one home, was always.
 *
 * Sal's call: the master ledger lives on the Value Chain Portfolio page, and every
 * ledger link lands there. This stays as a redirect rather than a deletion because the
 * route is reachable from saved deep links and from any surface not yet repointed —
 * removing the file outright would turn those into a blank screen.
 *
 * The homeowner Q&A this screen used to own now lives in `components/ledger-open-tasks`
 * and renders on the portfolio, directly under the ledger.
 */
export default function ValueChainLedgerRedirect() {
  const params = useLocalSearchParams<{ projectId?: string; name?: string }>();

  // Carry the home through, or the redirect would land on "whichever project is
  // newest" — the exact bug that made this consolidation necessary.
  const qs = new URLSearchParams();
  if (typeof params.projectId === "string" && params.projectId) qs.set("projectId", params.projectId);
  if (typeof params.name === "string" && params.name) qs.set("name", params.name);
  const query = qs.toString();

  return <Redirect href={(query ? `/portfolio?${query}` : "/portfolio") as never} />;
}
