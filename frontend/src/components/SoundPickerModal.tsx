import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import {
  X,
  Play,
  Pause,
  Music,
  Search,
  CheckCircle2,
  Circle,
  Volume2,
  UploadCloud,
} from "lucide-react-native";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import { AppDialogRenderer, useAppDialog } from "./AppDialog";
import { soundPickerEvents } from "./SoundControl";
import { uploadFile } from "../lib/upload";

interface Sound {
  id: number;
  url: string;
  title: string;
  name?: string | null;
  key?: string | null;
}

interface SoundPickerModalProps {
  visible: boolean;
  currentSoundId?: number | null;
  contentId?: number | null;
  onClose: () => void;
  onSelect: (sound: Sound | null) => void;
}

// ─── Audio Preview Row ───────────────────────────────────────────────────────
interface AudioPreviewRowProps {
  sound: Sound;
  isSelected: boolean;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onEnded: () => void;
  colors: any;
}

function AudioPreviewRow({ sound, isSelected, isPlaying, onPlayToggle, onEnded, colors }: AudioPreviewRowProps) {
  // Always create a player for this sound URL — will only actually play when isPlaying is true
  const player = useAudioPlayer(isPlaying ? { uri: sound.url } : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (status.didJustFinish) {
      onEnded();
    }
  }, [status.didJustFinish]);

  const currentTime = status.currentTime ?? 0;
  const duration = status.duration ?? 0;
  const progress = duration > 0 ? currentTime / duration : 0;

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable
          onPress={onPlayToggle}
          style={[styles.playBtn, { backgroundColor: isPlaying ? "#3B82F6" : colors.surface }]}
        >
          {isPlaying ? <Pause size={14} color="#fff" /> : <Play size={14} color={colors.text} />}
        </Pressable>
        <View style={{ flex: 1, overflow: "hidden" }}>
          <Text numberOfLines={1} style={[styles.soundTitle, { color: colors.text }]}>{sound.title}</Text>
          <Text numberOfLines={1} style={[styles.soundName, { color: colors.textMuted }]}>{sound.name || "--"}</Text>
        </View>
        {isSelected && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>
      {/* Timeline */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 44 }}>
        <Text style={[styles.timeText, { color: colors.textMuted }]}>{fmt(currentTime)}</Text>
        <View style={[styles.timeline, { backgroundColor: colors.border }]}>
          <View style={[styles.timelineFill, { width: `${Math.min(100, progress * 100)}%` as any }]} />
        </View>
        <Text style={[styles.timeText, { color: colors.textMuted }]}>{fmt(duration)}</Text>
      </View>
    </View>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────
