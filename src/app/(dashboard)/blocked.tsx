import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { isPreview } from "@/lib/preview";
import { AppHeader } from "@/components/app-header";

/**
 * Blocked Neighbors — the undo side of blocking.
 *
 * Blocking someone has to be reversible and visible somewhere the homeowner can
 * find it, so every block lands on this list with an Unblock next to it.
 */

type BlockedRow = { userId: string; name: string; createdAt: string | Date };

export default function BlockedScreen() {
  const insets = useSafeAreaInsets();
  const preview = isPreview();

  const blockedQ = trpc.community.listBlocked.useQuery(undefined, { retry: 0, enabled: !preview });
  const unblockM = trpc.community.unblock.useMutation();

  const rows = (blockedQ.data as BlockedRow[] | undefined) ?? [];

  const unblock = (row: BlockedRow) => {
    Alert.alert(`Unblock ${row.name}?`, "You'll start seeing their posts in Neighbors again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        onPress: async () => {
          try {
            await unblockM.mutateAsync({ userId: row.userId });
            await blockedQ.refetch();
          } catch (e: any) {
            Alert.alert("Couldn't unblock", e?.message ?? "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <AppHeader title="Blocked Neighbors" subtitle="People you've hidden from Neighbors" hideToggle />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}>
        {preview ? (
          <Text className="text-[#6B7280] text-[12px] text-center mt-8">
            Sign in to manage blocked neighbors.
          </Text>
        ) : blockedQ.isLoading ? (
          <ActivityIndicator color="#4EA0F5" className="mt-8" />
        ) : rows.length === 0 ? (
          <Text className="text-[#6B7280] text-[12px] text-center mt-8">
            You haven't blocked anyone.
          </Text>
        ) : (
          rows.map((r) => (
            <View
              key={r.userId}
              className="flex-row items-center justify-between rounded-2xl bg-[#111111] border border-[#262626] px-4 py-3.5"
            >
              <Text className="text-[#F9FAFB] text-[14px] font-semibold flex-1" numberOfLines={1}>
                {r.name}
              </Text>
              <Pressable
                onPress={() => unblock(r)}
                disabled={unblockM.isPending}
                className="rounded-lg px-3 py-1.5 bg-[#1A1A1A] border"
                style={{ borderColor: "#4EA0F540" }}
              >
                <Text style={{ color: "#4EA0F5" }} className="text-[12px] font-bold">Unblock</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
