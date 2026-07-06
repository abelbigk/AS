import { useRef, useState, useEffect } from "react";
import { MoreVertical, Play, PictureInPicture2, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface TikTokVideoPlayerProps {
  src: string;
  poster?: string; // Video thumbnail/cover image
  onLoadedData?: () => void;
  className?: string;
  isActive?: boolean;
  showInitialPlayButton?: boolean;
  onInitialPlay?: () => void;
  onVideoPlay?: () => void;
  onVideoPause?: () => void;
}

export default function TikTokVideoPlayer({
  src,
  poster,
  onLoadedData,
  className,
  isActive = true,
  showInitialPlayButton = false,
  onInitialPlay,
  onVideoPlay,
  onVideoPause,
}: TikTokVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragStartProgress = useRef<number>(0);
  const pinchStartDistance = useRef<number | null>(null);

  // Native touch events for pinch zoom (React's synthetic events are passive)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartDistance.current = distance;
      }
    };

    const handleNativeTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistance.current) {
        e.preventDefault();
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );

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

    const handleNativeTouchEnd = () => {
      pinchStartDistance.current = null;
    };

    // Always add pinch listeners for both entering and exiting fullscreen
    container.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    container.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    container.addEventListener('touchend', handleNativeTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleNativeTouchStart);
      container.removeEventListener('touchmove', handleNativeTouchMove);
      container.removeEventListener('touchend', handleNativeTouchEnd);
    };
  }, [isFullscreen]);

  // Pause video when slide changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isActive && isPlaying) {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive, isPlaying]);

  const playCallbackRef = useRef(onVideoPlay);
  const pauseCallbackRef = useRef(onVideoPause);
  useEffect(() => {
    playCallbackRef.current = onVideoPlay;
    pauseCallbackRef.current = onVideoPause;
  }, [onVideoPlay, onVideoPause]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!isDraggingProgress && video.duration) {
        const newProgress = (video.currentTime / video.duration) * 100;
        setProgress(newProgress);
        setCurrentTime(video.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      // Loop video when ended
      video.currentTime = 0;
      video.play();
      setIsPlaying(true);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      playCallbackRef.current?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      pauseCallbackRef.current?.();
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [isDraggingProgress]);

  // Keyboard volume control
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video || !isActive) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [isActive]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video || isDraggingProgress) return;

    if (showInitialPlayButton && onInitialPlay) {
      onInitialPlay();
    }

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Progress bar seeking
  const handleProgressTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    setWasPlayingBeforeDrag(isPlaying);
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    }
    
    setIsDraggingProgress(true);
    dragStartX.current = e.touches[0].clientX;
    dragStartProgress.current = progress;
  };

  const handleProgressTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (isDraggingProgress && dragStartX.current !== null) {
      const progressBar = progressRef.current;
      const video = videoRef.current;
      if (!progressBar || !video || !video.duration) return;

      const rect = progressBar.getBoundingClientRect();
      const dragDelta = e.touches[0].clientX - dragStartX.current;
      const percentDelta = (dragDelta / rect.width) * 100;
      const newPercent = Math.max(0, Math.min(100, dragStartProgress.current + percentDelta));
      const newTime = (newPercent / 100) * video.duration;
      
      // Update state first for instant UI feedback
      setProgress(newPercent);
      setCurrentTime(newTime);
      
      // Seek video without waiting
      requestAnimationFrame(() => {
        video.currentTime = newTime;
      });
    }
  };

  const handleProgressTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingProgress(false);
    dragStartX.current = null;
    
    // Always play on release and dismiss play button
    const video = videoRef.current;
    if (video) {
      video.play();
      setIsPlaying(true);
      
      // Dismiss the initial play button when starting playback via timeline
      if (showInitialPlayButton && onInitialPlay) {
        onInitialPlay();
      }
    }
  };

  const updateProgress = (clientX: number) => {
    const progressBar = progressRef.current;
    const video = videoRef.current;
    if (!progressBar || !video || !video.duration) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const newTime = (percent / 100) * video.duration;
    
    setProgress(percent);
    setCurrentTime(newTime);
    video.currentTime = newTime;
  };

  // Pinch to zoom/fullscreen - now handled by native events above

  const enterFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;
    
    try {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.log("Fullscreen not available or denied");
    }
  };

  const exitFullscreen = async () => {
    if (!document.fullscreenElement) return;
    
    try {
      await document.exitFullscreen();
      setIsFullscreen(false);
    } catch (error) {
      console.log("Exit fullscreen failed");
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Block all touch events on body when in fullscreen to prevent background interference
  useEffect(() => {
    if (!isFullscreen) return;

    const blockEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      // Only allow events on the video container
      if (containerRef.current && !containerRef.current.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // Block all pointer events at the highest level
    const events = ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mousemove', 'mouseup', 'pointerdown', 'pointermove', 'pointerup'];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, blockEvent, { passive: false, capture: true });
    });

    return () => {
      events.forEach(eventType => {
        document.removeEventListener(eventType, blockEvent, { capture: true });
      });
    };
  }, [isFullscreen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      toast.error("Picture-in-Picture not supported");
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full bg-black", className)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="absolute inset-0 w-full h-full object-contain"
        playsInline
        preload="metadata"
        onClick={togglePlayPause}
        onLoadedData={onLoadedData}
      />

      {/* Play button overlay when paused - REMOVED, now only shows timeline */}

      {/* Initial play button only when first sliding to video */}
      {showInitialPlayButton && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-10 h-10 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* 3-dot menu when paused */}
      {!isPlaying && !isDraggingProgress && (
        <div className="absolute top-4 right-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-all pointer-events-auto">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[var(--popover)] border-[var(--glass-border)] text-[var(--popover-foreground)] z-[10002]">
              <DropdownMenuItem onClick={handlePictureInPicture} className="gap-2">
                <PictureInPicture2 className="w-4 h-4" />
                Picture in Picture
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const video = videoRef.current;
                if (video) video.playbackRate = 0.5;
              }} className="gap-2">
                <Gauge className="w-4 h-4" />
                Speed: 0.5x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const video = videoRef.current;
                if (video) video.playbackRate = 1;
              }} className="gap-2">
                <Gauge className="w-4 h-4" />
                Speed: 1x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const video = videoRef.current;
                if (video) video.playbackRate = 1.5;
              }} className="gap-2">
                <Gauge className="w-4 h-4" />
                Speed: 1.5x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const video = videoRef.current;
                if (video) video.playbackRate = 2;
              }} className="gap-2">
                <Gauge className="w-4 h-4" />
                Speed: 2x
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Time display when dragging progress */}
      {isDraggingProgress && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      )}

      {/* Thin progress bar at bottom */}
      <div
        ref={progressRef}
        className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 cursor-pointer group z-40"
        onTouchStart={handleProgressTouchStart}
        onTouchMove={handleProgressTouchMove}
        onTouchEnd={handleProgressTouchEnd}
      >
        <div
          className="relative h-full bg-white transition-none"
          style={{ width: `${progress}%` }}
        >
          {/* Circle indicator at the edge */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
        </div>
      </div>
    </div>
  );
}
