import { useState, useRef, useEffect } from "react";
import { Play, Pause, Search, Music, UploadCloud, Loader2, X, Volume2, CheckCircle2, Circle } from "lucide-react";
import { Sound } from "@/types";
import { trpc } from "@/lib/trpc";
import { uploadFile } from "@/lib/upload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SoundPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sound: Sound | null) => void;
  currentSoundId?: number | null;
  contentId?: number | null;
}

// ─── Audio Preview with Timeline ─────────────────────────────────────────────

interface AudioPreviewRowProps {
  sound: Sound;
  isSelected: boolean;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onEnded: () => void;
}

function AudioPreviewRow({ sound, isSelected, isPlaying, onPlayToggle, onEnded }: AudioPreviewRowProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0); // 0–1
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const tick = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    if (!audio.paused) {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const ensureAudio = () => {
    if (!audioRef.current) {
      const a = new Audio(sound.url);
      a.addEventListener("loadedmetadata", () => setDuration(a.duration));
      a.addEventListener("ended", () => {
        onEnded();
        setProgress(0);
        setCurrentTime(0);
      });
      audioRef.current = a;
    }
    return audioRef.current;
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayToggle();
  };

  useEffect(() => {
    if (isPlaying) {
      const audio = ensureAudio();
      audio.play().catch(() => toast.error("Could not play preview"));
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  }, [isPlaying]);

  const handleScrub = (clientX: number) => {
    const audio = ensureAudio();
    if (!audio.duration || !isPlaying) return;
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
    setCurrentTime(audio.currentTime);
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlaying) return;
    setIsDragging(true);
    const audio = ensureAudio();
    audio.pause();
    handleScrub(e.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleScrub(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      const audio = audioRef.current;
      if (audio && isPlaying) {
        audio.play().catch(() => {});
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isPlaying]);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPlaying) return;
    setIsDragging(true);
    const audio = ensureAudio();
    audio.pause();
    handleScrub(e.touches[0].clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleScrub(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      const audio = audioRef.current;
      if (audio && isPlaying) {
        audio.play().catch(() => {});
      }
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, isPlaying]);

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-2 w-full min-w-0">
      {/* Row: play button + title info */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer",
            isPlaying
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
              : "bg-white/10 hover:bg-white/20 text-white"
          )}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <div className="min-w-0 flex-1 overflow-hidden">
          {isPlaying ? (
            <div className="h-5 overflow-hidden relative w-full flex items-center">
              <span className="animate-marquee absolute whitespace-nowrap text-sm font-semibold text-white leading-tight">
                {sound.title}{"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}{sound.title}{"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
              </span>
            </div>
          ) : (
            <p className="text-sm font-semibold truncate text-white leading-tight">
              {sound.title}
            </p>
          )}
          <p className="text-[11px] text-white/40 truncate mt-0.5">{sound.name || "--"}</p>
        </div>

        {isSelected && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 shrink-0">
            Active
          </span>
        )}
      </div>

      {/* Timeline scrubber */}
      <div className="flex items-center gap-2 pl-[52px]">
        <span className="text-[10px] text-white/30 tabular-nums w-7 shrink-0">{fmt(currentTime)}</span>
        <div
          ref={timelineRef}
          className={cn(
            "flex-1 h-1.5 bg-white/10 rounded-full relative group transition-all",
            isPlaying ? "cursor-pointer" : "cursor-not-allowed opacity-50"
          )}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onClick={(e) => e.stopPropagation()} // prevent row selection when scrubbing
        >
          <div
            className="h-full bg-blue-500 rounded-full transition-none relative"
            style={{ width: `${progress * 100}%` }}
          >
            {/* Thumb dot */}
            {isPlaying && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity -mr-1.5" />
            )}
          </div>
        </div>
        <span className="text-[10px] text-white/30 tabular-nums w-7 shrink-0 text-right">{fmt(duration)}</span>
      </div>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export default function SoundPickerDialog({
  isOpen,
  onClose,
  onSelect,
  currentSoundId,
  contentId,
}: SoundPickerDialogProps) {
  const [activeTab, setActiveTab] = useState<"existing" | "upload">("existing");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload state
  const [soundFile, setSoundFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Warning state
  const [showWarning, setShowWarning] = useState(false);
  const [pendingSound, setPendingSound] = useState<Sound | null>(null);

  // Preview state (allows only one preview playing at a time)
  const [playingSoundId, setPlayingSoundId] = useState<number | null>(null);

  const handlePlayToggle = (soundId: number) => {
    setPlayingSoundId((prev) => (prev === soundId ? null : soundId));
  };

  // Pause any playing system-wide audio (SoundControl) when dialog opens
  useEffect(() => {
    if (!isOpen) {
      setSoundFile(null);
      setTitle("");
      setCreatorName("");
      setIsUploading(false);
      setUploadProgress(0);
      setShowWarning(false);
      setPendingSound(null);
      setPlayingSoundId(null);
      return;
    }

    const event = new CustomEvent("sound-picker-open");
    window.dispatchEvent(event);
  }, [isOpen]);

  // Queries/Mutations
  const utils = trpc.useUtils();
  const { data: sounds = [], refetch } = trpc.sounds.list.useQuery(undefined, {
    enabled: isOpen,
  });
  const addSoundMutation = trpc.sounds.add.useMutation();

  const handleSelectRequest = async (newSound: Sound | null) => {
    const isDeselecting = currentSoundId && currentSoundId === newSound?.id;
    const targetSound = isDeselecting ? null : newSound;

    // If no sound was selected previously, or we are selecting/deselecting the same resulting state, no warning needed
    if (!currentSoundId || currentSoundId === targetSound?.id) {
      onSelect(targetSound);
      return;
    }

    try {
      const usage = await utils.sounds.checkUsage.fetch({
        soundId: currentSoundId,
        excludeContentId: contentId || undefined,
      });

      if (!usage.inUseByOthers) {
        // Sound is only used here — warn user that removing/replacing will delete it permanently
        setPendingSound(targetSound);
        setShowWarning(true);
      } else {
        onSelect(targetSound);
      }
    } catch (err) {
      // Fallback
      onSelect(targetSound);
    }
  };

  const handleUploadAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soundFile) { toast.error("Please choose an audio file"); return; }
    if (!title.trim()) { toast.error("Please enter a title"); return; }

    setIsUploading(true);
    setUploadProgress(10);
    const finalCreatorName = creatorName.trim() || "--";

    try {
      const result = await uploadFile(
        soundFile,
        (loaded, total) => setUploadProgress(Math.round((loaded / total) * 90) + 10),
        undefined,
        "sounds"
      );
      if (!result) throw new Error("File upload failed");

      const dbSound = await addSoundMutation.mutateAsync({
        title: title.trim(),
        name: finalCreatorName,
        url: result.url,
        key: result.key,
      });

      toast.success("Sound uploaded successfully");
      await refetch();

      onSelect({
        id: dbSound.id,
        title: title.trim(),
        name: finalCreatorName,
        url: result.url,
        key: result.key,
        uploadedByUserId: 0,
        createdAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload sound");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredSounds = sounds.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

        {/* Dialog */}
        <div className="relative w-full max-w-md max-h-[88vh] bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-white">Audio Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex p-2 bg-white/5 border-b border-white/5 gap-1">
            <button
              onClick={() => setActiveTab("existing")}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                activeTab === "existing" ? "bg-white/10 text-white shadow-sm" : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              Select Sound
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                activeTab === "upload" ? "bg-white/10 text-white shadow-sm" : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              Upload New
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px]">
            {activeTab === "existing" ? (
              <>
                {/* ① Remove current sound — above search */}
                {currentSoundId && (
                  <button
                    type="button"
                    onClick={() => handleSelectRequest(null)}
                    className="w-full py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Remove Current Sound
                  </button>
                )}

                {/* ② Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search sounds..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>

                {/* ③ Sound list */}
                <div className="space-y-2">
                  {filteredSounds.length > 0 ? (
                    filteredSounds.map((sound) => {
                      const isSelected = currentSoundId === sound.id;
                      return (
                        <div
                          key={sound.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all group",
                            isSelected
                              ? "bg-blue-500/10 border-blue-500/40"
                              : "bg-white/3 border-white/5 hover:bg-white/5"
                          )}
                        >
                          {/* Audio preview with timeline */}
                          <div className="flex-1 min-w-0">
                            <AudioPreviewRow
                              sound={sound}
                              isSelected={isSelected}
                              isPlaying={playingSoundId === sound.id}
                              onPlayToggle={() => handlePlayToggle(sound.id)}
                              onEnded={() => setPlayingSoundId(null)}
                            />
                          </div>

                          {/* Checkbox Selector (nice like delete button) */}
                          <button
                            type="button"
                            onClick={() => handleSelectRequest(sound)}
                            className="shrink-0 flex items-center justify-center p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
                            title={isSelected ? "Deselect Sound" : "Select Sound"}
                          >
                            {isSelected ? (
                              <CheckCircle2 className="w-5 h-5 text-blue-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-white/20 hover:text-white/40 transition-colors" />
                            )}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-white/30">
                      <Music className="w-8 h-8 opacity-40" />
                      <p className="text-sm">No sounds found</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <form onSubmit={handleUploadAndSave} className="space-y-4">
                {/* File dropzone */}
                <div>
                  <label className="block text-white/50 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Audio File
                  </label>
                  {soundFile ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-white">
                      <div className="flex items-center gap-2 min-w-0">
                        <Music className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-xs truncate font-medium">{soundFile.name}</span>
                      </div>
                      <button type="button" onClick={() => setSoundFile(null)} className="text-white/40 hover:text-white p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all cursor-pointer bg-white/3 hover:bg-white/5">
                      <UploadCloud className="w-8 h-8 text-white/40 mb-2" />
                      <span className="text-xs font-semibold text-white/80">Choose Audio File</span>
                      <span className="text-[10px] text-white/40 mt-1">MP3, WAV, M4A, etc.</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSoundFile(file);
                            const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
                            setTitle(baseName);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="block text-white/50 text-[10px] font-bold uppercase tracking-wider">
                    Sound Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chill Beats, Rain Effect"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isUploading}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors disabled:opacity-50"
                    required
                  />
                </div>

                {/* Creator/Artist (Optional) */}
                <div className="space-y-1.5">
                  <label className="block text-white/50 text-[10px] font-bold uppercase tracking-wider">
                    Creator / Artist Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lofi Girl, Unknown Artist (leave blank for '--')"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    disabled={isUploading}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors disabled:opacity-50"
                  />
                </div>

                {/* Progress / Submit */}
                {isUploading ? (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                        Uploading audio...
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={!soundFile || !title.trim()}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer mt-4 shadow-lg shadow-blue-500/10"
                  >
                    Upload & Select
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Permanent deletion warning dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="bg-zinc-900 border border-white/10 text-white rounded-2xl max-w-[320px] z-[10020]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Permanent Deletion Warning</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60 text-sm">
              This sound is not used by any other content. If you remove or replace it, this sound will be deleted permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 mt-4">
            <AlertDialogCancel
              onClick={() => {
                setShowWarning(false);
                setPendingSound(null);
              }}
              className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 text-xs font-semibold cursor-pointer m-0"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowWarning(false);
                onSelect(pendingSound);
                setPendingSound(null);
              }}
              className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer m-0 border border-red-500/20"
            >
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
