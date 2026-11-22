/**
 * CustomVideoPlayer — TikTok-style scrubber
 *
 * Scrubber behaviour (matches TikTok exactly):
 *  • Bar is HIDDEN while playing, SHOWN when paused or dragging.
 *  • DELTA-BASED drag: touching the bar at any X does NOT jump the video there.
 *    Instead the drag delta (finger movement in px) is applied to the video's
 *    progress at the moment the finger was placed. So if the video is at 20%
 *    and you touch at 60%, the video stays at 20%; dragging left by 10% of the
 *    bar width moves the video to 10% — your finger ends up at 50%.
 *  • Bar height animates from 3 → 7px while dragging (Animated.spring).
 *  • Thumb dot scales up while dragging.
 *  • Time tooltip shown while dragging.
 *  • Video pauses during drag, resumes on release.
 *  • Seeking on every move event (no debounce) → smooth frame-by-frame preview.
 *
 * Video layout:
 *  • VideoView uses flex:1 (never absoluteFill) → Android honours contentFit="contain".
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Platform,
  Animated as RNAnimated,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Play, MoreVertical, PictureInPicture2, Gauge } from "lucide-react-native";
import { DropdownMenu, DropdownItem } from "./DropdownMenu";

interface CustomVideoPlayerProps {
  uri: string;
  isActive?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  onDraggingChange?: (isDragging: boolean) => void;
  onFullscreenTrigger?: () => void;
  style?: any;
}

export function CustomVideoPlayer({
  uri,
  isActive = true,
  onPlayingChange,
  onDraggingChange,
  onFullscreenTrigger,
  style,
}: CustomVideoPlayerProps) {
  // ─── React state (triggers re-render for display) ─────────────────────────
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [showInitialPlay, setShowInitialPlay] = useState(true);
  const [currentTime,     setCurrentTime]     = useState(0);
  const [duration,        setDuration]        = useState(0);
  const [isDragging,      setIsDragging]      = useState(false);
  const [dragProgress,    setDragProgress]    = useState(0);  // 0–100 displayed during drag
  const [videoAspect,     setVideoAspect]     = useState<number | null>(null);

  // ─── Refs (read in event handlers — no stale closures) ───────────────────
  const isDraggingRef        = useRef(false);
  const isPlayingRef         = useRef(false);
  const currentProgressRef   = useRef(0);     // video progress 0–100, updated each timeUpdate
  const dragStartPageXRef    = useRef(0);     // absolute X where drag started
  const dragStartProgressRef = useRef(0);     // video progress at drag start
  const barWidthRef          = useRef(0);     // progress bar width in px
  const durationRef          = useRef(0);     // mirrors duration state for handlers

  const containerRef   = useRef<any>(null);
  const progressBarRef = useRef<any>(null);
  const videoViewRef   = useRef<VideoView>(null);
  const pinchDistRef   = useRef<number | null>(null);

  // ─── Animated values for bar expansion while dragging ────────────────────
  const barHeight  = useRef(new RNAnimated.Value(3)).current;
  const thumbScale = useRef(new RNAnimated.Value(1)).current;
  const barOpacity = useRef(new RNAnimated.Value(1)).current; // visible while paused, fades out when playing

  const expandBar = (expand: boolean) => {
    RNAnimated.spring(barHeight,  { toValue: expand ? 7  : 3, useNativeDriver: false, tension: 200, friction: 12 }).start();
    RNAnimated.spring(thumbScale, { toValue: expand ? 1.9 : 1, useNativeDriver: true,  tension: 200, friction: 12 }).start();
  };

  // Animate bar visibility: hidden while playing, visible when paused or dragging
  useEffect(() => {
    const shouldShow = !isPlaying || isDragging;
    RNAnimated.timing(barOpacity, {
      toValue: shouldShow ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isPlaying, isDragging]);

  // ─── Player ───────────────────────────────────────────────────────────────
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.05; // 50ms interval for smooth time tracking
  });

  useEffect(() => {
    const playSub = player.addListener("playingChange", (e) => {
      setIsPlaying(e.isPlaying);
      isPlayingRef.current = e.isPlaying;
      onPlayingChange?.(e.isPlaying);
      if (e.isPlaying) setShowInitialPlay(false);

      // When pausing or playing, immediately sync currentTime to current position
      if (!isDraggingRef.current) {
        const cur = player.currentTime;
        const dur = durationRef.current || player.duration || 0;
        if (typeof cur === "number" && !isNaN(cur)) {
          setCurrentTime(cur);
          if (dur > 0) currentProgressRef.current = (cur / dur) * 100;
        }
      }
    });

    const timeSub = player.addListener("timeUpdate", (e) => {
      if (!isDraggingRef.current) {
        const dur = durationRef.current || player.duration || 0;
        setCurrentTime(e.currentTime);
        if (dur > 0) currentProgressRef.current = (e.currentTime / dur) * 100;
      }
      if (player.duration && durationRef.current === 0) {
        setDuration(player.duration);
        durationRef.current = player.duration;
      }
    });

    const statusSub = player.addListener("statusChange", () => {
      if (player.duration) {
        setDuration(player.duration);
        durationRef.current = player.duration;
      }
      const size = (player as any).videoTrack?.size;
      if (size?.width && size?.height) {
        setVideoAspect(size.width / size.height);
      }
    });

    const trackSub = (player as any).addListener?.("videoTrackChange", (e: any) => {
      const size = e?.videoTrack?.size || (player as any).videoTrack?.size;
      if (size?.width && size?.height) {
        setVideoAspect(size.width / size.height);
      }
    });

    if (player.duration && durationRef.current === 0) {
      setDuration(player.duration);
      durationRef.current = player.duration;
    }

    const initSize = (player as any).videoTrack?.size;
    if (initSize?.width && initSize?.height) {
      setVideoAspect(initSize.width / initSize.height);
    }

    return () => {
      playSub.remove();
      timeSub.remove();
      statusSub.remove();
      trackSub?.remove?.();
    };
  }, [player, onPlayingChange]);

  // Web metadata detection: immediate offscreen probe + interval fallback
  useEffect(() => {
    if (Platform.OS !== "web" || !uri) return;
    let active = true;

    try {
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.src = uri;
      probe.onloadedmetadata = () => {
        if (active && probe.videoWidth && probe.videoHeight) {
          setVideoAspect(probe.videoWidth / probe.videoHeight);
        }
      };
    } catch {}

    const interval = setInterval(() => {
      if (!active) return;
      const raw = (videoViewRef.current as any)?.nativeRef;
      const el = (raw?.current || raw) as HTMLVideoElement | null;
      if (el && el.videoWidth && el.videoHeight) {
        setVideoAspect(el.videoWidth / el.videoHeight);
        clearInterval(interval);
      }
    }, 200);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [uri]);

  // Continuously track playback time at 60 FPS while playing so the hidden bar always follows the video
  useEffect(() => {
    let animId: number;
    let isRunning = true;

    const syncTick = () => {
      if (isPlayingRef.current && !isDraggingRef.current) {
        const cur = player.currentTime;
        const dur = durationRef.current || player.duration || 0;
        if (typeof cur === "number" && !isNaN(cur)) {
          setCurrentTime(cur);
          if (dur > 0) {
            currentProgressRef.current = (cur / dur) * 100;
          }
        }
      }
      if (isRunning) {
        animId = requestAnimationFrame(syncTick);
      }
    };

    animId = requestAnimationFrame(syncTick);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [player]);

  // Keep durationRef in sync with state
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // Pause when slide becomes inactive
  useEffect(() => {
    if (!isActive && isPlayingRef.current) { player.pause(); setIsPlaying(false); }
  }, [isActive, player]);

  // Pause on unmount
  useEffect(() => () => { try { player.pause(); } catch {} }, [player]);

  // ─── Toggle play / pause ──────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (isDraggingRef.current) return;   // ignore taps during scrub
    if (isPlayingRef.current) {
      player.pause();
      const cur = player.currentTime;
      const dur = durationRef.current || player.duration || 0;
      if (typeof cur === "number" && !isNaN(cur)) {
        setCurrentTime(cur);
        if (dur > 0) currentProgressRef.current = (cur / dur) * 100;
      }
    } else {
      player.play();
      setShowInitialPlay(false);
    }
  }, [player]);

  // ─── Seek helper ──────────────────────────────────────────────────────────
  const seekTo = (pct: number) => {
    const dur = durationRef.current || player.duration || 0;
    if (dur <= 0) return;
    const target = (pct / 100) * dur;
    setCurrentTime(target);
    try { player.currentTime = target; } catch {}
  };

  // ─── Drag lifecycle helpers (called from both native + web handlers) ──────
  const beginDrag = (pageX: number) => {
    // Immediately sample current position from player so we start with the exact frame
    const cur = player.currentTime;
    const dur = durationRef.current || player.duration || 0;
    const currentPct = dur > 0 && typeof cur === "number" && !isNaN(cur)
      ? (cur / dur) * 100
      : currentProgressRef.current;

    currentProgressRef.current   = currentPct;
    dragStartPageXRef.current    = pageX;
    dragStartProgressRef.current = currentPct;
    isDraggingRef.current        = true;
    setIsDragging(true);
    setDragProgress(currentPct);  // show current pos, no jump
    onDraggingChange?.(true);
    if (isPlayingRef.current) player.pause();
    expandBar(true);
  };

  const updateDrag = (pageX: number) => {
    if (!isDraggingRef.current || barWidthRef.current <= 0) return;
    // Delta from finger-down point, applied to progress at that moment
    const deltaPx  = pageX - dragStartPageXRef.current;
    const deltaPct = (deltaPx / barWidthRef.current) * 100;
    const newPct   = Math.max(0, Math.min(100, dragStartProgressRef.current + deltaPct));
    setDragProgress(newPct);
    seekTo(newPct);  // immediate — no rAF — for frame-accurate preview
  };

  const commitDrag = (pageX: number) => {
    if (!isDraggingRef.current) return;
    updateDrag(pageX);             // ensure final position is committed
    isDraggingRef.current = false;
    setIsDragging(false);
    onDraggingChange?.(false);
    expandBar(false);
    try { player.play(); } catch {}
    setIsPlaying(true);
    setShowInitialPlay(false);
  };

  // ─── Native (Android / iOS) touch handlers ───────────────────────────────
  // Attached via React Native props — no PanResponder (which fights ScrollView).
  const onNativeTouchStart = (e: any) => {
    e.stopPropagation?.();
    beginDrag(e.nativeEvent.pageX);
  };
  const onNativeTouchMove = (e: any) => {
    e.stopPropagation?.();
    updateDrag(e.nativeEvent.pageX);
  };
  const onNativeTouchEnd = (e: any) => {
    e.stopPropagation?.();
    commitDrag(e.nativeEvent.pageX);
  };

  // ─── Web mouse & touch handlers ──────────────────────────────────────────
  // Attached imperatively so document-level move/up work (dragging outside
  // the bar continues the scrub — exactly like TikTok web player).
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const bar = progressBarRef.current as HTMLElement | null;
    if (!bar) return;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      beginDrag(e.clientX);

      const onMouseMove = (ev: MouseEvent) => updateDrag(ev.clientX);
      const onMouseUp   = (ev: MouseEvent) => {
        commitDrag(ev.clientX);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup",   onMouseUp);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup",   onMouseUp);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.stopPropagation();
      beginDrag(e.touches[0].clientX);

      const onTouchMove = (ev: TouchEvent) => {
        if (ev.touches.length !== 1) return;
        updateDrag(ev.touches[0].clientX);
      };
      const onTouchEnd = (ev: TouchEvent) => {
        const touch = ev.changedTouches[0];
        commitDrag(touch ? touch.clientX : dragStartPageXRef.current);
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", onTouchEnd);
      };
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);
    };

    bar.addEventListener("mousedown", onMouseDown);
    bar.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => {
      bar.removeEventListener("mousedown", onMouseDown);
      bar.removeEventListener("touchstart", onTouchStart);
    };
  // Re-run only if the bar DOM element changes (practically never).
  // beginDrag/updateDrag/commitDrag read everything via refs — no stale closures.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressBarRef.current]);

  // ─── Web: pinch-to-fullscreen ─────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = containerRef.current as HTMLElement | null;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      try { e.preventDefault(); } catch {}
      pinchDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchDistRef.current === null) return;
      try { e.preventDefault(); } catch {}
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const delta = d - pinchDistRef.current;
      if (Math.abs(delta) > 30) {
        if (delta > 0) {
          if (onFullscreenTrigger) {
            onFullscreenTrigger();
          } else if (!isFullscreen) {
            enterFullscreen();
          }
          pinchDistRef.current = d;
        } else if (delta < 0 && isFullscreen) {
          exitFullscreen();
          pinchDistRef.current = d;
        }
      }
    };
    const onTouchEnd = () => { pinchDistRef.current = null; };
    const onFsChange  = () => { setIsFullscreen(!!document.fullscreenElement); };
    el.addEventListener("touchstart",       onTouchStart, { passive: false });
    el.addEventListener("touchmove",        onTouchMove,  { passive: false });
    el.addEventListener("touchend",         onTouchEnd);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      el.removeEventListener("touchstart",  onTouchStart);
      el.removeEventListener("touchmove",   onTouchMove);
      el.removeEventListener("touchend",    onTouchEnd);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, [isFullscreen]);

  // Web: enforce objectFit on the raw <video> DOM element
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const apply = () => {
      try {
        const raw = (videoViewRef.current as any)?.nativeRef;
        const el = (raw?.current || raw) as HTMLVideoElement | null;
        if (el && el.style) {
          el.style.width = "100%";
          el.style.height = "100%";
          el.style.maxWidth = "100%";
          el.style.maxHeight = "100%";
          el.style.objectFit = "cover";
          el.style.borderRadius = "16px";
        }
      } catch {}
    };
    apply();
    const t = setTimeout(apply, 150);
    return () => clearTimeout(t);
  }, [uri, videoAspect]);

  // ─── Display values ───────────────────────────────────────────────────────
  const currentDur     = duration || player.duration || 0;
  const displayProgress = isDragging
    ? dragProgress
    : (currentDur > 0 ? Math.min(100, Math.max(0, (currentTime / currentDur) * 100)) : 0);
  const displayTime = isDragging ? (currentDur * dragProgress) / 100 : currentTime;

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ─── Menu ─────────────────────────────────────────────────────────────────
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
  const isLandscape = videoAspect ? videoAspect > 1 : false;

  return (
    <View
      ref={containerRef}
      style={[styles.container, style]}
      onTouchStart={(e) => {
        if (Platform.OS !== "web" && e.nativeEvent?.touches?.length === 2) {
          const t1 = e.nativeEvent.touches[0];
          const t2 = e.nativeEvent.touches[1];
          pinchDistRef.current = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
        }
      }}
      onTouchMove={(e) => {
        if (Platform.OS !== "web" && e.nativeEvent?.touches?.length === 2 && pinchDistRef.current !== null) {
          const t1 = e.nativeEvent.touches[0];
          const t2 = e.nativeEvent.touches[1];
          const d = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          const delta = d - pinchDistRef.current;
          if (delta > 35) {
            if (onFullscreenTrigger) {
              onFullscreenTrigger();
            } else if (!isFullscreen) {
              enterFullscreen();
            }
            pinchDistRef.current = d;
          } else if (delta < -35 && isFullscreen) {
            exitFullscreen();
            pinchDistRef.current = d;
          }
        }
      }}
      onTouchEnd={() => { pinchDistRef.current = null; }}
    >
      {/* ── Frameless Video Card sized to real aspect ratio ── */}
      <View
        style={[
          styles.videoCard,
          videoAspect
            ? isLandscape
              ? { width: "100%", aspectRatio: videoAspect }
              : { height: "100%", aspectRatio: videoAspect }
            : { width: "100%", height: "100%" },
        ]}
      >
        {/* ── Video ── */}
        <Pressable onPress={togglePlay} style={styles.videoFlex}>
          <VideoView
            ref={videoViewRef}
            player={player}
            style={styles.videoFlex}
            nativeControls={false}
            contentFit="cover"
          />
        </Pressable>

        {/* ── Big initial play button (shown before first play) ── */}
        {showInitialPlay && (
          <Pressable onPress={togglePlay} style={StyleSheet.absoluteFill} pointerEvents="box-only">
            <View style={styles.centerPlayOverlay}>
              <View style={styles.playIconCircle}>
                <Play size={32} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
              </View>
            </View>
          </Pressable>
        )}

        {/* ── 3-dot menu (top-right, only when paused and NOT showing initial play) ── */}
        {!isPlaying && !isDragging && !showInitialPlay && (
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

        {/* ── Time tooltip (only while actively dragging) ── */}
        {isDragging && (
          <View style={styles.timeTooltip} pointerEvents="none">
            <Text style={styles.timeTooltipText}>
              {formatTime(displayTime)} / {formatTime(currentDur)}
            </Text>
          </View>
        )}

        {/* ── Progress bar (hidden while playing, visible when paused or dragging) ── */}
        <View
          ref={progressBarRef}
          style={styles.progressHitbox}
          onLayout={(e) => { barWidthRef.current = e.nativeEvent.layout.width; }}
          onTouchStart={Platform.OS !== "web" ? onNativeTouchStart : undefined}
          onTouchMove={Platform.OS  !== "web" ? onNativeTouchMove  : undefined}
          onTouchEnd={Platform.OS   !== "web" ? onNativeTouchEnd   : undefined}
        >
          {/* Animated track: height expands 3px -> 7px on drag, fades in when paused/dragging */}
          <RNAnimated.View style={[styles.track, { height: barHeight, opacity: barOpacity }]}>
            {/* Elapsed fill — grows from left */}
            <View
              style={[
                styles.elapsed,
                { width: `${Math.max(0, Math.min(100, displayProgress))}%` as any },
              ]}
            >
              {/* Thumb dot at right edge of elapsed fill, scales up while dragging */}
              <RNAnimated.View
                style={[
                  styles.thumb,
                  { transform: [{ scale: thumbScale }] },
                ]}
              />
            </View>
          </RNAnimated.View>
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
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  videoCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    maxHeight: "100%",
    maxWidth: "100%",
  },

  videoFlex: {
    width: "100%",
    height: "100%",
  },

  centerPlayOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.35)",
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
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  timeTooltip: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.78)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    zIndex: 40,
  },
  timeTooltipText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // Tall invisible hitbox — easy for a finger to land on
  progressHitbox: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    justifyContent: "flex-end",
    paddingBottom: 5,
    zIndex: 90,
    // Web only cursor
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },

  // The thin line. Height is driven by Animated.Value (3px → 7px).
  track: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 4,
    overflow: "visible",   // let the thumb overflow the thin bar
  },

  // White fill that grows from left
  elapsed: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 4,
    overflow: "visible",
  },

  // Thumb circle at the right edge of the elapsed fill
  thumb: {
    position: "absolute",
    right: -6,
    top: "50%" as any,
    marginTop: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
    elevation: 5,
  },
});
