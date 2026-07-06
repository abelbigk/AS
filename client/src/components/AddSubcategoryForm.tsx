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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import ImageInput, { type ImageResult } from "./ImageInput";

async function resolveImageResult(result: ImageResult): Promise<{ url?: string; key?: string; cropData?: string }> {
  // If it's a local file, we need to upload it
  if (result.blob) {
    const formData = new FormData();
    formData.append("file", result.blob);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return { url: data.url, key: data.key, cropData: JSON.stringify(result.cropData) };
  }
  return { url: result.url, cropData: JSON.stringify(result.cropData) };
}

export default function AddSubcategoryForm({ initialCategoryId, onSubcategoryCreated }: { initialCategoryId?: string; onSubcategoryCreated?: () => void }) {
  const [categoryId, setCategoryId] = useState(initialCategoryId || "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editImageResult, setEditImageResult] = useState<ImageResult | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState("");
  const [editRemoveCover, setEditRemoveCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const utils = trpc.useUtils();
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: allSubcategories } = trpc.subcategories.listAll.useQuery();
  const { data: subcategories } = trpc.subcategories.list.useQuery(
    { categoryId: categoryId ? parseInt(categoryId) : 0 }, { enabled: !!categoryId }
  );

  const createSubcategory = trpc.subcategories.create.useMutation({
    onSuccess: () => {
      setName(""); setDescription("");
      setImageResult(null); setCoverPreview("");
      utils.subcategories.list.invalidate();
      toast.success("Subcategory created!");
      onSubcategoryCreated?.(); // Close the dialog
    },
    onError: (e) => toast.error(e.message || "Failed"),
  });

  const updateSubcategory = trpc.subcategories.update.useMutation({
    onSuccess: () => { setEditingId(null); utils.subcategories.list.invalidate(); toast.success("Updated!"); },
    onError: (e) => toast.error(e.message || "Failed"),
  });

  const deleteSubcategory = trpc.subcategories.delete.useMutation({
    onSuccess: () => { utils.subcategories.list.invalidate(); toast.success("Deleted!"); },
    onError: (e) => toast.error(e.message || "Failed"),
  });

  const similar = name.trim().length > 1 && allSubcategories
    ? allSubcategories.filter(s => s.name.toLowerCase() === name.trim().toLowerCase())
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) { toast.error("Please select a category"); return; }
    if (!name.trim()) { toast.error("Please enter a name"); return; }
    setIsUploading(true);
    try {
      const { url, key, cropData } = imageResult ? await resolveImageResult(imageResult) : {};
      await createSubcategory.mutateAsync({
        categoryId: parseInt(categoryId), name,
        description: description || undefined,
        coverImageUrl: url, coverImageKey: key, coverCropData: cropData,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to create subcategory");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEdit = async (id: number) => {
    setIsSaving(true);
    try {
      const { url, key, cropData } = editImageResult ? await resolveImageResult(editImageResult) : {};
      await updateSubcategory.mutateAsync({
        subcategoryId: id,
        categoryId: editCategoryId ? parseInt(editCategoryId) : undefined,
        name: editName || undefined,
        description: editDescription || undefined,
        coverImageUrl: url, coverImageKey: key, coverCropData: cropData,
        removeCover: editRemoveCover,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update subcategory");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white dark:bg-white/10 backdrop-blur-sm border border-gray-200 dark:border-white/15 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
        {!initialCategoryId && (
          <div>
            <Label className="text-gray-600 dark:text-white/80 text-sm mb-2 block">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-white dark:bg-white/10 border-gray-200 dark:border-white/20 text-gray-900 dark:text-white">
                <SelectValue placeholder="Choose a category..." />
              </SelectTrigger>
              <SelectContent>
                {categories?.map(cat => <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="relative">
          <Label className="text-gray-600 dark:text-white/80 text-sm mb-2 block">Subcategory Name</Label>
          <Input placeholder="e.g., Fantasy" value={name} onChange={(e) => setName(e.target.value)}
            className="bg-white dark:bg-white/10 border-gray-200 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40" />
          {similar.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full rounded-xl bg-white dark:bg-black/80 backdrop-blur border border-gray-200 dark:border-white/15 overflow-hidden shadow-lg">
              {similar.map(s => (
                <div key={s.id} className="px-4 py-2.5 text-sm text-gray-600 dark:text-white/70 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/70 shrink-0" />
                  Already exists: <span className="text-gray-900 dark:text-white font-medium">{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label className="text-gray-600 dark:text-white/80 text-sm mb-2 block">Description (Optional)</Label>
          <Textarea placeholder="Add a description..." value={description} onChange={(e) => setDescription(e.target.value)}
            className="bg-white dark:bg-white/10 border-gray-200 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40" rows={2} />
        </div>

        <div>
          <Label className="text-gray-600 dark:text-white/80 text-sm mb-2 block">Cover Image</Label>
          <ImageInput 
            currentPreview={coverPreview} 
            currentCropData={imageResult?.cropData ? JSON.stringify(imageResult.cropData) : null}
            frameHeight={160} 
            naturalRatio={true}
            onResult={(r) => { setImageResult(r); setCoverPreview(r.url); }}
            onClear={() => { setImageResult(null); setCoverPreview(""); }} />
        </div>

        <Button type="submit" disabled={createSubcategory.isPending || isUploading}
          className="w-full bg-gray-900 dark:bg-white/20 hover:bg-gray-800 dark:hover:bg-white/30 text-white border border-gray-900 dark:border-white/20 font-semibold">
          {(createSubcategory.isPending || isUploading) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isUploading ? "Uploading..." : createSubcategory.isPending ? "Creating..." : `Create Subcategory${imageResult ? " ✓ image ready" : ""}`}
        </Button>
      </form>
      </div>

      <div className="space-y-3">
        {categoryId && subcategories && subcategories.length > 0 && (
          <>
            <p className="text-gray-500 dark:text-white/50 text-xs uppercase tracking-wider font-medium">Subcategories in this category</p>
            {subcategories.map(sub => (
              <div key={sub.id} className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 overflow-hidden">
                {editingId === sub.id ? (
                  <div className="p-4 space-y-3">
                    <div>
                      <Label className="text-gray-500 dark:text-white/60 text-xs mb-1 block">Name</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="bg-white dark:bg-white/10 border-gray-200 dark:border-white/20 text-gray-900 dark:text-white text-sm" />
                    </div>
                    <div>
                      <Label className="text-gray-500 dark:text-white/60 text-xs mb-1 block">Description</Label>
                      <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                        className="bg-white dark:bg-white/10 border-gray-200 dark:border-white/20 text-gray-900 dark:text-white text-sm" rows={2} />
                    </div>
                    <div>
                      <Label className="text-gray-500 dark:text-white/60 text-xs mb-1 block">Move to category</Label>
                      <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                        <SelectTrigger className="bg-white dark:bg-white/10 border-gray-200 dark:border-white/20 text-gray-900 dark:text-white text-sm">
                          <SelectValue placeholder="Keep current..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map(cat => <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-500 dark:text-white/60 text-xs mb-1 block">Cover Image</Label>
                      <ImageInput
                        currentPreview={editRemoveCover ? "" : editCoverPreview}
                        currentCropData={editRemoveCover ? null : (editImageResult ? JSON.stringify(editImageResult.cropData) : sub.coverCropData)}
                        frameHeight={160}
                        naturalRatio={true}
                        onResult={(r) => { setEditImageResult(r); setEditCoverPreview(r.url); setEditRemoveCover(false); }}
                        onClear={() => { setEditImageResult(null); setEditCoverPreview(""); setEditRemoveCover(true); }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(sub.id)} disabled={isSaving}
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
                    <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-200 dark:bg-white/10">
                      {sub.coverImageUrl && <img src={sub.coverImageUrl} className="w-full h-full object-cover" alt="" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{sub.name}</p>
                      {sub.description && <p className="text-gray-500 dark:text-white/40 text-xs truncate">{sub.description}</p>}
                    </div>
                    <button onClick={() => {
                      setEditingId(sub.id); setEditName(sub.name);
                      setEditDescription(sub.description || "");
                      setEditCategoryId(sub.categoryId.toString());
                      setEditCoverPreview(sub.coverImageUrl || "");
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
                          <AlertDialogTitle>Delete this subcategory?</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-500 dark:text-white/60">
                            This action cannot be undone. This will permanently delete the subcategory.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-row sm:justify-center w-full gap-2 mt-2">
                          <AlertDialogCancel className="flex-1 flex items-center justify-center gap-2 h-auto py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-white text-sm transition-all m-0 mt-0">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSubcategory.mutate({ subcategoryId: sub.id })} className="flex-1 flex items-center justify-center gap-2 h-auto py-2.5 rounded-xl bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/30 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium transition-all m-0">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
