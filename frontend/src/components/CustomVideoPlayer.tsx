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

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Platform,
  Animated as RNAnimated,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { VideoView, useVideoPlayer } from "expo-video";
import Svg, { Path } from "react-native-svg";
import { Play, MoreVertical, PictureInPicture2, Gauge } from "lucide-react-native";
import { DropdownMenu, DropdownItem } from "./DropdownMenu";
import { getCachedVideoUriOnly, getOrCacheVideoUri } from "../lib/videoCache";
import { useTheme } from "../contexts/ThemeContext";

interface CustomVideoPlayerProps {
  uri: string;
  isActive?: boolean;
  syncTime?: number;
  syncIsPlaying?: boolean;
  syncVersion?: number;
  onTimeUpdate?: (timeSec: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onDraggingChange?: (isDragging: boolean) => void;
  onBufferingChange?: (isBuffering: boolean) => void;
  onUserPausedChange?: (isUserPaused: boolean) => void;
  onFullscreenTrigger?: () => void;
  onFullscreenExit?: () => void;
  style?: any;
}

export function CustomVideoPlayer({
  uri,
  isActive = true,
  syncTime,
  syncIsPlaying,
  syncVersion,
  onTimeUpdate,
  onPlayingChange,
  onDraggingChange,
  onBufferingChange,
  onUserPausedChange,
  onFullscreenTrigger,
  onFullscreenExit,
  style,
}: CustomVideoPlayerProps) {
  const { theme } = useTheme();
  // ─── React state (triggers re-render for display) ─────────────────────────
  const [playableUri,     setPlayableUri]     = useState(uri);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [showInitialPlay, setShowInitialPlay] = useState(
    !(syncIsPlaying || (typeof syncTime === "number" && syncTime > 0))
  );
  const [currentTime,     setCurrentTime]     = useState(0);
  const [duration,        setDuration]        = useState(0);
  const [isDragging,      setIsDragging]      = useState(false);
  const [dragProgress,    setDragProgress]    = useState(0);  // 0–100 displayed during drag
  const [videoAspect,     setVideoAspect]     = useState<number | null>(null);

  // ─── Refs (read in event handlers — no stale closures) ───────────────────
  const isDraggingRef        = useRef(false);
  const isPlayingRef         = useRef(false);
  const isBufferingRef       = useRef(false);
  const currentProgressRef   = useRef(0);     // video progress 0–100, updated each timeUpdate
  const dragStartPageXRef    = useRef(0);     // absolute X where drag started
  const dragStartProgressRef = useRef(0);     // video progress at drag start
  const barWidthRef          = useRef(0);     // progress bar width in px
  const durationRef          = useRef(0);     // mirrors duration state for handlers

  const containerRef   = useRef<any>(null);
  const progressBarRef = useRef<any>(null);
  const videoViewRef   = useRef<VideoView>(null);
  const pinchDistRef   = useRef<number | null>(null);
  const pendingSyncRef = useRef<{ time: number; shouldPlay: boolean } | null>(null);
  const lastSyncVersionRef = useRef<number | undefined>(undefined);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onBufferingChangeRef = useRef(onBufferingChange);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onPlayingChangeRef.current = onPlayingChange;
  onBufferingChangeRef.current = onBufferingChange;
  onTimeUpdateRef.current = onTimeUpdate;

  // ─── Animated values for bar expansion & zero-rerender progress ──────────
  const barHeight       = useRef(new RNAnimated.Value(3)).current;
  const thumbScale      = useRef(new RNAnimated.Value(1)).current;
  const barOpacity      = useRef(new RNAnimated.Value(1)).current; // visible while paused or dragging
  const controlsOpacity = useRef(new RNAnimated.Value(1)).current; // visible only when paused by user (not dragging)
  const progressPctAnim = useRef(new RNAnimated.Value(0)).current; // 0-100 driven imperatively for 0-lag scrub
  const lastTooltipSecRef = useRef(-1);

  const expandBar = (expand: boolean) => {
    RNAnimated.spring(barHeight,  { toValue: expand ? 7  : 3, useNativeDriver: false, tension: 200, friction: 12 }).start();
    RNAnimated.spring(thumbScale, { toValue: expand ? 1.9 : 1, useNativeDriver: true,  tension: 200, friction: 12 }).start();
  };

  // Sync bar & paused controls visibility instantaneously
  useEffect(() => {
    barOpacity.stopAnimation();
    controlsOpacity.stopAnimation();
    barOpacity.setValue(!isPlaying || isDragging ? 1 : 0);
    controlsOpacity.setValue(!isPlaying && !isDragging ? 1 : 0);
  }, [isPlaying, isDragging]);

  // ─── Player ───────────────────────────────────────────────────────────────
  const player = useVideoPlayer({ uri: playableUri }, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.05; // 50ms interval for smooth time tracking
  });

