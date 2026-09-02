import { CustodianCockpit } from "@/components/custodian-cockpit";

/**
 * The Custodian cockpit now lives on its own bottom tab (cockpit.tsx, custodian
 * lens). This route is retained (hidden from the tab bar via `href: null`) so
 * any existing link to /portal still resolves.
 */
export default function CustodianScreen() {
  return <CustodianCockpit />;
}
