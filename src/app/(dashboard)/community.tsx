import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { isPreview } from "@/lib/preview";
import { useUser } from "@/lib/clerk-shim";
import { AppHeader } from "@/components/app-header";
import { PostActionsSheet, type ModerationTarget } from "@/components/post-actions";
import { openModerationEmail } from "@/lib/legal";

/**
 * Neighbors — homeowners staying connected + chatting with each other.
 *
 * Live cross-user messaging via the `community` tRPC router (rooms are a fixed set; posts keyed by
 * room). The public web preview (no Clerk session) can't hit the protected router, so it falls back
 * to seeded rooms with session-local posts — same pattern as store/pit/collective.
 */

type Room = { id: string; name: string; blurb: string; color: string };
type Post = { id: string; userId: string; author: string; text: string; when: string; you: boolean };

const ROOMS: Room[] = [
  { id: "providence", name: "Providence, RI", blurb: "Neighbors in the loop near you", color: "#22C55E" },
  { id: "rcm", name: "RCM Questions", blurb: "How the reversed mortgage really works", color: "#4EA0F5" },
  { id: "rebuild", name: "Show Your Rebuild", blurb: "Before / after — share your progress", color: "#F97316" },
  { id: "decon", name: "Deconstruction Tips", blurb: "What to salvage, what to skip", color: "#14B8A6" },
];

// Preview-only seed (the no-login web build can't reach the API).
const SEED: Record<string, Post[]> = {
  providence: [
    { id: "seed-1", userId: "seed", author: "Maria", text: "Anyone else on the East Side doing a deconstruction this fall?", when: "2h", you: false },
    { id: "seed-2", userId: "seed", author: "Devon", text: "Just closed my RCM — equity is moving way faster than my old mortgage.", when: "5h", you: false },
  ],
  rcm: [
    { id: "seed-3", userId: "seed", author: "Priya", text: "So 100% of my payment hits principal first? Still wrapping my head around it.", when: "1d", you: false },
    { id: "seed-4", userId: "seed", author: "Marcus", text: "Yep. Interest accrues separately. Year 3 I already had real equity.", when: "22h", you: false },
  ],
  rebuild: [{ id: "seed-5", userId: "seed", author: "Sam", text: "Framing up on the +1 level this week 🙌 pics soon.", when: "3h", you: false }],
  decon: [{ id: "seed-6", userId: "seed", author: "Lee", text: "Save the old-growth framing — it's worth more than you'd think.", when: "1d", you: false }],
};