export function SoundPickerModal({
  visible,
  currentSoundId,
  contentId,
  onClose,
  onSelect,
}: SoundPickerModalProps) {
  const { colors } = useTheme();
  const { dialogState, hide } = useAppDialog();

  const [activeTab, setActiveTab] = useState<"existing" | "upload">("existing");
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<number | null>(null);

  // Upload tab
  const [soundFile, setSoundFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCreator, setUploadCreator] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const { data: sounds = [], isLoading, refetch } = trpc.sounds.list.useQuery(undefined, { enabled: visible });
  const addMutation = trpc.sounds.add.useMutation();

  useEffect(() => {
    if (!visible) {
      setSearch("");
      setPlayingId(null);
      setSoundFile(null);
      setUploadTitle("");
      setUploadCreator("");
      setIsUploading(false);
      setUploadPct(0);
      soundPickerEvents.emit("close");
    } else {
      soundPickerEvents.emit("open");
    }
  }, [visible]);

  const handleSelect = (sound: Sound | null) => {
    setPlayingId(null);
    onSelect(sound);
  };

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setSoundFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || "audio/mpeg" });
      const baseName = asset.name.substring(0, asset.name.lastIndexOf(".")) || asset.name;
      setUploadTitle(baseName);
    } catch (e) { console.error("Audio pick error:", e); }
  };

  const handleUploadAndSave = async () => {
    if (!soundFile || !uploadTitle.trim()) return;
    setIsUploading(true);
    setUploadPct(5);
    try {
      const result = await uploadFile(
        soundFile.uri,
        soundFile.name,
        soundFile.mimeType,
        (loaded, total) => setUploadPct(Math.round((loaded / total) * 85) + 10),
        undefined,
        "sounds"
      );
      if (!result) throw new Error("Upload failed");
      const dbSound = await addMutation.mutateAsync({
        title: uploadTitle.trim(),
        name: uploadCreator.trim() || "--",
        url: result.url,
        key: result.key,
      });
      await refetch();
      handleSelect({ id: dbSound.id, title: uploadTitle.trim(), name: uploadCreator.trim() || "--", url: result.url, key: result.key });
      onClose();
    } catch (e: any) {
      console.error("Upload sound error:", e);
    } finally {
      setIsUploading(false);
    }
  };

  const filtered = sounds.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.title.toLowerCase().includes(q) || (s.name ?? "").toLowerCase().includes(q);
  });

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.glassBg, borderColor: colors.border }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Volume2 size={18} color="#3B82F6" />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Audio Settings</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                <X size={18} color={colors.text} />
              </Pressable>
            </View>

            {/* Tabs */}
            <View style={[styles.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              {(["existing", "upload"] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                >
                  <Text style={[styles.tabText, { color: activeTab === tab ? colors.text : colors.textMuted }]}>
                    {tab === "existing" ? "Select Sound" : "Upload New"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Body */}
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              {activeTab === "existing" ? (
                <>
                  {/* Remove current */}
                  {currentSoundId && (
                    <Pressable onPress={() => handleSelect(null)} style={styles.removeSoundBtn}>
                      <X size={14} color="#EF4444" />
                      <Text style={styles.removeSoundText}>Remove Current Sound</Text>
                    </Pressable>
                  )}

                  {/* Search */}
                  <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Search size={14} color={colors.textMuted} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder="Search sounds..."
                      placeholderTextColor={colors.textMuted}
                      value={search}
                      onChangeText={setSearch}
                      autoCorrect={false}
                    />
                  </View>

                  {/* Sound list */}
                  {isLoading ? (
                    <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 32 }} />
                  ) : filtered.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Music size={28} color={colors.textMuted} />
                      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                        {search ? "No sounds match your search" : "No sounds yet"}
                      </Text>
                    </View>
                  ) : (
                    filtered.map((snd) => {
                      const isSelected = currentSoundId === snd.id;
                      const isPlayingThis = playingId === snd.id;
                      return (
                        <View
                          key={snd.id}
                          style={[
                            styles.soundRow,
                            {
                              backgroundColor: isSelected ? "rgba(59,130,246,0.1)" : colors.surface,
                              borderColor: isSelected ? "#3B82F6" : colors.border,
                            },
                          ]}
                        >
                          <AudioPreviewRow
                            sound={snd}
                            isSelected={isSelected}
                            isPlaying={isPlayingThis}
                            onPlayToggle={() => setPlayingId((p) => (p === snd.id ? null : snd.id))}
                            onEnded={() => setPlayingId(null)}
                            colors={colors}
                          />
                          <Pressable
                            onPress={() => handleSelect(isSelected ? null : snd)}
                            style={styles.selectBtn}
                            hitSlop={8}
                          >
                            {isSelected
                              ? <CheckCircle2 size={22} color="#3B82F6" />
                              : <Circle size={22} color={colors.textMuted} />}
                          </Pressable>
                        </View>
                      );
                    })
                  )}
                </>
              ) : (
                <View style={{ gap: 14 }}>
                  {/* Audio file picker */}
                  <View>
                    <Text style={[styles.uploadLabel, { color: colors.textMuted }]}>Audio File</Text>
                    {soundFile ? (
                      <View style={[styles.pickedFile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Music size={16} color="#3B82F6" />
                        <Text style={[styles.pickedFileName, { color: colors.text }]} numberOfLines={1}>{soundFile.name}</Text>
                        <Pressable onPress={() => setSoundFile(null)} hitSlop={8}>
                          <X size={16} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={handlePickAudio}
                        style={[styles.dropzone, { borderColor: colors.border, backgroundColor: colors.surface }]}
                      >
                        <UploadCloud size={28} color={colors.textMuted} />
                        <Text style={[styles.dropzoneTitle, { color: colors.text }]}>Choose Audio File</Text>
                        <Text style={[styles.dropzoneHint, { color: colors.textMuted }]}>MP3, WAV, M4A, etc.</Text>
                      </Pressable>
                    )}
                  </View>

                  <View>
                    <Text style={[styles.uploadLabel, { color: colors.textMuted }]}>Sound Title</Text>
                    <TextInput
                      style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                      placeholder="e.g. Chill Beats, Rain Effect"
                      placeholderTextColor={colors.textMuted}
                      value={uploadTitle}
                      onChangeText={setUploadTitle}
                    />
                  </View>

                  <View>
                    <Text style={[styles.uploadLabel, { color: colors.textMuted }]}>Creator / Artist Name (Optional)</Text>
                    <TextInput
                      style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                      placeholder="e.g. Lofi Girl, Unknown Artist"
                      placeholderTextColor={colors.textMuted}
                      value={uploadCreator}
                      onChangeText={setUploadCreator}
                    />
                  </View>

                  {isUploading ? (
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Uploading audio...</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{uploadPct}%</Text>
                      </View>
                      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressFill, { width: `${uploadPct}%` as any }]} />
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleUploadAndSave}
                      disabled={!soundFile || !uploadTitle.trim()}
                      style={[styles.uploadBtn, (!soundFile || !uploadTitle.trim()) && { opacity: 0.4 }]}
                    >
                      <Text style={styles.uploadBtnText}>Upload & Select</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <AppDialogRenderer {...dialogState} onHide={hide} />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "88%",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  closeBtn: { padding: 4 },
  tabRow: {
    flexDirection: "row",
    padding: 6,
    gap: 4,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "rgba(255,255,255,0.1)" },
  tabText: { fontSize: 12, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  removeSoundBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  removeSoundText: { color: "#EF4444", fontSize: 13, fontWeight: "600" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  emptyContainer: { alignItems: "center", gap: 10, marginTop: 32, paddingVertical: 20 },
  emptyText: { fontSize: 14 },
  soundRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  soundTitle: { fontSize: 13, fontWeight: "600" },
  soundName: { fontSize: 11, marginTop: 1 },
  activeBadge: {
    backgroundColor: "rgba(59,130,246,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
  },
  activeBadgeText: {
    color: "#3B82F6",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  timeline: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  timelineFill: { height: "100%", backgroundColor: "#3B82F6", borderRadius: 2 },
  timeText: { fontSize: 10, minWidth: 28 },
  selectBtn: { padding: 4 },
  // Upload tab
  uploadLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pickedFile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickedFileName: { flex: 1, fontSize: 13, fontWeight: "500" },
  dropzone: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 24,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  dropzoneTitle: { fontSize: 14, fontWeight: "600" },
  dropzoneHint: { fontSize: 11 },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#3B82F6", borderRadius: 2 },
  uploadBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#3B82F6",
    marginTop: 4,
  },
  uploadBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
