import { View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMode } from "@/lib/view-mode";
import { AppHeader } from "@/components/app-header";
import { InvestorPointer } from "@/components/investor-pointer";
import { CompartmentChrome } from "@/components/compartment-chrome";
import { LoanOriginationView } from "@/components/loan-origination-view";

/**
 * Loan Origination (Phase 01) — the homeowner's standalone RCM screen. The body
 * is the shared LoanOriginationView, also rendered inside The Loan Pit's
 * "Loan Origination" tab. This route stays for the Homeowner hamburger link and
 * now wears the shared agent-app lens (header + compartment chrome).
 */

export default function LoanScreen() {
  const insets = useSafeAreaInsets();
  const { isInvestor } = useMode();

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <AppHeader href="/loan" title="Loan Origination" subtitle="Phase 01 · RCM" />
      <ScrollView
        className="flex-1"
        style={{ zIndex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
      >
        {/* Investor lens — the RCM book underwrites the bond; nudge to the star. */}
        {isInvestor ? (
          <View className="mt-3 mb-4">
            <InvestorPointer line="RCM loan origination — interest income layered on builder margin." />
          </View>
        ) : null}

        <LoanOriginationView />
      </ScrollView>
      <CompartmentChrome href="/loan" />
    </View>
  );
}
