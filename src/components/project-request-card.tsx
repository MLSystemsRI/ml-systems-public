import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { trpc } from "@/lib/trpc";
import { triageRequest, type AgentTag } from "@/lib/project-triage";

/**
 * Project Request card — "the projects you need done" on the Value Chain Portfolio.
 *
 * The homeowner describes the work in their own words (+ optional photos). As they
 * type, VERA-style triage routes it live to the minds that own it. Submit writes a
 * REAL record (projectRequests.create) the moment it's sent — no local draft — and
 * the board below lists every request with its status and the minds engaged. A
 * whole-home decon+rebuild threads into the decon gate / rebuild assessment / MURPHY
 * tracker already on this page; discrete work links the home's project. Everything
 * the homeowner needs done flows through here.
 */

const VIOLET = "#8B5CF6";

const GLYPH: Record<AgentTag, { glyph: string; color: string }> = {
  VERA: { glyph: "🦉", color: "#34D399" },
  CDA: { glyph: "◇", color: "#60A5FA" },
  REAPER: { glyph: "⛏", color: "#F97316" },
  "PIT LORD": { glyph: "🐉", color: "#EF4444" },
  MURPHY: { glyph: "⚒", color: "#84CC16" },
  MIA: { glyph: "◈", color: "#14B8A6" },
  Custodian: { glyph: "◆", color: "#FFE500" },
};

const STATUS: Record<string, { label: string; color: string }> = {
  requested:   { label: "REQUESTED",   color: "#9CA3AF" },
  triaged:     { label: "TRIAGED",     color: "#60A5FA" },
  in_progress: { label: "IN PROGRESS", color: "#F59E0B" },
  done:        { label: "DONE",        color: "#22C55E" },
  declined:    { label: "DECLINED",    color: "#6B7280" },
};

type RequestRow = {
  id: string;
  requestText: string;
  category: string | null;
  routedMinds: AgentTag[] | null;
  status: string;
  projectId: string | null;
  createdAt: string;
};

export function ProjectRequestCard({ address, projectId }: { address?: string | null; projectId?: string | null }) {
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const utils = trpc.useUtils();
  const realProjectId = projectId && !projectId.startsWith("local:") ? projectId : null;

  const myReq = trpc.projectRequests.myRequests.useQuery(undefined, { retry: 0 });
  const create = trpc.projectRequests.create.useMutation({
    onSuccess: () => {
      setText("");
      setPhotos([]);
      void utils.projectRequests.myRequests.invalidate();
    },
  });

  const rows: RequestRow[] = Array.isArray(myReq.data) ? (myReq.data as RequestRow[]) : [];
  // This home's requests first (when we know the project); the rest below.
  const homeRows = realProjectId ? rows.filter((r) => r.projectId === realProjectId) : rows;

  const triage = triageRequest(text);
  const canSubmit = text.trim().length >= 3 && !create.isPending;

  const addPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
      });
      const uri = res.canceled ? null : res.assets?.[0]?.uri;
      if (uri) setPhotos((p) => (p.length >= 12 ? p : [...p, uri]));
    } catch {
      /* picker unavailable — text is enough */
    }
  };

  const submit = () => {
    if (!canSubmit) return;
    create.mutate({
      requestText: text.trim(),
      category: triage.category,
      routedMinds: triage.routedMinds,
      ...(photos.length ? { photoRefs: photos } : {}),
      ...(realProjectId ? { projectId: realProjectId } : {}),
    });
  };

  return (
    <View className="rounded-xl px-3.5 py-3" style={{ backgroundColor: `${VIOLET}0D`, borderWidth: 1, borderColor: `${VIOLET}33` }}>
      <Text style={{ color: VIOLET }} className="text-[9px] font-bold uppercase tracking-widest mb-1">
        ✦ Projects you need done
      </Text>
      <Text className="text-[#9CA3AF] text-[10.5px] mb-2">
        Describe the work in your own words — the minds pick it up and it flows through the app.
      </Text>

      {/* Intake */}
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="e.g. I need a new roof · add a second story · the kitchen is dated"
        placeholderTextColor="#4B5563"
        multiline
        className="text-[#F9FAFB] text-[12.5px] rounded-lg px-3 py-2.5"
        style={{ backgroundColor: "#0C0C0F", borderWidth: 1, borderColor: "#262626", minHeight: 60, textAlignVertical: "top" }}
      />

      {/* Live triage — which minds this routes to */}
      {text.trim().length >= 3 ? (
        <View className="flex-row items-center flex-wrap mt-2">
          <Text className="text-[#6B7280] text-[10px] mr-1.5">{triage.label} →</Text>
          {triage.routedMinds.map((m) => (
            <Text key={m} style={{ color: GLYPH[m].color }} className="text-[11px] mr-1.5">
              {GLYPH[m].glyph}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Photos + submit */}
      <View className="flex-row items-center justify-between mt-2.5">
        <TouchableOpacity onPress={addPhoto} activeOpacity={0.75} className="rounded-lg px-3 py-1.5" style={{ borderWidth: 1, borderColor: "#262626" }}>
          <Text className="text-[#9CA3AF] text-[11px] font-semibold">
            + Photo{photos.length ? ` · ${photos.length}` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={submit}
          disabled={!canSubmit}
          activeOpacity={0.85}
          className="rounded-lg px-4 py-1.5 flex-row items-center"
          style={{ backgroundColor: canSubmit ? `${VIOLET}26` : "#1A1A1F", borderWidth: 1, borderColor: canSubmit ? `${VIOLET}66` : "#262626" }}
        >
          {create.isPending ? <ActivityIndicator size="small" color={VIOLET} style={{ marginRight: 6 }} /> : null}
          <Text style={{ color: canSubmit ? "#C4B5FD" : "#4B5563" }} className="text-[11.5px] font-extrabold">
            Start project →
          </Text>
        </TouchableOpacity>
      </View>

      {create.isError ? (
        <Text className="text-[#9CA3AF] text-[10.5px] mt-1.5">
          Couldn't start it — {realProjectId ? "try again" : "this begins once your home's record is live"}.
        </Text>
      ) : null}
      {create.isSuccess ? (
        <Text style={{ color: "#22C55E" }} className="text-[10.5px] mt-1.5">✓ Started — the minds are on it.</Text>
      ) : null}

      {/* Board — the homeowner's live requests */}
      {homeRows.length ? (
        <View className="mt-3 pt-2.5" style={{ borderTopWidth: 1, borderTopColor: "#1A1A1F" }}>
          <Text className="text-[#6B7280] text-[9px] font-bold uppercase tracking-widest mb-1.5">
            {homeRows.length} request{homeRows.length === 1 ? "" : "s"}
          </Text>
          {homeRows.map((r) => {
            const st = STATUS[r.status] ?? STATUS.requested;
            return (
              <View key={r.id} className="py-1.5 border-t" style={{ borderColor: "#14171c" }}>
                <View className="flex-row items-center">
                  <Text className="text-[#E5E7EB] text-[11px] flex-1 pr-2" numberOfLines={1}>{r.requestText}</Text>
                  <Text style={{ color: st.color }} className="text-[8px] font-bold tracking-wider">{st.label}</Text>
                </View>
                <View className="flex-row items-center mt-0.5">
                  {(r.routedMinds ?? []).map((m) => (
                    <Text key={m} style={{ color: GLYPH[m]?.color ?? "#6B7280" }} className="text-[10px] mr-1">
                      {GLYPH[m]?.glyph ?? "•"}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
