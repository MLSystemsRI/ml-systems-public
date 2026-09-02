import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useDrawer } from "@/lib/drawer";
import { MLMark } from "@/components/ml-mark";
import { setLocalHome, useLocalHome } from "@/lib/home-store";
import { addFamilyHome } from "@/lib/family-homes-store";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/clerk-shim";

/**
 * "Load your home" — the homeowner onboarding. Parity with the web portal's
 * apps/app/src/app/onboarding/onboarding-form.tsx (address → est. value),
 * condensed to one scrollable form. Works no-login: the home is saved locally
 * via home-store (SecureStore on native, in-memory on web) so the whole beta
 * flow runs without a backend session. A real Clerk session could additionally
 * mirror this into trpc.projects.create later — intentionally omitted here so the
 * internal beta stays pure-local (lowest setup).
 */

const GREEN = "#22C55E";
const US_STATES = ["RI", "MA", "CT", "NY", "NH", "VT", "ME"];

export default function AddHomeScreen() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();

  // Signed-in homeowners also enter the mainframe: their home mirrors into a real
  // project (trpc.projects.create). Local-only save still works with no session.
  const { isSignedIn } = useAuth();
  const mineQ = trpc.equity.getMine.useQuery(undefined, { enabled: !!isSignedIn });
  const createProject = trpc.projects.create.useMutation();
  // THE ONE-ENTRY RULE — the Custodian reviews the first value-chain entry before a
  // second opens (server-enforced in projects.create; this is the honest banner).
  const myHomeQ = trpc.vc.myHome.useQuery(undefined, { enabled: !!isSignedIn, retry: 0 });
  const myVcHome = (myHomeQ.data ?? null) as { address: string | null; vcVerificationStatus?: string | null } | null;
  const entryHeld = !!myVcHome && myVcHome.vcVerificationStatus !== "verified";

  // Prefill from the loaded home so this doubles as "Edit home" (Profile → Edit).
  const existing = useLocalHome();
  const [address, setAddress] = useState(existing?.address ?? "");
  const [city, setCity] = useState(existing?.city ?? "");
  const [state, setState] = useState(existing?.state ?? "RI");
  const [zip, setZip] = useState(existing?.zip ?? "");
  const [estValue, setEstValue] = useState(existing?.estValueDollars != null ? String(existing.estValueDollars) : "");
  const [beds, setBeds] = useState(existing?.beds != null ? String(existing.beds) : "");
  const [baths, setBaths] = useState(existing?.baths != null ? String(existing.baths) : "");
  const [sqft, setSqft] = useState(existing?.sqft != null ? String(existing.sqft) : "");
  const [error, setError] = useState("");

  // Family mode — the founder adds a family member's home (labeled) instead of his own.
  // It lands in family-homes-store, appears in Your Value Chain Homes, and the member
  // can beta-test their own portfolio (MURPHY tracking). Sal's own home stays intact.
  const [isFamily, setIsFamily] = useState(false);
  const [famLabel, setFamLabel] = useState("");
  const [relation, setRelation] = useState("");

  // Address is all that's required — a home runs from just an address + public data.
  const canSubmit = address.trim().length > 0;

  const submit = () => {
    setError("");
    if (!address.trim()) return setError("Enter your street address.");
    const num = (s: string) => {
      const n = parseFloat(s.replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const value = num(estValue); // optional — VERA fills it from the public record

    // Family home — a labeled entry in the founder's family portfolio (local, for the beta).
    if (isFamily) {
      addFamilyHome({
        address: address.trim(),
        city: city.trim() || undefined,
        state,
        zip: zip.trim() || undefined,
        ...(value != null ? { estValueDollars: value } : {}),
        label: famLabel.trim() || `${relation.trim() || "Family"}'s home`,
        relation: relation.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
      router.replace("/");
      return;
    }

    setLocalHome({
      address: address.trim(),
      city: city.trim() || undefined,
      state,
      zip: zip.trim() || undefined,
      ...(value != null ? { estValueDollars: value } : {}),
      beds: num(beds),
      baths: num(baths),
      sqft: num(sqft),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });

    // Enter the mainframe: mirror into a real project for signed-in homeowners who
    // don't already have one. Needs a city + full ZIP (projects.create requires them).
    // Fire-and-forget — local save + navigation never block on the network.
    if (isSignedIn && !mineQ.data?.project && city.trim() && zip.trim().length >= 5) {
      createProject.mutate({
        addressLine1: address.trim(),
        city: city.trim(),
        state,
        zip: zip.trim(),
        ...(value != null ? { currentAssessedValue: value * 100 } : {}), // cents; optional
      });
    }
    router.replace("/");
  };

  const label = (t: string) => (
    <Text className="text-[#9B9B9B] text-[10px] uppercase tracking-wider mb-1.5">{t}</Text>
  );
  const inputCls =
    "bg-[#1A1A1A] border border-[#262626] rounded-lg px-4 py-3 text-[13px] text-[#F9FAFB]";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0A0A0A" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 mb-1">
          <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text className="text-[#93a89b] text-2xl leading-none">☰</Text>
          </TouchableOpacity>
          <MLMark size={22} color={GREEN} />
          <Text className="text-[#F9FAFB] text-xl font-extrabold">Load Your Home</Text>
        </View>
        <Text className="text-[#6B7280] text-[12px] mb-6 ml-8">
          The property entering the equity loop — Loan → Decon → Build → Equity.
        </Text>

        {/* The Custodian's one-entry rule — visible the moment a held entry exists.
            (Family additions are the Custodian's own surface; the banner hides there.) */}
        {entryHeld && !isFamily ? (
          <View className="rounded-2xl px-4 py-3 mb-4 border" style={{ borderColor: "#F5D06044", backgroundColor: "#F5D0600D" }}>
            <Text style={{ color: "#F5D060" }} className="text-[9px] font-bold tracking-widest mb-1">⚖ THE CUSTODIAN</Text>
            <Text className="text-[#D1D5DB] text-[11.5px] leading-4">
              Your value chain holds one home entry until it&apos;s verified.{" "}
              {myVcHome?.address ?? "Your home"} is with me for review.
            </Text>
          </View>
        ) : null}

        <View className="bg-[#111111] border border-[#262626] rounded-2xl p-5 gap-4">
          {/* Whose home — own vs a family member's (the founder's family portfolio). */}
          <View className="flex-row gap-2">
            {([
              { on: false, label: "My home" },
              { on: true, label: "A family member's" },
            ] as const).map((opt) => {
              const active = isFamily === opt.on;
              return (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => setIsFamily(opt.on)}
                  activeOpacity={0.85}
                  className="flex-1 rounded-lg py-2.5 items-center"
                  style={{ backgroundColor: active ? `${GREEN}1A` : "#1A1A1A", borderWidth: 1, borderColor: active ? GREEN : "#262626" }}
                >
                  <Text style={{ color: active ? GREEN : "#9CA3AF" }} className="text-[12px] font-bold">{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isFamily ? (
            <View className="flex-row gap-3">
              <View className="flex-1">
                {label("Label")}
                <TextInput
                  value={famLabel}
                  onChangeText={setFamLabel}
                  placeholder="Mom's house"
                  placeholderTextColor="#6B7280"
                  className={inputCls}
                />
              </View>
              <View className="flex-1">
                {label("Relation")}
                <TextInput
                  value={relation}
                  onChangeText={setRelation}
                  placeholder="mother"
                  placeholderTextColor="#6B7280"
                  className={inputCls}
                />
              </View>
            </View>
          ) : null}

          <View>
            {label("Street Address *")}
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main St"
              placeholderTextColor="#6B7280"
              className={inputCls}
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              {label("City")}
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Providence"
                placeholderTextColor="#6B7280"
                className={inputCls}
              />
            </View>
            <View style={{ width: 96 }}>
              {label("State")}
              <View className="flex-row flex-wrap gap-1">
                {US_STATES.map((s) => {
                  const active = s === state;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setState(s)}
                      className="rounded-md px-2 py-1"
                      style={{
                        backgroundColor: active ? `${GREEN}1A` : "#1A1A1A",
                        borderWidth: 1,
                        borderColor: active ? GREEN : "#262626",
                      }}
                    >
                      <Text style={{ color: active ? GREEN : "#9CA3AF" }} className="text-[11px] font-bold">
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              {label("ZIP")}
              <TextInput
                value={zip}
                onChangeText={setZip}
                placeholder="02903"
                placeholderTextColor="#6B7280"
                keyboardType="number-pad"
                maxLength={10}
                className={inputCls}
              />
            </View>
            <View className="flex-1">
              {label("Est. Home Value")}
              <TextInput
                value={estValue}
                onChangeText={setEstValue}
                placeholder="filled from the record"
                placeholderTextColor="#6B7280"
                keyboardType="number-pad"
                className={inputCls}
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              {label("Beds")}
              <TextInput
                value={beds}
                onChangeText={setBeds}
                placeholder="3"
                placeholderTextColor="#6B7280"
                keyboardType="number-pad"
                className={inputCls}
              />
            </View>
            <View className="flex-1">
              {label("Baths")}
              <TextInput
                value={baths}
                onChangeText={setBaths}
                placeholder="2"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                className={inputCls}
              />
            </View>
            <View className="flex-1">
              {label("Sq Ft")}
              <TextInput
                value={sqft}
                onChangeText={setSqft}
                placeholder="1800"
                placeholderTextColor="#6B7280"
                keyboardType="number-pad"
                className={inputCls}
              />
            </View>
          </View>

          {error ? (
            <Text className="text-[#EF4444] text-[12px] bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg px-4 py-3">
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={submit}
            disabled={!canSubmit}
            activeOpacity={0.85}
            className="rounded-xl py-3.5 items-center mt-1"
            style={{ backgroundColor: canSubmit ? GREEN : `${GREEN}4D` }}
          >
            <Text className="text-black font-bold text-[14px]">{isFamily ? "Add family home →" : "Enter the loop →"}</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-[#374151] text-[10px] text-center mt-4">
          {isSignedIn
            ? "Saved on this device and entered into the mainframe — your home grounds the PI assistant, the dual strands, and your equity loop."
            : "Saved on this device for your preview. Your home grounds the PI assistant and cost estimate."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