function ago(iso: string | Date): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const preview = isPreview();
  const { user } = useUser();
  const myName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

  const [active, setActive] = useState<string | null>(null);
  const [localPosts, setLocalPosts] = useState<Record<string, Post[]>>(SEED); // preview only
  const [input, setInput] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [target, setTarget] = useState<ModerationTarget | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const room = ROOMS.find((r) => r.id === active) ?? null;

  // Rooms are internal state, not routes — so Android's hardware back must first step
  // OUT of the room (back to the room list) before it's allowed to leave the tab.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (active) {
        setActive(null);
        return true; // consumed — stay on Neighbors, show the room list
      }
      return false; // no room open — let the system handle it
    });
    return () => sub.remove();
  }, [active]);

  const postsQ = trpc.community.listPosts.useQuery(
    { room: active ?? "" },
    { retry: 0, enabled: !!active && !preview },
  );
  const postM = trpc.community.post.useMutation();

  type Row = { id: string; userId: string; authorName: string; body: string; createdAt: string | Date };
  const livePosts: Post[] = ((postsQ.data as Row[] | undefined) ?? []).map((r) => ({
    id: r.id,
    userId: r.userId,
    author: r.authorName,
    text: r.body,
    when: ago(r.createdAt),
    you: !!myName && r.authorName === myName,
  }));
  const posts: Post[] = preview ? localPosts[active ?? ""] ?? [] : livePosts;

  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40);

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text || !active) return;
    setInput("");
    if (preview) {
      setLocalPosts((prev) => ({
        ...prev,
        [active]: [
          ...(prev[active] ?? []),
          { id: `local-${Date.now()}`, userId: "local", author: "You", text, when: "now", you: true },
        ],
      }));
      scrollDown();
      return;
    }
    try {
      await postM.mutateAsync({ room: active, body: text });
      await postsQ.refetch();
      scrollDown();
    } catch {
      setInput(text); // restore on failure
    }
  }, [input, active, preview, postM, postsQ]);

  const onRefresh = useCallback(async () => {
    if (preview) return;
    setRefreshing(true);
    await postsQ.refetch();
    setRefreshing(false);
  }, [preview, postsQ]);

  // ── Room list ──
  if (!room) {
    return (
      <View className="flex-1 bg-[#0A0A0A]">
        <AppHeader title="Neighbors" subtitle="Homeowners, building together" hideToggle />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}>
          <Text className="text-[#9CA3AF] text-[12.5px] leading-5 mb-1">
            Rooms where homeowners going through the loop stay connected — swap tips, ask questions,
            and show your progress.
          </Text>
          {ROOMS.map((r) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => setActive(r.id)}
              activeOpacity={0.85}
              className="rounded-2xl px-4 py-4"
              style={{ backgroundColor: `${r.color}0D`, borderWidth: 1, borderColor: `${r.color}33` }}
            >
              <View className="flex-row items-center justify-between mb-0.5">
                <Text className="text-[#F9FAFB] text-[15px] font-bold">{r.name}</Text>
                <Text style={{ color: r.color }} className="text-[11px] font-semibold">Open →</Text>
              </View>
              <Text className="text-[#6B7280] text-[12px]">{r.blurb}</Text>
            </TouchableOpacity>
          ))}
          <Text className="text-[#6B7280] text-[11px] leading-5 mt-1">
            Be a good neighbor. Tap ⋯ on any message to report it or block the author — we review
            reports within 24 hours.{" "}
            <Text onPress={() => openModerationEmail()} style={{ color: "#4EA0F5" }}>
              Contact moderation
            </Text>
          </Text>
          {preview ? <Text className="text-center text-[#4B5563] text-[9.5px] mt-2">Preview · sign in to chat with real neighbors</Text> : null}
        </ScrollView>
      </View>
    );
  }

  // ── Thread ──
  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <AppHeader title={room.name} subtitle={room.blurb} hideToggle />
      {/* "padding" on BOTH platforms — Android edge-to-edge ignores adjustResize, so
          without it the keyboard covers the input bar. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View className="px-4 pt-1">
          <TouchableOpacity onPress={() => setActive(null)} activeOpacity={0.7}>
            <Text style={{ color: room.color }} className="text-[12px] font-semibold">‹ All rooms</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={room.color} />}
        >
          {!preview && postsQ.isLoading ? (
            <ActivityIndicator color={room.color} className="mt-6" />
          ) : posts.length === 0 ? (
            <Text className="text-[#6B7280] text-[12px] text-center mt-8">No posts yet — say hello 👋</Text>
          ) : (
            posts.map((p) => (
              <View key={p.id} className={p.you ? "items-end" : "items-start"}>
                {!p.you ? (
                  <View className="flex-row items-center gap-2 mb-0.5 ml-1">
                    <Text className="text-[#6B7280] text-[10px]">{p.author} · {p.when}</Text>
                    {/* Visible on every neighbor's post — a reviewer shouldn't have to
                        guess that a long-press hides the report action. */}
                    <TouchableOpacity
                      onPress={() => setTarget({ id: p.id, userId: p.userId, author: p.author, text: p.text })}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.6}
                    >
                      <Text className="text-[#4B5563] text-[12px] font-bold">⋯</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <View
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${p.you ? "" : "bg-[#111111] border border-[#262626]"}`}
                  style={p.you ? { backgroundColor: room.color } : undefined}
                >
                  <Text selectable className={p.you ? "text-black text-[13px] font-medium" : "text-[#F9FAFB] text-[13px]"} style={{ lineHeight: 19 }}>
                    {p.text}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
        <Text className="text-[#4B5563] text-[9.5px] text-center px-4 pb-1">
          Posting means you agree to the community guidelines. Tap ⋯ on any message to report it.
        </Text>
        <View className="px-3 pt-2 pb-3 border-t border-[#262626] flex-row items-end gap-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`Message ${room.name}…`}
            placeholderTextColor="#6B7280"
            multiline
            onSubmitEditing={submit}
            className="flex-1 bg-[#111111] border border-[#262626] rounded-xl px-4 py-3 text-[#F9FAFB] text-[13px] max-h-28"
          />
          <Pressable
            onPress={submit}
            disabled={!input.trim() || postM.isPending}
            className="rounded-xl px-4 py-3"
            style={{ backgroundColor: input.trim() ? room.color : `${room.color}4D` }}
          >
            {postM.isPending ? <ActivityIndicator size="small" color="#0A0A0A" /> : <Text className="text-black font-bold text-[13px]">Post</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <PostActionsSheet
        target={target}
        onClose={() => setTarget(null)}
        onDone={(t) => {
          // Preview has no server to re-query, so drop the post locally.
          if (preview) {
            setLocalPosts((prev) => ({
              ...prev,
              [active ?? ""]: (prev[active ?? ""] ?? []).filter((p) => p.id !== t.id),
            }));
          } else {
            postsQ.refetch();
          }
        }}
      />
    </View>
  );
}
