import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, Modal, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useUser, useAuth } from "@/lib/clerk-shim";
import { useDrawer } from "@/lib/drawer";
import { useLocalAvatar, setLocalAvatar } from "@/lib/avatar-store";
import { clearAllPlans } from "@/lib/plan-store";
import { LucentIcon } from "@/components/mind-icons";
import { DEFAULT_AVATAR } from "@/lib/default-avatar";
import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/stat-card";
import { formatEquity } from "@/lib/format";
import { useLocalHome, clearLocalHome } from "@/lib/home-store";
import { usd } from "@/lib/example-chain";
import { isPreview } from "@/lib/preview";
import { clearAdminUnlock } from "@/lib/view-mode";
import { wipeDeviceStores } from "@/lib/device-reset";
import { DeleteAccountModal } from "@/components/delete-account";
import { openPrivacy, openTerms, openSupportEmail } from "@/lib/legal";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  const { user } = useUser();
  const { signOut } = useAuth();
  const localHome = useLocalHome();
  const equity = trpc.equity.getMine.useQuery(undefined, { retry: 0 });
  const snapshot = equity.data?.snapshot ?? null;
  const project = equity.data?.project ?? null;

  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [savingName, setSavingName] = useState(false);

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    (isPreview() ? "Guest" : "Custodian");
  const email = user?.primaryEmailAddress?.emailAddress ?? (isPreview() ? "Preview mode" : "—");
  const initials = (user?.firstName?.[0] ?? fullName[0] ?? "M").toUpperCase();
  const canEdit = !!user;

  const onSignOut = () => {
    Alert.alert("Sign out", "Sign out of ML Systems?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          // The session ends → the cached admin unlock ends with it, so the next
          // account on this device starts homeowner with no toggle flash — and the
          // DEVICE stores wipe with it (homes, plans, findings), so the next account
          // never inherits this one's record (Sal 9/1: the same-phone test).
          try { clearAdminUnlock(); } catch { /* best-effort */ }
          try { wipeDeviceStores(); } catch { /* best-effort */ }
          try { signOut?.(); } catch { /* web/preview */ }
        },
      },
    ]);
  };

  const startEdit = () => {
    setFirst(user?.firstName ?? "");
    setLast(user?.lastName ?? "");
    setEditing(true);
  };
  const saveName = async () => {
    setSavingName(true);
    try {
      await (user as any)?.update?.({ firstName: first.trim(), lastName: last.trim() });
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message ?? "Please try again.");
    } finally {
      setSavingName(false);
    }
  };

  const removeHome = () => {
    Alert.alert("Remove home", "Remove your loaded home from this device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => clearLocalHome() },
    ]);
  };

  // ── Start fresh — the clean checkpoint: wipe every locally-stored artifact so the
  //    value chain starts empty and everything real begins from the homeowner's input. ──
  const startFresh = () => {
    Alert.alert(
      "Start fresh",
      "Clear this device's home, saved plans, and photo? Your value chain starts empty — everything real begins from what you tell the collective.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start fresh",
          style: "destructive",
          onPress: () => {
            clearLocalHome();
            clearAllPlans();
            setLocalAvatar(null);
          },
        },
      ],
    );
  };

  // ── Profile photo — pick from the library, push to Clerk when signed in, and
  //    mirror locally for instant UI (and preview mode). No new native deps. ──
  const localAvatar = useLocalAvatar();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const pickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Photos access", "Allow photo access in Settings to set a profile picture.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      const asset = res.assets?.[0];
      if (res.canceled || !asset) return;
      setUploadingPhoto(true);
      setLocalAvatar(asset.uri); // instant
      if (user && asset.base64) {
        const mime = asset.mimeType ?? "image/jpeg";
        try {
          await (user as any).setProfileImage?.({ file: `data:${mime};base64,${asset.base64}` });
        } catch {
          /* offline / preview — the local mirror still shows the photo */
        }
      }
    } catch (e: any) {
      Alert.alert("Couldn't set photo", e?.message ?? "Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40, paddingHorizontal: 16 }}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-6">
        {/* Hamburger — the universal drawer affordance (same ☰ as AppHeader). */}
        <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text className="text-[#E5E7EB] text-2xl leading-none">☰</Text>
        </TouchableOpacity>
        <Text className="text-[#F9FAFB] text-xl font-extrabold">Profile</Text>
      </View>

      {/* Identity card */}
      <View className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-5 flex-row items-center gap-4">
        <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8} disabled={uploadingPhoto}>
          <Image
            source={localAvatar ? { uri: localAvatar } : user?.imageUrl ? { uri: user.imageUrl } : DEFAULT_AVATAR}
            style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#0A0A0A", opacity: uploadingPhoto ? 0.5 : 1 }}
          />
          <View
            className="absolute items-center justify-center rounded-full"
            style={{ right: -2, bottom: -2, width: 20, height: 20, backgroundColor: "#22C55E", borderWidth: 2, borderColor: "#111111" }}
          >
            {uploadingPhoto ? <ActivityIndicator size={10} color="#0A0A0A" /> : <Text style={{ fontSize: 10 }}>📷</Text>}
          </View>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[#F9FAFB] text-[16px] font-bold" numberOfLines={1}>{fullName}</Text>
          <Text className="text-[#6B7280] text-[12px] mt-0.5" numberOfLines={1}>{email}</Text>
        </View>
        {canEdit ? (
          <TouchableOpacity onPress={startEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: "#22C55E" }} className="text-[12px] font-semibold">Edit</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Equity summary */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-3">Your Equity</Text>
      <View className="flex-row gap-3 mb-5">
        <StatCard label="Total Equity" value={equity.isLoading ? "…" : snapshot ? formatEquity(snapshot.totalEquity) : "—"} sub={snapshot ? "Live snapshot" : "No project yet"} accent />
        <StatCard label="Cycle" value={equity.isLoading ? "…" : project ? `#${project.cycleNumber}` : "—"} sub={project ? String(project.status).replace(/_/g, " ") : "Finance → Build → Loop"} />
      </View>

      {/* My Home — homeowner personal feature (edit / remove) */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-3">My Home</Text>
      {localHome ? (
        <View className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-5">
          <Text className="text-[#F9FAFB] text-[14px] font-bold" numberOfLines={1}>{localHome.address}</Text>
          <Text className="text-[#6B7280] text-[12px] mt-0.5">
            {[localHome.city, localHome.state].filter(Boolean).join(", ")}{localHome.estValueDollars != null ? ` · est. ${usd(localHome.estValueDollars)}` : ""}
          </Text>
          <View className="flex-row gap-2 mt-3">
            <TouchableOpacity onPress={() => router.push("/add-home" as any)} activeOpacity={0.85} className="flex-1 rounded-xl py-2.5 items-center" style={{ backgroundColor: "#22C55E14", borderWidth: 1, borderColor: "#22C55E40" }}>
              <Text style={{ color: "#22C55E" }} className="text-[12px] font-bold">Edit home</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={removeHome} activeOpacity={0.85} className="flex-1 rounded-xl py-2.5 items-center" style={{ backgroundColor: "#EF444414", borderWidth: 1, borderColor: "#EF444440" }}>
              <Text style={{ color: "#EF4444" }} className="text-[12px] font-bold">Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={() => router.push("/add-home" as any)} activeOpacity={0.85} className="bg-[#111111] border rounded-2xl p-4 mb-5 flex-row items-center justify-between" style={{ borderColor: "#22C55E40" }}>
          <View>
            <Text className="text-[#F9FAFB] text-[14px] font-bold">Load your home</Text>
            <Text className="text-[#6B7280] text-[12px] mt-0.5">Unlock your equity loop.</Text>
          </View>
          <Text style={{ color: "#22C55E" }} className="text-lg">→</Text>
        </TouchableOpacity>
      )}

      {/* Balance & credits → web-first billing surface */}
      <TouchableOpacity onPress={() => router.push("/billing" as any)} activeOpacity={0.85} className="bg-[#111111] border border-[#262626] rounded-2xl p-4 mb-5 flex-row items-center justify-between">
        <View>
          <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1">Balance & Credits</Text>
          <Text className="text-[#F9FAFB] text-[14px] font-bold">Manage plans & credits</Text>
        </View>
        <Text style={{ color: "#22C55E" }} className="text-lg">→</Text>
      </TouchableOpacity>

      {/* Account & Legal — app-store compliance */}
      <Text className="text-[#6B7280] text-[11px] uppercase tracking-wider mb-3">Account & Legal</Text>
      <View className="bg-[#111111] border border-[#262626] rounded-2xl overflow-hidden mb-5">
        <LinkRow label="Privacy Policy" onPress={openPrivacy} />
        <LinkRow label="Terms of Service" onPress={openTerms} />
        <LinkRow label="Blocked Neighbors" onPress={() => router.push("/blocked" as any)} />
        <LinkRow label="Contact Support" onPress={openSupportEmail} />
        <LinkRow label="Start Fresh (clear local data)" onPress={startFresh} danger />
        {canEdit ? <LinkRow label="Delete Account" onPress={() => setShowDelete(true)} danger last /> : null}
      </View>

      {/* Sign out */}
      <TouchableOpacity onPress={onSignOut} activeOpacity={0.85} className="rounded-2xl py-3.5 items-center" style={{ backgroundColor: "#EF444414", borderWidth: 1, borderColor: "#EF444440" }}>
        <Text style={{ color: "#EF4444" }} className="text-[13px] font-bold">Sign out</Text>
      </TouchableOpacity>

      <Text className="text-[#374151] text-[10px] text-center mt-4">ML Systems · v{APP_VERSION} · com.mlsystems.app</Text>

      {/* Edit name modal */}
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 24 }}>
          <View className="bg-[#111111] border border-[#262626] rounded-2xl p-5">
            <Text className="text-[#F9FAFB] text-[15px] font-extrabold mb-3">Edit name</Text>
            <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1">First name</Text>
            <TextInput value={first} onChangeText={setFirst} placeholder="First" placeholderTextColor="#4B5563" className="bg-[#0A0A0A] border border-[#262626] rounded-xl px-3 py-2.5 text-[#F9FAFB] text-[14px] mb-3" />
            <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1">Last name</Text>
            <TextInput value={last} onChangeText={setLast} placeholder="Last" placeholderTextColor="#4B5563" className="bg-[#0A0A0A] border border-[#262626] rounded-xl px-3 py-2.5 text-[#F9FAFB] text-[14px] mb-4" />
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => setEditing(false)} disabled={savingName} className="flex-1 rounded-xl py-3 items-center bg-[#1A1A1A] border border-[#262626]">
                <Text className="text-[#9CA3AF] text-[13px] font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveName} disabled={savingName} className="flex-1 rounded-xl py-3 items-center" style={{ backgroundColor: "#22C55E" }}>
                {savingName ? <ActivityIndicator color="#06210F" size="small" /> : <Text style={{ color: "#06210F" }} className="text-[13px] font-bold">Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DeleteAccountModal visible={showDelete} onClose={() => setShowDelete(false)} />
    </ScrollView>
  );
}

function LinkRow({ label, onPress, danger, last }: { label: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center justify-between px-4 py-3.5"
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: "#262626" }}
    >
      <Text style={{ color: danger ? "#EF4444" : "#F9FAFB" }} className="text-[13px] font-semibold">{label}</Text>
      <Text style={{ color: danger ? "#EF4444" : "#6B7280" }} className="text-[14px]">›</Text>
    </TouchableOpacity>
  );
}
