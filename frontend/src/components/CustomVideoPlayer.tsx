/**
 * CustomVideoPlayer
 *
 * Timeline scrubber rebuilt from scratch using the same pattern as the working
 * old-code TikTokVideoPlayer (raw touch / mouse events on the DOM / RN views,
 * NOT PanResponder which fights with the parent ScrollView).
 *
 * Key design decisions
 * ─────────────────────
 * • VideoView uses flex:1 (never absoluteFill) → Android contentFit="contain"
 *   is respected without zooming.
 * • Progress bar: onTouchStart / onTouchMove / onTouchEnd on mobile;
 *   onMouseDown + document mousemove/mouseup on web — same as TikTok web player.
 * • Pause while dragging, always resume + seek on release.
 * • Time tooltip shown while dragging (TikTok style).
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
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
  const [isPlaying, setIsPlaying]       = useState(false);
  const [showInitialPlay, setShowInitialPlay] = useState(true);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [isDragging, setIsDragging]     = useState(false);
  const [progress, setProgress]         = useState(0);       // 0–100 (%)
  const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef      = useRef<any>(null);
  const progressBarRef    = useRef<any>(null);  // the thin bar element
  const videoViewRef      = useRef<VideoView>(null);
  const pinchStartDist    = useRef<number | null>(null);
  const isDraggingRef     = useRef(false);       // shadow for event handlers (no stale closure)
  const progressRef       = useRef(0);           // shadow for smooth drag without re-renders
  const dragStartX        = useRef<number | null>(null);
  const dragStartProgress = useRef(0);

  // ─── Player ───────────────────────────────────────────────────────────────
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = true;
  });

  // Sync duration & playback state from player events
  useEffect(() => {
    const playSub = player.addListener("playingChange", (e) => {
      setIsPlaying(e.isPlaying);
      onPlayingChange?.(e.isPlaying);
      if (e.isPlaying) setShowInitialPlay(false);
    });

    const timeSub = player.addListener("timeUpdate", (e) => {
      if (!isDraggingRef.current) {
        const dur = player.duration || 0;
        const t   = e.currentTime;
        setCurrentTime(t);
        if (dur > 0) {
          const pct = (t / dur) * 100;
          setProgress(pct);
          progressRef.current = pct;
        }
      }
      if (player.duration && duration === 0) setDuration(player.duration);
    });

    const statusSub = player.addListener("statusChange", () => {
      if (player.duration) setDuration(player.duration);
    });

    if (player.duration && duration === 0) setDuration(player.duration);

    return () => { playSub.remove(); timeSub.remove(); statusSub.remove(); };
  }, [player, duration, onPlayingChange]);

  // Pause when slide becomes inactive
  useEffect(() => {
    if (!isActive && isPlaying) { player.pause(); setIsPlaying(false); }
  }, [isActive, isPlaying, player]);

  // Pause on unmount
  useEffect(() => () => { try { player.pause(); } catch {} }, [player]);

  // ─── Play / Pause toggle ──────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (isDraggingRef.current) return; // ignore taps while scrubbing
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
      setShowInitialPlay(false);
    }
  }, [isPlaying, player]);

  // ─── Fullscreen ───────────────────────────────────────────────────────────
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
    } catch { setIsFullscreen(false); }
  };

  // Pinch-to-fullscreen (web only — touch events on DOM)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const container = containerRef.current as any;
    if (!container || typeof container.addEventListener !== "function") return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        try { e.preventDefault(); } catch {}
        pinchStartDist.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist.current !== null) {
        try { e.preventDefault(); } catch {}
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = d - pinchStartDist.current;
        if (Math.abs(delta) > 30) {
          if (delta > 0 && !isFullscreen) { enterFullscreen(); pinchStartDist.current = d; }
          else if (delta < 0 && isFullscreen) { exitFullscreen(); pinchStartDist.current = d; }
        }
      }
    };
    const onTouchEnd = () => { pinchStartDist.current = null; };
    const onFsChange = () => { setIsFullscreen(!!document.fullscreenElement); };

    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove",  onTouchMove,  { passive: false });
    container.addEventListener("touchend",   onTouchEnd);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove",  onTouchMove);
      container.removeEventListener("touchend",   onTouchEnd);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, [isFullscreen]);

  // Web: enforce objectFit on the raw <video> DOM element
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const apply = () => {
      try {
        const el = (videoViewRef.current as any)?.nativeRef as HTMLVideoElement | null;
        if (el) {
          el.style.width     = "100%";
          el.style.height    = "100%";
          el.style.maxWidth  = "100%";
          el.style.maxHeight = "100%";
          el.style.objectFit = "contain";
        }
      } catch {}
    };
    apply();
    const t = setTimeout(apply, 100);
    return () => clearTimeout(t);
  }, [uri]);

  // ─── Timeline helpers ─────────────────────────────────────────────────────
  /**
   * Given a clientX (pixels from left of viewport), compute 0–100 progress
   * by measuring the progress bar's bounding rect on web, or using native
   * locationX on mobile.
   */
  const clientXToProgress = (clientX: number): number => {
    const bar = progressBarRef.current as any;
    if (!bar) return progressRef.current;
    if (Platform.OS === "web" && typeof bar.getBoundingClientRect === "function") {
      const rect = bar.getBoundingClientRect();
      if (rect.width <= 0) return progressRef.current;
      return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    }
    // Native: use stored layout width
    const { width } = bar._nativeLayout || { width: 0 };
    if (width <= 0) return progressRef.current;
    return Math.max(0, Math.min(100, (clientX / width) * 100));
  };

  const seekToProgress = (pct: number) => {
    const dur = duration || player.duration || 0;
    if (dur <= 0) return;
    const t = (pct / 100) * dur;
    setCurrentTime(t);
    try { player.currentTime = t; } catch {}
  };

  // ─── NATIVE (Android/iOS) touch handlers ─────────────────────────────────
  // These are React Native synthetic events on the View — no PanResponder,
  // exactly the same approach as TikTokVideoPlayer.tsx in the old code.

  const onProgressTouchStart = (e: any) => {
    e.stopPropagation?.();
    setWasPlayingBeforeDrag(isPlaying);
    if (isPlaying) player.pause();

    isDraggingRef.current = true;
    setIsDragging(true);
    onDraggingChange?.(true);

    const bar = progressBarRef.current as any;
    const barWidth = bar?._nativeLayout?.width ?? 0;
    const touchX   = e.nativeEvent?.locationX ?? 0;
    const pct = barWidth > 0 ? Math.max(0, Math.min(100, (touchX / barWidth) * 100)) : progressRef.current;

    dragStartX.current        = e.nativeEvent?.pageX ?? 0;
    dragStartProgress.current = pct;
    progressRef.current       = pct;
    setProgress(pct);
    seekToProgress(pct);
  };

  const onProgressTouchMove = (e: any) => {
    e.stopPropagation?.();
    if (!isDraggingRef.current || dragStartX.current === null) return;

    const bar = progressBarRef.current as any;
    const barWidth = bar?._nativeLayout?.width ?? 0;
    if (barWidth <= 0) return;

    const delta   = (e.nativeEvent?.pageX ?? 0) - dragStartX.current;
    const deltaPct = (delta / barWidth) * 100;
    const pct     = Math.max(0, Math.min(100, dragStartProgress.current + deltaPct));

    progressRef.current = pct;
    setProgress(pct);
    seekToProgress(pct);
  };

  const onProgressTouchEnd = (e: any) => {
    e.stopPropagation?.();
    isDraggingRef.current = false;
    setIsDragging(false);
    onDraggingChange?.(false);
    dragStartX.current = null;
    // Always resume + dismiss initial play button
    try { player.play(); } catch {}
    setIsPlaying(true);
    setShowInitialPlay(false);
  };

  // ─── WEB mouse handlers (attached imperatively to avoid passive issues) ───
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const bar = progressBarRef.current as any;
    if (!bar || typeof bar.addEventListener !== "function") return;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setWasPlayingBeforeDrag(isPlaying);
      if (isPlaying) player.pause();

      isDraggingRef.current = true;
      setIsDragging(true);
      onDraggingChange?.(true);

      const rect = bar.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      dragStartX.current        = e.clientX;
      dragStartProgress.current = pct;
      progressRef.current       = pct;
      setProgress(pct);
      seekToProgress(pct);

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const r    = bar.getBoundingClientRect();
        const p    = Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100));
        progressRef.current = p;
        setProgress(p);
        seekToProgress(p);
      };

      const onMouseUp = (ev: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const r   = bar.getBoundingClientRect();
        const p   = Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100));
        progressRef.current = p;
        setProgress(p);
        seekToProgress(p);

        isDraggingRef.current = false;
        setIsDragging(false);
        onDraggingChange?.(false);
        dragStartX.current = null;
        try { player.play(); } catch {}
        setIsPlaying(true);
        setShowInitialPlay(false);

        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup",   onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup",   onMouseUp);
    };

    bar.addEventListener("mousedown", onMouseDown);
    return () => bar.removeEventListener("mousedown", onMouseDown);
  // isPlaying intentionally not in deps — we capture it via closure at mousedown time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, duration, onDraggingChange, progressBarRef.current]);

  // ─── Computed display values ──────────────────────────────────────────────
  const currentDuration = duration || player.duration || 0;
  const displayProgress = isDragging ? progress : (
    currentDuration > 0 ? Math.min(100, Math.max(0, (currentTime / currentDuration) * 100)) : 0
  );
  const displayTime = isDragging
    ? (currentDuration * displayProgress) / 100
    : currentTime;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ─── Menu items ───────────────────────────────────────────────────────────
  const menuItems: DropdownItem[] = [
    {
      label: "Picture in Picture",
      icon:  PictureInPicture2,
      onPress: () => { try { (videoViewRef.current as any)?.startPictureInPicture?.(); } catch {} },
    },
    { label: "Speed: 0.5x", icon: Gauge, onPress: () => { player.playbackRate = 0.5; } },
    { label: "Speed: 1x",   icon: Gauge, onPress: () => { player.playbackRate = 1;   } },
    { label: "Speed: 1.5x", icon: Gauge, onPress: () => { player.playbackRate = 1.5; } },
    { label: "Speed: 2x",   icon: Gauge, onPress: () => { player.playbackRate = 2;   } },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View ref={containerRef} style={[styles.container, style]}>

      {/* ── Video ── flex:1 (NOT absoluteFill) keeps contentFit on Android */}
      <Pressable onPress={togglePlay} style={styles.videoFlex}>
        <VideoView
          ref={videoViewRef}
          player={player}
          style={styles.videoFlex}
          nativeControls={false}
          contentFit="contain"
        />
      </Pressable>

      {/* ── Big initial play button ── */}
      {showInitialPlay && (
        <Pressable onPress={togglePlay} style={styles.centerPlayBtn}>
          <View style={styles.playIconCircle}>
            <Play size={32} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
          </View>
        </Pressable>
      )}

      {/* ── 3-dot menu (top-right, only when paused) ── */}
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

      {/* ── Time tooltip while dragging (TikTok style) ── */}
      {isDragging && (
        <View style={styles.timeTooltip} pointerEvents="none">
          <Text style={styles.timeTooltipText}>
            {formatTime(displayTime)} / {formatTime(currentDuration)}
          </Text>
        </View>
      )}

      {/* ── Progress bar ── */}
      {/*
        Native: onTouchStart/Move/End directly on this View — same as old
        TikTokVideoPlayer.tsx. We store the layout width in _nativeLayout via onLayout.

        Web: mousedown is attached imperatively in a useEffect above so we
        can add document-level mousemove/mouseup (the same pattern TikTok uses).
      */}
      <View
        ref={progressBarRef}
        style={styles.progressHitbox}
        onLayout={(e) => {
          // Store layout so native touch handlers can read bar width
          const bar = progressBarRef.current as any;
          if (bar) bar._nativeLayout = e.nativeEvent.layout;
        }}
        onTouchStart={Platform.OS !== "web" ? onProgressTouchStart : undefined}
        onTouchMove={Platform.OS  !== "web" ? onProgressTouchMove  : undefined}
        onTouchEnd={Platform.OS   !== "web" ? onProgressTouchEnd   : undefined}
      >
        {/* Visual track (thin line + filled portion + thumb dot) */}
        <View style={styles.track} pointerEvents="none">
          {/* Elapsed fill */}
          <View
            style={[
              styles.elapsed,
              { width: `${Math.max(0, Math.min(100, displayProgress))}%` as any },
            ]}
          >
            {/* Thumb dot at the right edge of the fill */}
            <View style={[styles.thumb, isDragging && styles.thumbLarge]} />
          </View>
        </View>
      </View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
    overflow: "hidden",
  },

  // flex:1 — the only layout that makes VideoView respect contentFit on Android
  videoFlex: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  centerPlayBtn: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
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
    bottom: 28,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    zIndex: 40,
  },
  timeTooltipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // Tall invisible hitbox at bottom so the finger can tap anywhere in this zone
  progressHitbox: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,          // tall finger target
    justifyContent: "flex-end",
    paddingBottom: 4,
    zIndex: 90,
    cursor: "pointer" as any,
  },
  // Thin visual track (background)
  track: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.30)",
    width: "100%",
    borderRadius: 2,
    overflow: "visible",
  },
  // Elapsed (white filled) portion — grows from left
  elapsed: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
    // needed so the thumb (child) can overflow the 3px height
    overflow: "visible",
  },
  // Thumb dot — sits at the right edge of the elapsed fill
  thumb: {
    position: "absolute",
    right: -5,
    top: -4,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 4,
  },
  thumbLarge: {
    right: -8,
    top: -7,
    width: 17,
    height: 17,
    borderRadius: 9,
  },
});
