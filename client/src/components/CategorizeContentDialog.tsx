import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Folder, FolderTree } from "lucide-react";
import type { ContentItem } from "@/types";
import { useDialogBackButton } from "@/hooks/useDialogBackButton";

interface CategorizeContentDialogProps {
  content: ContentItem | null;
  onClose: () => void;
}

export default function CategorizeContentDialog({ content, onClose }: CategorizeContentDialogProps) {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<Set<number>>(new Set());

  useDialogBackButton(!!content, onClose);

  const utils = trpc.useUtils();
  const { data: categories, isLoading: categoriesLoading } = trpc.categories.list.useQuery(undefined, {
    enabled: !!content,
  });
  const { data: allSubcategories, isLoading: subcategoriesLoading } = trpc.subcategories.listAll.useQuery(undefined, {
    enabled: !!content,
  });

  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => {
      utils.content.listUncategorized.invalidate();
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      toast.success("Content categorized successfully");
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to categorize content");
    }
  });

  useEffect(() => {
    if (content) {
      setSelectedCategoryIds(new Set(content.categoryIds || []));
      setSelectedSubcategoryIds(new Set(content.subcategoryIds || []));
    }
  }, [content]);

  const handleCategoryToggle = (categoryId: number, checked: boolean) => {
    const newCatIds = new Set(selectedCategoryIds);
    const newSubIds = new Set(selectedSubcategoryIds);
    if (checked) {
      newCatIds.add(categoryId);
    } else {
      newCatIds.delete(categoryId);
    }
    setSelectedCategoryIds(newCatIds);
    setSelectedSubcategoryIds(newSubIds);
  };

  const handleSubcategoryToggle = (subcategoryId: number, categoryId: number, checked: boolean) => {
    const newSubIds = new Set(selectedSubcategoryIds);
    const newCatIds = new Set(selectedCategoryIds);
    if (checked) {
      newSubIds.add(subcategoryId);
      // Automatically remove its direct parent category relation when shifting to subcategory
      newCatIds.delete(categoryId);
    } else {
      newSubIds.delete(subcategoryId);
    }
    setSelectedSubcategoryIds(newSubIds);
    setSelectedCategoryIds(newCatIds);
  };

  const handleSave = () => {
    if (!content) return;
    if (selectedCategoryIds.size === 0 && selectedSubcategoryIds.size === 0) {
      toast.error("Please select at least one category or close the dialog.");
      return;
    }
    updateContent.mutate({
      itemId: content.id,
      categoryIds: Array.from(selectedCategoryIds),
      subcategoryIds: Array.from(selectedSubcategoryIds),
    });
  };

  const isLoading = categoriesLoading || subcategoriesLoading;

  return (
    <Dialog open={!!content} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col bg-[var(--popover)] text-[var(--popover-foreground)] border-[var(--glass-border)]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Categorize Content</DialogTitle>
          <DialogDescription>
            Select the categories and subcategories where this content should appear.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--glass-muted)]" />
          </div>
        ) : (
          <div className="flex-1 pr-2 -mr-2 mt-4 overflow-y-auto custom-scrollbar">
            <div className="space-y-4 pb-2">
              {categories?.length === 0 && (
                <p className="text-sm text-[var(--glass-muted)] text-center py-4">No categories found. Please create one first.</p>
              )}
              {categories?.map((cat) => {
                const catSubcategories = allSubcategories?.filter(s => s.categoryId === cat.id) || [];
                return (
                  <div key={cat.id} className="bg-[var(--foreground)]/5 border border-[var(--glass-border)] rounded-xl p-4 space-y-3">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={`cat-${cat.id}`}
                        checked={selectedCategoryIds.has(cat.id)}
                        onCheckedChange={(checked) => handleCategoryToggle(cat.id, checked as boolean)}
                        className="mt-1 border-gray-400 dark:border-white/40 data-[state=checked]:bg-blue-500"
                      />
                      <label
                        htmlFor={`cat-${cat.id}`}
                        className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                      >
                        <Folder className="w-4 h-4 text-blue-500" />
                        {cat.name}
                      </label>
                    </div>

                    {catSubcategories.length > 0 && (
                      <div className="ml-7 pl-3 border-l-2 border-gray-100 dark:border-white/10 space-y-3">
                        {catSubcategories.map((sub) => (
                          <div key={sub.id} className="flex items-start space-x-3">
                            <Checkbox
                              id={`sub-${sub.id}`}
                              checked={selectedSubcategoryIds.has(sub.id)}
                              onCheckedChange={(checked) => handleSubcategoryToggle(sub.id, cat.id, checked as boolean)}
                              className="mt-0.5 border-gray-300 dark:border-white/30 data-[state=checked]:bg-blue-400"
                            />
                            <label
                              htmlFor={`sub-${sub.id}`}
                              className="text-sm font-medium leading-none text-gray-600 dark:text-gray-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                            >
                              <FolderTree className="w-3.5 h-3.5 text-[var(--glass-muted)]" />
                              {sub.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 pt-4 border-t border-[var(--glass-border)] sm:justify-between">
          <Button variant="ghost" onClick={onClose} disabled={updateContent.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateContent.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
            {updateContent.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Categories
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
