import React, { useState, useEffect, useCallback } from "react";
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
import { useAudioPlayer } from "expo-audio";
import { X, Play, Pause, Music, Search, Check, Trash2 } from "lucide-react-native";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import { AppDialogRenderer, useAppDialog } from "./AppDialog";
import { soundPickerEvents } from "./SoundControl";

interface Sound {
  id: number;
  url: string;
  title: string;
  name?: string | null;
}

interface SoundPickerModalProps {
  visible: boolean;
  currentSoundId?: number | null;
  contentId?: number | null;
  onClose: () => void;
  onSelect: (sound: Sound | null) => void;
}

export function SoundPickerModal({
  visible,
  currentSoundId,
  contentId,
  onClose,
  onSelect,
}: SoundPickerModalProps) {
  const { colors } = useTheme();
  const { dialogState, hide, showConfirm } = useAppDialog();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(currentSoundId ?? null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // URL-based add form
  const [addUrl, setAddUrl] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Fetch all sounds
  const { data: sounds = [], isLoading, refetch } = trpc.sounds.list.useQuery(undefined, {
    enabled: visible,
  });

  const addMutation = trpc.sounds.add.useMutation({
    onSuccess: () => {
      refetch();
      setAddUrl("");
      setAddTitle("");
      setIsAdding(false);
    },
    onError: () => {
      setIsAdding(false);
    },
  });

  const deleteMutation = trpc.sounds.delete.useMutation({
    onSuccess: () => {
      refetch();
      if (selectedId !== null) {
        // If we just deleted the selected sound, deselect it
        const stillExists = sounds.some((s) => s.id === selectedId);
        if (!stillExists) setSelectedId(null);
      }
    },
  });

  // Single audio preview player
  const previewPlayer = useAudioPlayer(previewUrl ? { uri: previewUrl } : null);

  // Sync selectedId when prop changes
  useEffect(() => {
    setSelectedId(currentSoundId ?? null);
  }, [currentSoundId, visible]);

  // Emit open/close events
  useEffect(() => {
    if (visible) {
      soundPickerEvents.emit("open");
    } else {
      soundPickerEvents.emit("close");
      // Stop preview when closing
      try {
        previewPlayer?.pause();
      } catch {}
      setPlayingId(null);
      setPreviewUrl(null);
    }
  }, [visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        previewPlayer?.pause();
      } catch {}
    };
  }, [previewPlayer]);

  const handlePlayPause = useCallback(
    (sound: Sound) => {
      if (playingId === sound.id) {
        // Pause
        try {
          previewPlayer?.pause();
        } catch {}
        setPlayingId(null);
        setPreviewUrl(null);
      } else {
        // Switch to this sound
        setPreviewUrl(sound.url);
        setPlayingId(sound.id);
        // The player auto-plays when previewUrl changes via a new useAudioPlayer instance
        // but we need to call play explicitly
        try {
          previewPlayer?.play();
        } catch {}
      }
    },
    [playingId, previewPlayer]
  );

  // When previewUrl changes, play
  useEffect(() => {
    if (previewUrl && previewPlayer) {
      try {
        previewPlayer.play();
      } catch {}
    }
  }, [previewUrl, previewPlayer]);

  const handleDelete = useCallback(
    async (sound: Sound) => {
      const confirmed = await showConfirm({
        title: "Delete Sound?",
        message: `Delete "${sound.title}"? This cannot be undone.`,
        confirmText: "Delete",
        destructive: true,
      });
      if (confirmed) {
        deleteMutation.mutate({ soundId: sound.id });
        if (playingId === sound.id) {
          try { previewPlayer?.pause(); } catch {}
          setPlayingId(null);
          setPreviewUrl(null);
        }
      }
    },
    [showConfirm, deleteMutation, playingId, previewPlayer]
  );

  const handleAdd = useCallback(async () => {
    const url = addUrl.trim();
    const title = addTitle.trim();
    if (!url || !title) return;
    setIsAdding(true);
    addMutation.mutate({
      url,
      title,
      name: title,
      key: `url-${Date.now()}`,
    });
  }, [addUrl, addTitle, addMutation]);

  const handleDone = useCallback(() => {
    if (selectedId !== null) {
      const sound = sounds.find((s) => s.id === selectedId);
      onSelect(sound ?? null);
    } else {
      onSelect(null);
    }
  }, [selectedId, sounds, onSelect]);

  const handleRemoveSound = useCallback(() => {
    setSelectedId(null);
    onSelect(null);
  }, [onSelect]);

  const handleClose = useCallback(() => {
    try { previewPlayer?.pause(); } catch {}
    setPlayingId(null);
    setPreviewUrl(null);
    onClose();
  }, [previewPlayer, onClose]);

  // Filter sounds by search
  const filtered = sounds.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.title.toLowerCase().includes(q) || (s.name ?? "").toLowerCase().includes(q);
  });

  return (
    <>
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleClose}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.dialogSheet, { backgroundColor: colors.glassBg, borderColor: colors.border }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Choose Sound</Text>
              <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
                <X size={20} color={colors.text} />
              </Pressable>
            </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Remove Sound row */}
            {currentSoundId && (
              <Pressable
                onPress={handleRemoveSound}
                style={[styles.removeSoundBtn, { borderColor: colors.border }]}
              >
                <X size={14} color="#EF4444" />
                <Text style={styles.removeSoundText}>Remove Sound</Text>
              </Pressable>
            )}

            {/* Search bar */}
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

            {/* Add Sound Section */}
            <View style={[styles.addSection, { borderColor: colors.border }]}>
              <Text style={[styles.addSectionTitle, { color: colors.textMuted }]}>Add Sound via URL</Text>
              <TextInput
                style={[styles.urlInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="Audio URL (https://...)"
                placeholderTextColor={colors.textMuted}
                value={addUrl}
                onChangeText={setAddUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TextInput
                style={[styles.urlInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="Title"
                placeholderTextColor={colors.textMuted}
                value={addTitle}
                onChangeText={setAddTitle}
              />
              <Pressable
                onPress={handleAdd}
                disabled={isAdding || !addUrl.trim() || !addTitle.trim()}
                style={[
                  styles.addBtn,
                  { backgroundColor: colors.accent },
                  (isAdding || !addUrl.trim() || !addTitle.trim()) && styles.addBtnDisabled,
                ]}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addBtnText}>Add Sound</Text>
                )}
              </Pressable>
            </View>

            {/* Sound List */}
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
            ) : filtered.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Music size={28} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {search ? "No sounds match your search" : "No sounds yet"}
                </Text>
              </View>
            ) : (
              filtered.map((sound) => {
                const isSelected = selectedId === sound.id;
                const isPlayingThis = playingId === sound.id;

                return (
                  <Pressable
                    key={sound.id}
                    onPress={() => setSelectedId(sound.id)}
                    style={[
                      styles.soundRow,
                      {
                        backgroundColor: isSelected
                          ? (colors.accent + "22")
                          : colors.surface,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    {/* Play / Pause button */}
                    <Pressable
                      onPress={() => handlePlayPause(sound)}
                      style={[styles.playBtn, { backgroundColor: colors.border }]}
                      hitSlop={4}
                    >
                      {isPlayingThis ? (
                        <Pause size={14} color={colors.text} />
                      ) : (
                        <Play size={14} color={colors.text} />
                      )}
                    </Pressable>

                    {/* Title */}
                    <View style={styles.soundInfo}>
                      <Text
                        numberOfLines={1}
                        style={[styles.soundTitle, { color: colors.text }]}
                      >
                        {sound.title}
                      </Text>
                      {sound.name && sound.name !== sound.title && (
                        <Text
                          numberOfLines={1}
                          style={[styles.soundName, { color: colors.textMuted }]}
                        >
                          {sound.name}
                        </Text>
                      )}
                    </View>

                    {/* Delete */}
                    <Pressable
                      onPress={() => handleDelete(sound)}
                      hitSlop={8}
                      style={styles.deleteBtn}
                    >
                      <Trash2 size={14} color={colors.textMuted} />
                    </Pressable>

                    {/* Radio / check */}
                    <View
                      style={[
                        styles.radioCircle,
                        { borderColor: isSelected ? colors.accent : colors.border },
                        isSelected && { backgroundColor: colors.accent },
                      ]}
                    >
                      {isSelected && <Check size={10} color="#fff" />}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Done button */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={handleDone}
              style={[styles.doneBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.doneBtnText}>
                {selectedId !== null ? "Done" : "Close"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
    <AppDialogRenderer {...dialogState} onHide={hide} />
  </>
);
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialogSheet: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "82%",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  removeSoundBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EF444444",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    marginBottom: 4,
  },
  removeSoundText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  addSection: {
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  addSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  addBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  loader: {
    marginTop: 32,
  },
  emptyContainer: {
    alignItems: "center",
    gap: 10,
    marginTop: 32,
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
  },
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  soundInfo: {
    flex: 1,
    gap: 2,
  },
  soundTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  soundName: {
    fontSize: 11,
  },
  deleteBtn: {
    padding: 4,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  doneBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
