import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import ImageInput, { type ImageResult } from "./ImageInput";
import CroppedImage from "./CroppedImage";
import { uploadFile } from "@/lib/upload";

// Domains that allow direct hotlinking — no proxy needed
const HOTLINK_OK = ["images.unsplash.com", "res.cloudinary.com", "r2.dev", "unsplash.com"];

function imgSrc(url: string | null | undefined): string {
  if (!url) return "";
  // Don't proxy blob URLs - they're local browser references
  if (url.startsWith('blob:')) return url;
  
  try {
    const host = new URL(url).hostname;
    if (HOTLINK_OK.some(d => host.endsWith(d))) return url;
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

const CATEGORY_IMAGES: Record<string, string> = {
  "Movies": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80",
  "Food": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  "Place": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
  "Must": "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&q=80",
  "Quotes": "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80",
  "Business and money management": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
  "How to": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
  "Health": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  "Workout": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
  "Her": "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80",
  "Games": "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&q=80",
  "Home and Designs": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
  "😈 Time": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
  "Ai and sites": "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80",
  "Books": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
  "Family": "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800&q=80",
  "Tech": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
};

async function resolveImageResult(result: ImageResult): Promise<{ url?: string; key?: string; cropData?: string }> {
  // If it's a local file, we need to upload it to R2
  if (result.blob) {
    const uploadData = await uploadFile(result.blob as File);
    if (!uploadData) {
      throw new Error("File upload to R2 failed");
    }
    return { 
      url: uploadData.url, 
      key: uploadData.key, 
      cropData: result.cropData ? JSON.stringify(result.cropData) : undefined 
    };
  }
  // External URL + crop data — no upload needed
  return { 
    url: result.url, 
    cropData: result.cropData ? JSON.stringify(result.cropData) : undefined 
  };
}

export default function AddCategoryForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageResult, setEditImageResult] = useState<ImageResult | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState("");
  const [editRemoveCover, setEditRemoveCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const utils = trpc.useUtils();
  const { data: categories } = trpc.categories.list.useQuery();
  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => { setName(""); setDescription(""); setImageResult(null); setCoverPreview(""); utils.categories.list.invalidate(); toast.success("Category created!"); },
    onError: (e) => toast.error(e.message || "Failed"),
  });
  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: () => { setEditingId(null); utils.categories.list.invalidate(); toast.success("Updated!"); },
    onError: (e) => toast.error(e.message || "Failed"),
  });
  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); toast.success("Deleted!"); },
    onError: (e) => toast.error(e.message || "Failed"),
  });

  const similar = name.trim().length > 1 ? categories?.filter(c => c.name.toLowerCase() === name.trim().toLowerCase()) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Please enter a category name"); return; }
    setIsUploading(true);
    try {
      const { url, key, cropData } = imageResult ? await resolveImageResult(imageResult) : {};
      await createCategory.mutateAsync({ name, description: description || undefined, coverImageUrl: url, coverImageKey: key, coverCropData: cropData });
    } catch (err: any) {
      toast.error(err?.message || "Failed to create category");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEdit = async (id: number) => {
    setIsSaving(true);
    try {
      const { url, key, cropData } = editImageResult ? await resolveImageResult(editImageResult) : {};
      await updateCategory.mutateAsync({
        categoryId: id, name: editName || undefined,
        description: editDescription || undefined,
        coverImageUrl: url, coverImageKey: key, coverCropData: cropData,
        removeCover: editRemoveCover,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update category");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white dark:bg-white/10 backdrop-blur-sm border border-gray-200 dark:border-white/15 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <Label className="text-gray-600 dark:text-white/80 text-sm mb-2 block">Category Name</Label>
          <Input placeholder="e.g., My Favorites" value={name} onChange={(e) => setName(e.target.value)}
            className="bg-white dark:bg-white/10 border-gray-200 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40" />
          {similar && similar.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full rounded-xl bg-white dark:bg-black/80 backdrop-blur border border-gray-200 dark:border-white/15 overflow-hidden shadow-lg">
              {similar.map(c => (
                <div key={c.id} className="px-4 py-2.5 text-sm text-gray-600 dark:text-white/70 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/70 shrink-0" />
                  Already exists: <span className="text-gray-900 dark:text-white font-medium">{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <Label className="text-gray-600 dark:text-white/80 text-sm mb-2 block">Description (Optional)</Label>
          <Input placeholder="What's this category about?" value={description} onChange={(e) => setDescription(e.target.value)}
            className="bg-white dark:bg-white/10 border-gray-200 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40" />
        </div>
        <div>
          <Label className="text-gray-600 dark:text-white/80 text-sm mb-2 block">Cover Image</Label>
          <ImageInput 
            currentPreview={coverPreview} 
            currentCropData={imageResult?.cropData ? JSON.stringify(imageResult.cropData) : null}
            frameHeight={112} 
            flushMargin="-mx-6"
            onResult={(r) => { setImageResult(r); setCoverPreview(r.url); }}
            onClear={() => { setImageResult(null); setCoverPreview(""); }} />
        </div>
        <Button type="submit" disabled={createCategory.isPending || isUploading}
          className="w-full bg-gray-900 dark:bg-white/20 hover:bg-gray-800 dark:hover:bg-white/30 text-white border border-gray-900 dark:border-white/20 font-semibold">
          {(createCategory.isPending || isUploading) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isUploading ? "Uploading..." : createCategory.isPending ? "Creating..." : "Create Category"}
        </Button>
      </form>
      </div>

      {categories && categories.length > 0 && (
        <div className="space-y-3">
          <p className="text-gray-500 dark:text-white/50 text-xs uppercase tracking-wider font-medium">Existing Categories</p>
          {categories.map(cat => (
            <div key={cat.id} className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 overflow-hidden">
              {editingId === cat.id ? (
                <div className="p-4 space-y-3">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="bg-white dark:bg-white/10 border-gray-200 dark:border-white/20 text-gray-900 dark:text-white text-sm" />
                  <Input placeholder="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                    className="bg-white dark:bg-white/10 border-gray-200 dark:border-white/20 text-gray-900 dark:text-white text-xs placeholder:text-gray-400 dark:placeholder:text-white/40" />
                  <ImageInput
                    currentPreview={editRemoveCover ? "" : editCoverPreview}
                    currentCropData={editRemoveCover ? null : (editImageResult ? JSON.stringify(editImageResult.cropData) : cat.coverCropData)}
                    frameHeight={112}
                    flushMargin="-mx-4"
                    onResult={(r) => { setEditImageResult(r); setEditCoverPreview(r.url); setEditRemoveCover(false); }}
                    onClear={() => { setEditImageResult(null); setEditCoverPreview(""); setEditRemoveCover(true); }}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(cat.id)} disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-900 dark:bg-white/20 text-white text-sm hover:bg-gray-800 dark:hover:bg-white/30 transition-all font-semibold">
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white/60 text-sm hover:bg-gray-300 dark:hover:bg-white/15 transition-all">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3">
                    <div className="w-14 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-200 dark:bg-white/10">
                      <CroppedImage
                        src={cat.coverImageUrl || CATEGORY_IMAGES[cat.name] || ""}
                        cropData={cat.coverCropData}
                      />
                    </div>
                  <span className="flex-1 text-gray-900 dark:text-white text-sm font-medium truncate">{cat.name}</span>
                  <button onClick={() => {
                    setEditingId(cat.id); setEditName(cat.name); setEditDescription(cat.description || "");
                    setEditCoverPreview(cat.coverImageUrl || CATEGORY_IMAGES[cat.name] || "");
                    setEditImageResult(null); setEditRemoveCover(false);
                  }} className="p-2 rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-2 rounded-lg text-gray-400 dark:text-white/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white backdrop-blur-xl rounded-2xl max-w-[320px]">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this category?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-500 dark:text-white/60">
                          This action cannot be undone. This will permanently delete the category and its cover image.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row sm:justify-center w-full gap-2 mt-2">
                        <AlertDialogCancel className="flex-1 flex items-center justify-center gap-2 h-auto py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-white text-sm transition-all m-0">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteCategory.mutate({ categoryId: cat.id })} className="flex-1 flex items-center justify-center gap-2 h-auto py-2.5 rounded-xl bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/30 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium transition-all m-0">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
