// ContentDetailDialog - Media viewer with video poster support
// Last updated: 2026-06-27
import { trpc } from "@/lib/trpc";
import {
  Loader2, Calendar, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, ArrowLeft,
  MoreVertical, Pencil, Trash2, FolderMinus, FolderPlus, Images, Download, Music,
} from "lucide-react";
import type { ContentItem, Sound } from "@/types";
import SoundControl from "./SoundControl";
import SoundPickerDialog from "./SoundPickerDialog";
import { format } from "date-fns";
import CroppedImage from "./CroppedImage";
import EditContentDialog from "./EditContentDialog";
import TikTokVideoPlayer from "./TikTokVideoPlayer";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContentDetailDialogProps {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoveFromCategory?: () => void;
  onRemoveFromSubcategory?: () => void;
  onCategorize?: () => void;
}

export default function ContentDetailDialog({
  item, open, onOpenChange,
  onRemoveFromCategory, onRemoveFromSubcategory, onCategorize,
}: ContentDetailDialogProps) {
  // Re-fetch content item so edits are reflected immediately
  const { data: freshItem } = trpc.content.getById.useQuery(
    { itemId: item?.id || 0 },
    { enabled: !!item && open, staleTime: 0, refetchOnMount: "always" }
  );
  const displayItem = freshItem ?? item;

  const { data: media, isLoading: mediaLoading, refetch: refetchMedia } = trpc.media.listByContent.useQuery(
    { contentItemId: item?.id || 0 },
    { enabled: !!item && open, staleTime: 0, refetchOnMount: "always" }
  );

  const [editOpen, setEditOpen] = useState(false);
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [activeSound, setActiveSound] = useState<Sound | null | undefined>(undefined);

  useEffect(() => {
    if (displayItem) {
      setActiveSound(displayItem.sound);
    }
  }, [displayItem?.id, displayItem?.sound?.id]);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<"category" | "subcategory" | null>(null);
  const hasDialogRef = useRef(false);
  const triggerDialogAction = (action: () => void) => {
    hasDialogRef.current = true;
    action();
  };
  const utils = trpc.useUtils();

  // Update content mutation (used for quick sound assignment from view mode)
  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => {
      utils.content.getById.invalidate({ itemId: item?.id });
      utils.content.listByStatus.invalidate();
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
    },
    onError: (e) => {
      toast.error(e.message || "Failed to update sound");
      setActiveSound(displayItem?.sound);
    },
  });

  const handleSoundSelect = (sound: Sound | null) => {
    if (!displayItem) return;
    setActiveSound(sound);
    toast.success(sound ? `Sound set: ${sound.title}` : "Sound removed");

    updateContent.mutate({
      itemId: displayItem.id,
      soundId: sound ? sound.id : null,
      // pass through existing values so they aren't wiped
      heading: displayItem.heading,
      description: displayItem.description ?? undefined,
      posterImageUrl: displayItem.posterImageUrl ?? undefined,
      posterImageKey: displayItem.posterImageKey ?? undefined,
      posterCropData: displayItem.posterCropData ?? undefined,
      categoryIds: displayItem.categoryIds ?? [],
      subcategoryIds: displayItem.subcategoryIds ?? [],
    });
  };

  // Stable ref so popstate handler always has fresh state without re-running the effect
  const popStateHandlerRef = useRef<() => void>(() => {});
  popStateHandlerRef.current = () => {
    if (deleteConfirmOpen) {
      setDeleteConfirmOpen(false);
    } else if (pendingRemove) {
      setPendingRemove(null);
    } else if (editOpen) {
      setEditOpen(false);
    } else {
      onOpenChange(false);
    }
  };

  // Handle browser back button — push history ONCE when dialog opens, not on every state change
  useEffect(() => {
    if (!open) return;

    const handlePopState = () => popStateHandlerRef.current();

    window.history.pushState({ modalOpen: true }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If the dialog was closed by something other than the back button,
      // pop the dummy history entry we added.
      if (window.history.state?.modalOpen) {
        window.history.back();
      }
    };
  }, [open]);



  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      utils.content.listByStatus.invalidate();
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      utils.content.getById.invalidate({ itemId: item?.id });
    },
  });

  const deleteItem = trpc.content.delete.useMutation({
    onSuccess: () => {
      utils.content.listByStatus.invalidate();
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      toast.success("Deleted");
      onOpenChange(false);
    },
  });

  // When edit dialog closes, refetch both item and media
  const handleEditClose = (open: boolean) => {
    setEditOpen(open);
    if (!open) {
      utils.content.getById.invalidate({ itemId: item?.id });
      refetchMedia();
    }
  };

  // Handle manual close (clicking Back button)
  const handleClose = () => {
    // Pop the history entry we pushed
    if (open) {
      window.history.back();
    }
  };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!displayItem || !open) return null;

  const isQueued = displayItem.status === "queued";
  const isDone = displayItem.status === "done";

  return createPortal(
    <>
      {/* ── Full-screen viewer ── */}
      <div className="fixed inset-0 z-[9999] bg-[var(--background)] flex flex-col">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center px-4 py-3 bg-[var(--background)]/80 backdrop-blur-sm border-b border-[var(--glass-border)]">
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex-1 flex items-center justify-center gap-2">
            {isQueued && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 dark:text-blue-300 text-[10px] font-medium border border-blue-500/30">
                <Clock className="w-2.5 h-2.5" /> Queued
              </span>
            )}
            {isDone && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-300 text-[10px] font-medium border border-green-500/30">
                <CheckCircle2 className="w-2.5 h-2.5" /> Done
              </span>
            )}
          </div>

          {/* 3-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--foreground)]/8 text-[var(--foreground)]/60 hover:bg-[var(--foreground)]/15 hover:text-[var(--foreground)] transition-all">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-[10001] bg-[var(--popover)] border-[var(--glass-border)] text-[var(--popover-foreground)]"
              onCloseAutoFocus={(e) => {
                if (hasDialogRef.current) {
                  e.preventDefault();
                  hasDialogRef.current = false;
                }
              }}
            >
              <DropdownMenuItem
                onClick={() => updateStatus.mutate({ itemId: displayItem.id, status: isQueued ? "default" : "queued" })}
                className="gap-2"
              >
                <Clock className="w-3.5 h-3.5" /> {isQueued ? "Unqueue" : "Queue"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateStatus.mutate({ itemId: displayItem.id, status: isDone ? "default" : "done" })}
                className="gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> {isDone ? "Undone" : "Done"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => triggerDialogAction(() => setEditOpen(true))} className="gap-2">
                <Pencil className="w-3.5 h-3.5" /> Edit Details
              </DropdownMenuItem>
              {onRemoveFromCategory && (
                <DropdownMenuItem onClick={() => triggerDialogAction(() => setPendingRemove("category"))} className="gap-2">
                  <FolderMinus className="w-3.5 h-3.5" /> Remove from Category
                </DropdownMenuItem>
              )}
              {onRemoveFromSubcategory && (
                <DropdownMenuItem onClick={() => triggerDialogAction(() => setPendingRemove("subcategory"))} className="gap-2">
                  <FolderMinus className="w-3.5 h-3.5" /> Remove from Subcategory
                </DropdownMenuItem>
              )}
              {onCategorize && (
                <DropdownMenuItem onClick={() => triggerDialogAction(() => { onCategorize(); onOpenChange(false); })} className="gap-2">
                  <FolderPlus className="w-3.5 h-3.5" /> Categorize content
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => triggerDialogAction(() => setDeleteConfirmOpen(true))}
                className="gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto pt-14">
          {/* ① Title */}
          <div className="px-5 pt-5 pb-2">
            <h1 className="text-2xl font-bold font-playfair text-[var(--foreground)] leading-tight">
              {displayItem.heading}
            </h1>
          </div>

          {/* ② Date + description */}
          <div className="px-5 pb-5 space-y-2">
            {displayItem.createdAt && (
              <p className="flex items-center gap-1.5 text-[var(--foreground)]/40 text-xs">
                <Calendar className="w-3 h-3" />
                {format(new Date(displayItem.createdAt), "PPP")}
              </p>
            )}
            {displayItem.description && (
              <p className="text-[var(--foreground)]/70 leading-relaxed whitespace-pre-wrap text-sm">
                {displayItem.description}
              </p>
            )}
          </div>

          {/* ③ Cover image */}
          {displayItem.posterImageUrl && (
            <div className="px-5 pb-4">
              <div className="w-full bg-[var(--foreground)]/5 rounded-2xl overflow-hidden">
                <CroppedImage
                  src={displayItem.posterImageUrl}
                  cropData={displayItem.posterCropData}
                  naturalRatio={true}
                  className="w-full block"
                  alt={displayItem.heading}
                />
              </div>
            </div>
          )}

          {/* ④ Media section */}
          <div className="mt-6 mb-2">
            <div className="px-5 flex items-center gap-2 mb-3">
              <Images className="w-3.5 h-3.5 text-[var(--foreground)]/30" />
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--foreground)]/30">
                Media &middot; {mediaLoading ? "…" : `${media?.length ?? 0} item${(media?.length ?? 0) !== 1 ? "s" : ""}`}
              </p>
            </div>

            {mediaLoading ? (
              <div
                className="mx-auto rounded-xl bg-[var(--foreground)]/5 flex items-center justify-center"
                style={{ width: "95vw", height: "500px" }}
              >
                <Loader2 className="w-8 h-8 animate-spin text-[var(--foreground)]/20" />
              </div>
            ) : media && media.length > 0 ? (
              <MediaSlider
                media={media}
                sound={activeSound !== undefined ? activeSound : displayItem?.sound}
                onSoundChangeRequest={() => setSoundPickerOpen(true)}
              />
            ) : (
              <div
                className="mx-auto rounded-xl border border-[var(--glass-border)] bg-[var(--foreground)]/3 flex flex-col items-center justify-center gap-2"
                style={{ width: "95vw", height: "160px" }}
              >
                <Images className="w-8 h-8 text-[var(--foreground)]/15" />
                <p className="text-[var(--foreground)]/30 text-sm">No media here</p>
              </div>
            )}
          </div>

          <div className="h-10" />
        </div>
      </div>

      {/* Edit dialog — z above the viewer */}
      {editOpen && (
        <EditContentDialog
          item={displayItem}
          open={editOpen}
          onOpenChange={handleEditClose}
          zIndex={10001}
        />
      )}

      {/* Sound Picker — accessible directly from content view */}
      <SoundPickerDialog
        isOpen={soundPickerOpen}
        onClose={() => {
          setSoundPickerOpen(false);
          window.dispatchEvent(new CustomEvent("sound-picker-close"));
        }}
        onSelect={handleSoundSelect}
        currentSoundId={activeSound !== undefined ? activeSound?.id : displayItem?.soundId}
        contentId={displayItem?.id}
      />

      {/* Delete confirm */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={(open) => {
        if (!open && deleteConfirmOpen) {
          window.history.back();
        }
        setDeleteConfirmOpen(open);
      }}>
        <AlertDialogContent className="bg-[var(--popover)] border-[var(--glass-border)] text-[var(--popover-foreground)] rounded-2xl max-w-[320px] z-[10001]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--glass-muted)]">This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 mt-2">
            <AlertDialogCancel className="flex-1 py-2.5 rounded-xl m-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem.mutate({ itemId: displayItem.id })}
              className="flex-1 py-2.5 rounded-xl bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30 m-0"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove confirm */}
      <AlertDialog open={!!pendingRemove} onOpenChange={(o) => {
        if (!o && pendingRemove) {
          window.history.back();
        }
        if (!o) setPendingRemove(null);
      }}>
        <AlertDialogContent className="bg-[var(--popover)] border-[var(--glass-border)] text-[var(--popover-foreground)] rounded-2xl max-w-[320px] z-[10001]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from {pendingRemove}?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--glass-muted)]">
              The item will still exist in your other categories.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 mt-2">
            <AlertDialogCancel className="flex-1 py-2.5 rounded-xl m-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemove === "category" && onRemoveFromCategory) onRemoveFromCategory();
                if (pendingRemove === "subcategory" && onRemoveFromSubcategory) onRemoveFromSubcategory();
                setPendingRemove(null);
                onOpenChange(false);
              }}
              className="flex-1 py-2.5 rounded-xl bg-orange-500/20 border-orange-500/30 text-orange-500 hover:bg-orange-500/30 m-0"
            >Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    document.body
  );
}

