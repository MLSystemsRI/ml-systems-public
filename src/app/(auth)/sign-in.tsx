import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSignIn, useSSO } from "@/lib/clerk-shim";
import { router } from "expo-router";
import { useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import { MLMark } from "@/components/ml-mark";
import { enablePreview } from "@/lib/preview";

// Required so the OAuth browser tab hands control back to the app on completion.
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  // Email-code step — when Clerk wants a verification code (unverified email,
  // new-device check), we handle it RIGHT HERE instead of punting to the web.
  const [codeStage, setCodeStage] = useState(false);
  const [code, setCode] = useState("");

  async function handleSignIn() {
    if (!isLoaded || loading) return;
    setLoading(true);
    setError("");
    try {
      // Two-step, exactly like the web flow: create the sign-in, THEN explicitly
      // attempt the password factor. Passing `password` to create() alone doesn't
      // reliably auto-complete — Clerk can return `needs_first_factor`, which used
      // to dead-end the native app to "finish on the web" even though the password
      // was correct (the web works because it does this explicit attempt).
      let result = await signIn.create({ identifier: email.trim() });

      if (result.status === "needs_first_factor") {
        const hasPassword = (result.supportedFirstFactors ?? []).some(
          (f: any) => f.strategy === "password",
        );
        if (hasPassword && password) {
          result = await signIn.attemptFirstFactor({ strategy: "password", password });
        }
      }

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
        return;
      }

      // Password didn't finish it — offer an emailed code if the instance supports it
      // (also the passwordless path when the field is left blank).
      if (result.status === "needs_first_factor") {
        const emailFactor: any = (result.supportedFirstFactors ?? []).find(
          (f: any) => f.strategy === "email_code",
        );
        if (emailFactor) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          });
          setCodeStage(true);
          return;
        }
      }

      // Surface the ACTUAL status instead of a generic dead-end, so failures are
      // diagnosable (e.g. needs_second_factor = MFA is enabled for this account).
      setError(
        result.status === "needs_second_factor"
          ? "This account has two-factor enabled — turn off MFA in Clerk, or finish on the web."
          : `Couldn't complete sign-in (status: ${result.status ?? "unknown"}).`,
      );
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Sign in failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCode() {
    if (!isLoaded || loading || !code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn.attemptFirstFactor({ strategy: "email_code", code: code.trim() });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        setError("That code didn't complete sign-in — request a new one and retry.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Invalid or expired code — try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleGoogle = useCallback(async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError("");
    try {
      // A host-less `mlsystems://` redirect is not reliably captured by Chrome
      // Custom Tabs on Android (openAuthSessionAsync returns `dismiss`). Give it a
      // path — matches Clerk's own default (`sso-callback`) and is caught reliably.
      const { createdSessionId, setActive: ssoSetActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "mlsystems", path: "sso-callback" }),
      });
      if (createdSessionId && ssoSetActive) {
        await ssoSetActive({ session: createdSessionId });
        router.replace("/");
      } else {
        setError("Couldn't complete Google sign-in.");
      }
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.message ??
          "Google sign-in isn't enabled yet — turn on Google in Clerk → SSO connections."
      );
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLoading, startSSOFlow]);

  // Offering Google obliges us to offer Apple too (App Store guideline 4.8).
  const handleApple = useCallback(async () => {
    if (appleLoading) return;
    setAppleLoading(true);
    setError("");
    try {
      const { createdSessionId, setActive: ssoSetActive } = await startSSOFlow({
        strategy: "oauth_apple",
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "mlsystems", path: "sso-callback" }),
      });
      if (createdSessionId && ssoSetActive) {
        await ssoSetActive({ session: createdSessionId });
        router.replace("/");
      } else {
        setError("Couldn't complete Apple sign-in.");
      }
    } catch (err: any) {
      // Dismissing Apple's sheet is a normal choice, not a failure to report.
      if (err?.code === "ERR_REQUEST_CANCELED") return;
      setError(
        err?.errors?.[0]?.message ??
          "Apple sign-in isn't enabled yet — turn on Apple in Clerk → SSO connections."
      );
    } finally {
      setAppleLoading(false);
    }
  }, [appleLoading, startSSOFlow]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0A0A0A]"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-8 gap-6">
        <View className="items-center gap-3 mb-4">
          <MLMark size={44} color="#22C55E" />
          <Text className="text-[#F9FAFB] text-2xl font-extrabold">ML Systems</Text>
          <Text className="text-[#6B7280] text-sm">Sign in to your account</Text>
        </View>

        {/* Apple SSO — iOS only. Apple's own button so the mark and label follow
            their guidelines, and it sits above Google as they require. */}
        {Platform.OS === "ios" ? (
          appleLoading ? (
            <View
              className="bg-white rounded-xl items-center justify-center"
              style={{ height: 48 }}
            >
              <ActivityIndicator color="#1F2937" />
            </View>
          ) : (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={12}
              style={{ height: 48, width: "100%" }}
              onPress={handleApple}
            />
          )
        ) : null}

        {/* Google SSO */}
        <TouchableOpacity
          onPress={handleGoogle}
          disabled={googleLoading}
          className="bg-white rounded-xl py-3.5 flex-row items-center justify-center gap-2"
          activeOpacity={0.85}
        >
          {googleLoading ? (
            <ActivityIndicator color="#1F2937" />
          ) : (
            <>
              <Text className="text-[#4285F4] text-base font-black">G</Text>
              <Text className="text-[#1F2937] font-bold text-sm">Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* divider */}
        <View className="flex-row items-center gap-3">
          <View className="flex-1 h-px bg-[#262626]" />
          <Text className="text-[#374151] text-[11px]">or</Text>
          <View className="flex-1 h-px bg-[#262626]" />
        </View>

        {codeStage ? (
          <View className="gap-3">
            <Text className="text-[#9CA3AF] text-xs text-center">
              We emailed a verification code to {email.trim()} — enter it to finish signing in.
            </Text>
            <TextInput
              placeholder="Verification code"
              placeholderTextColor="#6B7280"
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              className="bg-[#111111] border border-[#262626] rounded-xl px-4 py-3 text-[#F9FAFB] text-sm text-center"
            />
          </View>
        ) : (
          <View className="gap-3">
            <TextInput
              placeholder="Email"
              placeholderTextColor="#6B7280"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              className="bg-[#111111] border border-[#262626] rounded-xl px-4 py-3 text-[#F9FAFB] text-sm"
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#6B7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              className="bg-[#111111] border border-[#262626] rounded-xl px-4 py-3 text-[#F9FAFB] text-sm"
            />
          </View>
        )}

        {error ? <Text className="text-[#EF4444] text-xs text-center">{error}</Text> : null}

        <TouchableOpacity
          onPress={codeStage ? handleCode : handleSignIn}
          disabled={loading}
          className="bg-[#22C55E] rounded-xl py-3.5 items-center"
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#06210F" />
          ) : (
            <Text className="text-[#06210F] font-bold text-sm">{codeStage ? "Verify Code" : "Sign In"}</Text>
          )}
        </TouchableOpacity>
        {codeStage ? (
          <TouchableOpacity onPress={() => { setCodeStage(false); setCode(""); setError(""); }} activeOpacity={0.7}>
            <Text className="text-[#6B7280] text-xs text-center">‹ Back to password sign-in</Text>
          </TouchableOpacity>
        ) : null}

        <Text className="text-[#374151] text-[11px] text-center">
          Custodian of your compute — never a toll booth.
        </Text>

        {/* Web-only guest preview (try.mlsystemsri.com). NATIVE gets no bypass:
            production/Play/TestFlight users must sign in — the old
            "Preview as Custodian" link let anyone skip auth (and read as an
            operator door). Web already auto-enables preview at module load;
            this link is just the explicit entry on the web sign-in screen. */}
        {Platform.OS === "web" ? (
          <TouchableOpacity
            onPress={() => {
              enablePreview();
              router.replace("/");
            }}
            activeOpacity={0.7}
          >
            <Text className="text-[#22C55E]/70 text-[12px] text-center">
              Preview the homeowner app →
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
