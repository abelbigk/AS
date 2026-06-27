import { useState, useMemo, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, X, Film, ImagePlus, AlertTriangle, Music, Volume2, VolumeX, Play, Pause } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { uploadFile, uploadMultipleFiles, deleteUploadedKey } from "@/lib/upload";
import type { Sound } from "@/types";
import SoundPickerDialog from "./SoundPickerDialog";
import ImageInput, { type ImageResult } from "./ImageInput";
import UploadProgress from "./UploadProgress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";
import { useDialogBackButton } from "@/hooks/useDialogBackButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EditContentDialogProps {
  item: {
    id: number;
    heading: string;
    description?: string | null;
    posterImageUrl?: string | null;
    posterImageKey?: string | null;
    posterCropData?: string | null;
    categoryIds: number[];
    subcategoryIds: number[];
    soundId?: number | null;
    sound?: Sound | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zIndex?: number;
}

export default function EditContentDialog({ item, open, onOpenChange, zIndex }: EditContentDialogProps) {
  const [heading, setHeading] = useState(item.heading);
  const [description, setDescription] = useState(item.description || "");
  const [categoryIds, setCategoryIds] = useState<string[]>(item.categoryIds.map(id => id.toString()));
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>(item.subcategoryIds.map(id => id.toString()));
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);
  const [preview, setPreview] = useState(item.posterImageUrl || "");
  const [removePoster, setRemovePoster] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadLoadedBytes, setUploadLoadedBytes] = useState(0);
  const [uploadStage, setUploadStage] = useState<'idle' | 'cover' | 'saving_entry' | 'media' | 'processing'>('idle');
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Sound States
  const [selectedSound, setSelectedSound] = useState<Sound | null>(item.sound || null);
  const [isSoundPickerOpen, setIsSoundPickerOpen] = useState(false);
  const [isPlayingEditPreview, setIsPlayingEditPreview] = useState(false);
  const editPreviewAudioRef = useRef<HTMLAudioElement | null>(null);

  const toggleEditPreview = () => {
    if (!selectedSound) return;
    if (isPlayingEditPreview) {
      if (editPreviewAudioRef.current) {
        editPreviewAudioRef.current.pause();
        editPreviewAudioRef.current.src = "";
        editPreviewAudioRef.current = null;
      }
      setIsPlayingEditPreview(false);
    } else {
      const audio = new Audio(selectedSound.url);
      audio.play().catch(err => {
        console.error(err);
        toast.error("Could not play sound preview");
      });
      audio.addEventListener("ended", () => {
        setIsPlayingEditPreview(false);
      });
      editPreviewAudioRef.current = audio;
      setIsPlayingEditPreview(true);
    }
  };

  useEffect(() => {
    return () => {
      if (editPreviewAudioRef.current) {
        editPreviewAudioRef.current.pause();
        editPreviewAudioRef.current.src = "";
      }
    };
  }, []);
  

  // Track mid-save uploads for rollback on cancel
  const rollbackRef = useRef<{ coverKey: string | null; mediaIds: number[] }>({ coverKey: null, mediaIds: [] });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Use the hook to handle back button - it manages history internally
  useDialogBackButton(open && !cancelConfirmOpen, () => {
    if (isSaving) {
      setCancelConfirmOpen(true);
    } else {
      onOpenChange(false);
    }
  });

  // Intercept all close attempts while saving
  const handleOpenChange = (next: boolean) => {
    if (!next && isSaving) {
      setCancelConfirmOpen(true);
      return;
    }
    onOpenChange(next);
  };

  // Handle drag to dismiss
  const handleDragStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragOffset({ x: 0, y: e.touches[0].clientY - dialogPosition.y });
  };

  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const newY = e.touches[0].clientY - dragOffset.y;
    setDialogPosition({ x: 0, y: newY });
  };

  const handleDragEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Dismiss if dragged down more than 100px
    if (dialogPosition.y > 100) {
      setDialogPosition({ x: 0, y: 0 });
      handleOpenChange(false);
    } else {
      // Snap back to center
      setDialogPosition({ x: 0, y: 0 });
    }
  };

  // Called when user confirms cancel mid-upload — cleans up partial saves
  const handleCancelUpload = async () => {
    setCancelConfirmOpen(false);
    // Abort the in-flight fetch immediately
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    const { coverKey, mediaIds } = rollbackRef.current;

    // Delete cover image from R2 if uploaded but cancelled
    if (coverKey) {
      deleteUploadedKey(coverKey).catch(() => {});
    }

    // Delete any partially saved media records (also deletes from R2)
    for (const id of mediaIds) {
      try { await deleteMedia.mutateAsync({ mediaId: id }); } catch {}
    }
    rollbackRef.current = { coverKey: null, mediaIds: [] };
    setIsSaving(false);
    setUploadLoadedBytes(0);
    setUploadStage('idle');
    utils.media.listByContent.invalidate({ contentItemId: item.id });
    onOpenChange(false);
  };

  // Reset dialog position when opening
  useEffect(() => {
    if (open) {
      setDialogPosition({ x: 0, y: 0 });
    }
  }, [open]);

  // Block browser tab close / navigation while saving
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isSaving) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isSaving]);

  const [mediaFiles, setMediaFiles] = useState<{ file: File; preview: string; type: "image" | "video" }[]>([]);
  const [deletedMediaIds, setDeletedMediaIds] = useState<number[]>([]);

  useEffect(() => {
    if (open) {
      setMediaFiles([]);
      setDeletedMediaIds([]);
    }
  }, [open]);

  const overallLoadedBytes = useMemo(() => {
    const sizeCover = imageResult?.blob ? imageResult.blob.size : 0;
    if (uploadStage === 'cover') {
      return uploadLoadedBytes;
    } else if (uploadStage === 'saving_entry') {
      return sizeCover;
    } else if (uploadStage === 'media') {
      return sizeCover + uploadLoadedBytes;
    } else if (uploadStage === 'processing') {
      return uploadTotalBytes;
    }
    return 0;
  }, [uploadStage, uploadLoadedBytes, uploadTotalBytes, imageResult]);

  const overallPct = useMemo(() => {
    if (uploadTotalBytes === 0) return 0;
    if (uploadStage === 'processing') return 100;
    const calculated = Math.round((overallLoadedBytes / uploadTotalBytes) * 100);
    return Math.min(calculated, 100);
  }, [overallLoadedBytes, uploadTotalBytes, uploadStage]);

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: allSubcategories } = trpc.subcategories.list.useQuery(
    { categoryId: 0 },
    { enabled: true }
  );
  const { data: existingMedia } = trpc.media.listByContent.useQuery(
    { contentItemId: item.id },
    { enabled: open }
  );

  const toggleCategory = (id: string) => {
    setCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSubcategory = (id: string) => {
    const isChecking = !subcategoryIds.includes(id);
    setSubcategoryIds(prev => isChecking ? [...prev, id] : prev.filter(x => x !== id));
    
    if (isChecking) {
      const sub = allSubcategories?.find(s => s.id.toString() === id);
      if (sub) {
        // Automatically uncheck parent category when shifting to subcategory
        setCategoryIds(prev => prev.filter(x => x !== sub.categoryId.toString()));
      }
    }
  };

  const activeSubcategories = allSubcategories?.filter(s => categoryIds.includes(s.categoryId.toString())) || [];

  const initialSelectedIds = useMemo(() => item.categoryIds.map(id => id.toString()), [item.id]);

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => a.id - b.id);
  }, [categories]);

  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const utils = trpc.useUtils();
  const addMedia = trpc.media.add.useMutation();
  const deleteMedia = trpc.media.delete.useMutation();

  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      utils.content.listByStatus.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to update"),
  });

  const handleSave = async () => {
    setIsSaving(true);
    setUploadLoadedBytes(0);
    setUploadStage('idle');

    const sizeCover = imageResult?.blob ? imageResult.blob.size : 0;
    const sizeMedia = mediaFiles.reduce((sum, m) => sum + m.file.size, 0);
    const totalBytes = sizeCover + sizeMedia;

    setUploadTotalBytes(totalBytes);
    if (totalBytes > 0) {
      const name = mediaFiles.length > 0 
        ? (imageResult?.blob ? `Cover & ${mediaFiles.length} files` : `${mediaFiles.length === 1 ? mediaFiles[0].file.name : `${mediaFiles.length} files`}`) 
        : (imageResult?.blob ? "Cover image" : "");
      setUploadFileName(name);
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const abort = abortController.signal;

    let uploadedCoverKey: string | null = null;
    const uploadedMediaIds: number[] = [];
    let mediaUploadResults: { url: string; key: string }[] = [];
    let contentUpdated = false;
    const savedMediaKeys = new Set<string>();
    rollbackRef.current = { coverKey: null, mediaIds: [] };

    try {
      let url = undefined;
      let key = undefined;
      let cropData = undefined;

      if (imageResult) {
        if (imageResult.blob) {
          setUploadStage('cover');
          setUploadLoadedBytes(0);
          const data = await uploadFile(imageResult.blob as File, (loaded, total) => setUploadLoadedBytes(loaded), abort);
          if (!data) {
            if (abort.aborted) { setUploadStage('idle'); return; } // cancelled — handleCancelUpload takes over
            throw new Error("Cover upload failed");
          }
          url = data.url;
          key = data.key;
          uploadedCoverKey = key;
          rollbackRef.current.coverKey = key;
        } else {
          url = imageResult.url;
        }
        cropData = JSON.stringify(imageResult.cropData);
      }

      // Upload new media before saving metadata so upload progress reflects only bytes sent.
      if (mediaFiles.length > 0) {
        setUploadStage('media');
        setUploadLoadedBytes(0);
        mediaUploadResults = await uploadMultipleFiles(
          mediaFiles.map((m) => m.file),
          (loaded, total) => setUploadLoadedBytes(loaded),
          abort
        );
        if (abort.aborted) { setUploadStage('idle'); return; }
        if (mediaUploadResults.length !== mediaFiles.length) {
          throw new Error("Media upload failed");
        }
      }

      setUploadStage('saving_entry');
      setUploadLoadedBytes(0);

      await updateContent.mutateAsync({
        itemId: item.id,
        categoryIds: categoryIds.map(id => parseInt(id)),
        subcategoryIds: subcategoryIds.map(id => parseInt(id)),
        heading,
        description,
        posterImageUrl: removePoster ? undefined : url,
        posterImageKey: removePoster ? undefined : key,
        posterCropData: removePoster ? undefined : cropData,
        removePoster,
        soundId: selectedSound ? selectedSound.id : null,
      });
      contentUpdated = true;

      // Handle deleted media
      for (const id of deletedMediaIds) {
        await deleteMedia.mutateAsync({ mediaId: id });
      }

      // Save uploaded media records
      if (mediaUploadResults.length > 0) {
        const maxOrder = existingMedia?.length ? Math.max(...existingMedia.map(m => m.order)) : 0;
        setUploadStage('processing');
        for (let i = 0; i < mediaUploadResults.length; i++) {
          const saved = await addMedia.mutateAsync({
            contentItemId: item.id,
            url: mediaUploadResults[i].url,
            key: mediaUploadResults[i].key,
            type: mediaFiles[i].type,
            order: maxOrder + 1 + i,
          });
          // track the saved media item IDs for potential rollback
          if (Array.isArray(saved)) {
            const newest = saved[saved.length - 1];
            if (newest?.id) {
              uploadedMediaIds.push(newest.id);
              rollbackRef.current.mediaIds.push(newest.id);
              savedMediaKeys.add(mediaUploadResults[i].key);
            }
          }
        }
      } else {
        setUploadStage('processing');
      }

      utils.media.listByContent.invalidate({ contentItemId: item.id });
      toast.success("Content updated!");
      onOpenChange(false);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error(err?.message || "Failed to save");
      }
      if (uploadedCoverKey && !contentUpdated) {
        deleteUploadedKey(uploadedCoverKey).catch(() => {});
      }
      mediaUploadResults
        .filter(result => !savedMediaKeys.has(result.key))
        .forEach(result => deleteUploadedKey(result.key).catch(() => {}));
    } finally {
      setIsSaving(false);
      setUploadStage('idle');
      setUploadLoadedBytes(0);
      abortControllerRef.current = null;
    }
  };

  const z = zIndex ?? 50;

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay — clicking outside while saving shows confirm instead of closing */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{ zIndex: z }}
          onClick={(e) => {
            if (isSaving) {
              e.preventDefault();
              e.stopPropagation();
              setCancelConfirmOpen(true);
            }
          }}
        />
        {/* Content panel */}
        <DialogPrimitive.Content
          style={{ 
            zIndex: z,
            transform: `translateY(${dialogPosition.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
          onInteractOutside={(e) => {
            e.preventDefault(); // always prevent — overlay handles it
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            if (isSaving) {
              setCancelConfirmOpen(true);
            } else {
              onOpenChange(false);
            }
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
          }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--popover)] backdrop-blur-xl border border-[var(--glass-border)] text-[var(--popover-foreground)] rounded-3xl p-0 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
        {/* Drag handle */}
        <div
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          className="flex justify-center items-center py-2 cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1 bg-[var(--foreground)]/20 rounded-full" />
        </div>
        <div className="p-6 pb-2 shrink-0 border-b border-[var(--glass-border)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-playfair">Edit Content</DialogTitle>
            <DialogDescription className="text-[var(--glass-muted)]">Update heading, description and placement.</DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-4 p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-4">
            <div>
              <Label className="text-[var(--glass-muted)] text-xs mb-2 block">Categories</Label>
              <Popover open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-[var(--foreground)]/5 border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--foreground)]/10 h-10 px-3 font-normal">
                    <span className="truncate">
                      {categoryIds.length === 0 ? "Select categories..." : `${categoryIds.length} selected`}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${categoriesOpen ? "rotate-180" : ""}`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 border-white/10 bg-zinc-950 backdrop-blur-xl w-[calc(100vw-3rem)] max-w-[350px]" align="start">
                  <div className="p-2 space-y-1">
                    <div className="max-h-[200px] overflow-y-auto p-1 space-y-1 custom-scrollbar">
                      {sortedCategories.map(cat => (
                        <label 
                          key={cat.id} 
                          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer group ${categoryIds.includes(cat.id.toString()) ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                        >
                          <Checkbox 
                            checked={categoryIds.includes(cat.id.toString())}
                            onCheckedChange={() => toggleCategory(cat.id.toString())}
                            onClick={(e) => e.stopPropagation()}
                            className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
                          />
                          <span className="text-sm font-medium">
                            {cat.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {categoryIds.length > 0 && activeSubcategories.length > 0 && (
            <div>
              <Label className="text-white/70 text-xs mb-2 block">Subcategories (Optional)</Label>
              <div className="flex flex-wrap gap-2">
                {activeSubcategories.map(sub => (
                  <Badge 
                    key={sub.id} 
                    variant="outline" 
                    onClick={() => toggleSubcategory(sub.id.toString())}
                    className={`cursor-pointer h-7 px-2.5 text-xs transition-all ${subcategoryIds.includes(sub.id.toString()) ? 'bg-blue-500/30 border-blue-500/50 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                  >
                    {sub.name}
                  </Badge>
                ))}
              </div>
            </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-[var(--glass-muted)]">Heading</Label>
            <Input value={heading} onChange={(e) => setHeading(e.target.value)} className="bg-[var(--foreground)]/5 border-[var(--glass-border)] text-[var(--foreground)]" />
          </div>
          <div className="space-y-2">
            <Label className="text-[var(--glass-muted)]">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-[var(--foreground)]/5 border-[var(--glass-border)] text-[var(--foreground)]" rows={2} />
          </div>
          <div className="space-y-2">
            <Label className="text-[var(--glass-muted)]">Cover Image</Label>
            <ImageInput
              currentPreview={removePoster ? "" : preview}
              currentCropData={removePoster ? null : (imageResult ? JSON.stringify(imageResult.cropData) : item.posterCropData)}
              frameHeight={300}
              naturalRatio={true}
              onResult={(r) => { setImageResult(r); setPreview(r.url); setRemovePoster(false); }}
              onClear={() => { setImageResult(null); setPreview(""); setRemovePoster(true); }}
            />
          </div>

          {/* Sound control option */}
          {((existingMedia?.filter(m => !deletedMediaIds.includes(m.id)).length ?? 0) > 0 || mediaFiles.length > 0) && (
            <div className="space-y-2">
              <Label className="text-[var(--glass-muted)] block">Background Sound</Label>
              <div className="p-3.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--foreground)]/3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Music className="w-4 h-4 text-blue-500 shrink-0" />
                  {selectedSound ? (
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--foreground)] truncate leading-tight">
                        {selectedSound.title}
                      </p>
                      <p className="text-[10px] text-[var(--foreground)]/40 truncate mt-0.5">
                        {selectedSound.name}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--foreground)]/50">No background sound</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedSound && (
                    <button
                      type="button"
                      onClick={toggleEditPreview}
                      className="p-1.5 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-all cursor-pointer flex items-center justify-center"
                      title={isPlayingEditPreview ? "Pause preview" : "Listen preview"}
                    >
                      {isPlayingEditPreview ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                    </button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isPlayingEditPreview && editPreviewAudioRef.current) {
                        editPreviewAudioRef.current.pause();
                        setIsPlayingEditPreview(false);
                      }
                      setIsSoundPickerOpen(true);
                    }}
                    className="h-8 px-3 text-[10px] font-semibold uppercase tracking-wider rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/80 hover:text-[var(--foreground)] border-[var(--glass-border)] cursor-pointer"
                  >
                    {selectedSound ? "Change" : "Add Sound"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[var(--glass-muted)] block">Photos &amp; Videos</Label>
            <div className="grid grid-cols-3 gap-2">
              {existingMedia?.filter(m => !deletedMediaIds.includes(m.id)).map((m) => (
                <div key={m.id} className="relative rounded-lg overflow-hidden aspect-square bg-[var(--foreground)]/10">
                  {m.type === "video" ? (
                    <div className="relative w-full h-full">
                      <video 
                        src={m.url} 
                        poster={item.posterImageUrl || undefined}
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Play className="w-6 h-6 text-white/80" fill="white" />
                      </div>
                    </div>
                  ) : (
                    <img src={m.url} className="w-full h-full object-cover" alt="" />
                  )}
                  <button type="button" onClick={() => setDeletedMediaIds(prev => [...prev, m.id])}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {mediaFiles.map((m, i) => (
                <div key={`new-${i}`} className="relative rounded-lg overflow-hidden aspect-square bg-[var(--foreground)]/10 border border-blue-500/30">
                  {m.type === "video" ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={m.preview} 
                        className="w-full h-full object-cover" 
                        alt=""
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Play className="w-6 h-6 text-white/80" fill="white" />
                      </div>
                    </div>
                  ) : (
                    <img src={m.preview} className="w-full h-full object-cover" alt="" />
                  )}
                  <button type="button" onClick={() => setMediaFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-[var(--glass-border)] cursor-pointer hover:border-[var(--glass-muted)] transition-colors">
                <ImagePlus className="w-5 h-5 text-[var(--glass-muted)]" />
                <input type="file" accept="image/*,video/*" multiple onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  
                  // Generate thumbnails for videos, use blob URL for images
                  const newMediaPromises = files.map(async (file) => {
                    const isVideo = file.type.startsWith("video/");
                    let preview: string;
                    
                    if (isVideo) {
                      // Generate thumbnail from video
                      preview = await new Promise<string>((resolve) => {
                        const video = document.createElement('video');
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        video.preload = 'metadata';
                        video.muted = true;
                        video.playsInline = true;
                        
                        video.onloadeddata = () => {
                          // Seek to 1 second or 10% of video duration, whichever is less
                          const seekTime = Math.min(1, video.duration * 0.1);
                          video.currentTime = seekTime;
                        };
                        
                        video.onseeked = () => {
                          canvas.width = video.videoWidth;
                          canvas.height = video.videoHeight;
                          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                          
                          canvas.toBlob((blob) => {
                            if (blob) {
                              resolve(URL.createObjectURL(blob));
                            } else {
                              // Fallback to video blob URL if thumbnail generation fails
                              resolve(URL.createObjectURL(file));
                            }
                            // Clean up
                            URL.revokeObjectURL(video.src);
                          }, 'image/jpeg', 0.8);
                        };
                        
                        video.onerror = () => {
                          // Fallback to video blob URL
                          resolve(URL.createObjectURL(file));
                        };
                        
                        video.src = URL.createObjectURL(file);
                      });
                    } else {
                      preview = URL.createObjectURL(file);
                    }
                    
                    return {
                      file,
                      preview,
                      type: isVideo ? "video" as const : "image" as const,
                    };
                  });
                  
                  const newMedia = await Promise.all(newMediaPromises);
                  setMediaFiles((prev) => [...prev, ...newMedia]);
                  e.target.value = "";
                }} className="hidden" />
              </label>
            </div>
          </div>
          {isSaving && uploadTotalBytes > 0 && (
            <UploadProgress
              pct={overallPct}
              loadedBytes={overallLoadedBytes}
              totalBytes={uploadTotalBytes}
              isSubmitting={isSaving}
              stage={uploadStage}
              fileName={uploadFileName}
              onCancel={handleCancelUpload}
            />
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="relative w-full overflow-hidden rounded-2xl h-12 font-semibold text-sm text-[var(--foreground)] border border-[var(--glass-border)] disabled:opacity-70 transition-all"
          >
            <span className="relative z-10 flex items-center justify-center gap-2 bg-[var(--foreground)]/10 hover:bg-[var(--foreground)]/20 w-full h-full px-4 transition-colors">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadTotalBytes > 0 
                    ? (uploadStage === 'processing' ? "Processing..." : "Uploading...")
                    : "Saving..."}
                </>
              ) : "Save Changes"}
            </span>
          </button>
        </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>

    {/* Cancel-while-uploading confirm — raw Radix so z-index is explicit */}
    <AlertDialogPrimitive.Root open={cancelConfirmOpen} onOpenChange={(open) => {
      if (!open && cancelConfirmOpen) {
        window.history.back();
      }
      setCancelConfirmOpen(open);
    }}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          className="fixed inset-0 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{ zIndex: 20000 }}
        />
        <AlertDialogPrimitive.Content
          style={{ zIndex: 20000 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[320px] bg-[var(--popover)] border border-[var(--glass-border)] text-[var(--popover-foreground)] rounded-2xl p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
            <AlertDialogPrimitive.Title className="text-base font-semibold">
              Upload in progress
            </AlertDialogPrimitive.Title>
          </div>
          <AlertDialogPrimitive.Description className="text-sm text-[var(--glass-muted)] mb-5">
            Files are still uploading. If you leave now the upload will be cancelled and changes may be lost.
          </AlertDialogPrimitive.Description>
          <div className="flex gap-2">
            <AlertDialogPrimitive.Cancel
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-medium border border-[var(--glass-border)] bg-[var(--foreground)]/5 text-[var(--foreground)]/70 hover:bg-[var(--foreground)]/10 transition-colors"
              )}
            >
              Keep waiting
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              onClick={handleCancelUpload}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500/20 border border-red-500/30 text-red-500 hover:bg-red-500/30 transition-colors"
            >
              Cancel upload
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>

    <SoundPickerDialog
      isOpen={isSoundPickerOpen}
      onClose={() => setIsSoundPickerOpen(false)}
      onSelect={(sound) => setSelectedSound(sound)}
      currentSoundId={selectedSound?.id}
    />
    </>
  );
}
