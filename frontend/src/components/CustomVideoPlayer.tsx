import React, { useRef, useState, useEffect } from "react";
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
  onAspectRatioKnown?: (ratio: number) => void;
  onDraggingChange?: (isDragging: boolean) => void;
  style?: any;
}

export function CustomVideoPlayer({
  uri,
  isActive = true,
  onPlayingChange,
  onAspectRatioKnown,
  onDraggingChange,
  style,
}: CustomVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInitialPlay, setShowInitialPlay] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [trackPageX, setTrackPageX] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<any>(null);
  const timelineRef = useRef<any>(null);
  const videoViewRef = useRef<VideoView>(null);
  const pinchStartDistance = useRef<number | null>(null);

  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = true;
  });

  // Track video aspect ratio across native and web
  useEffect(() => {
    const checkAspectRatio = () => {
      try {
        const track = player.videoTrack;
        if (track?.size && track.size.width > 0 && track.size.height > 0) {
          onAspectRatioKnown?.(track.size.width / track.size.height);
        }
      } catch {}
    };

    checkAspectRatio();

    const trackSub = (player as any).addListener?.("videoTrackChange", (e: any) => {
      if (e?.videoTrack?.size?.width && e?.videoTrack?.size?.height) {
        onAspectRatioKnown?.(e.videoTrack.size.width / e.videoTrack.size.height);
      }
    });

    const srcSub = (player as any).addListener?.("sourceLoad", () => {
      checkAspectRatio();
    });

    return () => {
      trackSub?.remove?.();
      srcSub?.remove?.();
    };
  }, [player, onAspectRatioKnown]);

  // On Web, offscreen video metadata detection
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      try {
        const testVideo = document.createElement("video");
        testVideo.src = uri;
        testVideo.onloadedmetadata = () => {
          if (testVideo.videoWidth && testVideo.videoHeight) {
            onAspectRatioKnown?.(testVideo.videoWidth / testVideo.videoHeight);
          }
        };
      } catch {}
    }
  }, [uri, onAspectRatioKnown]);

  // Pause video if it becomes inactive (e.g. user slides to another media item)
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

  useEffect(() => {
    if (player.duration && duration === 0) {
      setDuration(player.duration);
    }

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
      sub.remove();
      timeSub.remove();
      statusSub.remove();
    };
  }, [player, isDragging, duration, onPlayingChange]);

  // Enter fullscreen helper across platforms
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

  // Exit fullscreen helper across platforms safely
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

  // Pinch-to-zoom → fullscreen (supports Web touch devices & Native)
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
    } else if (container._nativeTag) {
      container.addEventListener?.("touchstart", handleTouchStart, { passive: false });
      container.addEventListener?.("touchmove", handleTouchMove, { passive: false });
      container.addEventListener?.("touchend", handleTouchEnd);

      return () => {
        container.removeEventListener?.("touchstart", handleTouchStart);
        container.removeEventListener?.("touchmove", handleTouchMove);
        container.removeEventListener?.("touchend", handleTouchEnd);
      };
    }
  }, [isFullscreen, player]);

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
      setShowInitialPlay(false);
    }
  };

  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const activeRatio = isDragging && dragRatio !== null ? dragRatio : progressRatio;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setIsDragging(true);
        onDraggingChange?.(true);
        player.pause();
        const currentX = evt.nativeEvent.pageX;
        const width = trackWidth > 0 ? trackWidth : 1;
        const offset = currentX - trackPageX;
        const ratio = Math.max(0, Math.min(1, offset / width));
        setDragRatio(ratio);
        const totalDuration = duration || player.duration || 0;
        if (totalDuration > 0) {
          const target = totalDuration * ratio;
          setCurrentTime(target);
          try {
            player.currentTime = target;
          } catch {}
        }
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const currentX = evt.nativeEvent.pageX;
        const width = trackWidth > 0 ? trackWidth : 1;
        const offset = currentX - trackPageX;
        const ratio = Math.max(0, Math.min(1, offset / width));
        setDragRatio(ratio);
        const totalDuration = duration || player.duration || 0;
        if (totalDuration > 0) {
          const target = totalDuration * ratio;
          setCurrentTime(target);
          try {
            player.currentTime = target;
          } catch {}
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        const currentX = evt.nativeEvent.pageX;
        const width = trackWidth > 0 ? trackWidth : 1;
        const offset = currentX - trackPageX;
        const ratio = Math.max(0, Math.min(1, offset / width));
        const totalDuration = duration || player.duration || 0;
        if (totalDuration > 0) {
          try {
            player.currentTime = totalDuration * ratio;
          } catch {}
        }
        setIsDragging(false);
        setDragRatio(null);
        onDraggingChange?.(false);
        try {
          player.play();
        } catch {}
        setIsPlaying(true);
        setShowInitialPlay(false);
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        setDragRatio(null);
        onDraggingChange?.(false);
      },
    })
  ).current;

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

      {/* 3-dot menu when paused and not dragging */}
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
            {formatTime(
              dragRatio !== null && (duration || player.duration)
                ? (duration || player.duration) * dragRatio
                : currentTime
            )}{" "}
            / {formatTime(duration || player.duration || 0)}
          </Text>
        </View>
      )}

      {/* Timeline dragger at the bottom - hidden through the whole video, visible only while dragging */}
      <View
        ref={timelineRef}
        style={styles.timelineHitbox}
        onLayout={() => {
          timelineRef.current?.measure((_x: number, _y: number, width: number, _height: number, pageX: number) => {
            if (width > 0) setTrackWidth(width);
            if (pageX !== undefined) setTrackPageX(pageX);
          });
        }}
        {...panResponder.panHandlers}
      >
        <View style={[styles.timelineTrack, { opacity: isDragging ? 1 : 0 }]}>
          <View style={[styles.timelineFill, { width: `${activeRatio * 100}%` }]} />
          <View style={[styles.timelineThumb, { left: `${activeRatio * 100}%` }]} />
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
    height: 46,
    justifyContent: "flex-end",
    paddingBottom: 6,
    zIndex: 90,
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