// ─── Media Slider ────────────────────────────────────────────────────────────

interface MediaItem { id: number; url: string; type: "image" | "video"; }

function MediaSlider({ media, sound, onSoundChangeRequest }: { media: MediaItem[]; sound: Sound | null | undefined; onSoundChangeRequest?: () => void }) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Reset video play status when sliding to a different media item
  useEffect(() => {
    setIsVideoPlaying(false);
  }, [index]);

  const handleVideoPlay = useCallback(() => setIsVideoPlaying(true), []);
  const handleVideoPause = useCallback(() => setIsVideoPlaying(false), []);
  const [containerW, setContainerW] = useState(0);
  const [loadedSet, setLoadedSet] = useState<Set<number>>(new Set());
  const [videoPlayButtonDismissed, setVideoPlayButtonDismissed] = useState<Set<number>>(new Set());
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isHorizontal = useRef<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = media.length;

  useEffect(() => {
    const measure = () => { if (containerRef.current) setContainerW(containerRef.current.clientWidth); };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const markLoaded = useCallback((id: number) => {
    setLoadedSet(prev => new Set(prev).add(id));
  }, []);

  const dismissVideoPlayButton = useCallback((id: number) => {
    setVideoPlayButtonDismissed(prev => new Set(prev).add(id));
  }, []);

  // Show play button again when returning to a video
  useEffect(() => {
    const currentMedia = media[index];
    if (currentMedia && currentMedia.type === "video") {
      // Remove from dismissed set when sliding to this video
      setVideoPlayButtonDismissed(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentMedia.id);
        return newSet;
      });
    }
  }, [index, media]);

  const goTo = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(i, total - 1)));
    setDragX(0);
  }, [total]);

  const onTouchStart = (e: React.TouchEvent) => {
    // Don't process if in fullscreen
    if (document.fullscreenElement) return;
    
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontal.current = null;
    setIsDragging(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    // Don't process if in fullscreen
    if (document.fullscreenElement) return;
    
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (isHorizontal.current === null && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
    }
    if (isHorizontal.current) { 
      e.stopPropagation(); 
      e.preventDefault(); // Prevent background scrolling
      setIsDragging(true); 
      setDragX(dx); 
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    // Don't process if in fullscreen
    if (document.fullscreenElement) return;
    
    if (!isHorizontal.current || touchStartX.current === null) {
      touchStartX.current = null; touchStartY.current = null;
      isHorizontal.current = null; setIsDragging(false); setDragX(0);
      return;
    }
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = containerW * 0.25;
    if (dx < -threshold && index < total - 1) goTo(index + 1);
    else if (dx > threshold && index > 0) goTo(index - 1);
    else setDragX(0);
    touchStartX.current = null; touchStartY.current = null;
    isHorizontal.current = null; setIsDragging(false);
  };

  const offsetPx = containerW > 0 ? -(index * containerW) + dragX : 0;

  return (
    <div className="w-full">
      {/* Counter row with download button for all media */}
      <div className="flex items-center justify-between px-5 mb-2 gap-2">
        <button
          onClick={async () => {
            try {
              const currentMedia = media[index];
              const filename = `${currentMedia.type}_${Date.now()}.${currentMedia.type === 'video' ? 'mp4' : 'jpg'}`;
              
              // Detect if running inside a WebView/native wrapper (APK)
              const isWebView = /wv|WebView|Android.*Version\/[0-9.]+/i.test(navigator.userAgent) 
                || (window as any).cordova 
                || (window as any).Capacitor;

              if (isWebView) {
                // WebView doesn't support blob downloads, so we trigger a direct URL download
                // which allows the WebView's DownloadListener to intercept and download it natively.
                const a = document.createElement("a");
                a.href = currentMedia.url;
                a.download = filename;
                a.target = "_blank";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                toast.success("Download started");
              } else {
                // Standard web browser download (using Blob to force download over open-in-tab)
                const response = await fetch(currentMedia.url);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                toast.success("Download started");
              }
            } catch (error) {
              toast.error("Download failed");
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--foreground)]/10 hover:bg-[var(--foreground)]/20 text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-all text-xs font-medium shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>

        {/* Sound control + add/change button */}
        <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
          {/* When a sound is set: clicking the pill itself opens the picker */}
          <SoundControl
            sound={sound}
            isParentVideoPlaying={isVideoPlaying}
            onSoundClick={sound && onSoundChangeRequest ? onSoundChangeRequest : undefined}
          />
          {/* Show "Add" button only when no sound is set */}
          {!sound && onSoundChangeRequest && (
            <button
              onClick={onSoundChangeRequest}
              title="Add sound"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all text-xs font-medium shrink-0 border bg-[var(--foreground)]/5 border-dashed border-[var(--foreground)]/20 text-[var(--foreground)]/40 hover:text-[var(--foreground)]/70 hover:bg-[var(--foreground)]/10"
            >
              <Music className="w-3 h-3" />
              <span className="text-[10px]">Add Sound🎵</span>
            </button>
          )}
        </div>

        <span className="text-xs font-semibold tabular-nums text-[var(--foreground)]/40 select-none shrink-0">
          {index + 1}/{total}
        </span>
      </div>

      {/* Slide viewport */}
      <div
        ref={containerRef}
        className="relative overflow-hidden mx-auto rounded-xl bg-[var(--foreground)]/5"
        style={{ width: "95vw", height: "500px" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="absolute inset-0 flex h-full"
          style={{
            width: containerW > 0 ? `${total * containerW}px` : `${total * 100}%`,
            transform: `translateX(${offsetPx}px)`,
            transition: isDragging ? "none" : "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
            willChange: "transform",
          }}
        >
          {media.map((m, i) => {
            const isLoaded = loadedSet.has(m.id);
            const isCurrentSlide = i === index;
            return (
              <div
                key={m.id}
                className="relative flex-shrink-0 bg-[var(--foreground)]/5"
                style={{ width: containerW > 0 ? `${containerW}px` : "95vw", height: "100%" }}
              >
                {!isLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--foreground)]/20" />
                  </div>
                )}
                {m.type === "video" ? (
                  <TikTokVideoPlayer 
                    src={m.url}
                    poster={displayItem.posterImageUrl || undefined}
                    onLoadedData={() => markLoaded(m.id)}
                    className="absolute inset-0"
                    isActive={isCurrentSlide}
                    showInitialPlayButton={!videoPlayButtonDismissed.has(m.id)}
                    onInitialPlay={() => dismissVideoPlayButton(m.id)}
                    onVideoPlay={handleVideoPlay}
                    onVideoPause={handleVideoPause}
                  />
                ) : (
                  <img
                    src={m.url} alt=""
                    className={cn("absolute inset-0 w-full h-full object-contain transition-opacity duration-300", isLoaded ? "opacity-100" : "opacity-0")}
                    onLoad={() => markLoaded(m.id)}
                    draggable={false}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls row below the slider: < dots > */}
      <div className="flex items-center justify-center gap-3 pt-3 pb-1 mx-auto" style={{ width: "95vw" }}>
        {/* Prev arrow */}
        <button
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-[var(--foreground)]/8 text-[var(--foreground)]/60 hover:bg-[var(--foreground)]/15 hover:text-[var(--foreground)] active:scale-90 transition-all disabled:opacity-20 disabled:pointer-events-none border border-[var(--glass-border)]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {media.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={cn("rounded-full transition-all duration-200",
                i === index ? "w-4 h-1.5 bg-[var(--foreground)]" : "w-1.5 h-1.5 bg-[var(--foreground)]/25 hover:bg-[var(--foreground)]/50"
              )}
            />
          ))}
        </div>

        {/* Next arrow */}
        <button
          onClick={() => goTo(index + 1)}
          disabled={index === total - 1}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-[var(--foreground)]/8 text-[var(--foreground)]/60 hover:bg-[var(--foreground)]/15 hover:text-[var(--foreground)] active:scale-90 transition-all disabled:opacity-20 disabled:pointer-events-none border border-[var(--glass-border)]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
