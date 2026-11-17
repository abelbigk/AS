import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  PanResponder,
  GestureResponderEvent,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Play } from "lucide-react-native";

interface CustomVideoPlayerProps {
  uri: string;
  onPlayingChange?: (isPlaying: boolean) => void;
  style?: any;
}

export function CustomVideoPlayer({ uri, onPlayingChange, style }: CustomVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInitialPlay, setShowInitialPlay] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    const sub = player.addListener("playingChange", (e) => {
      setIsPlaying(e.isPlaying);
      onPlayingChange?.(e.isPlaying);
      if (e.isPlaying) {
        setShowInitialPlay(false);
      }
    });

    const timeSub = player.addListener("timeUpdate", (e) => {
      if (!isDragging) {
        setCurrentTime(e.currentTime);
      }
    });

    const statusSub = player.addListener("statusChange", (e) => {
      if (player.duration) {
        setDuration(player.duration);
      }
    });

    return () => {
      sub.remove();
      timeSub.remove();
      statusSub.remove();
    };
  }, [player, isDragging, onPlayingChange]);

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
      setShowInitialPlay(false);
    }
  };

  const seekToPosition = (ratio: number) => {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const target = (duration || player.duration || 1) * clampedRatio;
    setCurrentTime(target);
    player.currentTime = target;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setIsDragging(true);
        if (trackWidth > 0) {
          seekToPosition(evt.nativeEvent.locationX / trackWidth);
        }
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        if (trackWidth > 0) {
          seekToPosition(evt.nativeEvent.locationX / trackWidth);
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        setIsDragging(false);
        if (trackWidth > 0) {
          seekToPosition(evt.nativeEvent.locationX / trackWidth);
        }
      },
    })
  ).current;

  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <View style={[styles.container, style]}>
      <Pressable onPress={togglePlay} style={StyleSheet.absoluteFill}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          nativeControls={false}
          contentFit="contain"
        />
      </Pressable>

      {/* Initial big play button overlay like old code */}
      {showInitialPlay && (
        <Pressable onPress={togglePlay} style={styles.centerPlayBtn}>
          <View style={styles.playIconCircle}>
            <Play size={32} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
          </View>
        </Pressable>
      )}

      {/* Time tooltip while dragging */}
      {isDragging && (
        <View style={styles.timeTooltip}>
          <Text style={styles.timeTooltipText}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        </View>
      )}

      {/* Timeline dragger at the bottom */}
      <View
        style={styles.timelineHitbox}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={styles.timelineTrack}>
          <View style={[styles.timelineFill, { width: `${progressRatio * 100}%` }]} />
          <View style={[styles.timelineThumb, { left: `${progressRatio * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  centerPlayBtn: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  playIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  timeTooltip: {
    position: "absolute",
    bottom: 30,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timeTooltipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  timelineHitbox: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    justifyContent: "flex-end",
    paddingBottom: 2,
    zIndex: 50,
  },
  timelineTrack: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    width: "100%",
    position: "relative",
  },
  timelineFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
  },
  timelineThumb: {
    position: "absolute",
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    marginLeft: -6,
  },
});
