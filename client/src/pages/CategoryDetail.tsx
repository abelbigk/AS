import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { ContentItem } from "@/types";
import { cn } from "@/lib/utils";
import ContentCard from "@/components/ContentCard";
import CroppedImage from "@/components/CroppedImage";
import EditCategoryDialog from "@/components/EditCategoryDialog";
import AddSubcategoryForm from "@/components/AddSubcategoryForm";
import AddContentForm from "@/components/AddContentForm";
import { useMemo, useState, useEffect, useRef } from "react";
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/SortableItem';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlusCircle, FilePlus, FolderMinus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, ArrowLeft, Loader2, ListChecks, X, Search, CheckCircle2 } from "lucide-react";
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

const HOTLINK_OK = ["images.unsplash.com", "res.cloudinary.com", "r2.dev"];
function imgSrc(url: string): string {
  // Don't proxy blob URLs - they're local browser references
  if (url.startsWith('blob:')) return url;
  
  try {
    const host = new URL(url).hostname;
    if (HOTLINK_OK.some(d => host.endsWith(d))) return url;
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  } catch { return url; }
}

const BG_IMAGE = "https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=80";

const CATEGORY_IMAGES: Record<string, string> = {
  "Movies": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=80",
  "Food": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80",
  "Place": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1600&q=80",
  "Must": "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=1600&q=80",
  "Quotes": "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1600&q=80",
  "Business and money management": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&q=80",
  "How to": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1600&q=80",
  "Health": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=80",
  "Workout": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80",
  "Her": "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1600&q=80",
  "Games": "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1600&q=80",
  "Home and Designs": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1600&q=80",
  "😈 Time": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80",
  "Ai and sites": "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1600&q=80",
  "Books": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1600&q=80",
  "Family": "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=1600&q=80",
  "Tech": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80",
};

