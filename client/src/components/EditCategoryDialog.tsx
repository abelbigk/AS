import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import ImageInput, { type ImageResult } from "./ImageInput";
import { useDialogBackButton } from "@/hooks/useDialogBackButton";

interface EditCategoryDialogProps {
  category: { id: number; name: string; description?: string | null; coverImageUrl?: string | null; coverImageKey?: string | null; coverCropData?: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditCategoryDialog({ category, open, onOpenChange }: EditCategoryDialogProps) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);
  const [preview, setPreview] = useState(category.coverImageUrl || "");
  const [removeCover, setRemoveCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useDialogBackButton(open, () => onOpenChange(false));

  const utils = trpc.useUtils();
  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      toast.success("Category updated!");
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

      await updateCategory.mutateAsync({
        categoryId: category.id,
        name,
        description,
        coverImageUrl: url,
        coverImageKey: key,
        coverCropData: cropData,
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
      <DialogContent className="bg-zinc-950/95 backdrop-blur-xl border-white/10 text-white rounded-3xl max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 pb-2 shrink-0 border-b border-white/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-playfair">Edit Category</DialogTitle>
            <DialogDescription className="text-white/50">Update category name, description and cover image.</DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-5 p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-2">
            <Label className="text-white/70">Category Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Cover Image</Label>
            <ImageInput
              currentPreview={removeCover ? "" : preview}
              currentCropData={removeCover ? null : (imageResult ? JSON.stringify(imageResult.cropData) : category.coverCropData)}
              frameHeight={160}
              onResult={(r) => { setImageResult(r); setPreview(r.url); setRemoveCover(false); }}
              onClear={() => { setImageResult(null); setPreview(""); setRemoveCover(true); }}
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 h-12 rounded-2xl">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
