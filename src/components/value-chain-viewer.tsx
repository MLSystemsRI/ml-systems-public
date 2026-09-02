import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Asset } from "expo-asset";

/**
 * ValueChainViewer — renders a bundled value-chain prototype (.html asset) in an
 * in-app WebView. Resolves the Metro asset module to a local file URI via expo-asset,
 * then loads it with full file-access so the inline CSS/JS (and CDN Three.js for the 3D
 * scenes) run. All prototypes are self-contained single files — no server needed.
 *
 * Loading a bundled .html on Android via file:// is the fiddly bit; we set the file-access
 * flags WebView needs, and surface a clear error state if the asset can't resolve.
 */
export function ValueChainViewer({ module, tint = "#22C55E" }: { module: number; tint?: string }) {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const asset = Asset.fromModule(module);
        await asset.downloadAsync(); // copies the bundled asset into cache, sets localUri
        const resolved = asset.localUri ?? asset.uri;
        if (!resolved) throw new Error("asset had no uri");
        if (!cancelled) setUri(resolved);
      } catch (e) {
        if (!cancelled) setError(String((e as Error)?.message ?? e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [module]);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0A0A0A] px-8">
        <Text className="text-[#EF4444] text-sm text-center">Couldn&apos;t load this prototype.</Text>
        <Text className="text-[#6B7280] text-[11px] text-center mt-1">{error}</Text>
      </View>
    );
  }

  if (!uri) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0A0A0A]">
        <ActivityIndicator color={tint} />
      </View>
    );
  }

  return (
    <WebView
      source={{ uri }}
      originWhitelist={["*"]}
      allowFileAccess
      allowFileAccessFromFileURLs
      allowUniversalAccessFromFileURLs
      javaScriptEnabled
      domStorageEnabled
      style={{ flex: 1, backgroundColor: "#07090c" }}
      startInLoadingState
      renderLoading={() => (
        <View className="absolute inset-0 items-center justify-center bg-[#07090c]">
          <ActivityIndicator color={tint} />
        </View>
      )}
    />
  );
}
