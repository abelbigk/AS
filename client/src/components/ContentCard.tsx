import { Clock, CheckCircle2, Trash2, MoreVertical, Pencil, FolderMinus, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { ContentItem } from "@/types";
import { useMemo, useState, useRef } from "react";
import ContentDetailDialog from "./ContentDetailDialog";
import EditContentDialog from "./EditContentDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import CroppedImage from "./CroppedImage";

interface ContentCardProps {
  item: ContentItem;
  onRemoveFromCategory?: () => void;
  onRemoveFromSubcategory?: () => void;
  onCategorize?: () => void;
  isSelectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  activeCategoryId?: number;
  activeSubcategoryId?: number;
}

export default function ContentCard({ 
  item, 
  onRemoveFromCategory, 
  onRemoveFromSubcategory, 
  onCategorize, 
  isSelectMode, 
  selected, 
  onToggleSelect,
  activeCategoryId,
  activeSubcategoryId
}: ContentCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<"category" | "subcategory" | null>(null);
  const utils = trpc.useUtils();
  const hasDialogRef = useRef(false);
  const triggerDialogAction = (action: () => void) => {
    hasDialogRef.current = true;
    action();
  };

  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      utils.content.listByStatus.invalidate();
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
    },
  });

  const deleteItem = trpc.content.delete.useMutation({
    onSuccess: () => {
      utils.content.listByStatus.invalidate();
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      utils.content.listUncategorized.invalidate();
      toast.success("Deleted");
    },
  });

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: allSubcategories } = trpc.subcategories.listAll.useQuery();

  const willBeUncategorized = useMemo(() => {
    if (!pendingRemove) return false;

    if (pendingRemove === "category") {
      const currentCatId = activeCategoryId;
      if (!currentCatId) return item.categoryIds.length <= 1 && item.subcategoryIds.length === 0;

      // Check if there are other categories or ANY subcategories
      const otherCats = item.categoryIds.filter(id => id !== currentCatId);
      const otherSubs = item.subcategoryIds; // Keep ALL subcategories (now independent)
      
      return otherCats.length === 0 && otherSubs.length === 0;
    }

    if (pendingRemove === "subcategory") {
      const currentSubId = activeSubcategoryId;
      if (!currentSubId) return item.subcategoryIds.length <= 1 && item.categoryIds.length === 0;

      // Check if there are other subcategories or ANY categories
      const otherSubs = item.subcategoryIds.filter(id => id !== currentSubId);
      const otherCats = item.categoryIds; // Keep ALL categories (now independent)
      
      return otherSubs.length === 0 && otherCats.length === 0;
    }

    return false;
  }, [pendingRemove, item.categoryIds, item.subcategoryIds, activeCategoryId, activeSubcategoryId, allSubcategories]);

  const categoryNames = useMemo(
    () => {
      const uniqueCategoryIdsSet = new Set<number>();
      item.categoryIds.forEach(id => uniqueCategoryIdsSet.add(id));
      item.subcategoryIds.forEach(subId => {
        const sub = allSubcategories?.find(s => s.id === subId);
        if (sub) {
          uniqueCategoryIdsSet.add(sub.categoryId);
        }
      });

      const uniqueCategoryIds = Array.from(uniqueCategoryIdsSet);
      const names = uniqueCategoryIds.map(id => categories?.find(c => c.id === id)?.name).filter(Boolean);
      
      if (names.length === 0) return "";
      if (names.length === 1) return names[0];
      return `${names[0]} +${names.length - 1}`;
    },
    [categories, allSubcategories, item.categoryIds, item.subcategoryIds]
  );

  const handleQueue = (e: React.SyntheticEvent | React.MouseEvent) => {
    e.stopPropagation();
    updateStatus.mutate({ itemId: item.id, status: item.status === "queued" ? "default" : "queued" });
  };

  const handleDone = (e: React.SyntheticEvent | React.MouseEvent) => {
    e.stopPropagation();
    updateStatus.mutate({ itemId: item.id, status: item.status === "done" ? "default" : "done" });
  };

  const handleDelete = (e: React.SyntheticEvent | React.MouseEvent) => {
    e.stopPropagation();
    triggerDialogAction(() => setDeleteConfirmOpen(true));
  };

  const confirmDelete = () => {
    deleteItem.mutate({ itemId: item.id });
    setDeleteConfirmOpen(false);
  };

  return (
    <>
      <div 
        onClick={() => {
          if (isSelectMode) {
            if (onToggleSelect) onToggleSelect();
          } else {
            setDetailOpen(true);
          }
        }}
        onPointerDown={(e) => { if (detailOpen) e.stopPropagation(); }}
        className={cn(
          "relative overflow-hidden rounded-2xl bg-[var(--glass-bg)] backdrop-blur-sm border border-[var(--glass-border)] shadow-lg group break-inside-avoid cursor-pointer hover:border-[var(--foreground)]/20 transition-all",
          isSelectMode && "hover:border-blue-500/50",
          selected && "ring-2 ring-blue-500 border-blue-500"
        )}>
        
        {isSelectMode && (
          <div className="absolute top-3 left-3 z-20">
            <div className={cn(
              "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shadow-sm",
              selected ? "bg-blue-500 border-blue-500 text-white" : "bg-black/40 border-white/40 text-transparent backdrop-blur-md"
            )}>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
        {/* Poster — natural height, no fixed crop */}
        {item.posterImageUrl ? (
          <div className="relative w-full overflow-hidden">
            <CroppedImage
              src={item.posterImageUrl}
              cropData={item.posterCropData}
              naturalRatio={true}
              alt={item.heading}
              className="w-full block transition-transform duration-500 group-hover:scale-105"
            />
            {/* Status pill on image */}
            {item.status !== "default" && (
              <div className="absolute top-2 left-2">
                {item.status === "queued" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/80 text-white text-[10px] font-medium backdrop-blur-sm">
                    <Clock className="w-2.5 h-2.5" /> Queued
                  </span>
                )}
                {item.status === "done" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/80 text-white text-[10px] font-medium backdrop-blur-sm">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Done
                  </span>
                )}
              </div>
            )}
            {/* 3-dot menu on image */}
            {!isSelectMode && (
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-black/50 text-white/80 hover:bg-black/70 transition-all"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-black/90 backdrop-blur border-white/15 text-white"
                  onCloseAutoFocus={(e) => {
                    if (hasDialogRef.current) {
                      e.preventDefault();
                      hasDialogRef.current = false;
                    }
                  }}
                >
                  <DropdownMenuItem onClick={handleQueue} className="gap-2 focus:bg-white/10 focus:text-white">
                    <Clock className="w-3.5 h-3.5" /> {item.status === "queued" ? "Unqueue" : "Queue"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDone} className="gap-2 focus:bg-white/10 focus:text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {item.status === "done" ? "Undone" : "Done"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { 
                    e.stopPropagation(); 
                    triggerDialogAction(() => setEditDialogOpen(true)); 
                  }} className="gap-2 focus:bg-white/10 focus:text-white">
                    <Pencil className="w-3.5 h-3.5" /> Edit Details
                  </DropdownMenuItem>
                  {onRemoveFromCategory && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerDialogAction(() => setPendingRemove("category")); }} className="gap-2 focus:bg-white/10 focus:text-white">
                      <FolderMinus className="w-3.5 h-3.5" /> Remove from Category
                    </DropdownMenuItem>
                  )}
                  {onRemoveFromSubcategory && (
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); triggerDialogAction(() => setPendingRemove("subcategory")); }} 
                      className="gap-2 focus:bg-white/10 focus:text-white"
                      disabled={item.subcategoryIds.length === 0}
                    >
                      <FolderMinus className="w-3.5 h-3.5" /> Remove from Subcategory
                    </DropdownMenuItem>
                  )}
                  {onCategorize && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerDialogAction(() => onCategorize()); }} className="gap-2 focus:bg-white/10 focus:text-white">
                      <FolderPlus className="w-3.5 h-3.5" /> Categorize content
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleDelete} className="gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        ) : (
          /* No image — show colored block with status */
          <div className="relative w-full h-24 bg-[var(--foreground)]/5 flex items-center justify-center">
            {item.status !== "default" && (
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                item.status === "queued" ? "bg-blue-500/30 text-blue-200" : "bg-green-500/30 text-green-200"
              )}>
                {item.status === "queued" ? <Clock className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
                {item.status}
              </span>
            )}
            {/* 3-dot menu for no-image cards */}
            {!isSelectMode && (
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button onClick={(e) => e.stopPropagation()}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 transition-all">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-black/90 backdrop-blur border-white/15 text-white"
                  onCloseAutoFocus={(e) => {
                    if (hasDialogRef.current) {
                      e.preventDefault();
                      hasDialogRef.current = false;
                    }
                  }}
                >
                  <DropdownMenuItem onClick={handleQueue} className="gap-2 focus:bg-white/10 focus:text-white">
                    <Clock className="w-3.5 h-3.5" /> {item.status === "queued" ? "Unqueue" : "Queue"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDone} className="gap-2 focus:bg-white/10 focus:text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {item.status === "done" ? "Undone" : "Done"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { 
                    e.stopPropagation(); 
                    triggerDialogAction(() => setEditDialogOpen(true)); 
                  }} className="gap-2 focus:bg-white/10 focus:text-white">
                    <Pencil className="w-3.5 h-3.5" /> Edit Details
                  </DropdownMenuItem>
                  {onRemoveFromCategory && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerDialogAction(() => setPendingRemove("category")); }} className="gap-2 focus:bg-white/10 focus:text-white">
                      <FolderMinus className="w-3.5 h-3.5" /> Remove from Category
                    </DropdownMenuItem>
                  )}
                  {onRemoveFromSubcategory && (
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); triggerDialogAction(() => setPendingRemove("subcategory")); }} 
                      className="gap-2 focus:bg-white/10 focus:text-white"
                      disabled={item.subcategoryIds.length === 0}
                    >
                      <FolderMinus className="w-3.5 h-3.5" /> Remove from Subcategory
                    </DropdownMenuItem>
                  )}
                  {onCategorize && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerDialogAction(() => onCategorize()); }} className="gap-2 focus:bg-white/10 focus:text-white">
                      <FolderPlus className="w-3.5 h-3.5" /> Categorize content
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleDelete} className="gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}

        <div className="p-3 flex flex-col gap-1.5">
          {categoryNames && (
            <p className="text-[var(--glass-muted)] text-[10px] font-medium uppercase tracking-wider truncate">{categoryNames}</p>
          )}
          <h3 className="font-semibold text-[var(--foreground)] text-sm leading-snug line-clamp-3">
            {item.heading}
          </h3>
          {item.description && (
            <p className="text-[var(--glass-muted)] text-xs line-clamp-2">{item.description}</p>
          )}
        </div>
      </div>

      <ContentDetailDialog 
        item={item} 
        open={detailOpen} 
        onOpenChange={setDetailOpen}
        onRemoveFromCategory={onRemoveFromCategory}
        onRemoveFromSubcategory={onRemoveFromSubcategory}
        onCategorize={onCategorize}
      />

      <EditContentDialog
        item={item}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-[var(--popover)] border-[var(--glass-border)] text-[var(--popover-foreground)] backdrop-blur-xl rounded-2xl max-w-[320px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--glass-muted)]">
              This action cannot be undone. This will permanently delete the content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row sm:justify-center w-full gap-2 mt-2">
            <AlertDialogCancel className="flex-1 py-2.5 rounded-xl bg-white/10 border-white/15 text-[var(--foreground)]/70 hover:bg-white/20 hover:text-[var(--foreground)] transition-all m-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all m-0">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingRemove} onOpenChange={(open) => !open && setPendingRemove(null)}>
        <AlertDialogContent className="bg-[var(--popover)] border-[var(--glass-border)] text-[var(--popover-foreground)] backdrop-blur-xl rounded-2xl max-w-[320px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from {pendingRemove}?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--glass-muted)]">
              {willBeUncategorized
                ? `Are you sure you want to remove this content from this ${pendingRemove}? This will be available in your setting uncategorized list.`
                : `Are you sure you want to remove this content from this ${pendingRemove}? It will still be available in your other categories.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row sm:justify-center w-full gap-2 mt-2">
            <AlertDialogCancel className="flex-1 py-2.5 rounded-xl bg-white/10 border-white/15 text-[var(--foreground)]/70 hover:bg-white/20 hover:text-[var(--foreground)] transition-all m-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (pendingRemove === "category" && onRemoveFromCategory) onRemoveFromCategory();
                if (pendingRemove === "subcategory" && onRemoveFromSubcategory) onRemoveFromSubcategory();
                setPendingRemove(null);
              }} 
              className={cn(
                "flex-1 py-2.5 rounded-xl transition-all m-0 border",
                willBeUncategorized
                  ? "bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                  : "bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30"
              )}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
