import { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useDrawer } from "@/lib/drawer";
import { analyzeMaterialPhoto } from "@/lib/ai";
import {
  useLocalUploads,
  addUpload,
  removeUpload,
  setUploadAnalysis,
  type LocalUpload,
} from "@/lib/uploads-store";

/**
 * Home Uploads — the homeowner attaches photos and documents to their project.
 * Works no-login: files are held locally (uploads-store) and photos get an
 * instant on-device Gemini assessment (analyzeMaterialPhoto in lib/ai.ts, no
 * backend session). Reuses the camera capture flow from lab.tsx. The live camera
 * is native-only (like lab.tsx); the photo-library and document pickers work on
 * web too, so the public web build can still upload.
 */

const BLUE = "#4EA0F5";
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";
const IS_WEB = Platform.OS === "web";

function uid() {
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

export default function UploadsScreen() {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  const uploads = useLocalUploads();
  const [cameraOn, setCameraOn] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Kick off on-device Gemini analysis for a photo and store the result.
  const analyze = useCallback(async (id: string, base64: string) => {
    if (!GEMINI_KEY) {
      setUploadAnalysis(id, "[Set EXPO_PUBLIC_GEMINI_API_KEY to enable on-device analysis]");
      return;
    }
    try {
      const text = await analyzeMaterialPhoto({ apiKey: GEMINI_KEY }, base64);
      setUploadAnalysis(id, text);
    } catch (e: any) {
      setUploadAnalysis(id, `Analysis failed: ${e?.message ?? "unknown error"}`);
    }
  }, []);

  // ── Camera capture (native only) ──
  const capture = useCallback(async () => {
    if (!cameraRef.current) return;
    setError("");
    try {
      const shot = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4 });
      if (!shot?.base64) {
        setError("Couldn't capture the photo — try again.");
        return;
      }
      const id = uid();
      addUpload({
        id,
        uri: shot.uri,
        base64: shot.base64,
        mimeType: "image/jpeg",
        fileName: `photo-${id}.jpg`,
        kind: "photo",
        createdAt: new Date().toISOString(),
      });
      setCameraOn(false);
      analyze(id, shot.base64);
    } catch (e: any) {
      setError(e?.message ?? "Camera error.");
    }
  }, [analyze]);

  const openCamera = useCallback(async () => {
    setError("");
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError("Camera permission is needed to capture site photos.");
        return;
      }
    }
    setCameraOn(true);
  }, [permission, requestPermission]);

  // ── Photo library (works on web) ──
  const pickPhoto = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.4,
      });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0]!;
      const id = uid();
      addUpload({
        id,
        uri: a.uri,
        base64: a.base64 ?? undefined,
        mimeType: a.mimeType ?? "image/jpeg",
        fileName: a.fileName ?? `photo-${id}.jpg`,
        kind: "photo",
        createdAt: new Date().toISOString(),
      });
      if (a.base64) analyze(id, a.base64);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't open the photo library.");
    } finally {
      setBusy(false);
    }
  }, [analyze]);

  // ── Document (works on web) ──
  const pickDoc = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0]!;
      const id = uid();
      addUpload({
        id,
        uri: a.uri,
        mimeType: a.mimeType ?? "application/octet-stream",
        fileName: a.name ?? `document-${id}`,
        kind: "doc",
        createdAt: new Date().toISOString(),
      });
    } catch (e: any) {
      setError(e?.message ?? "Couldn't open the document picker.");
    } finally {
      setBusy(false);
    }
  }, []);

  const Header = (
    <View className="flex-row items-center gap-3 px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
      <TouchableOpacity onPress={open} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text className="text-[#93a89b] text-2xl leading-none">☰</Text>
      </TouchableOpacity>
      <View>
        <Text className="text-[#F9FAFB] text-xl font-extrabold">Uploads</Text>
        <Text className="text-[#6B7280] text-[11px]">Photos & documents · instant AI read</Text>
      </View>
    </View>
  );

  // ── Live camera view ──
  if (cameraOn && !IS_WEB) {
    return (
      <View className="flex-1 bg-black">
        {Header}
        <View className="flex-1 mx-4 mb-4 rounded-2xl overflow-hidden">
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        </View>
        {error ? <Text className="text-[#EF4444] text-xs text-center mb-2">{error}</Text> : null}
        <View className="flex-row items-center justify-center gap-8 pb-4" style={{ paddingBottom: insets.bottom + 16 }}>
          <TouchableOpacity onPress={() => setCameraOn(false)} activeOpacity={0.8}>
            <Text className="text-[#9CA3AF] text-[13px] font-semibold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={capture}
            activeOpacity={0.8}
            className="rounded-full items-center justify-center"
            style={{ width: 72, height: 72, backgroundColor: BLUE }}
          >
            <View className="rounded-full bg-white" style={{ width: 58, height: 58 }} />
          </TouchableOpacity>
          <View style={{ width: 52 }} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      {Header}

      {/* Entry buttons */}
      <View className="px-4 flex-row gap-2 mb-4">
        <UploadButton
          label={IS_WEB ? "Camera (app)" : "Take Photo"}
          glyph="◉"
          disabled={IS_WEB}
          onPress={openCamera}
        />
        <UploadButton label="Photo Library" glyph="▤" onPress={pickPhoto} />
        <UploadButton label="Document" glyph="▦" onPress={pickDoc} />
      </View>

      {busy ? (
        <View className="px-4 flex-row items-center gap-2 mb-3">
          <ActivityIndicator size="small" color={BLUE} />
          <Text className="text-[#6B7280] text-[12px]">Adding…</Text>
        </View>
      ) : null}
      {error ? <Text className="text-[#EF4444] text-[12px] px-4 mb-3">{error}</Text> : null}
      {IS_WEB ? (
        <Text className="text-[#6B7280] text-[11px] px-4 mb-3">
          The live camera runs in the ML Systems mobile app — use Photo Library here.
        </Text>
      ) : null}

      {/* Upload list */}
      {uploads.length === 0 ? (
        <View className="items-center justify-center px-8 py-16">
          <Text className="text-[#6B7280] text-[13px] text-center leading-5">
            No uploads yet. Add a photo of your home and PI reads it instantly.
          </Text>
        </View>
      ) : (
        <View className="px-4 gap-3">
          {uploads.map((u) => (
            <UploadCard key={u.id} upload={u} onRemove={() => removeUpload(u.id)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function UploadButton({
  label,
  glyph,
  onPress,
  disabled,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.85}
      className="flex-1 rounded-xl py-3 items-center border"
      style={{
        borderColor: disabled ? "#26262699" : `${BLUE}40`,
        backgroundColor: disabled ? "#11111180" : `${BLUE}14`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: BLUE, fontSize: 18 }}>{glyph}</Text>
      <Text style={{ color: disabled ? "#6B7280" : BLUE }} className="text-[11px] font-bold mt-1">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function UploadCard({ upload, onRemove }: { upload: LocalUpload; onRemove: () => void }) {
  const analyzing = upload.kind === "photo" && upload.analysis === undefined;
  return (
    <View className="bg-[#111111] border border-[#262626] rounded-xl p-3">
      <View className="flex-row gap-3">
        {upload.kind === "photo" ? (
          <Image source={{ uri: upload.uri }} style={{ width: 64, height: 64, borderRadius: 8 }} />
        ) : (
          <View
            className="items-center justify-center rounded-lg"
            style={{ width: 64, height: 64, backgroundColor: "#1A1A1A" }}
          >
            <Text style={{ color: BLUE, fontSize: 24 }}>▦</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-[#F9FAFB] text-[13px] font-semibold" numberOfLines={1}>
            {upload.fileName}
          </Text>
          <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mt-0.5">
            {upload.kind === "photo" ? "Photo" : "Document"} · {upload.mimeType}
          </Text>
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-[#6B7280] text-lg">✕</Text>
        </TouchableOpacity>
      </View>

      {upload.kind === "photo" ? (
        analyzing ? (
          <View className="flex-row items-center gap-2 mt-3">
            <ActivityIndicator size="small" color={BLUE} />
            <Text className="text-[#6B7280] text-[12px]">Reading the photo…</Text>
          </View>
        ) : (
          <View className="mt-3 rounded-lg p-3" style={{ backgroundColor: "#0D0D0D", borderWidth: 1, borderColor: `${BLUE}22` }}>
            <Text className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: BLUE }}>
              Field Assessment
            </Text>
            <Text className="text-[#E8F2EC] text-[12px] leading-relaxed">{upload.analysis}</Text>
          </View>
        )
      ) : null}
    </View>
  );
}
