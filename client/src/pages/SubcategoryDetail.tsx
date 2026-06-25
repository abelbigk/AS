import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { ContentItem } from "@/types";
import { Loader2, ArrowLeft, MoreHorizontal, Pencil, Trash2, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import ContentCard from "@/components/ContentCard";
import CroppedImage from "@/components/CroppedImage";
import EditSubcategoryDialog from "@/components/EditSubcategoryDialog";
import AddContentForm from "@/components/AddContentForm";
import { useMemo, useState, useEffect, useRef } from "react";
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/SortableItem';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FilePlus, Check, X, Search } from "lucide-react";
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

export default function SubcategoryDetail() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/subcategory/:id");
  const subcategoryId = params?.id ? parseInt(params.id) : null;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedContentIds, setSelectedContentIds] = useState<Set<number>>(new Set());
  const [batchRemoveConfirmOpen, setBatchRemoveConfirmOpen] = useState(false);
  const [isTouchSelecting, setIsTouchSelecting] = useState(false);
  const [touchedItemsInSession, setTouchedItemsInSession] = useState<Set<number>>(new Set());
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const touchMoveHandlerRef = useRef<((e: TouchEvent) => void) | null>(null);
  
  const utils = trpc.useUtils();
  const deleteSubcategory = trpc.subcategories.delete.useMutation({
    onSuccess: () => {
      utils.subcategories.list.invalidate();
      toast.success("Subcategory deleted");
      window.history.back();
    },
  });

  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => {
      utils.content.listBySubcategory.invalidate();
      utils.content.listUncategorized.invalidate();
      toast.success("Content removed from subcategory");
    }
  });

  const handleRemoveFromSubcategory = (item: ContentItem) => {
    if (!subcategoryId || !subcategory) return;
    // Only remove from this subcategory, keep category link intact
    updateContent.mutate({
      itemId: item.id,
      categoryIds: item.categoryIds, // Keep all category links
      subcategoryIds: item.subcategoryIds.filter(id => id !== subcategoryId)
    });
  };
  
  const batchRemove = trpc.content.batchRemoveFromSubcategory.useMutation({
    onSuccess: () => {
      utils.content.listBySubcategory.invalidate();
      utils.content.listUncategorized.invalidate();
      toast.success("Contents removed from subcategory");
      setIsSelectMode(false);
      setSelectedContentIds(new Set());
    }
  });

  const handleBatchRemove = () => {
    if (!subcategoryId || selectedContentIds.size === 0) return;
    batchRemove.mutate({
      itemIds: Array.from(selectedContentIds),
      subcategoryId,
    });
  };

  const query = new URLSearchParams(window.location.search);
  const statusFilter = query.get("status") as "default" | "queued" | "done" | null;

  const { data: subcategory, isLoading: subLoading } = trpc.subcategories.getById.useQuery(
    { subcategoryId: subcategoryId || 0 },
    { enabled: !!subcategoryId }
  );
  
  const { data: content, isLoading: contentLoading } = trpc.content.listBySubcategory.useQuery(
    { subcategoryId: subcategoryId || 0 },
    { enabled: !!subcategoryId }
  );

  const filteredContent = useMemo(() => {
    if (!content) return [];
    if (!statusFilter) return content;
    return content.filter(item => item.status === statusFilter);
  }, [content, statusFilter]);

  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const displayedContent = useMemo(() => {
    if (!searchQuery) return filteredContent;
    const q = searchQuery.toLowerCase();
    return filteredContent.filter(item =>
      item.heading.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  }, [filteredContent, searchQuery]);

  const reorderContentMutation = trpc.content.reorderInSubcategory.useMutation({
    onSuccess: () => {
      utils.content.listBySubcategory.invalidate();
    }
  });

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
  const handleTouchStart = (e: React.TouchEvent, itemId: number) => {
    if (isSelectMode) {
      // Prevent default link/navigation behavior
      e.preventDefault();
      
      // Start a long-press timer (500ms)
      const timer = setTimeout(() => {
        setIsTouchSelecting(true);
        setTouchedItemsInSession(new Set([itemId]));
        
        // Toggle the item being touched
        const newSet = new Set(selectedContentIds);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        setSelectedContentIds(newSet);
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
    if (isSelectMode) {
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
  }, [isSelectMode]);

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
      
      if (card && isSelectMode) {
        const itemId = parseInt(card.dataset.itemId || '0');
        
        // Only toggle if we haven't touched this item in this session yet
        setTouchedItemsInSession(prev => {
          if (prev.has(itemId)) return prev;
          
          const newSet = new Set(prev);
          newSet.add(itemId);
          
          setSelectedContentIds(current => {
            const newSelection = new Set(current);
            if (newSelection.has(itemId)) {
              newSelection.delete(itemId);
            } else {
              newSelection.add(itemId);
            }
            return newSelection;
          });
          
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
  }, [isTouchSelecting, isSelectMode]);

  function handleContentDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !subcategoryId) return;
    
    // Extract numeric IDs from prefixed strings
    const activeId = typeof active.id === 'string' ? parseInt(active.id.replace('content-', '')) : active.id;
    const overId = typeof over.id === 'string' ? parseInt(over.id.replace('content-', '')) : over.id;
    
    const oldIndex = filteredContent.findIndex(item => item.id === activeId);
    const newIndex = filteredContent.findIndex(item => item.id === overId);
    const newOrder = arrayMove(filteredContent, oldIndex, newIndex);
    
    // Optimistically update the UI
    utils.content.listBySubcategory.setData({ subcategoryId }, newOrder);
    
    // Send to server
    reorderContentMutation.mutate({ subcategoryId, contentIds: newOrder.map(i => i.id) }, {
      onError: () => {
        // Revert on error
        utils.content.listBySubcategory.invalidate();
        toast.error("Failed to save order");
      }
    });
  }

  const batchCounts = useMemo(() => {
    const currentSubId = subcategoryId || 0;
    const parentCatId = subcategory?.categoryId;
    let uncategorizedCount = 0;
    let categorizedCount = 0;

    Array.from(selectedContentIds).forEach(id => {
      const item = content?.find(i => i.id === id);
      if (!item) return;

      const otherSubs = item.subcategoryIds.filter(sId => sId !== currentSubId);
      const otherCats = item.categoryIds;

      const willBeUnc = otherSubs.length === 0 && otherCats.length === 0;
      if (willBeUnc) {
        uncategorizedCount++;
      } else {
        categorizedCount++;
      }
    });

    return { uncategorizedCount, categorizedCount };
  }, [selectedContentIds, content, subcategoryId, subcategory]);

  const deleteCounts = useMemo(() => {
    if (!content || !subcategory || !subcategoryId) return { uncategorizedCount: 0, categorizedCount: 0 };
    let uncategorizedCount = 0;
    let categorizedCount = 0;

    content.forEach(item => {
      const otherSubs = item.subcategoryIds.filter(sId => sId !== subcategoryId);
      const otherCats = item.categoryIds;

      const willBeUnc = otherSubs.length === 0 && otherCats.length === 0;
      if (willBeUnc) {
        uncategorizedCount++;
      } else {
        categorizedCount++;
      }
    });

    return { uncategorizedCount, categorizedCount };
  }, [content, subcategory, subcategoryId]);

  const bgImage = subcategory?.coverImageUrl ? imgSrc(subcategory.coverImageUrl) : BG_IMAGE;

  if (!match || !subcategoryId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white/60">Subcategory not found</p>
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
                    placeholder="Search in this subcategory..."
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
                  {subcategory?.name}
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
                        requestAnimationFrame(() => {
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        });
                        setAddContentOpen(true); 
                      }} className="gap-2 focus:bg-white/10 focus:text-white border-b border-white/5 pb-2 mb-2">
                        <FilePlus className="w-4 h-4" /> Add Content
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsSelectMode(true)}
                        disabled={filteredContent.length === 0}
                        className={cn(
                          "gap-2 focus:bg-white/10 focus:text-white border-b border-white/5 pb-2 mb-2",
                          filteredContent.length === 0 && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <ListChecks className="w-4 h-4" /> Remove Contents
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { 
                        requestAnimationFrame(() => {
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        });
                        setEditDialogOpen(true); 
                      }} className="gap-2 focus:bg-white/10 focus:text-white">
                        <Pencil className="w-4 h-4" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { 
                        requestAnimationFrame(() => {
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        });
                        setDeleteConfirmOpen(true); 
                      }} className="gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400">
                        <Trash2 className="w-4 h-4" /> Delete Subcategory
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </div>

          <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <AlertDialogContent className="bg-zinc-950 border-white/10 text-white backdrop-blur-xl rounded-2xl max-w-[340px]">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this subcategory?</AlertDialogTitle>
                <AlertDialogDescription className="text-white/60 text-sm">
                  {deleteCounts.uncategorizedCount > 0
                    ? "This will permanently delete the subcategory and any content items that exist only in this subcategory. Other items will remain in their other categories."
                    : "This will permanently delete the subcategory. All contents inside will still be available in their other categories."
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row sm:justify-center w-full gap-2 mt-2">
                <AlertDialogCancel className="flex-1 py-2.5 rounded-xl bg-white/10 border-white/15 text-white/70 hover:bg-white/20 hover:text-white transition-all m-0">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteSubcategory.mutate({ subcategoryId: subcategoryId! })}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl transition-all m-0 border",
                    deleteCounts.uncategorizedCount > 0
                      ? "bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                      : "bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30"
                  )}
                >
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
          {subcategory?.description && (
            <p className="text-[var(--foreground)]/80 text-lg mt-3 font-medium leading-relaxed max-w-xl">
              {subcategory.description}
            </p>
          )}
          <p className="text-[var(--glass-muted)] text-base mt-2">
            {filteredContent.length} item{filteredContent.length !== 1 ? "s" : ""}
            {statusFilter ? " shown" : ""}
          </p>
        </div>

        {/* Pinterest-style 2-column masonry grid */}
        {displayedContent.length === 0 && searchQuery.trim().length > 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[var(--glass-muted)] text-base font-medium">No matches found</p>
            <p className="text-[var(--glass-muted)]/60 text-xs mt-1">Try a different keyword in this subcategory.</p>
          </div>
        ) : displayedContent.length > 0 ? (
          !isSelectMode ? (
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
                            onRemoveFromSubcategory={() => handleRemoveFromSubcategory(item)}
                            activeSubcategoryId={subcategoryId ?? undefined}
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
                            onRemoveFromSubcategory={() => handleRemoveFromSubcategory(item)}
                            activeSubcategoryId={subcategoryId ?? undefined}
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
                    onTouchStart={(e) => handleTouchStart(e, item.id)}
                  >
                    <ContentCard
                      item={item}
                      onRemoveFromSubcategory={() => handleRemoveFromSubcategory(item)}
                      activeSubcategoryId={subcategoryId ?? undefined}
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
                    onTouchStart={(e) => handleTouchStart(e, item.id)}
                  >
                    <ContentCard
                      item={item}
                      onRemoveFromSubcategory={() => handleRemoveFromSubcategory(item)}
                      activeSubcategoryId={subcategoryId ?? undefined}
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
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-[var(--glass-muted)] text-lg">No {statusFilter || ""} content here</p>
          </div>
        )}

        {subcategory && (
          <EditSubcategoryDialog 
            subcategory={subcategory} 
            open={editDialogOpen} 
            onOpenChange={setEditDialogOpen} 
          />
        )}

        {/* Add Content Dialog */}
        <Dialog open={addContentOpen} onOpenChange={setAddContentOpen}>
          <DialogContent className="bg-[var(--popover)]/95 backdrop-blur-xl border-[var(--glass-border)] text-[var(--popover-foreground)] rounded-3xl max-w-lg p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 pb-2 shrink-0">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold font-playfair">Add Content</DialogTitle>
                <DialogDescription className="text-[var(--glass-muted)] text-xs">
                  Upload photos, videos or link existing items to {subcategory?.name}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="p-6 pt-0 overflow-y-auto flex-1 custom-scrollbar">
              <AddContentForm 
                initialSubcategoryId={subcategoryId?.toString()}
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
    </div>
  );
}

