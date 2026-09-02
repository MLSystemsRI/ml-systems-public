// Must load before anything constructs a URL. React Native's built-in URL is
// incomplete: Clerk's SSO flow does `new URL(deepLink).searchParams` on the
// `mlsystems://` OAuth return, which throws "Cannot read property 'href' of
// undefined" without a spec-compliant URL. This polyfill fixes native Google SSO.
import "react-native-url-polyfill/auto";
import "../global.css";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import {
  ClerkProvider,
  ClerkLoaded,
  ClerkLoading,
  useAuth,
} from "@/lib/clerk-shim";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useMemo } from "react";
import * as SecureStore from "expo-secure-store";
import { trpc, makeTRPCClient, makeQueryClient } from "@/lib/trpc";
import { MLMark } from "@/components/ml-mark";
import { enablePreview } from "@/lib/preview";

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

// The public web build (try.mlsystemsri.com) runs as a no-login guest: Clerk is
// shimmed out and the dashboard guard is unlocked via preview mode.
const IS_WEB = Platform.OS === "web";
if (IS_WEB) enablePreview();

// Clerk reads/writes the session token through the device's encrypted store,
// so a killed-and-reopened app stays signed in.
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch {
      return;
    }
  },
};

/** The tRPC client needs Clerk's getToken, so it lives inside ClerkProvider. */
function TRPCProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const queryClient = useMemo(() => makeQueryClient(), []);
  const trpcClient = useMemo(() => makeTRPCClient(() => getToken()), [getToken]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

/** Branded splash shown while Clerk boots or if the key is missing in a build. */
function Splash({ message }: { message?: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0A0A0A",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      <MLMark size={44} color="#22C55E" />
      {message ? (
        <Text style={{ color: "#EF4444", fontSize: 13, textAlign: "center", paddingHorizontal: 32 }}>
          {message}
        </Text>
      ) : (
        <ActivityIndicator color="#22C55E" />
      )}
    </View>
  );
}

export default function RootLayout() {
  if (!CLERK_KEY && !IS_WEB) {
    // Fail loud but on-brand instead of a white screen — surfaces a missing
    // EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in the build env immediately on the Pixel.
    // (Web uses the passthrough Clerk shim and needs no key.)
    return <Splash message="Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in this build." />;
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
        <StatusBar style="light" />
        <ClerkLoading>
          <Splash />
        </ClerkLoading>
        <ClerkLoaded>
          <TRPCProvider>
            <Slot />
          </TRPCProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