  // Check local cache immediately on mount; defer background download until active for 1.2s
  // so quick swipes don't waste 2x bandwidth, and preserve position on hot-swap.
  useEffect(() => {
    let isMounted = true;
    let downloadTimer: ReturnType<typeof setTimeout> | null = null;

    const applyLocalUri = (localUri: string) => {
      if (!isMounted || localUri === playableUri) return;
      const savedTime = player.currentTime || 0;
      const wasPlaying = isPlayingRef.current;
      setPlayableUri(localUri);
      try {
        player.replace({ uri: localUri });
        if (savedTime > 0) player.currentTime = savedTime;
        if (wasPlaying) player.play();
      } catch {}
    };

    getCachedVideoUriOnly(uri).then((cached) => {
      if (!isMounted) return;
      if (cached) {
        if (cached !== playableUri) setPlayableUri(cached);
        return;
      }
      if (isActive) {
        downloadTimer = setTimeout(() => {
          if (!isMounted) return;
          getOrCacheVideoUri(uri, applyLocalUri);
        }, 1200);
      }
    });

    return () => {
      isMounted = false;
      if (downloadTimer) clearTimeout(downloadTimer);
    };
  }, [uri, isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const playSub = player.addListener("playingChange", (e) => {
      setIsPlaying(e.isPlaying);
      isPlayingRef.current = e.isPlaying;
      onPlayingChange?.(e.isPlaying);
      if (e.isPlaying) setShowInitialPlay(false);
      if (!isDraggingRef.current) {
        barOpacity.stopAnimation();
        controlsOpacity.stopAnimation();
        barOpacity.setValue(e.isPlaying ? 0 : 1);
        controlsOpacity.setValue(e.isPlaying ? 0 : 1);
      }

      // When pausing or playing, immediately sync currentTime to current position
      if (!isDraggingRef.current) {
        const cur = player.currentTime;
        const dur = durationRef.current || player.duration || 0;
        if (typeof cur === "number" && !isNaN(cur)) {
          setCurrentTime(cur);
          if (dur > 0) {
            const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
            currentProgressRef.current = pct;
            progressPctAnim.setValue(pct);
          }
        }
      }
    });

    const timeSub = player.addListener("timeUpdate", (e) => {
      if (!isDraggingRef.current) {
        const dur = durationRef.current || player.duration || 0;
        setCurrentTime(e.currentTime);
        onTimeUpdate?.(e.currentTime);
        if (dur > 0) {
          const pct = Math.min(100, Math.max(0, (e.currentTime / dur) * 100));
          currentProgressRef.current = pct;
          progressPctAnim.setValue(pct);
        }
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
      if (pendingSyncRef.current && ((player as any).status === "readyToPlay" || player.duration > 0)) {
        const pending = pendingSyncRef.current;
        pendingSyncRef.current = null;
        try {
          if (pending.time > 0) {
            player.currentTime = pending.time;
            setCurrentTime(pending.time);
            onTimeUpdate?.(pending.time);
            const dur = player.duration || durationRef.current || 0;
            if (dur > 0) {
              const pct = Math.min(100, Math.max(0, (pending.time / dur) * 100));
              currentProgressRef.current = pct;
              progressPctAnim.setValue(pct);
            }
          }
          if (pending.shouldPlay) {
            (player as any).muted = false;
            player.play();
            setIsPlaying(true);
            isPlayingRef.current = true;
            setShowInitialPlay(false);
            onPlayingChange?.(true);
          } else {
            player.pause();
            setIsPlaying(false);
            isPlayingRef.current = false;
            if (pending.time > 0) setShowInitialPlay(false);
            onPlayingChange?.(false);
          }
        } catch {}
      }
      const track = (player as any).videoTrack;
      const size = track?.size;
      if (size?.width && size?.height) {
        const rotation = track?.rotation || 0;
        const aspect = (rotation === 90 || rotation === 270)
          ? size.height / size.width
          : size.width / size.height;
        setVideoAspect(aspect);
      }
      // Detect buffering state
      const status = (player as any).status;
      const playbackState = (player as any).playbackState;
      const buffering = status === "buffering" || playbackState === "buffering";
      if (buffering !== isBufferingRef.current) {
        isBufferingRef.current = buffering;
        onBufferingChange?.(buffering);
      }
    });

    const trackSub = (player as any).addListener?.("videoTrackChange", (e: any) => {
      const track = e?.videoTrack || (player as any).videoTrack;
      const size = track?.size;
      if (size?.width && size?.height) {
        const rotation = track?.rotation || 0;
        const aspect = (rotation === 90 || rotation === 270)
          ? size.height / size.width
          : size.width / size.height;
        setVideoAspect(aspect);
      }
    });

    if (player.duration && durationRef.current === 0) {
      setDuration(player.duration);
      durationRef.current = player.duration;
    }

    const initTrack = (player as any).videoTrack;
    const initSize = initTrack?.size;
    if (initSize?.width && initSize?.height) {
      const rotation = initTrack?.rotation || 0;
      const aspect = (rotation === 90 || rotation === 270)
        ? initSize.height / initSize.width
        : initSize.width / initSize.height;
      setVideoAspect(aspect);
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

  // Continuously track playback time at 60 FPS while playing without React re-renders
  useEffect(() => {
    let animId: number;
    let isRunning = true;

    const syncTick = () => {
      if (isPlayingRef.current && !isDraggingRef.current) {
        const cur = player.currentTime;
        const dur = durationRef.current || player.duration || 0;
        if (typeof cur === "number" && !isNaN(cur) && dur > 0) {
          const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
          currentProgressRef.current = pct;
          progressPctAnim.setValue(pct);
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
  }, [player, progressPctAnim]);

  // Keep durationRef in sync with state
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // Apply external sync (entering or exiting fullscreen) when active
  useEffect(() => {
    if (!isActive || syncVersion === undefined) return;
    if (lastSyncVersionRef.current === syncVersion) return;
    lastSyncVersionRef.current = syncVersion;

    const targetTime = typeof syncTime === "number" && !Number.isNaN(syncTime) ? syncTime : 0;
    const shouldPlay = !!syncIsPlaying;

    if ((player as any).status === "readyToPlay" || player.duration > 0) {
      pendingSyncRef.current = null;
      try {
        player.currentTime = targetTime;
        setCurrentTime(targetTime);
        onTimeUpdate?.(targetTime);
        const dur = player.duration || durationRef.current || 0;
        if (dur > 0) {
          const pct = Math.min(100, Math.max(0, (targetTime / dur) * 100));
          currentProgressRef.current = pct;
          progressPctAnim.setValue(pct);
        }
        if (shouldPlay) {
          (player as any).muted = false;
          player.play();
          setIsPlaying(true);
          isPlayingRef.current = true;
          setShowInitialPlay(false);
          onPlayingChange?.(true);
        } else {
          player.pause();
          setIsPlaying(false);
          isPlayingRef.current = false;
          if (targetTime > 0) setShowInitialPlay(false);
          onPlayingChange?.(false);
        }
      } catch {}
    } else {
      pendingSyncRef.current = { time: targetTime, shouldPlay };
    }
  }, [isActive, syncVersion, syncTime, syncIsPlaying, player, progressPctAnim]);

  // Pause when slide becomes inactive (preserve current frame/second so returning resumes where left off)
  useEffect(() => {
    if (!isActive) {
      try {
        player.pause();
        // Mute as a failsafe while inactive
        (player as any).muted = true;
      } catch {}
      setIsPlaying(false);
      isPlayingRef.current = false;
      isBufferingRef.current = false;
      onPlayingChangeRef.current?.(false);
      onBufferingChangeRef.current?.(false);
      if ((player.currentTime || 0) <= 0.1) {
        setShowInitialPlay(true);
      }
    } else {
      try {
        // Unmute when active again
        (player as any).muted = false;
      } catch {}
    }
  }, [isActive, player]);

  // Pause ONLY on actual unmount (refs ensure inline callbacks never trigger pause mid-playback)
  useEffect(() => () => {
    try { player.pause(); } catch {}
    isPlayingRef.current = false;
    isBufferingRef.current = false;
    onPlayingChangeRef.current?.(false);
    onBufferingChangeRef.current?.(false);
  }, [player]);

  // ─── Toggle play / pause ──────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (isDraggingRef.current) return;   // ignore taps during scrub
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      barOpacity.stopAnimation();
      controlsOpacity.stopAnimation();
      barOpacity.setValue(1);
      controlsOpacity.setValue(1);
      onPlayingChange?.(false);
      onUserPausedChange?.(true);
      player.pause();
      const cur = player.currentTime;
      const dur = durationRef.current || player.duration || 0;
      if (typeof cur === "number" && !isNaN(cur)) {
        setCurrentTime(cur);
        if (dur > 0) currentProgressRef.current = (cur / dur) * 100;
      }
    } else {
      isPlayingRef.current = true;
      setIsPlaying(true);
      setShowInitialPlay(false);
      barOpacity.stopAnimation();
      controlsOpacity.stopAnimation();
      barOpacity.setValue(0);
      controlsOpacity.setValue(0);
      onPlayingChange?.(true);
      onUserPausedChange?.(false);
      player.play();
    }
  }, [player, onPlayingChange, onUserPausedChange, barOpacity, controlsOpacity]);

  // ─── Seek helper ──────────────────────────────────────────────────────────
  const lastSeekTimeRef = useRef(0);
  const lastSeekPctRef  = useRef(-1);

  const seekTo = (pct: number) => {
    const dur = durationRef.current || player.duration || 0;
    if (dur <= 0) return;
    lastSeekPctRef.current = pct;
    const target = (pct / 100) * dur;
    try { player.currentTime = target; } catch {}
    onTimeUpdate?.(target);
  };

  // ─── Drag lifecycle helpers (called from both native + web handlers) ──────
  const beginDrag = (pageX: number) => {
    // Enable ExoPlayer native scrubbing optimizations & mute before pausing
    // so frames update continuously while dragging with zero audio blip.
    try {
      (player as any).muted = true;
      (player as any).scrubbingModeOptions = {
        scrubbingModeEnabled: true,
        increaseCodecOperatingRate: true,
        enableDynamicScheduling: true,
        useDecodeOnlyFlag: true,
        allowSkippingMediaCodecFlush: true,
      };
      (player as any).seekTolerance = { toleranceBefore: 0.25, toleranceAfter: 0.25 };
      player.pause();
    } catch {}

    // Immediately sample current position from player so we start with the exact frame
    const cur = player.currentTime;
    const dur = durationRef.current || player.duration || 0;
    const currentPct = dur > 0 && typeof cur === "number" && !isNaN(cur)
      ? Math.min(100, Math.max(0, (cur / dur) * 100))
      : currentProgressRef.current;

    currentProgressRef.current   = currentPct;
    dragStartPageXRef.current    = pageX;
    dragStartProgressRef.current = currentPct;
    lastSeekPctRef.current       = currentPct;
    lastTooltipSecRef.current    = dur > 0 ? Math.floor((currentPct / 100) * dur) : -1;
    isDraggingRef.current        = true;
    isPlayingRef.current         = false;
    progressPctAnim.setValue(currentPct);
    setIsDragging(true);
    setIsPlaying(false);
    barOpacity.stopAnimation();
    controlsOpacity.stopAnimation();
    barOpacity.setValue(1);
    controlsOpacity.setValue(0);
    setDragProgress(currentPct);  // show current pos, no jump
    onDraggingChange?.(true);
    expandBar(true);
  };

  const updateDrag = (pageX: number) => {
    if (!isDraggingRef.current || barWidthRef.current <= 0) return;
    // Delta from finger-down point, applied to progress at that moment
    const deltaPx  = pageX - dragStartPageXRef.current;
    const deltaPct = (deltaPx / barWidthRef.current) * 100;
    const newPct   = Math.max(0, Math.min(100, dragStartProgressRef.current + deltaPct));
    // Update bar + thumb imperatively with ZERO React re-renders
    progressPctAnim.setValue(newPct);
    // Only re-render tooltip when the displayed second changes
    const dur = durationRef.current || player.duration || 0;
    if (dur > 0) {
      const sec = Math.floor((newPct / 100) * dur);
      if (sec !== lastTooltipSecRef.current) {
        lastTooltipSecRef.current = sec;
        setDragProgress(newPct);
      }
    }
    seekTo(newPct);
  };

  const commitDrag = (pageX: number) => {
    if (!isDraggingRef.current) return;
    const deltaPx  = barWidthRef.current > 0 ? pageX - dragStartPageXRef.current : 0;
    const deltaPct = barWidthRef.current > 0 ? (deltaPx / barWidthRef.current) * 100 : 0;
    const finalPct = Math.max(0, Math.min(100, dragStartProgressRef.current + deltaPct));

    // Disable scrubbing mode and restore exact seek tolerance before final seek + play
    try {
      (player as any).seekTolerance = { toleranceBefore: 0, toleranceAfter: 0 };
      (player as any).scrubbingModeOptions = { scrubbingModeEnabled: false };
    } catch {}

    currentProgressRef.current = finalPct;
    progressPctAnim.setValue(finalPct);
    setDragProgress(finalPct);
    seekTo(finalPct);

    isDraggingRef.current = false;
    isPlayingRef.current  = true;
    setIsDragging(false);
    setIsPlaying(true);
    setShowInitialPlay(false);
    barOpacity.stopAnimation();
    controlsOpacity.stopAnimation();
    barOpacity.setValue(0);
    controlsOpacity.setValue(0);
    // Notify playing BEFORE clearing dragging so parent never sees a false-pause gap
    onPlayingChange?.(true);
    onDraggingChange?.(false);
    onUserPausedChange?.(false);
    expandBar(false);
    try {
      (player as any).muted = false;
      player.play();
    } catch {}
  };

  const pinchHandledRef = useRef(false);
  const onFsTriggerRef  = useRef(onFullscreenTrigger);
  const onFsExitRef     = useRef(onFullscreenExit);
  onFsTriggerRef.current = onFullscreenTrigger;
  onFsExitRef.current    = onFullscreenExit;

  const videoPinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onBegin(() => {
          pinchHandledRef.current = false;
        })
        .onUpdate((e) => {
          if (pinchHandledRef.current) return;
          if (e.scale > 1.15 && onFsTriggerRef.current) {
            pinchHandledRef.current = true;
            onFsTriggerRef.current();
          } else if (e.scale < 0.85 && onFsExitRef.current) {
            pinchHandledRef.current = true;
            onFsExitRef.current();
          }
        }),
    []
  );
  // ─── Native (Android / iOS) Gesture Handler for timeline scrub ───────────
  // Using RNGH Gesture.Pan() runs on the native UI thread and claims the gesture
  // before any parent HorizontalScrollView can intercept and slide the media.
  const beginDragRef  = useRef(beginDrag);
  const updateDragRef = useRef(updateDrag);
  const commitDragRef = useRef(commitDrag);
  beginDragRef.current  = beginDrag;
  updateDragRef.current = updateDrag;
  commitDragRef.current = commitDrag;

  const scrubGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .shouldCancelWhenOutside(false)
        .onBegin((e) => {
          beginDragRef.current(e.absoluteX);
        })
        .onUpdate((e) => {
          updateDragRef.current(e.absoluteX);
        })
        .onFinalize((e) => {
          commitDragRef.current(e.absoluteX);
        }),
    []
  );

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
          el.style.objectFit = "contain";
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
  const playerBody = (
    <View
      ref={containerRef}
      style={[styles.container, style]}
    >
      {/* ── Video Card fills container; VideoView contentFit="contain" handles letterboxing ── */}
      <View style={styles.videoCard}>
        {/* ── Video ── */}
        <Pressable onPress={togglePlay} style={styles.videoFlex}>
          <VideoView
            ref={videoViewRef}
            player={player}
            style={styles.videoView}
            nativeControls={false}
            contentFit="contain"
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

        {/* ── 3-dot menu (top-right, below Download button in fullscreen, synced instantaneously with bar) ── */}
        {!showInitialPlay && (
          <RNAnimated.View
            style={[
              styles.menuContainer,
              onFullscreenExit ? { top: 64 } : null,
              { opacity: controlsOpacity },
            ]}
            pointerEvents={!isPlaying && !isDragging ? "auto" : "none"}
          >
            <DropdownMenu
              trigger={(open) => (
                <Pressable onPress={open} style={styles.menuButton}>
                  <MoreVertical size={20} color="#FFFFFF" />
                </Pressable>
              )}
              items={menuItems}
              align="right"
            />
          </RNAnimated.View>
        )}

        {/* ── Time tooltip (only while actively dragging) ── */}
        {isDragging && (
          <View style={styles.timeTooltip} pointerEvents="none">
            <Text style={styles.timeTooltipText}>
              {formatTime(displayTime)} / {formatTime(currentDur)}
            </Text>
          </View>
        )}

        {/* ── Fullscreen / Minimizer button above the bar at the right edge (synced instantaneously with bar) ── */}
        {(onFullscreenTrigger || onFullscreenExit) && (() => {
          const iconColor = theme === "dark" ? "#FFFFFF" : "#000000";
          return (
            <RNAnimated.View
              style={[styles.fullscreenToggleBtn, { opacity: controlsOpacity }]}
              pointerEvents={!isPlaying && !isDragging ? "auto" : "none"}
            >
              <Pressable
                onPress={onFullscreenTrigger ?? onFullscreenExit}
                hitSlop={{ top: 10, right: 10, bottom: 0, left: 10 }}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  {onFullscreenExit ? (
                    <>
                      <Path d="M4 9 H9 V4" stroke={iconColor} strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" fill="none" />
                      <Path d="M20 9 H15 V4" stroke={iconColor} strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" fill="none" />
                      <Path d="M4 15 H9 V20" stroke={iconColor} strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" fill="none" />
                      <Path d="M20 15 H15 V20" stroke={iconColor} strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" fill="none" />
                    </>
                  ) : (
                    <>
                      <Path d="M4 9 V4 H9" stroke={iconColor} strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" fill="none" />
                      <Path d="M15 4 H20 V9" stroke={iconColor} strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" fill="none" />
                      <Path d="M4 15 V20 H9" stroke={iconColor} strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" fill="none" />
                      <Path d="M15 20 H20 V15" stroke={iconColor} strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" fill="none" />
                    </>
                  )}
                </Svg>
              </Pressable>
            </RNAnimated.View>
          );
        })()}

        {/* ── Progress bar (hidden while playing, visible when paused or dragging) ── */}
        {(() => {
          const barContent = (
            <View
              ref={progressBarRef}
              style={styles.progressHitbox}
              onLayout={(e) => { barWidthRef.current = e.nativeEvent.layout.width; }}
            >
              {/* Animated track: height expands 3px -> 7px on drag, fades in when paused/dragging */}
              <RNAnimated.View style={[styles.track, { height: barHeight, opacity: barOpacity }]}>
                {/* Elapsed fill — driven by progressPctAnim for 0-rerender 60-120fps scrubbing */}
                <RNAnimated.View
                  style={[
                    styles.elapsed,
                    {
                      width: progressPctAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ["0%", "100%"],
                        extrapolate: "clamp",
                      }),
                    },
                  ]}
                >
                  {/* Thumb dot at right edge of elapsed fill, scales up while dragging */}
                  <RNAnimated.View
                    style={[
                      styles.thumb,
                      { transform: [{ scale: thumbScale }] },
                    ]}
                  />
                </RNAnimated.View>
              </RNAnimated.View>
            </View>
          );

          return Platform.OS !== "web" ? (
            <GestureDetector gesture={scrubGesture}>{barContent}</GestureDetector>
          ) : (
            barContent
          );
        })()}
      </View>
    </View>
  );

  return Platform.OS !== "web" ? (
    <GestureDetector gesture={videoPinchGesture}>{playerBody}</GestureDetector>
  ) : (
    playerBody
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
    flex: 1,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  videoFlex: {
    flex: 1,
    width: "100%",
  },

  videoView: {
    flex: 1,
    width: "100%",
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
    backgroundColor: "rgba(0, 0, 0, 0.52)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
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
  fullscreenToggleBtn: {
    position: "absolute",
    bottom: 26,
    right: 6,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 95,
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

  // Tall invisible hitbox — easy for a finger to land on, without overlapping fullscreenToggleBtn (bottom: 26+)
  progressHitbox: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
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
