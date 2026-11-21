import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  PanResponder,
  GestureResponderEvent,
  Platform,
  ActivityIndicator,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Play, MoreVertical, PictureInPicture2, Gauge } from "lucide-react-native";
import { DropdownMenu, DropdownItem } from "./DropdownMenu";

interface CustomVideoPlayerProps {
  uri: string;
  /** Width the player should fill. Height is computed from the video's natural aspect ratio. */
  width: number;
  isActive?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  onDraggingChange?: (isDragging: boolean) => void;
}

export function CustomVideoPlayer({
  uri,
  width,
  isActive = true,
  onPlayingChange,
  onDraggingChange,
}: CustomVideoPlayerProps) {
  // ─── Video natural size ─────────────────────────────────────────────────────
  // null = not yet known; we show a spinner and default portrait height
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const reportedRatioRef = useRef<number | null>(null);

  const reportRatio = (w: number, h: number) => {
    if (w > 0 && h > 0) {
      const r = w / h;
      if (reportedRatioRef.current !== null && Math.abs(reportedRatioRef.current - r) < 0.01) return;
      reportedRatioRef.current = r;
      setNaturalRatio(r);
    }
  };

  // ─── Player state ────────────────────────────────────────────────────────────
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

  // ─── Aspect ratio detection ──────────────────────────────────────────────────
  // Strategy: listen to every event that might carry size, plus poll with delays.
  // The player owns this — no callbacks to parent needed.
  useEffect(() => {
    const tryFromTrack = () => {
      try {
        const t = player.videoTrack;
        if (t?.size?.width && t?.size?.height) reportRatio(t.size.width, t.size.height);
      } catch {}
    };

    // Immediate check in case already loaded
    tryFromTrack();

    // videoTrackChange — most reliable on native
    const trackSub = (player as any).addListener?.("videoTrackChange", (e: any) => {
      const s = e?.videoTrack?.size;
      if (s?.width && s?.height) reportRatio(s.width, s.height);
      else tryFromTrack();
    });

    // sourceLoad — fires when source is ready, payload has availableVideoTracks
    const srcSub = (player as any).addListener?.("sourceLoad", (e: any) => {
      const t = e?.availableVideoTracks?.[0];
      if (t?.size?.width && t?.size?.height) reportRatio(t.size.width, t.size.height);
      else tryFromTrack();
    });

    // statusChange — poll after readyToPlay (Android videoTrack often delayed)
    const statusSub = (player as any).addListener?.("statusChange", (e: any) => {
      if (e?.status === "readyToPlay") {
        tryFromTrack();
        [100, 300, 600, 1200].forEach((ms) => setTimeout(tryFromTrack, ms));
      }
    });

    return () => {
      trackSub?.remove?.();
      srcSub?.remove?.();
      statusSub?.remove?.();
    };
  }, [player]);

  // Web: use an offscreen <video> element — most reliable there
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.preload = "metadata";
    v.src = uri;
    const onMeta = () => { if (v.videoWidth && v.videoHeight) reportRatio(v.videoWidth, v.videoHeight); };
    v.addEventListener("loadedmetadata", onMeta, { once: true });
    // Fallback: also try after a tick on the rendered element
    const timer = setTimeout(() => {
      try {
        const nv = (videoViewRef.current as any)?.nativeRef;
        if (nv?.videoWidth && nv?.videoHeight) reportRatio(nv.videoWidth, nv.videoHeight);
      } catch {}
    }, 500);
    return () => { clearTimeout(timer); v.removeEventListener("loadedmetadata", onMeta); };
  }, [uri]);

  // ─── Computed container height ───────────────────────────────────────────────
  // Known ratio → exact pixel height; unknown → 9:16 portrait placeholder
  const containerHeight = naturalRatio !== null
    ? Math.round(width / naturalRatio)
    : Math.round(width * (16 / 9));   // tall portrait default while loading

  // ─── Playback helpers ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive && isPlaying) { player.pause(); setIsPlaying(false); }
  }, [isActive, isPlaying, player]);

  useEffect(() => () => { try { player.pause(); } catch {} }, [player]);

  useEffect(() => {
    if (player.duration && duration === 0) setDuration(player.duration);
    const playSub = player.addListener("playingChange", (e) => {
      setIsPlaying(e.isPlaying);
      onPlayingChange?.(e.isPlaying);
      if (e.isPlaying) setShowInitialPlay(false);
    });
    const timeSub = player.addListener("timeUpdate", (e) => {
      if (!isDragging) setCurrentTime(e.currentTime);
      if (player.duration && duration === 0) setDuration(player.duration);
    });
    const durSub = player.addListener("statusChange", () => {
      if (player.duration) setDuration(player.duration);
    });
    return () => { playSub.remove(); timeSub.remove(); durSub.remove(); };
  }, [player, isDragging, duration, onPlayingChange]);

  // ─── Fullscreen ──────────────────────────────────────────────────────────────
  const enterFullscreen = () => {
    try {
      if (Platform.OS === "web") {
        const el = containerRef.current as any;
        if (el?.requestFullscreen && !document.fullscreenElement) {
          el.requestFullscreen().catch(() => {});
          setIsFullscreen(true); return;
        }
      }
      videoViewRef.current?.enterFullscreen().catch(() => {});
      setIsFullscreen(true);
    } catch {}
  };
  const exitFullscreen = () => {
    try {
      if (Platform.OS === "web") {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        setIsFullscreen(false); return;
      }
      videoViewRef.current?.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    } catch { setIsFullscreen(false); }
  };

  // ─── Pinch-to-zoom → fullscreen ──────────────────────────────────────────────
  useEffect(() => {
    const c = containerRef.current as any;
    if (!c) return;
    const onTouchStart = (e: any) => {
      if (e.touches?.length === 2) {
        try { e.preventDefault(); } catch {}
        pinchStartDistance.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };
    const onTouchMove = (e: any) => {
      if (e.touches?.length === 2 && pinchStartDistance.current !== null) {
        try { e.preventDefault(); } catch {}
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const delta = d - pinchStartDistance.current;
        if (Math.abs(delta) > 30) {
          if (delta > 0 && !isFullscreen) { enterFullscreen(); pinchStartDistance.current = d; }
          else if (delta < 0 && isFullscreen) { exitFullscreen(); pinchStartDistance.current = d; }
        }
      }
    };
    const onTouchEnd = () => { pinchStartDistance.current = null; };
    if (Platform.OS === "web" && typeof c.addEventListener === "function") {
      c.addEventListener("touchstart", onTouchStart, { passive: false });
      c.addEventListener("touchmove", onTouchMove, { passive: false });
      c.addEventListener("touchend", onTouchEnd);
      const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener("fullscreenchange", onFSChange);
      return () => {
        c.removeEventListener("touchstart", onTouchStart);
        c.removeEventListener("touchmove", onTouchMove);
        c.removeEventListener("touchend", onTouchEnd);
        document.removeEventListener("fullscreenchange", onFSChange);
      };
    }
  }, [isFullscreen]);

  // ─── Timeline drag ───────────────────────────────────────────────────────────
  const togglePlay = () => {
    if (isPlaying) { player.pause(); }
    else { player.play(); setShowInitialPlay(false); }
  };

  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const activeRatio = isDragging && dragRatio !== null ? dragRatio : progressRatio;

  const calcTimelineRatio = (evt: GestureResponderEvent) => {
    if (Platform.OS === "web") {
      const rect = (timelineRef.current as any)?.getBoundingClientRect?.();
      if (rect?.width > 0) return Math.max(0, Math.min(1, (evt.nativeEvent.pageX - rect.left) / rect.width));
    }
    const locX = evt.nativeEvent.locationX;
    if (trackWidth > 0 && locX !== undefined) return Math.max(0, Math.min(1, locX / trackWidth));
    if (trackWidth > 0 && trackPageX > 0) return Math.max(0, Math.min(1, (evt.nativeEvent.pageX - trackPageX) / trackWidth));
    return 0;
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (evt) => {
      setIsDragging(true); onDraggingChange?.(true); player.pause();
      const r = calcTimelineRatio(evt); setDragRatio(r);
      const total = duration || player.duration || 0;
      if (total > 0) { const t = total * r; setCurrentTime(t); try { player.currentTime = t; } catch {} }
    },
    onPanResponderMove: (evt) => {
      const r = calcTimelineRatio(evt); setDragRatio(r);
      const total = duration || player.duration || 0;
      if (total > 0) { const t = total * r; setCurrentTime(t); try { player.currentTime = t; } catch {} }
    },
    onPanResponderRelease: (evt) => {
      const r = calcTimelineRatio(evt);
      const total = duration || player.duration || 0;
      if (total > 0) { try { player.currentTime = total * r; } catch {} }
      setIsDragging(false); setDragRatio(null); onDraggingChange?.(false);
      try { player.play(); } catch {}
      setIsPlaying(true); setShowInitialPlay(false);
    },
    onPanResponderTerminate: () => { setIsDragging(false); setDragRatio(null); onDraggingChange?.(false); },
  })).current;

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const menuItems: DropdownItem[] = [
    { label: "Picture in Picture", icon: PictureInPicture2, onPress: () => { try { (videoViewRef.current as any)?.startPictureInPicture?.(); } catch {} } },
    { label: "Speed: 0.5×", icon: Gauge, onPress: () => { player.playbackRate = 0.5; } },
    { label: "Speed: 1×",   icon: Gauge, onPress: () => { player.playbackRate = 1; } },
    { label: "Speed: 1.5×", icon: Gauge, onPress: () => { player.playbackRate = 1.5; } },
    { label: "Speed: 2×",   icon: Gauge, onPress: () => { player.playbackRate = 2; } },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View
      ref={containerRef}
      style={{ width, height: containerHeight, backgroundColor: "#000", overflow: "hidden", borderRadius: 14 }}
    >
      {/* The video fills the container exactly — contentFit="cover" shows true size, no bars */}
      <Pressable onPress={togglePlay} style={StyleSheet.absoluteFill}>
        <VideoView
          ref={videoViewRef}
          player={player}
          style={StyleSheet.absoluteFill}
          nativeControls={false}
          contentFit="contain"
        />
      </Pressable>

      {/* Loading spinner while natural size is unknown */}
      {naturalRatio === null && (
        <ActivityIndicator style={StyleSheet.absoluteFill} color="rgba(255,255,255,0.6)" size="large" />
      )}

      {/* Initial play button */}
      {showInitialPlay && naturalRatio !== null && (
        <Pressable onPress={togglePlay} style={styles.centerPlayBtn}>
          <View style={styles.playIconCircle}>
            <Play size={32} color="#FFF" fill="#FFF" style={{ marginLeft: 3 }} />
          </View>
        </Pressable>
      )}

      {/* 3-dot menu */}
      {!isPlaying && !isDragging && (
        <View style={styles.menuContainer}>
          <DropdownMenu
            trigger={(open) => (
              <Pressable onPress={open} style={styles.menuButton}>
                <MoreVertical size={20} color="#FFF" />
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
            {formatTime(dragRatio !== null && (duration || player.duration)
              ? (duration || player.duration) * dragRatio : currentTime)}{" "}
            / {formatTime(duration || player.duration || 0)}
          </Text>
        </View>
      )}

      {/* Timeline scrubber — always captures touch at bottom, track visible only while dragging */}
      <View
        ref={timelineRef}
        style={styles.timelineHitbox}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setTrackWidth(w);
          timelineRef.current?.measure((_x: number, _y: number, mw: number, _h: number, px: number) => {
            if (mw > 0) setTrackWidth(mw);
            if (px !== undefined) setTrackPageX(px);
          });
        }}
        {...(Platform.OS === "web"
          ? ({ onMouseDown: (e: any) => e.stopPropagation(), onTouchStart: (e: any) => e.stopPropagation(), onTouchMove: (e: any) => e.stopPropagation() } as any)
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
  centerPlayBtn: { position: "absolute", alignItems: "center", justifyContent: "center" },
  playIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center" },
  menuContainer: { position: "absolute", top: 12, right: 12, zIndex: 50 },
  menuButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  timeTooltip: { position: "absolute", bottom: 30, backgroundColor: "rgba(0,0,0,0.8)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  timeTooltipText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  timelineHitbox: { position: "absolute", bottom: 0, left: 0, right: 0, height: 48, justifyContent: "flex-end", paddingBottom: 6, zIndex: 90 },
  timelineTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.35)", width: "100%", position: "relative" },
  timelineFill: { height: "100%", backgroundColor: "#FFF" },
  timelineThumb: { position: "absolute", top: -5, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFF", marginLeft: -8 },
});
