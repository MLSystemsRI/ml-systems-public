import { useState } from "react";
import { View, Text, Pressable, Image, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { addUpload, setUploadAddress, useLocalUploads, type LocalUpload } from "@/lib/uploads-store";
import { readHomeownerPhoto } from "@/lib/vera-photo-read";

/**
 * LedgerPhotoSpot — THE one place photos of the home go (Sal 9/6): the top of the master
 * ledger. Camera or library → the upload store → VERA reads the photo the same way she
 * reads Street View (`readHomeownerPhoto` → a `photo-digest` finding) → the read becomes
 * the homeowner's own camera claim on the ledger (windows, siding, storeys). Per-entry
 * photo capture is gone; a photo is about the house, not one row.
 */

const VERA = "#34D399";
const uid = () => Math.random().toString(36).slice(2, 10);

export function LedgerPhotoSpot({ address, addressKey }: { address: string; addressKey: string }) {
  const uploads = useLocalUploads();
  const mine = uploads.filter((u) => u.kind === "photo" && u.address === addressKey);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const file = async (asset: { uri: string; base64?: string | null; mimeType?: string | null; fileName?: string | null }) => {
    const id = uid();
    const upload: LocalUpload = {
      id,
      uri: asset.uri,
      base64: asset.base64 ?? undefined,
      mimeType: asset.mimeType ?? "image/jpeg",
      fileName: asset.fileName ?? `home-${id}.jpg`,
      kind: "photo",
      address: addressKey,
      createdAt: new Date().toISOString(),
    };
    addUpload(upload);
    setUploadAddress(id, addressKey);
    setBusy(id);
    try {
      await readHomeownerPhoto({ upload, addressKey });
    } catch {
      /* fail-soft — the photo is on file; the read can be retried by tapping it */
    } finally {
      setBusy(null);
    }
  };

  const take = async () => {
    setError("");
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setError("Camera permission is needed to photograph the house."); return; }
      const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.4 });
      if (res.canceled || !res.assets?.length) return;
      await file(res.assets[0]!);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't take the photo.");
    }
  };
  const pick = async () => {
    setError("");
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.4 });
      if (res.canceled || !res.assets?.length) return;
      await file(res.assets[0]!);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't open the photo library.");
    }
  };
  const reread = async (u: LocalUpload) => {
    if (busy) return;
    setBusy(u.id);
    try { await readHomeownerPhoto({ upload: u, addressKey }); } catch { /* fail-soft */ } finally { setBusy(null); }
  };

  const read = mine.filter((u) => u.analysis).length;

  return (
    <View className="rounded-lg border px-2.5 py-2 mb-2" style={{ borderColor: `${VERA}33`, backgroundColor: `${VERA}08` }} onStartShouldSetResponder={() => true}>
      <View className="flex-row items-center gap-2">
        <Text style={{ color: VERA }} className="text-[8px] font-bold tracking-widest flex-1" numberOfLines={1}>
          📷 PHOTOS OF YOUR HOME{mine.length ? ` — ${mine.length} · ${read} read` : ""}
        </Text>
        <Pressable onPress={take} className="rounded-md px-2 py-1 border" style={{ borderColor: `${VERA}55`, backgroundColor: `${VERA}14` }}>
          <Text style={{ color: VERA }} className="text-[9px] font-semibold">Take</Text>
        </Pressable>
        <Pressable onPress={pick} className="rounded-md px-2 py-1 border" style={{ borderColor: `${VERA}55`, backgroundColor: `${VERA}14` }}>
          <Text style={{ color: VERA }} className="text-[9px] font-semibold">Library</Text>
        </Pressable>
      </View>
      {!mine.length ? (
        <Text className="text-[#6B7280] text-[9px] mt-1 leading-3">
          Front, sides, inside — each photo is read into the ledger (windows, siding, storeys) beside the street view.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-1.5">
          <View className="flex-row gap-1.5">
            {mine.map((u) => (
              <Pressable key={u.id} onPress={() => (u.analysis ? undefined : reread(u))} className="items-center" style={{ width: 52 }}>
                <Image source={{ uri: u.uri }} style={{ width: 52, height: 40, borderRadius: 6, opacity: u.analysis ? 1 : 0.6 }} />
                <Text style={{ color: u.analysis ? VERA : "#F59E0B" }} className="text-[7px] mt-0.5" numberOfLines={1}>
                  {busy === u.id ? "reading…" : u.analysis ? "read ✓" : "tap to read"}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
      {error ? <Text style={{ color: "#F59E0B" }} className="text-[8.5px] mt-1">{error}</Text> : null}
    </View>
  );
}
