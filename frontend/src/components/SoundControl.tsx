import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { Volume2, VolumeX, Music } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";

// Simple event emitter for sound picker open/close coordination
type SoundPickerListener = () => void;
interface SoundPickerEvents {
  on(event: "open" | "close", fn: SoundPickerListener): void;
  off(event: "open" | "close", fn: SoundPickerListener): void;
  emit(event: "open" | "close"): void;
}
const _openListeners = new Set<SoundPickerListener>();
const _closeListeners = new Set<SoundPickerListener>();
export const soundPickerEvents: SoundPickerEvents = {
  on(event, fn) {
    if (event === "open") _openListeners.add(fn);
    else _closeListeners.add(fn);
  },
  off(event, fn) {
    if (event === "open") _openListeners.delete(fn);
    else _closeListeners.delete(fn);
  },
  emit(event) {
    if (event === "open") _openListeners.forEach((fn) => fn());
    else _closeListeners.forEach((fn) => fn());
  },
};

interface Sound {
  id: number;
  url: string;
  title: string;
  name?: string | null;
}

interface SoundControlProps {
  sound: Sound | null | undefined;
  isParentVideoPlaying: boolean;
  onSoundClick?: () => void;
}

export function SoundControl({ sound, isParentVideoPlaying, onSoundClick }: SoundControlProps) {
  const { colors } = useTheme();
  const [isMuted, setIsMuted] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Animated bars for equalizer
  const bar1 = useRef(new Animated.Value(0.3)).current;
  const bar2 = useRef(new Animated.Value(0.5)).current;
  const bar3 = useRef(new Animated.Value(0.7)).current;
  const bar4 = useRef(new Animated.Value(0.4)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const player = useAudioPlayer(sound?.url ? { uri: sound.url } : null);
  const status = useAudioPlayerStatus(player);

  const startEqualizer = useCallback(() => {
    animRef.current?.stop();
    const makeAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: 350 + delay, easing: Easing.sin, useNativeDriver: false }),
          Animated.timing(val, { toValue: 0.15, duration: 350 + delay, easing: Easing.sin, useNativeDriver: false }),
        ])
      );
    animRef.current = Animated.parallel([
      makeAnim(bar1, 0),
      makeAnim(bar2, 80),
      makeAnim(bar3, 160),
      makeAnim(bar4, 40),
    ]);
    animRef.current.start();
  }, [bar1, bar2, bar3, bar4]);

  const stopEqualizer = useCallback(() => {
    animRef.current?.stop();
    [bar1, bar2, bar3, bar4].forEach((b) => b.setValue(0.3));
  }, [bar1, bar2, bar3, bar4]);

  // Play/pause based on conditions
  const shouldPlay = !isMuted && !isParentVideoPlaying && !isPickerOpen && !!sound?.url;

  useEffect(() => {
    if (!player || !sound?.url) return;
    try {
      player.loop = true;
      if (shouldPlay) {
        setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: "mixWithOthers",
        }).catch(() => {});
        player.muted = false;
        player.volume = 1.0;
        player.play();
      } else {
        player.pause();
      }
    } catch {}
  }, [shouldPlay, sound?.url, player]);

  // Recover if Android AudioFocus paused expo-audio while a video was playing/buffering
  useEffect(() => {
    if (!player || !sound?.url || !shouldPlay) return;
    if (status.isLoaded && !status.playing) {
      const t = setTimeout(() => {
        try {
          player.muted = false;
          player.volume = 1.0;
          player.play();
        } catch {}
      }, 120);
      return () => clearTimeout(t);
    }
  }, [shouldPlay, status.isLoaded, status.playing, player, sound?.url]);

  // Drive equalizer strictly from actual playback state so animation never lies
  const showAnimation = shouldPlay && status.playing;

  useEffect(() => {
    if (showAnimation) {
      startEqualizer();
    } else {
      stopEqualizer();
    }
  }, [showAnimation, startEqualizer, stopEqualizer]);

  // Picker open/close events
  useEffect(() => {
    const handleOpen = () => {
      setIsPickerOpen(true);
      try { player?.pause(); } catch {}
    };
    const handleClose = () => {
      setIsPickerOpen(false);
    };
    soundPickerEvents.on("open", handleOpen);
    soundPickerEvents.on("close", handleClose);
    return () => {
      soundPickerEvents.off("open", handleOpen);
      soundPickerEvents.off("close", handleClose);
    };
  }, [player]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { player?.pause(); } catch {}
      animRef.current?.stop();
    };
  }, [player]);

  if (!sound) return null;

  const barColor = colors.text + "CC";
  const dimBarColor = colors.text + "55";

  return (
    <Pressable
      onPress={onSoundClick}
      style={[
        styles.pill,
        { backgroundColor: (colors as any).glassBg ?? "rgba(0,0,0,0.3)", borderColor: colors.border },
      ]}
    >
      {/* Equalizer bars */}
      <View style={styles.eqContainer}>
        {showAnimation ? (
          <>
            {[bar1, bar2, bar3, bar4].map((bar, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.eqBar,
                  { backgroundColor: barColor, height: bar.interpolate({ inputRange: [0, 1], outputRange: ["10%", "100%"] }) },
                ]}
              />
            ))}
          </>
        ) : (
          <>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.eqBar, { backgroundColor: dimBarColor, height: "35%" }]} />
            ))}
          </>
        )}
      </View>

      {/* Music icon + scrolling title */}
      <View style={styles.titleRow}>
        <Music size={10} color={colors.textMuted} />
        <Text numberOfLines={1} style={[styles.titleText, { color: colors.text }]}>
          {sound.title}
        </Text>
      </View>

      {/* Mute button */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          setIsMuted((prev) => !prev);
        }}
        hitSlop={8}
        style={styles.muteBtn}
      >
        {isMuted ? (
          <VolumeX size={14} color="#EF4444" />
        ) : (
          <Volume2 size={14} color={colors.textMuted} />
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  eqContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 14,
    width: 18,
  },
  eqBar: {
    width: 2.5,
    borderRadius: 2,
    alignSelf: "flex-end",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: 100,
    overflow: "hidden",
  },
  titleText: {
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },
  muteBtn: {
    padding: 2,
  },
});
