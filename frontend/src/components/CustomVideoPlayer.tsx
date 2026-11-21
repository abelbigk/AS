import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  PanResponder,
  GestureResponderEvent,
  Platform,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Play, MoreVertical, PictureInPicture2, Gauge } from "lucide-react-native";
import { DropdownMenu, DropdownItem } from "./DropdownMenu";

interface CustomVideoPlayerProps {
  uri: string;
  isActive?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  onDraggingChange?: (isDragging: boolean) => void;
  style?: any;
}

export function CustomVideoPlayer({
  uri,
  isActive = true,
  onPlayingChange,
  onDraggingChange,
  style,
}: CustomVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInitialPlay, setShowInitialPlay] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [trackWidth, setTrackWidth] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<any>(null);
  const timelineRef = useRef<any>(null);
  const videoViewRef = useRef<VideoView>(null);
  const pinchStartDistance = useRef<number | null>(null);
  const trackLayoutRef = useRef<{ left: number; width: number }>({ left: 0, width: 0 });

  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = true;
  });

  // Keep playback state synced
  useEffect(() => {
    if (player.duration && duration === 0) {
      setDuration(player.duration);
    }

    const playSub = player.addListener("playingChange", (e) => {
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
      if (player.duration && duration === 0) {
        setDuration(player.duration);
      }
    });

    const statusSub = player.addListener("statusChange", (_e) => {
      if (player.duration) {
        setDuration(player.duration);
      }
    });

    return () => {
      playSub.remove();
      timeSub.remove();
      statusSub.remove();
    };
  }, [player, isDragging, duration, onPlayingChange]);

  // Pause when slide is inactive
  useEffect(() => {
    if (!isActive && isPlaying) {
      player.pause();
      setIsPlaying(false);
    }
  }, [isActive, isPlaying, player]);

  // Pause on unmount
  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {}
    };
  }, [player]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
      setShowInitialPlay(false);
    }
  }, [isPlaying, player]);

  // Fullscreen support
  const enterFullscreen = () => {
    try {
      if (Platform.OS === "web") {
        const el = containerRef.current as any;
        if (el?.requestFullscreen && typeof document !== "undefined" && !document.fullscreenElement) {
          el.requestFullscreen().catch(() => {});
          setIsFullscreen(true);
          return;
        }
      }
      videoViewRef.current?.enterFullscreen().catch(() => {});
      setIsFullscreen(true);
    } catch {}
  };

  const exitFullscreen = () => {
    try {
      if (Platform.OS === "web") {
        if (typeof document !== "undefined" && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
        return;
      }
      videoViewRef.current?.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    } catch {
      setIsFullscreen(false);
    }
  };

  // Pinch to fullscreen
  useEffect(() => {
    const container = containerRef.current as any;
    if (!container) return;

    const handleTouchStart = (e: any) => {
      if (e.touches && e.touches.length === 2) {
        try { e.preventDefault(); } catch {}
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDistance.current = Math.hypot(dx, dy);
      }
    };

    const handleTouchMove = (e: any) => {
      if (e.touches && e.touches.length === 2 && pinchStartDistance.current !== null) {
        try { e.preventDefault(); } catch {}
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.hypot(dx, dy);
        const delta = distance - pinchStartDistance.current;

        if (Math.abs(delta) > 30) {
          if (delta > 0 && !isFullscreen) {
            enterFullscreen();
            pinchStartDistance.current = distance;
          } else if (delta < 0 && isFullscreen) {
            exitFullscreen();
            pinchStartDistance.current = distance;
          }
        }
      }
    };

    const handleTouchEnd = () => {
      pinchStartDistance.current = null;
    };

    if (Platform.OS === "web" && typeof container.addEventListener === "function") {
      container.addEventListener("touchstart", handleTouchStart, { passive: false });
      container.addEventListener("touchmove", handleTouchMove, { passive: false });
      container.addEventListener("touchend", handleTouchEnd);

      const onFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener("fullscreenchange", onFullscreenChange);

      return () => {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("touchend", handleTouchEnd);
        document.removeEventListener("fullscreenchange", onFullscreenChange);
      };
    }
  }, [isFullscreen]);

  // Timeline position calculation
  const calculateRatioFromEvent = (evt: GestureResponderEvent): number => {
    const width = trackLayoutRef.current.width || trackWidth;
    if (width <= 0) return 0;

    if (Platform.OS === "web") {
      const el = timelineRef.current as any;
      const rect = el?.getBoundingClientRect?.();
      if (rect && rect.width > 0) {
        const x = evt.nativeEvent.pageX - rect.left;
        return Math.max(0, Math.min(1, x / rect.width));
      }
    }

    const locX = evt.nativeEvent.locationX;
    if (locX !== undefined && locX >= 0) {
      return Math.max(0, Math.min(1, locX / width));
    }

    return 0;
  };

  // PanResponder specifically for the timeline scrubber at bottom
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setIsDragging(true);
        onDraggingChange?.(true);
        player.pause();

        const ratio = calculateRatioFromEvent(evt);
        setDragProgress(ratio);

        const total = duration || player.duration || 0;
        if (total > 0) {
          const target = total * ratio;
          setCurrentTime(target);
          try {
            player.currentTime = target;
          } catch {}
        }
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const ratio = calculateRatioFromEvent(evt);
        setDragProgress(ratio);

        const total = duration || player.duration || 0;
        if (total > 0) {
          const target = total * ratio;
          setCurrentTime(target);
          try {
            player.currentTime = target;
          } catch {}
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        const ratio = calculateRatioFromEvent(evt);
        const total = duration || player.duration || 0;
        if (total > 0) {
          const target = total * ratio;
          try {
            player.currentTime = target;
          } catch {}
        }
        setIsDragging(false);
        onDraggingChange?.(false);
        try {
          player.play();
        } catch {}
        setIsPlaying(true);
        setShowInitialPlay(false);
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        onDraggingChange?.(false);
      },
    })
  ).current;

  const currentDuration = duration || player.duration || 0;
  const normalProgress = currentDuration > 0 ? Math.min(1, Math.max(0, currentTime / currentDuration)) : 0;
  const effectiveProgress = isDragging ? dragProgress : normalProgress;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const menuItems: DropdownItem[] = [
    {
      label: "Picture in Picture",
      icon: PictureInPicture2,
      onPress: () => {
        try {
          (videoViewRef.current as any)?.startPictureInPicture?.();
        } catch {}
      },
    },
    {
      label: "Speed: 0.5x",
      icon: Gauge,
      onPress: () => {
        player.playbackRate = 0.5;
      },
    },
    {
      label: "Speed: 1x",
      icon: Gauge,
      onPress: () => {
        player.playbackRate = 1;
      },
    },
    {
      label: "Speed: 1.5x",
      icon: Gauge,
      onPress: () => {
        player.playbackRate = 1.5;
      },
    },
    {
      label: "Speed: 2x",
      icon: Gauge,
      onPress: () => {
        player.playbackRate = 2;
      },
    },
  ];

  return (
    <View ref={containerRef} style={[styles.container, style]}>
      {/* Video element - fills the frame with clean contain fit */}
      <Pressable onPress={togglePlay} style={StyleSheet.absoluteFill}>
        <VideoView
          ref={videoViewRef}
          player={player}
          style={StyleSheet.absoluteFill}
          nativeControls={false}
          contentFit="contain"
        />
      </Pressable>

      {/* Initial big play button overlay */}
      {showInitialPlay && (
        <Pressable onPress={togglePlay} style={styles.centerPlayBtn}>
          <View style={styles.playIconCircle}>
            <Play size={32} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
          </View>
        </Pressable>
      )}

      {/* 3-dot menu button at top right when paused */}
      {!isPlaying && !isDragging && (
        <View style={styles.menuContainer}>
          <DropdownMenu
            trigger={(open) => (
              <Pressable onPress={open} style={styles.menuButton}>
                <MoreVertical size={20} color="#FFFFFF" />
              </Pressable>
            )}
            items={menuItems}
            align="right"
          />
        </View>
      )}

      {/* Time tooltip while dragging */}
      {isDragging && (
        <View style={styles.timeTooltip}>
          <Text style={styles.timeTooltipText}>
            {formatTime(effectiveProgress * currentDuration)} / {formatTime(currentDuration)}
          </Text>
        </View>
      )}

      {/* Timeline scrubber at the bottom */}
      <View
        ref={timelineRef}
        style={styles.timelineHitbox}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) {
            setTrackWidth(w);
            trackLayoutRef.current.width = w;
          }
        }}
        {...(Platform.OS === "web"
          ? ({
              onMouseDown: (e: any) => e.stopPropagation(),
              onTouchStart: (e: any) => e.stopPropagation(),
              onTouchMove: (e: any) => e.stopPropagation(),
            } as any)
          : {})}
        {...panResponder.panHandlers}
      >
        <View style={styles.timelineTrack} pointerEvents="none">
          <View
            style={[
              styles.timelineFill,
              { width: `${Math.max(0, Math.min(100, effectiveProgress * 100))}%` },
            ]}
          />
          <View
            style={[
              styles.timelineThumb,
              { left: `${Math.max(0, Math.min(100, effectiveProgress * 100))}%` },
            ]}
          />
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
    overflow: "hidden",
  },
  centerPlayBtn: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  playIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuContainer: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 50,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  timeTooltip: {
    position: "absolute",
    bottom: 34,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 40,
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
    height: 36,
    justifyContent: "flex-end",
    paddingBottom: 4,
    zIndex: 90,
  },
  timelineTrack: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});
