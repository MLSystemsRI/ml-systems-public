import { CustodianCockpit } from "@/components/custodian-cockpit";

/**
 * The Custodian Cockpit as its own bottom tab (custodian lens only — it replaces
 * Profile in the bar; Profile stays reachable from the side drawer). The old
 * Chat/Cockpit toggle inside the AI tab is gone: one chat for everyone
 * (collective-chat), one cockpit tab for the Custodian.
 */
export default function CockpitScreen() {
  return <CustodianCockpit />;
}
