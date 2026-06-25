import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import ImageInput, { type ImageResult } from "./ImageInput";
import { useMemo } from "react";
import { useDialogBackButton } from "@/hooks/useDialogBackButton";

interface EditSubcategoryDialogProps {
  subcategory: { id: number; name: string; description?: string | null; coverImageUrl?: string | null; coverImageKey?: string | null; coverCropData?: string | null; categoryId: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditSubcategoryDialog({ subcategory, open, onOpenChange }: EditSubcategoryDialogProps) {
  const [name, setName] = useState(subcategory.name);
  const [description, setDescription] = useState(subcategory.description || "");
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);
  const [preview, setPreview] = useState(subcategory.coverImageUrl || "");
  const [removeCover, setRemoveCover] = useState(false);
  const [categoryId, setCategoryId] = useState(subcategory.categoryId.toString());
  const [isSaving, setIsSaving] = useState(false);

  useDialogBackButton(open, () => onOpenChange(false));

  const { data: categories } = trpc.categories.list.useQuery();

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => {
      const aIsCurrent = a.id === subcategory.categoryId;
      const bIsCurrent = b.id === subcategory.categoryId;
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [categories, subcategory.categoryId]);

  const utils = trpc.useUtils();
  const updateSubcategory = trpc.subcategories.update.useMutation({
    onSuccess: () => {
      utils.subcategories.list.invalidate();
      utils.subcategories.getById.invalidate({ subcategoryId: subcategory.id });
      toast.success("Subcategory updated!");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message || "Failed to update"),
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let url = undefined;
      let key = undefined;
      let cropData = undefined;

      if (imageResult) {
        if (imageResult.blob) {
          const formData = new FormData();
          formData.append("file", imageResult.blob);
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          url = data.url;
          key = data.key;
        } else {
          url = imageResult.url;
        }
        cropData = JSON.stringify(imageResult.cropData);
      }

      await updateSubcategory.mutateAsync({
        subcategoryId: subcategory.id,
        categoryId: parseInt(categoryId),
        name,
        description,
        coverImageUrl: removeCover ? undefined : url,
        coverImageKey: removeCover ? undefined : key,
        coverCropData: removeCover ? undefined : cropData,
        removeCover,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--popover)]/95 backdrop-blur-xl border-[var(--glass-border)] text-[var(--popover-foreground)] rounded-3xl max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 pb-2 shrink-0 border-b border-[var(--glass-border)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-playfair">Edit Subcategory</DialogTitle>
            <DialogDescription className="text-[var(--glass-muted)]">Update subcategory name, description and cover image.</DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-5 p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-2">
            <Label className="text-[var(--glass-muted)]">Parent Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-[var(--foreground)]/5 border-[var(--glass-border)] text-[var(--foreground)]">
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[var(--glass-muted)]">Subcategory Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-[var(--foreground)]/5 border-[var(--glass-border)] text-[var(--foreground)]" />
          </div>
          <div className="space-y-2">
            <Label className="text-[var(--glass-muted)]">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-[var(--foreground)]/5 border-[var(--glass-border)] text-[var(--foreground)]" />
          </div>
          <div className="space-y-2">
            <Label className="text-[var(--glass-muted)]">Cover Image</Label>
            <ImageInput
              currentPreview={removeCover ? "" : preview}
              currentCropData={removeCover ? null : (imageResult ? JSON.stringify(imageResult.cropData) : subcategory.coverCropData)}
              frameHeight={300}
              naturalRatio={true}
              onResult={(r) => { setImageResult(r); setPreview(r.url); setRemoveCover(false); }}
              onClear={() => { setImageResult(null); setPreview(""); setRemoveCover(true); }}
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full bg-[var(--foreground)]/10 hover:bg-[var(--foreground)]/20 text-[var(--foreground)] border border-[var(--glass-border)] h-12 rounded-2xl">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
