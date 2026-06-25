import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Music } from "lucide-react";
import { Sound } from "@/types";
import { cn } from "@/lib/utils";

interface SoundControlProps {
  sound: Sound | null | undefined;
  isParentVideoPlaying: boolean;
  onSoundClick?: () => void; // when provided, the pill becomes clickable to open picker
}

export default function SoundControl({ sound, isParentVideoPlaying, onSoundClick }: SoundControlProps) {
  const [isMuted, setIsMuted] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isPickerOpenRef = useRef(false);

  // Initialize and clean up audio
  useEffect(() => {
    if (!sound?.url) {
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(sound.url);
    audio.loop = true;
    audio.muted = isMuted;
    audioRef.current = audio;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    // Play if not muted, video is not playing, and picker is not open
    if (!isMuted && !isParentVideoPlaying && !isPickerOpenRef.current) {
      audio.play().catch((err) => {
        console.warn("[SoundControl] Auto-play blocked by browser. User interaction required.", err);
      });
    }

    return () => {
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.src = "";
      audioRef.current = null;
    };
  }, [sound?.url]);

  // Pause audio when the sound picker opens; resume when it closes
  useEffect(() => {
    const handlePickerOpen = () => {
      isPickerOpenRef.current = true;
      audioRef.current?.pause();
    };
    const handlePickerClose = () => {
      isPickerOpenRef.current = false;
      const audio = audioRef.current;
      if (!audio) return;
      // Read the live isMuted value via ref to avoid stale closure
      const muted = audio.muted;
      if (!muted && !isParentVideoPlaying) {
        audio.play().catch(() => {/* autoplay may be blocked */});
      }
    };
    window.addEventListener("sound-picker-open", handlePickerOpen);
    window.addEventListener("sound-picker-close", handlePickerClose);
    return () => {
      window.removeEventListener("sound-picker-open", handlePickerOpen);
      window.removeEventListener("sound-picker-close", handlePickerClose);
    };
  }, [isParentVideoPlaying]);

  // Handle play/pause state when mute or parent video playing status changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = isMuted;

    if (isMuted || isParentVideoPlaying || isPickerOpenRef.current) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.warn("[SoundControl] Play failed on state change:", err);
      });
    }
  }, [isMuted, isParentVideoPlaying]);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  if (!sound) return null;

  // Equalizer visualizer animation when sound is active and playing
  const showAnimation = isPlaying && !isMuted && !isParentVideoPlaying;

  return (
    <div
      onClick={onSoundClick}
      role={onSoundClick ? "button" : undefined}
      tabIndex={onSoundClick ? 0 : undefined}
      onKeyDown={onSoundClick ? (e) => e.key === "Enter" && onSoundClick() : undefined}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--foreground)]/10 text-[var(--foreground)]/60 border border-[var(--glass-border)]/20 shadow-sm backdrop-blur-md",
        onSoundClick && "cursor-pointer hover:bg-[var(--foreground)]/15 active:scale-95 transition-all"
      )}
    >
      {/* Equalizer animation / static icon */}
      <div className="flex items-end gap-[2px] h-3 w-3.5 mb-[1px]">
        {showAnimation ? (
          <>
            <span className="w-[2px] h-full bg-[var(--foreground)]/80 rounded-full animate-sound-wave-1" />
            <span className="w-[2px] h-full bg-[var(--foreground)]/80 rounded-full animate-sound-wave-2" style={{ animationDelay: "0.15s" }} />
            <span className="w-[2px] h-full bg-[var(--foreground)]/80 rounded-full animate-sound-wave-3" style={{ animationDelay: "0.3s" }} />
            <span className="w-[2px] h-full bg-[var(--foreground)]/80 rounded-full animate-sound-wave-4" style={{ animationDelay: "0.05s" }} />
          </>
        ) : (
          <>
            <span className="w-[2px] h-[35%] bg-[var(--foreground)]/40 rounded-full" />
            <span className="w-[2px] h-[35%] bg-[var(--foreground)]/40 rounded-full" />
            <span className="w-[2px] h-[35%] bg-[var(--foreground)]/40 rounded-full" />
            <span className="w-[2px] h-[35%] bg-[var(--foreground)]/40 rounded-full" />
          </>
        )}
      </div>

      {/* Sound title & info */}
      <div className="w-[100px] sm:w-[150px] overflow-hidden text-[11px] font-medium text-[var(--foreground)]/80 flex items-center gap-1 select-none">
        <Music className="w-2.5 h-2.5 flex-shrink-0 text-[var(--foreground)]/50" />
        <div className="flex-1 overflow-hidden relative h-3.5 flex items-center">
          <span className="animate-marquee absolute whitespace-nowrap" title={`${sound.title} - ${sound.name}`}>
            {sound.title}{"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}{sound.title}{"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
          </span>
        </div>
      </div>

      {/* Mute button — stop propagation so it doesn't also trigger onSoundClick */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
        className={cn(
          "p-0.5 rounded-full hover:bg-[var(--foreground)]/10 active:scale-90 transition-all cursor-pointer",
          isMuted ? "text-red-500/80 hover:text-red-500" : "text-[var(--foreground)]/70 hover:text-[var(--foreground)]"
        )}
        title={isMuted ? "Unmute sound" : "Mute sound"}
      >
        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
