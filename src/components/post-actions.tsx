import { useState } from "react";
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { trpc } from "@/lib/trpc";
import { openModerationEmail, MODERATION_EMAIL } from "@/lib/legal";

/**
 * Report-or-block sheet for a neighbor's post.
 *
 * The three things a homeowner needs when a post is out of line: flag it, stop
 * seeing the person, or reach a human. Reporting hides the post for everyone once
 * enough people agree (or immediately for the worst categories); blocking only
 * changes what this homeowner sees.
 */

export type ModerationTarget = { id: string; userId: string; author: string; text: string };

const REASONS = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment" },
  { id: "hate", label: "Hate speech" },
  { id: "sexual", label: "Sexual content" },
  { id: "violence", label: "Violence" },
  { id: "scam", label: "Scam" },
  { id: "other", label: "Something else" },
] as const;

const RED = "#EF4444";

export function PostActionsSheet({
  target,
  onClose,
  onDone,
}: {
  target: ModerationTarget | null;
  onClose: () => void;
  /** Called after a successful report/block so the feed can drop the post. */
  onDone: (t: ModerationTarget) => void;
}) {
  const [reason, setReason] = useState<string>("spam");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);

  const reportM = trpc.community.report.useMutation();
  const blockM = trpc.community.block.useMutation();

  const reset = () => { setReason("spam"); setDetail(""); setBusy(false); };
  const close = () => { reset(); onClose(); };

  const submitReport = async () => {
    if (!target || busy) return;
    setBusy(true);
    try {
      // Local-only ids exist in the signed-out preview, where there's no API to call.
      if (!target.id.startsWith("seed-") && !target.id.startsWith("local-")) {
        await reportM.mutateAsync({ postId: target.id, reason, detail: detail.trim() || undefined });
      }
      onDone(target);
      close();
      Alert.alert("Report sent", "Thanks — we review reports within 24 hours.");
    } catch (e: any) {
      setBusy(false);
      Alert.alert("Couldn't send report", e?.message ?? "Please try again.");
    }
  };

  const confirmBlock = () => {
    if (!target || busy) return;
    Alert.alert(
      `Block ${target.author}?`,
      "You won't see their posts anywhere in Neighbors. You can undo this in Profile → Blocked Neighbors.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              if (target.userId !== "seed" && !target.userId.startsWith("local")) {
                await blockM.mutateAsync({ userId: target.userId });
              }
              onDone(target);
              close();
            } catch (e: any) {
              setBusy(false);
              Alert.alert("Couldn't block", e?.message ?? "Please try again.");
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 24 }}>
        <View className="bg-[#111111] border rounded-2xl p-5" style={{ borderColor: "#262626" }}>
          <Text className="text-[#F9FAFB] text-[15px] font-extrabold mb-1">Report or block</Text>
          <Text className="text-[#6B7280] text-[11px] mb-2">{target?.author}</Text>
          <Text className="text-[#9CA3AF] text-[12px] leading-snug mb-3" numberOfLines={2}>
            “{target?.text}”
          </Text>

          <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1.5">Why are you reporting this?</Text>
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {REASONS.map((r) => {
              const on = reason === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setReason(r.id)}
                  className="rounded-lg px-2.5 py-1.5"
                  style={{
                    backgroundColor: on ? `${RED}22` : "#1A1A1A",
                    borderWidth: 1,
                    borderColor: on ? `${RED}66` : "#262626",
                  }}
                >
                  <Text style={{ color: on ? RED : "#9CA3AF" }} className="text-[11.5px] font-semibold">
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={detail}
            onChangeText={setDetail}
            placeholder="Anything else we should know? (optional)"
            placeholderTextColor="#4B5563"
            multiline
            className="bg-[#0A0A0A] border border-[#262626] rounded-xl px-3 py-2.5 text-[#F9FAFB] text-[12.5px] mb-4 max-h-24"
          />

          <View className="flex-row gap-2 mb-2">
            <Pressable
              onPress={close}
              disabled={busy}
              className="flex-1 rounded-xl py-3 items-center bg-[#1A1A1A] border border-[#262626]"
            >
              <Text className="text-[#9CA3AF] text-[13px] font-bold">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submitReport}
              disabled={busy}
              className="flex-1 rounded-xl py-3 items-center"
              style={{ backgroundColor: busy ? `${RED}33` : RED }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white text-[13px] font-bold">Submit report</Text>
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={confirmBlock}
            disabled={busy}
            className="rounded-xl py-3 items-center bg-[#1A1A1A] border"
            style={{ borderColor: `${RED}40` }}
          >
            <Text style={{ color: RED }} className="text-[13px] font-bold">
              Block {target?.author ?? "this neighbor"}
            </Text>
          </Pressable>

          <Pressable onPress={() => openModerationEmail(target?.id)} className="pt-3.5 items-center">
            <Text className="text-[#4EA0F5] text-[12px] font-semibold">Contact moderation</Text>
            <Text className="text-[#4B5563] text-[10px] mt-0.5">{MODERATION_EMAIL}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
