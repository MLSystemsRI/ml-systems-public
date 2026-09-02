import { Stack, Redirect } from "expo-router";
import { useAuth } from "@/lib/clerk-shim";

// Auth group. If the user is already signed in, bounce them to the Hub ("/")
// so the sign-in screen can never trap an authenticated session.
export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  if (isLoaded && isSignedIn) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
