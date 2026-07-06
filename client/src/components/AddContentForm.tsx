import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, X, Loader2, Film } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { deleteUploadedKey, uploadFile, uploadMultipleFiles } from "../lib/upload";
import ImageInput, { type ImageResult } from "./ImageInput";
import UploadProgress from "./UploadProgress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


type MediaFile = { file: File; preview: string; type: "image" | "video" };

export default function AddContentForm({ initialCategoryId, initialSubcategoryId, onContentAdded }: { initialCategoryId?: string; initialSubcategoryId?: string; onContentAdded?: () => void }) {
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryId ? [initialCategoryId] : []);
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>(initialSubcategoryId ? [initialSubcategoryId] : []);
  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [poster, setPoster] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadLoadedBytes, setUploadLoadedBytes] = useState(0);
  const [uploadStage, setUploadStage] = useState<'idle' | 'cover' | 'saving_entry' | 'media' | 'processing'>('idle');
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const createdItemRef = useRef<{ id: number } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults } = trpc.content.search.useQuery(
    { query: searchQuery.trim() },
    { enabled: true }
  );

  const availableSearchResults = useMemo(() => {
    if (!searchResults) return [];
    return searchResults.filter((item: any) => {
      const isLinked = initialSubcategoryId 
        ? item.subcategoryIds.includes(parseInt(initialSubcategoryId))
        : initialCategoryId 
          ? item.categoryIds.includes(parseInt(initialCategoryId))
          : false;
      return !isLinked;
    });
  }, [searchResults, initialCategoryId, initialSubcategoryId]);

  const overallLoadedBytes = useMemo(() => {
    const sizeCover = poster ? poster.size : 0;
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
  }, [uploadStage, uploadLoadedBytes, uploadTotalBytes, poster]);

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
  const { data: existingContent } = trpc.content.searchExisting.useQuery(
    { heading: heading.trim() },
    { enabled: heading.trim().length > 2 }
  );

  const utils = trpc.useUtils();
  const createContent = trpc.content.create.useMutation();
  const updateContent = trpc.content.update.useMutation();
  const addMedia = trpc.media.add.useMutation();
  const deleteContent = trpc.content.delete.useMutation();


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

  const initialSelectedIds = useMemo(() => initialCategoryId ? [initialCategoryId] : [], [initialCategoryId]);

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => a.id - b.id);
  }, [categories]);

  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const handleMediaAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newMedia: MediaFile[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));
    setMediaFiles((prev) => [...prev, ...newMedia]);
    e.target.value = "";
  };

  const removeMedia = (index: number) =>
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));

  const handleCancelUpload = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const newItem = createdItemRef.current;
    createdItemRef.current = null;

    setIsSubmitting(false);
    setUploadStage('idle');
    setUploadLoadedBytes(0);

    if (newItem) {
      try {
        await deleteContent.mutateAsync({ itemId: newItem.id });
      } catch (err) {
        console.error("Failed to delete partially created item on cancel:", err);
      }
    }
    toast.info("Upload cancelled");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryIds.length === 0 && subcategoryIds.length === 0) { 
      toast.error("Please select at least one category or subcategory"); 
      return; 
    }
    if (!heading.trim()) { toast.error("Please enter a heading"); return; }

    setIsSubmitting(true);
    setUploadLoadedBytes(0);
    setUploadStage('idle');
    createdItemRef.current = null;

    const sizeCover = poster ? poster.size : 0;
    const sizeMedia = mediaFiles.reduce((sum, m) => sum + m.file.size, 0);
    const totalBytes = sizeCover + sizeMedia;

    setUploadTotalBytes(totalBytes);
    if (totalBytes > 0) {
      const name = mediaFiles.length > 0 
        ? (poster ? `Cover & ${mediaFiles.length} files` : `${mediaFiles.length === 1 ? mediaFiles[0].file.name : `${mediaFiles.length} files`}`) 
        : (poster ? poster.name : "");
      setUploadFileName(name);
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const abort = abortController.signal;
    let uploadedPosterKey: string | undefined;
    let mediaUploadResults: { url: string; key: string }[] = [];

    try {
      if (existingContent) {
        setUploadStage('saving_entry');
        await createContent.mutateAsync({
          categoryIds: categoryIds.map(id => parseInt(id)),
          subcategoryIds: subcategoryIds.map(id => parseInt(id)),
          heading: heading.trim(),
        });
      } else {
        let posterImageUrl = imageResult?.url;
        let posterImageKey: string | undefined;
        if (poster) {
          setUploadStage('cover');
          setUploadLoadedBytes(0);
          const result = await uploadFile(poster, (loaded, total) => setUploadLoadedBytes(loaded), abort);
          if (!result) { 
            if (abort.aborted) return;
            setIsSubmitting(false);
            setUploadStage('idle');
            return;
          }
          posterImageUrl = result.url;
          posterImageKey = result.key;
          uploadedPosterKey = result.key;
        }

        if (abort.aborted) return;

        if (mediaFiles.length > 0) {
          setUploadStage('media');
          setUploadLoadedBytes(0);
          mediaUploadResults = await uploadMultipleFiles(
            mediaFiles.map((m) => m.file),
            (loaded, total) => setUploadLoadedBytes(loaded),
            abort
          );
          
          if (abort.aborted) return;
          if (mediaUploadResults.length !== mediaFiles.length) {
            throw new Error("Media upload failed");
          }
        }

        setUploadStage('saving_entry');
        const newItem = await createContent.mutateAsync({
          categoryIds: categoryIds.map(id => parseInt(id)),
          subcategoryIds: subcategoryIds.map(id => parseInt(id)),
          heading: heading.trim(),
          description: description || undefined,
          posterImageUrl,
          posterImageKey,
          posterCropData: imageResult?.cropData ? JSON.stringify(imageResult.cropData) : undefined,
        });
        createdItemRef.current = newItem;

        if (abort.aborted) {
          await deleteContent.mutateAsync({ itemId: newItem.id });
          createdItemRef.current = null;
          return;
        }

        if (mediaUploadResults.length > 0) {
          setUploadStage('processing');
          for (let i = 0; i < mediaUploadResults.length; i++) {
            const result = mediaUploadResults[i];
            await addMedia.mutateAsync({
              contentItemId: newItem.id,
              url: result.url,
              key: result.key,
              type: mediaFiles[i].type,
              order: i,
            });
          }
          setUploadLoadedBytes(0);
        } else {
          setUploadStage('processing');
        }
      }

      setHeading(""); setDescription(""); setCategoryIds(initialCategoryId ? [initialCategoryId] : []); setSubcategoryIds(initialSubcategoryId ? [initialSubcategoryId] : []);
      setPoster(null); setPosterPreview(""); setImageResult(null); setMediaFiles([]);
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      toast.success("Content added!");
      if (onContentAdded) onContentAdded();
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error(err?.message || "Failed to add content");
      }
      if (createdItemRef.current) {
        try {
          await deleteContent.mutateAsync({ itemId: createdItemRef.current.id });
        } catch (deleteErr) {
          console.error("Failed to delete partially created item after upload error:", deleteErr);
        }
        createdItemRef.current = null;
      }
      if (!createdItemRef.current) {
        if (uploadedPosterKey) deleteUploadedKey(uploadedPosterKey).catch(() => {});
        mediaUploadResults.forEach(result => deleteUploadedKey(result.key).catch(() => {}));
      }
    } finally {
      setIsSubmitting(false);
      setUploadStage('idle');
      setUploadLoadedBytes(0);
      abortControllerRef.current = null;
      createdItemRef.current = null;
    }
  };


  const handleLinkExisting = async (item: any) => {
    if (categoryIds.length === 0 && subcategoryIds.length === 0) { 
      toast.error("Please select at least one category or subcategory"); 
      return; 
    }
    setIsSubmitting(true);
    try {
      await createContent.mutateAsync({
        categoryIds: categoryIds.map(id => parseInt(id)),
        subcategoryIds: subcategoryIds.map(id => parseInt(id)),
        heading: item.heading,
      });
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      utils.content.search.invalidate();
      toast.success("Content linked!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to link content");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async (item: any) => {
    setIsSubmitting(true);
    try {
      if (initialSubcategoryId && initialCategoryId) {
        await updateContent.mutateAsync({
          itemId: item.id,
          categoryIds: item.categoryIds.filter((id: number) => id !== parseInt(initialCategoryId)),
          subcategoryIds: item.subcategoryIds.filter((id: number) => id !== parseInt(initialSubcategoryId))
        });
      } else if (initialCategoryId) {
        await updateContent.mutateAsync({
          itemId: item.id,
          categoryIds: item.categoryIds.filter((id: number) => id !== parseInt(initialCategoryId))
        });
      }
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      utils.content.search.invalidate();
      toast.success("Link removed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove link");
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="rounded-2xl bg-white dark:bg-white/10 backdrop-blur-sm border border-gray-200 dark:border-white/15 p-6 space-y-8">
      <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        {!initialCategoryId && (
        <div>
          <Label className="text-gray-600 dark:text-white/80 text-sm mb-2 block">Categories</Label>
          <Popover open={categoriesOpen} onOpenChange={setCategoriesOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white h-10 px-3 font-normal">
                <span className="truncate">
                  {categoryIds.length === 0 ? "Select categories..." : `${categoryIds.length} selected`}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${categoriesOpen ? "rotate-180" : ""}`} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950 backdrop-blur-xl w-[calc(100vw-3rem)] max-w-[350px]" align="start">
              <div className="p-2 space-y-1">
                <div className="max-h-[200px] overflow-y-auto p-1 space-y-1 custom-scrollbar">
                  {sortedCategories.map(cat => (
                    <label 
                      key={cat.id} 
                      className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer group ${categoryIds.includes(cat.id.toString()) ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white' : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                      <Checkbox 
                        checked={categoryIds.includes(cat.id.toString())}
                        onCheckedChange={() => toggleCategory(cat.id.toString())}
                        onClick={(e) => e.stopPropagation()}
                        className="border-gray-300 dark:border-white/20 data-[state=checked]:bg-gray-900 dark:data-[state=checked]:bg-white data-[state=checked]:text-white dark:data-[state=checked]:text-black"
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
        )}

        {categoryIds.length > 0 && activeSubcategories.length > 0 && (
        <div>
          <Label className="text-gray-600 dark:text-white/80 text-sm mb-2 block">Subcategories (Optional)</Label>
          <div className="flex flex-wrap gap-2">
            {activeSubcategories.map(sub => (
              <Badge 
                key={sub.id} 
                variant="outline" 
                onClick={() => toggleSubcategory(sub.id.toString())}
                className={`cursor-pointer h-7 px-2.5 text-xs transition-all ${subcategoryIds.includes(sub.id.toString()) ? 'bg-blue-100 dark:bg-blue-500/30 border-blue-400 dark:border-blue-500/50 text-blue-700 dark:text-white' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {sub.name}
              </Badge>
            ))}
          </div>
        </div>
        )}
      </div>

      <div>
        <Label className="text-gray-600 dark:text-white/80 text-sm mb-2 block">Heading</Label>
        <Input placeholder="e.g., Inception" value={heading}
          onChange={(e) => setHeading(e.target.value)}
          className="bg-white dark:bg-white/10 border-gray-200 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40" />
        {existingContent && (
          <div className="mt-2 flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>Existing content found. We'll link it to the selected categories.</span>
          </div>
        )}
      </div>

      {!existingContent && (
      <>
      <div>
        <Label className="text-gray-600 dark:text-white/80 text-sm mb-2 block">Description (Optional)</Label>
        <Textarea placeholder="Add notes..." value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-white dark:bg-white/10 border-gray-200 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40" rows={2} />
      </div>

      <div>
        <Label className="text-gray-600 dark:text-white/80 text-sm mb-2 block">Cover Image</Label>
        <ImageInput
          currentPreview={posterPreview}
          currentCropData={imageResult?.cropData ? JSON.stringify(imageResult.cropData) : null}
          frameHeight={300}
          naturalRatio={true}
          onResult={(r) => {
            if (r.file) setPoster(r.file);
            setPosterPreview(r.url);
            setImageResult(r);
          }}
          onClear={() => { setPoster(null); setPosterPreview(""); setImageResult(null); }}
        />
      </div>

      <div>
        <Label className="text-gray-600 dark:text-white/80 text-sm mb-2 block">
          Photos &amp; Videos
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {mediaFiles.map((m, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden aspect-square bg-gray-100 dark:bg-white/10">
              {m.type === "video" ? (
                <div className="w-full h-full flex items-center justify-center flex-col gap-1">
                  <Film className="w-7 h-7 text-gray-400 dark:text-white/50" />
                  <span className="text-[10px] text-gray-400 dark:text-white/50">video</span>
                </div>
              ) : (
                <img src={m.preview} className="w-full h-full object-cover" alt="" />
              )}
              <button type="button" onClick={() => removeMedia(i)}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-white/20 cursor-pointer hover:border-gray-400 dark:hover:border-white/40 transition-colors">
              <ImagePlus className="w-5 h-5 text-gray-400 dark:text-white/40" />
              <input type="file" accept="image/*,video/*" multiple onChange={handleMediaAdd} className="hidden" />
            </label>
        </div>
      </div>
      </>
      )}

      {isSubmitting && uploadTotalBytes > 0 && (
        <UploadProgress
          pct={overallPct}
          loadedBytes={overallLoadedBytes}
          totalBytes={uploadTotalBytes}
          isSubmitting={isSubmitting}
          stage={uploadStage}
          fileName={uploadFileName}
          onCancel={handleCancelUpload}
        />
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="relative w-full overflow-hidden rounded-lg h-10 font-semibold text-sm text-white border border-gray-900 dark:border-white/20 disabled:opacity-70 transition-all"
      >
        <span className="relative z-10 flex items-center justify-center gap-2 bg-gray-900 dark:bg-white/20 w-full h-full px-4">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploadTotalBytes > 0 
                ? (uploadStage === 'processing' ? "Processing..." : "Uploading...")
                : "Saving..."}
            </>
          ) : (
            existingContent ? "Link Existing Content" : "Add Content"
          )}
        </span>
      </button>
      </form>

      {(initialCategoryId || initialSubcategoryId) && (
        <div className="pt-6 border-t border-[var(--glass-border)] space-y-4">
          <div className="space-y-1">
            <Label className="text-[var(--foreground)] text-xs font-semibold uppercase tracking-wider">Link Existing Content</Label>
            <p className="text-[var(--glass-muted)] text-[10px]">Select from your other categories</p>
          </div>
          
          <Input 
            placeholder="Search items to link..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[var(--foreground)]/5 border-[var(--glass-border)] text-[var(--foreground)] placeholder:text-[var(--glass-muted)] h-9 text-sm"
          />

          {availableSearchResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
              {availableSearchResults.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--foreground)]/5 border border-[var(--glass-border)] group hover:bg-[var(--foreground)]/10 transition-all">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--foreground)]/10 shrink-0">
                    {item.posterImageUrl && <img src={item.posterImageUrl} className="w-full h-full object-cover" alt="" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--foreground)] text-sm font-medium truncate">{item.heading}</p>
                    <p className="text-[var(--glass-muted)] text-[10px] truncate">
                      {(() => {
                        const total = (item.categoryIds?.length || 0) + (item.subcategoryIds?.length || 0);
                        return total === 1 ? "1 collection" : `${total} collections`;
                      })()}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleLinkExisting(item)}
                    className="h-8 rounded-lg bg-[var(--foreground)]/10 border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--foreground)]/20 px-3 text-xs"
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          ) : searchQuery.trim().length > 0 ? (
            <p className="text-center py-4 text-[var(--glass-muted)] text-xs italic">No matching items found</p>
          ) : (
            <p className="text-center py-4 text-[var(--glass-muted)] text-[11px]">All your content is already linked here</p>
          )}
        </div>
      )}
    </div>
  );
}
