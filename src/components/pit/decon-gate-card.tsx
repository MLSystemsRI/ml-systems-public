import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { BRIDGE } from "@/lib/pit-bridge";
import { useDeconAnswer, setDeconAnswer } from "@/lib/decon-intent-store";

/**
 * The decon gate — PIT LORD's ONE question in the value chain: are you
 * deconstructing this home? Lives under the home on the Hub (Your Value Chain
 * Homes) and on the Value Chain Portfolio — the two control surfaces. "Yes" is
 * his cue to BUILD the decon bridge: a real loans.submit (bridge · $10k · 4% ·
 * 24 mo, the standing terms) on the home's project, which lands in the pit as
 * an application → the custodian opens it → lenders compete. The answer
 * persists per address (decon-intent-store) and gates the build-logic Finance
 * stage. Homes without a backend project yet hold the answer until the record
 * syncs. Steel-bridge palette — this is bridge work, not fire.
 */

const RED = "#EF4444";
// The standing decon-bridge terms (matches the first seeded bridge).
const BRIDGE_CENTS = 1_000_000; // $10,000
const BRIDGE_RATE = 0.04; // 4.0%
const BRIDGE_TERM = 24; // months

export function DeconGateCard({ address, projectId }: { address?: string | null; projectId?: string | null }) {
  const answer = useDeconAnswer(address ?? undefined);
  const utils = trpc.useUtils();
  const submit = trpc.loans.submit.useMutation({
    onSuccess: () => utils.pit.getMyLoans.invalidate(),
  });
  // Only a real backend project can hold a loan row; `local:` homes park the answer.
  const realProjectId = projectId && !projectId.startsWith("local:") ? projectId : null;

  const sayYes = () => {
    if (address) setDeconAnswer(address, "yes");
    if (realProjectId && !submit.isPending) {
      submit.mutate({
        projectId: realProjectId,
        loanType: "bridge",
        principalAmount: BRIDGE_CENTS,
        interestRate: BRIDGE_RATE,
        termMonths: BRIDGE_TERM,
      });
    }
  };

  // ── Not yet: a slim standing-by row, changeable any time ──
  if (answer === "not_yet") {
    return (
      <View className="rounded-xl px-3.5 py-2.5 flex-row items-center justify-between" style={{ backgroundColor: "#11111180", borderWidth: 1, borderColor: "#262626" }}>
        <Text className="text-[#6B7280] text-[11px] flex-1 pr-2">🐉 Not deconstructing yet — the bridge draft is held for you.</Text>
        <TouchableOpacity onPress={() => address && setDeconAnswer(address, undefined)} activeOpacity={0.7}>
          <Text style={{ color: BRIDGE.bright }} className="text-[11px] font-bold">Change</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Yes: the bridge is being built / built / needs the record ──
  if (answer === "yes") {
    return (
      <View className="rounded-xl px-3.5 py-3" style={{ backgroundColor: `${BRIDGE.color}0D`, borderWidth: 1, borderColor: `${BRIDGE.color}44` }}>
        <Text style={{ color: BRIDGE.bright }} className="text-[9px] font-bold uppercase tracking-widest mb-1">🐉 Financing · decon bridge</Text>
        {submit.isPending ? (
          <Text className="text-[#9CA3AF] text-[11px]">Building your bridge — $10,000 · 4.0% · 24 mo…</Text>
        ) : submit.isSuccess ? (
          <Text className="text-[#9CA3AF] text-[11px]">
            Bridge built — <Text style={{ color: BRIDGE.bright }}>$10,000 · 4.0% · 24 mo</Text>, application in. The pit opens next; lenders compete on your terms.
          </Text>
        ) : submit.isError ? (
          <View>
            <Text className="text-[#9CA3AF] text-[11px] mb-1.5">
              {String(submit.error?.message ?? "").includes("already exists")
                ? "This home already holds an active bridge — it's in the pit."
                : "Couldn't build the bridge — the draft is held."}
            </Text>
            {!String(submit.error?.message ?? "").includes("already exists") ? (
              <TouchableOpacity onPress={sayYes} activeOpacity={0.85} className="self-start rounded-lg px-3 py-1.5" style={{ backgroundColor: `${BRIDGE.color}26`, borderWidth: 1, borderColor: `${BRIDGE.color}55` }}>
                <Text style={{ color: BRIDGE.bright }} className="text-[11px] font-bold">Try again</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : realProjectId ? (
          <View>
            <Text className="text-[#9CA3AF] text-[11px] mb-1.5">Draft ready — $10,000 · 4.0% · 24 mo, secured by the harvest.</Text>
            <TouchableOpacity onPress={sayYes} activeOpacity={0.85} className="self-start rounded-lg px-3 py-1.5" style={{ backgroundColor: `${BRIDGE.color}26`, borderWidth: 1, borderColor: `${BRIDGE.color}55` }}>
              <Text style={{ color: BRIDGE.bright }} className="text-[11px] font-bold">Build my bridge loan →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text className="text-[#9CA3AF] text-[11px]">
            Draft held — <Text style={{ color: BRIDGE.bright }}>$10,000 · 4.0% · 24 mo</Text>. It files the moment this home's record is live.{" "}
            <Text style={{ color: RED }} onPress={() => router.push("/pit")}>The Loan Pit →</Text>
          </Text>
        )}
      </View>
    );
  }

  // ── The question — PIT LORD's one gate before financing moves ──
  return (
    <View className="rounded-xl px-3.5 py-3" style={{ backgroundColor: `${RED}0A`, borderWidth: 1, borderColor: `${RED}30` }}>
      <Text style={{ color: RED }} className="text-[9px] font-bold uppercase tracking-widest mb-1">🐉 Financing · one question</Text>
      <Text className="text-[#F9FAFB] text-[12.5px] font-bold mb-0.5">Are you deconstructing this home?</Text>
      <Text className="text-[#6B7280] text-[10.5px] mb-2">Yes → your decon bridge is built ($10,000 · 4.0% · 24 mo) and the pit opens.</Text>
      <View className="flex-row gap-2">
        <TouchableOpacity onPress={sayYes} activeOpacity={0.85} className="rounded-lg px-3.5 py-2" style={{ backgroundColor: `${BRIDGE.color}26`, borderWidth: 1, borderColor: `${BRIDGE.color}66` }}>
          <Text style={{ color: BRIDGE.bright }} className="text-[11.5px] font-extrabold">Yes — deconstruct</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => address && setDeconAnswer(address, "not_yet")} activeOpacity={0.7} className="rounded-lg px-3.5 py-2" style={{ borderWidth: 1, borderColor: "#262626" }}>
          <Text className="text-[#9CA3AF] text-[11.5px] font-bold">Not yet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
