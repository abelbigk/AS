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
  const onAspectRatioKnownRef = useRef(onAspectRatioKnown);
  const lastReportedRatioRef = useRef<number | null>(null);

  useEffect(() => {
    onAspectRatioKnownRef.current = onAspectRatioKnown;
  });

  const reportAspectRatio = (ratio: number) => {
    if (ratio > 0 && isFinite(ratio)) {
      if (lastReportedRatioRef.current !== null && Math.abs(lastReportedRatioRef.current - ratio) < 0.01) {
        return;
      }
      lastReportedRatioRef.current = ratio;
      onAspectRatioKnownRef.current?.(ratio);
    }
  };

  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = true;
  });

  // Track video aspect ratio across native and web
  useEffect(() => {
    const checkAspectRatio = () => {
      try {
        const track = player.videoTrack;
        if (track?.size && track.size.width > 0 && track.size.height > 0) {
          reportAspectRatio(track.size.width / track.size.height);
        }
      } catch {}
    };

    checkAspectRatio();

    const trackSub = (player as any).addListener?.("videoTrackChange", (e: any) => {
      if (e?.videoTrack?.size?.width && e?.videoTrack?.size?.height) {
        reportAspectRatio(e.videoTrack.size.width / e.videoTrack.size.height);
      }
    });

    const srcSub = (player as any).addListener?.("sourceLoad", (e: any) => {
      const track = e?.availableVideoTracks?.[0];
      if (track?.size?.width && track?.size?.height) {
        reportAspectRatio(track.size.width / track.size.height);
      } else {
        checkAspectRatio();
      }
    });

    const statusSub2 = (player as any).addListener?.("statusChange", (e: any) => {
      if (e?.status === "readyToPlay") {
        // Retry several times with increasing delays — videoTrack may still be null initially
        checkAspectRatio();
        setTimeout(() => checkAspectRatio(), 100);
        setTimeout(() => checkAspectRatio(), 300);
        setTimeout(() => checkAspectRatio(), 700);
        setTimeout(() => checkAspectRatio(), 1500);
      }
    });

    return () => {
      trackSub?.remove?.();
      srcSub?.remove?.();
      statusSub2?.remove?.();
    };
  }, [player]);

  // On Web, offscreen video metadata detection
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      try {
        const testVideo = document.createElement("video");
        testVideo.src = uri;
        testVideo.onloadedmetadata = () => {
          if (testVideo.videoWidth && testVideo.videoHeight) {
            reportAspectRatio(testVideo.videoWidth / testVideo.videoHeight);
          }
        };
      } catch {}
    }
  }, [uri]);

  // Also try via the rendered VideoView's nativeRef (web only)
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const timer = setTimeout(() => {
      try {
        const nativeVideo = (videoViewRef.current as any)?.nativeRef;
        if (!nativeVideo) return;
        if (nativeVideo.videoWidth && nativeVideo.videoHeight) {
          reportAspectRatio(nativeVideo.videoWidth / nativeVideo.videoHeight);
          return;
        }
        const onMeta = () => {
          if (nativeVideo.videoWidth && nativeVideo.videoHeight) {
            reportAspectRatio(nativeVideo.videoWidth / nativeVideo.videoHeight);
          }
        };
        nativeVideo.addEventListener("loadedmetadata", onMeta, { once: true });
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [uri]);

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

  const calculateRatio = (evt: GestureResponderEvent) => {
    if (Platform.OS === "web") {
      const el = timelineRef.current as any;
      const rect = el?.getBoundingClientRect?.();
      if (rect && rect.width > 0) {
        return Math.max(0, Math.min(1, (evt.nativeEvent.pageX - rect.left) / rect.width));
      }
    }
    const locX = evt.nativeEvent.locationX;
    if (trackWidth > 0 && locX !== undefined) {
      return Math.max(0, Math.min(1, locX / trackWidth));
    }
    if (trackWidth > 0 && trackPageX > 0) {
      return Math.max(0, Math.min(1, (evt.nativeEvent.pageX - trackPageX) / trackWidth));
    }
    return 0;
  };

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
        const ratio = calculateRatio(evt);
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
        const ratio = calculateRatio(evt);
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
        const ratio = calculateRatio(evt);
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
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setTrackWidth(w);
          timelineRef.current?.measure((_x: number, _y: number, width: number, _height: number, pageX: number) => {
            if (width > 0) setTrackWidth(width);
            if (pageX !== undefined) setTrackPageX(pageX);
          });
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
        <View style={[styles.timelineTrack, { opacity: isDragging ? 1 : 0 }]} pointerEvents="none">
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
    height: 48,
    justifyContent: "flex-end",
    paddingBottom: 6,
    zIndex: 90,
  },
  timelineTrack: {
    height: 6,
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
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    marginLeft: -8,
  },
});