export default function CategoryDetail() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/category/:id");
  const categoryId = params?.id ? parseInt(params.id) : null;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedContentIds, setSelectedContentIds] = useState<Set<number>>(new Set());
  const [batchRemoveConfirmOpen, setBatchRemoveConfirmOpen] = useState(false);
  const [isSubcategorySelectMode, setIsSubcategorySelectMode] = useState(false);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<Set<number>>(new Set());
  const [batchDeleteSubcategoriesConfirmOpen, setBatchDeleteSubcategoriesConfirmOpen] = useState(false);
  const [isTouchSelecting, setIsTouchSelecting] = useState(false);
  const [touchedItemsInSession, setTouchedItemsInSession] = useState<Set<number>>(new Set());
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const touchMoveHandlerRef = useRef<((e: TouchEvent) => void) | null>(null);
  
  const utils = trpc.useUtils();
  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      toast.success("Category deleted");
      navigate("/");
    },
  });

  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
      utils.content.listUncategorized.invalidate();
      toast.success("Content removed from category");
    }
  });

  const handleRemoveFromCategory = (item: ContentItem) => {
    if (!categoryId) return;
    // Only remove from this category, keep subcategory links intact
    updateContent.mutate({
      itemId: item.id,
      categoryIds: item.categoryIds.filter(id => id !== categoryId),
      subcategoryIds: item.subcategoryIds // Keep all subcategory links
    });
  };
  
  const batchRemove = trpc.content.batchRemoveFromCategory.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
      utils.content.listUncategorized.invalidate();
      toast.success("Contents removed from category");
      setIsSelectMode(false);
      setSelectedContentIds(new Set());
    }
  });

  const handleBatchRemove = () => {
    if (!categoryId || selectedContentIds.size === 0) return;
    batchRemove.mutate({
      itemIds: Array.from(selectedContentIds),
      categoryId,
    });
  };

  const deleteSubcategory = trpc.subcategories.delete.useMutation({
    onSuccess: () => {
      utils.subcategories.list.invalidate();
      toast.success("Subcategories deleted");
      setIsSubcategorySelectMode(false);
      setSelectedSubcategoryIds(new Set());
    },
    onError: (e) => toast.error(e.message || "Failed to delete subcategories"),
  });

  const handleBatchDeleteSubcategories = () => {
    if (selectedSubcategoryIds.size === 0) return;
    // Delete each subcategory
    Array.from(selectedSubcategoryIds).forEach(subcategoryId => {
      deleteSubcategory.mutate({ subcategoryId });
    });
  };

  const query = new URLSearchParams(window.location.search);
  const statusFilter = query.get("status") as "default" | "queued" | "done" | null;

  const { data: category } = trpc.categories.list.useQuery();
  const { data: allSubcategories } = trpc.subcategories.listAll.useQuery();
  const { data: subcategories, isLoading: subLoading } = trpc.subcategories.list.useQuery(
    { categoryId: categoryId || 0 },
    { enabled: !!categoryId }
  );
  const { data: content, isLoading: contentLoading } = trpc.content.listByCategory.useQuery(
    { categoryId: categoryId || 0 },
    { enabled: !!categoryId }
  );
  
  // Get accurate counts from subcategory content links
  const { data: subcategoryCounts } = trpc.subcategories.getContentCounts.useQuery(
    { categoryId: categoryId || 0 },
    { enabled: !!categoryId }
  );

  const currentCategory = category?.find(c => c.id === categoryId);
  const bgImage = imgSrc(currentCategory?.coverImageUrl
    || (currentCategory ? (CATEGORY_IMAGES[currentCategory.name] || BG_IMAGE) : BG_IMAGE));

  const filteredContent = useMemo(() => {
    if (!content) return [];
    if (!statusFilter) return content;
    return content.filter(item => item.status === statusFilter);
  }, [content, statusFilter]);

  const filteredSubcategories = useMemo(() => {
    if (!subcategories || !content) return [];
    if (!statusFilter) return subcategories;
    const subIdsWithStatus = new Set(
      content.filter(item => item.status === statusFilter)
             .flatMap(item => item.subcategoryIds)
    );
    return subcategories.filter(sub => subIdsWithStatus.has(sub.id));
  }, [subcategories, content, statusFilter]);

  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const displayedSubcategories = useMemo(() => {
    if (!searchQuery) return filteredSubcategories;
    const q = searchQuery.toLowerCase();
    return filteredSubcategories.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  }, [filteredSubcategories, searchQuery]);

  const displayedContent = useMemo(() => {
    if (!searchQuery) return filteredContent;
    const q = searchQuery.toLowerCase();
    return filteredContent.filter(item =>
      item.heading.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  }, [filteredContent, searchQuery]);

  const reorderSubMutation = trpc.subcategories.reorder.useMutation({
    onSuccess: () => {
      utils.subcategories.list.invalidate();
    }
  });

  const reorderContentMutation = trpc.content.reorderInCategory.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
    }
  });

  // Disable DnD sensors during select modes
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Touch selection handlers
  const handleTouchStart = (e: React.TouchEvent, itemId: number, type: 'content' | 'subcategory') => {
    if ((type === 'content' && isSelectMode) || (type === 'subcategory' && isSubcategorySelectMode)) {
      // Prevent default link/navigation behavior
      e.preventDefault();
      
      // Start a long-press timer (500ms)
      const timer = setTimeout(() => {
        setIsTouchSelecting(true);
        setTouchedItemsInSession(new Set([itemId]));
        
        // Toggle the item being touched
        if (type === 'content') {
          const newSet = new Set(selectedContentIds);
          if (newSet.has(itemId)) {
            newSet.delete(itemId);
          } else {
            newSet.add(itemId);
          }
          setSelectedContentIds(newSet);
        } else {
          const newSet = new Set(selectedSubcategoryIds);
          if (newSet.has(itemId)) {
            newSet.delete(itemId);
          } else {
            newSet.add(itemId);
          }
          setSelectedSubcategoryIds(newSet);
        }
      }, 500);
      
      setLongPressTimer(timer);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // If we're not in selecting mode yet, cancel the long-press timer (user is scrolling)
    if (!isTouchSelecting && longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      return;
    }
  };

  const handleTouchEnd = () => {
    // Clear the long-press timer if it's still running
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    setScrollDirection(null);
    setIsTouchSelecting(false);
    setTouchedItemsInSession(new Set());
  };

  // Auto-scroll effect based on scroll direction
  useEffect(() => {
    if (!scrollDirection) return;
    
    let animationFrameId: number;
    
    const scroll = () => {
      const scrollSpeed = 8;
      if (scrollDirection === 'up') {
        window.scrollBy(0, -scrollSpeed);
      } else if (scrollDirection === 'down') {
        window.scrollBy(0, scrollSpeed);
      }
      animationFrameId = requestAnimationFrame(scroll);
    };
    
    animationFrameId = requestAnimationFrame(scroll);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [scrollDirection]);

  // Add body styles to prevent all dragging/selection during touch selection
  useEffect(() => {
    if (isSelectMode || isSubcategorySelectMode) {
      const style = document.createElement('style');
      style.id = 'touch-selection-styles';
      style.textContent = `
        * {
          -webkit-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }
        img {
          -webkit-user-drag: none !important;
          user-drag: none !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        const existingStyle = document.getElementById('touch-selection-styles');
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, [isSelectMode, isSubcategorySelectMode]);

  // Setup native touch move handler with passive: false
  useEffect(() => {
    const handleNativeTouchMove = (e: TouchEvent) => {
      if (!isTouchSelecting) return;
      
      e.preventDefault();
      
      const touch = e.touches[0];
      const viewportHeight = window.innerHeight;
      const touchY = touch.clientY;
      
      // Auto-scroll when touch is near top or bottom of screen
      const scrollZone = 100;
      
      // Update scroll direction based on touch position
      if (touchY < scrollZone) {
        setScrollDirection('up');
      } else if (touchY > viewportHeight - scrollZone) {
        setScrollDirection('down');
      } else {
        setScrollDirection(null);
      }
      
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const card = element?.closest('[data-item-id]') as HTMLElement;
      
      if (card) {
        const itemId = parseInt(card.dataset.itemId || '0');
        const itemType = card.dataset.itemType as 'content' | 'subcategory';
        
        // Only toggle if we haven't touched this item in this session yet
        setTouchedItemsInSession(prev => {
          if (prev.has(itemId)) return prev;
          
          const newSet = new Set(prev);
          newSet.add(itemId);
          
          if (itemType === 'content' && isSelectMode) {
            setSelectedContentIds(current => {
              const newSelection = new Set(current);
              if (newSelection.has(itemId)) {
                newSelection.delete(itemId);
              } else {
                newSelection.add(itemId);
              }
              return newSelection;
            });
          } else if (itemType === 'subcategory' && isSubcategorySelectMode) {
            setSelectedSubcategoryIds(current => {
              const newSelection = new Set(current);
              if (newSelection.has(itemId)) {
                newSelection.delete(itemId);
              } else {
                newSelection.add(itemId);
              }
              return newSelection;
            });
          }
          
          return newSet;
        });
      }
    };

    const handleNativeTouchStart = (e: TouchEvent) => {
      if (!isTouchSelecting) return;
      // Prevent image drag, text selection, and other default behaviors during selection
      e.preventDefault();
    };
    
    // Always add the listener, but the function itself checks isTouchSelecting
    document.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    document.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', handleNativeTouchMove);
      document.removeEventListener('touchstart', handleNativeTouchStart);
    };
  }, [isTouchSelecting, isSelectMode, isSubcategorySelectMode]);

  function handleSubDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !categoryId) return;
    
    // Extract numeric IDs from prefixed strings
    const activeId = typeof active.id === 'string' ? parseInt(active.id.replace('sub-', '')) : active.id;
    const overId = typeof over.id === 'string' ? parseInt(over.id.replace('sub-', '')) : over.id;
    
    const oldIndex = filteredSubcategories.findIndex(item => item.id === activeId);
    const newIndex = filteredSubcategories.findIndex(item => item.id === overId);
    const newOrder = arrayMove(filteredSubcategories, oldIndex, newIndex);
    
    // Optimistically update the UI
    utils.subcategories.list.setData({ categoryId }, newOrder);
    
    // Send to server
    reorderSubMutation.mutate({ categoryId, subcategoryIds: newOrder.map(i => i.id) }, {
      onError: () => {
        // Revert on error
        utils.subcategories.list.invalidate();
        toast.error("Failed to save subcategory order");
      }
    });
  }

  function handleContentDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !categoryId) return;
    
    // Extract numeric IDs from prefixed strings
    const activeId = typeof active.id === 'string' ? parseInt(active.id.replace('content-', '')) : active.id;
    const overId = typeof over.id === 'string' ? parseInt(over.id.replace('content-', '')) : over.id;
    
    const oldIndex = filteredContent.findIndex(item => item.id === activeId);
    const newIndex = filteredContent.findIndex(item => item.id === overId);
    const newOrder = arrayMove(filteredContent, oldIndex, newIndex);
    
    // Optimistically update the UI
    utils.content.listByCategory.setData({ categoryId }, newOrder);
    
    // Send to server
    reorderContentMutation.mutate({ categoryId, contentIds: newOrder.map(i => i.id) }, {
      onError: () => {
        // Revert on error
        utils.content.listByCategory.invalidate();
        toast.error("Failed to save content order");
      }
    });
  }

  const batchCounts = useMemo(() => {
    const currentCatId = categoryId || 0;
    let uncategorizedCount = 0;
    let categorizedCount = 0;

    Array.from(selectedContentIds).forEach(id => {
      const item = content?.find(i => i.id === id);
      if (!item) return;

      const otherCats = item.categoryIds.filter(cId => cId !== currentCatId);
      const otherSubs = item.subcategoryIds.filter(subId => {
        const sub = allSubcategories?.find(s => s.id === subId);
        return sub && sub.categoryId !== currentCatId;
      });

      const willBeUnc = otherCats.length === 0 && otherSubs.length === 0;
      if (willBeUnc) {
        uncategorizedCount++;
      } else {
        categorizedCount++;
      }
    });

    return { uncategorizedCount, categorizedCount };
  }, [selectedContentIds, content, categoryId, allSubcategories]);

  if (!match || !categoryId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white/60">Category not found</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen page-enter">



      <div className="fixed inset-0 -z-10">
        <img src={bgImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 backdrop-blur-xl bg-[var(--background)]/60" />
      </div>

      {(subLoading || contentLoading) ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      ) : (

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => window.history.back()}
            className="flex items-center gap-2 text-[var(--glass-muted)] hover:text-[var(--foreground)] transition-colors mb-5 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center justify-between gap-4">
            {isSearchMode ? (
              <div className="relative flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--glass-muted)]" />
                  <input
                    type="text"
                    placeholder="Search in this category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-8 py-2 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--foreground)] placeholder:text-[var(--glass-muted)] focus:outline-none focus:border-[var(--foreground)]/20 transition-all text-sm shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--glass-muted)] hover:text-[var(--foreground)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { setIsSearchMode(false); setSearchQuery(""); }}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--glass-muted)] hover:text-[var(--foreground)] transition-colors active:scale-95 shadow-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-4xl md:text-5xl font-bold font-playfair text-[var(--foreground)] drop-shadow-lg truncate">
                  {currentCategory?.name}
                </h1>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsSearchMode(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--glass-muted)] hover:text-[var(--foreground)] transition-all border border-[var(--glass-border)] hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--glass-muted)] hover:text-[var(--foreground)] transition-all border border-[var(--glass-border)] hover:scale-105 active:scale-95 shadow-sm">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[var(--popover)] backdrop-blur-xl border-[var(--glass-border)] text-[var(--popover-foreground)]">
                      <DropdownMenuItem onClick={() => { 
                        // Blur after dropdown closes to prevent aria-hidden focus warning
                        requestAnimationFrame(() => {
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        });
                        setAddContentOpen(true); 
                      }} className="gap-2">
                        <FilePlus className="w-4 h-4" /> Add Content
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { 
                        requestAnimationFrame(() => {
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        });
                        setAddSubOpen(true); 
                      }} className="gap-2">
                        <PlusCircle className="w-4 h-4" /> Add Subcategory
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsSubcategorySelectMode(true)}
                        disabled={displayedSubcategories.length === 0}
                        className={cn(
                          "gap-2 border-b border-[var(--glass-border)] pb-2 mb-2",
                          displayedSubcategories.length === 0 && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <FolderMinus className="w-4 h-4" /> Remove Subcategories
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { 
                        requestAnimationFrame(() => {
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        });
                        setEditDialogOpen(true); 
                      }} className="gap-2">
                        <Pencil className="w-4 h-4" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { 
                        requestAnimationFrame(() => {
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        });
                        setDeleteConfirmOpen(true); 
                      }} className="gap-2 text-red-500">
                        <Trash2 className="w-4 h-4" /> Delete Category
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </div>

          <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <AlertDialogContent className="bg-[var(--popover)] border-[var(--glass-border)] text-[var(--popover-foreground)] backdrop-blur-xl rounded-2xl max-w-[320px]">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this category?</AlertDialogTitle>
                <AlertDialogDescription className="text-[var(--glass-muted)]">
                  This will permanently delete the category and all its contents.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row sm:justify-center w-full gap-2 mt-2">
                <AlertDialogCancel className="flex-1 py-2.5 rounded-xl bg-[var(--foreground)]/5 border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--foreground)]/10 transition-all m-0">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteCategory.mutate({ categoryId: categoryId! })} className="flex-1 py-2.5 rounded-xl bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30 transition-all m-0">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {statusFilter && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--glass-bg)] text-[var(--glass-muted)] text-[10px] font-bold uppercase tracking-widest mt-3 border border-[var(--glass-border)]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Filtering by: {statusFilter}
            </div>
          )}
          {currentCategory?.description && (
            <p className="text-[var(--foreground)]/80 text-lg mt-3 font-medium leading-relaxed max-w-xl">
              {currentCategory.description}
            </p>
          )}
          <p className="text-[var(--foreground)]/60 text-base mt-2">
            {filteredContent.length} item{filteredContent.length !== 1 ? "s" : ""}
            {statusFilter ? " shown" : ""}
            {filteredSubcategories.length > 0 && ` · ${filteredSubcategories.length} subcategories`}
          </p>
        </div>

        {displayedSubcategories.length === 0 && displayedContent.length === 0 && searchQuery.trim().length > 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-white/60 text-lg font-medium">No matches found</p>
            <p className="text-white/40 text-sm mt-1">Try a different keyword in this category.</p>
          </div>
        ) : (
          <>
            {/* Subcategory 2-column masonry grid */}
            {displayedSubcategories.length > 0 && (
              <div className="mb-8">
                <p className="text-white/50 text-xs uppercase tracking-wider font-medium mb-3">Subcategories</p>
                {!isSubcategorySelectMode ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubDragEnd}>
                    <SortableContext items={displayedSubcategories.map(s => `sub-${s.id}`)} strategy={rectSortingStrategy}>
                      <div className="flex gap-3 items-start">
                        {/* Left column: even indices */}
                        <div className="flex-1 flex flex-col gap-3">
                          {displayedSubcategories.filter((_, i) => i % 2 === 0).map((sub, index) => (
                            <SortableItem key={`sub-${sub.id}`} id={`sub-${sub.id}`}>
                              <div
                                data-item-id={sub.id}
                                data-item-type="subcategory"
                                style={{ animationDelay: `${index * 40}ms` }}
                                onClick={() => navigate(`/subcategory/${sub.id}${statusFilter ? `?status=${statusFilter}` : ""}`)}
                                className="stagger-item overflow-hidden rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] cursor-pointer group hover:border-[var(--foreground)]/20 transition-all active:scale-95 shadow-sm relative"
                              >
                                {sub.coverImageUrl ? (
                                  <div className="relative w-full overflow-hidden">
                                    <CroppedImage src={sub.coverImageUrl} cropData={sub.coverCropData} naturalRatio={true} className="w-full block group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                      <p className="text-white font-semibold text-sm">{sub.name}</p>
                                      {sub.description && <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{sub.description}</p>}
                                    </div>
                                    <div className="absolute top-2 right-2">
                                      <span className="bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-white/10 text-[10px] font-bold text-white/80">{subcategoryCounts?.[sub.id] || 0}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-4 min-h-[100px] flex items-end relative">
                                    <div className="absolute top-2 right-2">
                                      <span className="bg-[var(--foreground)]/5 px-1.5 py-0.5 rounded-full border border-[var(--glass-border)] text-[10px] font-bold text-[var(--glass-muted)]">{subcategoryCounts?.[sub.id] || 0}</span>
                                    </div>
                                    <div>
                                      <p className="text-[var(--foreground)] font-semibold text-sm">{sub.name}</p>
                                      {sub.description && <p className="text-[var(--glass-muted)] text-xs mt-0.5 line-clamp-2">{sub.description}</p>}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </SortableItem>
                          ))}
                        </div>
                        {/* Right column: odd indices */}
                        <div className="flex-1 flex flex-col gap-3">
                          {displayedSubcategories.filter((_, i) => i % 2 === 1).map((sub, index) => (
                            <SortableItem key={`sub-${sub.id}`} id={`sub-${sub.id}`}>
                              <div
                                data-item-id={sub.id}
                                data-item-type="subcategory"
                                style={{ animationDelay: `${index * 40}ms` }}
                                onClick={() => navigate(`/subcategory/${sub.id}${statusFilter ? `?status=${statusFilter}` : ""}`)}
                                className="stagger-item overflow-hidden rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] cursor-pointer group hover:border-[var(--foreground)]/20 transition-all active:scale-95 shadow-sm relative"
                              >
                                {sub.coverImageUrl ? (
                                  <div className="relative w-full overflow-hidden">
                                    <CroppedImage src={sub.coverImageUrl} cropData={sub.coverCropData} naturalRatio={true} className="w-full block group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                      <p className="text-white font-semibold text-sm">{sub.name}</p>
                                      {sub.description && <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{sub.description}</p>}
                                    </div>
                                    <div className="absolute top-2 right-2">
                                      <span className="bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-white/10 text-[10px] font-bold text-white/80">{subcategoryCounts?.[sub.id] || 0}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-4 min-h-[100px] flex items-end relative">
                                    <div className="absolute top-2 right-2">
                                      <span className="bg-[var(--foreground)]/5 px-1.5 py-0.5 rounded-full border border-[var(--glass-border)] text-[10px] font-bold text-[var(--glass-muted)]">{subcategoryCounts?.[sub.id] || 0}</span>
                                    </div>
                                    <div>
                                      <p className="text-[var(--foreground)] font-semibold text-sm">{sub.name}</p>
                                      {sub.description && <p className="text-[var(--glass-muted)] text-xs mt-0.5 line-clamp-2">{sub.description}</p>}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </SortableItem>
                          ))}
                        </div>
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div 
                    className="flex gap-3 items-start"
                    style={isTouchSelecting ? { 
                      touchAction: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none'
                    } : undefined}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {/* Left column: even indices */}
                    <div className="flex-1 flex flex-col gap-3">
                      {displayedSubcategories.filter((_, i) => i % 2 === 0).map((sub, index) => (
                        <div
                          key={sub.id}
                          data-item-id={sub.id}
                          data-item-type="subcategory"
                          style={{ animationDelay: `${index * 40}ms` }}
                          onTouchStart={(e) => handleTouchStart(e, sub.id, 'subcategory')}
                          onClick={() => {
                            const newSet = new Set(selectedSubcategoryIds);
                            if (newSet.has(sub.id)) newSet.delete(sub.id);
                            else newSet.add(sub.id);
                            setSelectedSubcategoryIds(newSet);
                          }}
                          className={cn(
                            "stagger-item overflow-hidden rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] cursor-pointer group hover:border-blue-500/50 transition-all active:scale-95 shadow-sm relative",
                            selectedSubcategoryIds.has(sub.id) && "ring-2 ring-blue-500 border-blue-500"
                          )}
                        >
                          <div className="absolute top-3 left-3 z-20">
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shadow-sm",
                              selectedSubcategoryIds.has(sub.id) ? "bg-blue-500 border-blue-500 text-white" : "bg-black/40 border-white/40 text-transparent backdrop-blur-md"
                            )}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          {sub.coverImageUrl ? (
                            <div className="relative w-full overflow-hidden">
                              <CroppedImage src={sub.coverImageUrl} cropData={sub.coverCropData} naturalRatio={true} className="w-full block group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-white font-semibold text-sm">{sub.name}</p>
                                {sub.description && <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{sub.description}</p>}
                              </div>
                              <div className="absolute top-2 right-2">
                                <span className="bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-white/10 text-[10px] font-bold text-white/80">{subcategoryCounts?.[sub.id] || 0}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 min-h-[100px] flex items-end relative">
                              <div className="absolute top-2 right-2">
                                <span className="bg-[var(--foreground)]/5 px-1.5 py-0.5 rounded-full border border-[var(--glass-border)] text-[10px] font-bold text-[var(--glass-muted)]">{subcategoryCounts?.[sub.id] || 0}</span>
                              </div>
                              <div>
                                <p className="text-[var(--foreground)] font-semibold text-sm">{sub.name}</p>
                                {sub.description && <p className="text-[var(--glass-muted)] text-xs mt-0.5 line-clamp-2">{sub.description}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Right column: odd indices */}
                    <div className="flex-1 flex flex-col gap-3">
                      {displayedSubcategories.filter((_, i) => i % 2 === 1).map((sub, index) => (
                        <div
                          key={sub.id}
                          data-item-id={sub.id}
                          data-item-type="subcategory"
                          style={{ animationDelay: `${index * 40}ms` }}
                          onTouchStart={(e) => handleTouchStart(e, sub.id, 'subcategory')}
                          onClick={() => {
                            const newSet = new Set(selectedSubcategoryIds);
                            if (newSet.has(sub.id)) newSet.delete(sub.id);
                            else newSet.add(sub.id);
                            setSelectedSubcategoryIds(newSet);
                          }}
                          className={cn(
                            "stagger-item overflow-hidden rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] cursor-pointer group hover:border-blue-500/50 transition-all active:scale-95 shadow-sm relative",
                            selectedSubcategoryIds.has(sub.id) && "ring-2 ring-blue-500 border-blue-500"
                          )}
                        >
                          <div className="absolute top-3 left-3 z-20">
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shadow-sm",
                              selectedSubcategoryIds.has(sub.id) ? "bg-blue-500 border-blue-500 text-white" : "bg-black/40 border-white/40 text-transparent backdrop-blur-md"
                            )}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          {sub.coverImageUrl ? (
                            <div className="relative w-full overflow-hidden">
                              <CroppedImage src={sub.coverImageUrl} cropData={sub.coverCropData} naturalRatio={true} className="w-full block group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-white font-semibold text-sm">{sub.name}</p>
                                {sub.description && <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{sub.description}</p>}
                              </div>
                              <div className="absolute top-2 right-2">
                                <span className="bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-white/10 text-[10px] font-bold text-white/80">{subcategoryCounts?.[sub.id] || 0}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 min-h-[100px] flex items-end relative">
                              <div className="absolute top-2 right-2">
                                <span className="bg-[var(--foreground)]/5 px-1.5 py-0.5 rounded-full border border-[var(--glass-border)] text-[10px] font-bold text-[var(--glass-muted)]">{subcategoryCounts?.[sub.id] || 0}</span>
                              </div>
                              <div>
                                <p className="text-[var(--foreground)] font-semibold text-sm">{sub.name}</p>
                                {sub.description && <p className="text-[var(--glass-muted)] text-xs mt-0.5 line-clamp-2">{sub.description}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2-column masonry content grid */}
            {displayedContent.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white/50 text-xs uppercase tracking-wider font-medium">Content</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-7 h-7 flex items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--glass-muted)] hover:text-[var(--foreground)] transition-all border border-[var(--glass-border)] hover:scale-105 active:scale-95 shadow-sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[var(--popover)] backdrop-blur-xl border-[var(--glass-border)] text-[var(--popover-foreground)]">
                      <DropdownMenuItem onClick={() => { 
                        requestAnimationFrame(() => {
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        });
                        setAddContentOpen(true); 
                      }} className="gap-2">
                        <FilePlus className="w-4 h-4" /> Add Content
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsSelectMode(true)}
                        className="gap-2"
                      >
                        <ListChecks className="w-4 h-4" /> Remove Contents
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {!isSelectMode ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleContentDragEnd}>
                  <SortableContext items={displayedContent.map(c => `content-${c.id}`)} strategy={rectSortingStrategy}>
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 flex flex-col gap-3">
                        {displayedContent.filter((_, i) => i % 2 === 0).map((item, index) => (
                          <SortableItem key={`content-${item.id}`} id={`content-${item.id}`}>
                            <div 
                              style={{ animationDelay: `${index * 40}ms` }} 
                              className="stagger-item"
                              data-item-id={item.id}
                              data-item-type="content"
                            >
                              <ContentCard
                                item={item}
                                onRemoveFromCategory={() => handleRemoveFromCategory(item)}
                                activeCategoryId={categoryId ?? undefined}
                                isSelectMode={false}
                                selected={false}
                                onToggleSelect={() => {}}
                              />
                            </div>
                          </SortableItem>
                        ))}
                      </div>
                      <div className="flex-1 flex flex-col gap-3">
                        {displayedContent.filter((_, i) => i % 2 === 1).map((item, index) => (
                          <SortableItem key={`content-${item.id}`} id={`content-${item.id}`}>
                            <div 
                              style={{ animationDelay: `${index * 40}ms` }} 
                              className="stagger-item"
                              data-item-id={item.id}
                              data-item-type="content"
                            >
                              <ContentCard
                                item={item}
                                onRemoveFromCategory={() => handleRemoveFromCategory(item)}
                                activeCategoryId={categoryId ?? undefined}
                                isSelectMode={false}
                                selected={false}
                                onToggleSelect={() => {}}
                              />
                            </div>
                          </SortableItem>
                        ))}
                      </div>
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div 
                  className="flex gap-3 items-start"
                  style={isTouchSelecting ? { 
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none'
                  } : undefined}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="flex-1 flex flex-col gap-3">
                    {displayedContent.filter((_, i) => i % 2 === 0).map((item, index) => (
                      <div 
                        key={item.id}
                        style={{ animationDelay: `${index * 40}ms` }} 
                        className="stagger-item"
                        data-item-id={item.id}
                        data-item-type="content"
                        onTouchStart={(e) => handleTouchStart(e, item.id, 'content')}
                      >
                        <ContentCard
                          item={item}
                          onRemoveFromCategory={() => handleRemoveFromCategory(item)}
                          activeCategoryId={categoryId ?? undefined}
                          isSelectMode={isSelectMode}
                          selected={selectedContentIds.has(item.id)}
                          onToggleSelect={() => {
                            const newSet = new Set(selectedContentIds);
                            if (newSet.has(item.id)) newSet.delete(item.id);
                            else newSet.add(item.id);
                            setSelectedContentIds(newSet);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    {displayedContent.filter((_, i) => i % 2 === 1).map((item, index) => (
                      <div 
                        key={item.id}
                        style={{ animationDelay: `${index * 40}ms` }} 
                        className="stagger-item"
                        data-item-id={item.id}
                        data-item-type="content"
                        onTouchStart={(e) => handleTouchStart(e, item.id, 'content')}
                      >
                        <ContentCard
                          item={item}
                          onRemoveFromCategory={() => handleRemoveFromCategory(item)}
                          activeCategoryId={categoryId ?? undefined}
                          isSelectMode={isSelectMode}
                          selected={selectedContentIds.has(item.id)}
                          onToggleSelect={() => {
                            const newSet = new Set(selectedContentIds);
                            if (newSet.has(item.id)) newSet.delete(item.id);
                            else newSet.add(item.id);
                            setSelectedContentIds(newSet);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-white/60 text-lg">No {statusFilter || ""} content here</p>
                {statusFilter && <p className="text-white/40 text-sm mt-2">Try viewing all items in the home page</p>}
              </div>
            )}
          </>
        )}

        {currentCategory && (
          <EditCategoryDialog 
            category={currentCategory} 
            open={editDialogOpen} 
            onOpenChange={setEditDialogOpen} 
          />
        )}

        {/* Add Subcategory Dialog */}
        <Dialog open={addSubOpen} onOpenChange={setAddSubOpen}>
          <DialogContent className="bg-zinc-950/95 backdrop-blur-xl border-white/10 text-white rounded-3xl max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 pb-2 shrink-0">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold font-playfair">Add Subcategory</DialogTitle>
                <DialogDescription className="text-white/40 text-xs">
                  Create a new sub-grouping within {currentCategory?.name}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="p-6 pt-0 overflow-y-auto flex-1 custom-scrollbar">
              <AddSubcategoryForm 
                initialCategoryId={categoryId?.toString()} 
                onSubcategoryCreated={() => setAddSubOpen(false)} 
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Content Dialog */}
        <Dialog open={addContentOpen} onOpenChange={setAddContentOpen}>
          <DialogContent className="bg-zinc-950/95 backdrop-blur-xl border-white/10 text-white rounded-3xl max-w-lg p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 pb-2 shrink-0">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold font-playfair">Add Content</DialogTitle>
                <DialogDescription className="text-white/40 text-xs">
                  Upload photos, videos or link existing items
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="p-6 pt-0 overflow-y-auto flex-1 custom-scrollbar">
              <AddContentForm 
                initialCategoryId={categoryId?.toString()} 
                onContentAdded={() => setAddContentOpen(false)} 
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      )}

      {isSelectMode && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--glass-border)] rounded-full px-6 py-3 flex items-center gap-6 shadow-xl z-[60] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <span className="text-sm font-medium">{selectedContentIds.size} selected</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const allIds = new Set(displayedContent.map(item => item.id));
                setSelectedContentIds(allIds);
              }}
              className="text-sm font-medium text-blue-500 hover:text-blue-600 px-3 py-1.5 transition-colors"
            >
              Select All
            </button>
            <button onClick={() => { setIsSelectMode(false); setSelectedContentIds(new Set()); }} className="text-sm font-medium text-[var(--glass-muted)] hover:text-[var(--foreground)] px-3 py-1.5 transition-colors">
              Cancel
            </button>
            <button 
              onClick={() => setBatchRemoveConfirmOpen(true)} 
              disabled={selectedContentIds.size === 0 || batchRemove.isPending}
              className={cn(
                "disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-full flex items-center gap-2 transition-colors",
                (batchCounts.uncategorizedCount > 0)
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-orange-500 hover:bg-orange-600"
              )}
            >
              {batchRemove.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Remove
            </button>
          </div>
        </div>
      )}

      {isSubcategorySelectMode && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--glass-border)] rounded-full px-6 py-3 flex items-center gap-6 shadow-xl z-[60] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <span className="text-sm font-medium">{selectedSubcategoryIds.size} selected</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const allIds = new Set(displayedSubcategories.map(sub => sub.id));
                setSelectedSubcategoryIds(allIds);
              }}
              className="text-sm font-medium text-blue-500 hover:text-blue-600 px-3 py-1.5 transition-colors"
            >
              Select All
            </button>
            <button onClick={() => { setIsSubcategorySelectMode(false); setSelectedSubcategoryIds(new Set()); }} className="text-sm font-medium text-[var(--glass-muted)] hover:text-[var(--foreground)] px-3 py-1.5 transition-colors">
              Cancel
            </button>
            <button 
              onClick={() => setBatchDeleteSubcategoriesConfirmOpen(true)} 
              disabled={selectedSubcategoryIds.size === 0}
              className="disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-full flex items-center gap-2 transition-colors bg-red-500 hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      <AlertDialog open={batchRemoveConfirmOpen} onOpenChange={setBatchRemoveConfirmOpen}>
        <AlertDialogContent className="bg-[var(--popover)] border-[var(--glass-border)] text-[var(--popover-foreground)] backdrop-blur-xl rounded-2xl max-w-[345px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedContentIds.size} items?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--glass-muted)] text-sm">
              {batchCounts.uncategorizedCount > 0 && batchCounts.categorizedCount > 0
                ? "Are you sure you want to remove these selected items? Some will be uncategorized and available in your setting uncategorized list, while others will still be available in other categories they existed."
                : batchCounts.uncategorizedCount > 0
                  ? "Are you sure you want to remove these selected items? This will make them uncategorized and available in your setting uncategorized list."
                  : "Are you sure you want to remove these selected items? They will still be available in your other categories."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row sm:justify-center w-full gap-2 mt-2">
            <AlertDialogCancel className="flex-1 py-2.5 rounded-xl bg-[var(--foreground)]/5 border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--foreground)]/10 transition-all m-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBatchRemove} 
              className={cn(
                "flex-1 py-2.5 rounded-xl transition-all m-0 border",
                (batchCounts.uncategorizedCount > 0)
                  ? "bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                  : "bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30"
              )}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={batchDeleteSubcategoriesConfirmOpen} onOpenChange={setBatchDeleteSubcategoriesConfirmOpen}>
        <AlertDialogContent className="bg-[var(--popover)] border-[var(--glass-border)] text-[var(--popover-foreground)] backdrop-blur-xl rounded-2xl max-w-[345px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedSubcategoryIds.size} subcategor{selectedSubcategoryIds.size === 1 ? 'y' : 'ies'}?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--glass-muted)] text-sm">
              This action cannot be undone. This will permanently delete the selected subcategor{selectedSubcategoryIds.size === 1 ? 'y' : 'ies'} and their cover images. All content linked to {selectedSubcategoryIds.size === 1 ? 'it' : 'them'} will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row sm:justify-center w-full gap-2 mt-2">
            <AlertDialogCancel className="flex-1 py-2.5 rounded-xl bg-[var(--foreground)]/5 border-[var(--glass-border)] text-[var(--foreground)] hover:bg-[var(--foreground)]/10 transition-all m-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                handleBatchDeleteSubcategories();
                setBatchDeleteSubcategoriesConfirmOpen(false);
              }} 
              disabled={deleteSubcategory.isPending}
              className="flex-1 py-2.5 rounded-xl transition-all m-0 border bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
            >
              {deleteSubcategory.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

