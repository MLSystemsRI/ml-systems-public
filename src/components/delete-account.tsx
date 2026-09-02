import { useState } from "react";
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useUser } from "@/lib/clerk-shim";
import { clearAdminUnlock } from "@/lib/view-mode";
import { wipeDeviceStores } from "@/lib/device-reset";

/**
 * Delete-account modal — Apple Guideline 5.1.1(v) requires in-app account deletion.
 * Type-"DELETE"-to-confirm, then Clerk `user.delete()` (client-side, native), clears
 * on-device data, and returns to sign-in. Server-side DB soft-delete + Stripe cleanup
 * are handled later via a Clerk webhook (users.deletedAt). No-op on web/preview.
 */
export function DeleteAccountModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useUser();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const canDelete = confirm.trim().toUpperCase() === "DELETE" && !busy && !!user;

  const onDelete = async () => {
    if (!canDelete) return;
    setBusy(true);
    try {
      await (user as any)?.delete?.();
      // The account is gone — every device store goes with it (both lens slices +
      // per-address artifacts), so the next sign-in starts truly clean.
      try { wipeDeviceStores(); } catch { /* best-effort */ }
      try { clearAdminUnlock(); } catch { /* best-effort */ }
      setConfirm("");
      onClose();
      router.replace("/(auth)/sign-in" as any);
    } catch (e: any) {
      setBusy(false);
      Alert.alert("Couldn't delete account", e?.message ?? "Please try again, or contact support.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 24 }}>
        <View className="bg-[#111111] border rounded-2xl p-5" style={{ borderColor: "#EF444440" }}>
          <Text style={{ color: "#EF4444" }} className="text-[15px] font-extrabold mb-2">Delete account</Text>
          <Text className="text-[#9CA3AF] text-[12px] leading-snug mb-1.5">
            This permanently deletes your ML Systems account and signs you out. This can't be undone.
          </Text>
          <Text className="text-[#6B7280] text-[11px] leading-snug mb-3">
            Records tied to active projects/equity may be retained where required by law — email support to
            request full data removal.
          </Text>
          <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1">Type DELETE to confirm</Text>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="DELETE"
            placeholderTextColor="#4B5563"
            className="bg-[#0A0A0A] border border-[#262626] rounded-xl px-3 py-2.5 text-[#F9FAFB] text-[14px] font-bold mb-4"
          />
          <View className="flex-row gap-2">
            <Pressable onPress={() => { setConfirm(""); onClose(); }} disabled={busy} className="flex-1 rounded-xl py-3 items-center bg-[#1A1A1A] border border-[#262626]">
              <Text className="text-[#9CA3AF] text-[13px] font-bold">Cancel</Text>
            </Pressable>
            <Pressable onPress={onDelete} disabled={!canDelete} className="flex-1 rounded-xl py-3 items-center" style={{ backgroundColor: canDelete ? "#EF4444" : "#EF444433" }}>
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: canDelete ? "#FFFFFF" : "#EF444488" }} className="text-[13px] font-bold">Delete</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
