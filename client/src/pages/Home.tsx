import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, Check, X, Search, ArrowLeft } from "lucide-react";
import CategoryCard from "@/components/CategoryCard";
import ContentCard from "@/components/ContentCard";
import CroppedImage from "@/components/CroppedImage";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/SortableItem';

const DARK_IMAGE = "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80";
const LIGHT_IMAGE = "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&q=80";

export default function Home() {
  const [, navigate] = useLocation();
  const { data: categoriesData, isLoading } = trpc.categories.list.useQuery();
  
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allSubcategories } = trpc.subcategories.listAll.useQuery(undefined, { enabled: isSearchMode });
  const { data: searchContentsData, isLoading: searchContentsLoading } = trpc.content.search.useQuery(
    { query: searchQuery },
    { enabled: isSearchMode && searchQuery.trim().length > 0 }
  );

  // Use categoriesData directly for display
  const categories = categoriesData || [];

  const matchingCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const matchingSubcategories = allSubcategories?.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const matchingContents = searchContentsData || [];

  const trpcContext = trpc.useContext();
  const reorderMutation = trpc.categories.reorder.useMutation({
    onSuccess: () => {
      trpcContext.categories.list.invalidate();
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    // Get current order
    const oldIndex = categories.findIndex(item => item.id === active.id);
    const newIndex = categories.findIndex(item => item.id === over.id);
    const newOrder = arrayMove(categories, oldIndex, newIndex);
    
    // Optimistically update the UI
    trpcContext.categories.list.setData(undefined, newOrder);
    
    // Send to server
    reorderMutation.mutate({ categoryIds: newOrder.map(c => c.id) }, {
      onError: () => {
        // Revert on error
        trpcContext.categories.list.invalidate();
        toast.error("Failed to save order");
      }
    });
  }

  return (
    <div className="relative min-h-screen page-enter">
      {/* Full-page blurred background */}
      <div className="fixed inset-0 -z-10">
        <img src={DARK_IMAGE} alt="" className="hidden dark:block w-full h-full object-cover" />
        <div className="hidden dark:block absolute inset-0 backdrop-blur-xl bg-black/50" />
        <img src={LIGHT_IMAGE} alt="" className="block dark:hidden w-full h-full object-cover" />
        <div className="block dark:hidden absolute inset-0 backdrop-blur-xl bg-white/65" />
      </div>

      {isSearchMode ? (
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
          {/* Header Search Input */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => {
                setIsSearchMode(false);
                setSearchQuery("");
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--glass-muted)] hover:text-[var(--foreground)] transition-all border border-[var(--glass-border)] shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--glass-muted)]" />
              <input
                type="text"
                placeholder="Search categories, subcategories, content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-10 pr-10 py-2.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--foreground)] placeholder:text-[var(--glass-muted)] focus:outline-none focus:border-[var(--foreground)]/25 transition-all text-sm shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--glass-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchQuery.trim().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-[var(--glass-muted)] text-base font-medium">Search for everything</p>
              <p className="text-[var(--glass-muted)]/60 text-xs mt-1">Find categories, subcategories, or contents by name and description.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Categories Section */}
              {matchingCategories.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[var(--glass-muted)] font-bold mb-3">Categories ({matchingCategories.length})</h3>
                  <div className="flex flex-col gap-3">
                    {matchingCategories.map((category) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        onClick={() => navigate(`/category/${category.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Subcategories Section */}
              {matchingSubcategories.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[var(--glass-muted)] font-bold mb-3">Subcategories ({matchingSubcategories.length})</h3>
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 flex flex-col gap-3">
                      {matchingSubcategories.filter((_, i) => i % 2 === 0).map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => navigate(`/subcategory/${sub.id}`)}
                          className="overflow-hidden rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] cursor-pointer group hover:border-[var(--foreground)]/20 transition-all active:scale-95 shadow-sm"
                        >
                          {sub.coverImageUrl ? (
                            <div className="relative w-full overflow-hidden">
                              <CroppedImage src={sub.coverImageUrl} cropData={sub.coverCropData} naturalRatio={true} className="w-full block group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-white font-semibold text-sm">{sub.name}</p>
                                {sub.description && <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{sub.description}</p>}
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 min-h-[100px] flex items-end relative">
                              <div>
                                <p className="text-[var(--foreground)] font-semibold text-sm">{sub.name}</p>
                                {sub.description && <p className="text-[var(--glass-muted)] text-xs mt-0.5 line-clamp-2">{sub.description}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                      {matchingSubcategories.filter((_, i) => i % 2 === 1).map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => navigate(`/subcategory/${sub.id}`)}
                          className="overflow-hidden rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] cursor-pointer group hover:border-[var(--foreground)]/20 transition-all active:scale-95 shadow-sm"
                        >
                          {sub.coverImageUrl ? (
                            <div className="relative w-full overflow-hidden">
                              <CroppedImage src={sub.coverImageUrl} cropData={sub.coverCropData} naturalRatio={true} className="w-full block group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-white font-semibold text-sm">{sub.name}</p>
                                {sub.description && <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{sub.description}</p>}
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 min-h-[100px] flex items-end relative">
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
                </div>
              )}

              {/* Contents Section */}
              {searchContentsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--glass-muted)]" />
                </div>
              ) : matchingContents.length > 0 ? (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[var(--glass-muted)] font-bold mb-3">Contents ({matchingContents.length})</h3>
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 flex flex-col gap-3">
                      {matchingContents.filter((_, i) => i % 2 === 0).map((item) => (
                        <ContentCard
                          key={item.id}
                          item={item}
                        />
                      ))}
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                      {matchingContents.filter((_, i) => i % 2 === 1).map((item) => (
                        <ContentCard
                          key={item.id}
                          item={item}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* No results state */}
              {matchingCategories.length === 0 &&
               matchingSubcategories.length === 0 &&
               !searchContentsLoading &&
               matchingContents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-[var(--glass-muted)] text-base font-medium">No results found</p>
                  <p className="text-[var(--glass-muted)]/60 text-xs mt-1">Try typing a different search query.</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          ) : (
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
              {/* Header */}
              <div className="mb-10 pt-2 flex items-start justify-between">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold font-playfair text-[var(--foreground)] drop-shadow-lg">
                    My
                  </h1>
                  <p className="text-[var(--glass-muted)] text-base mt-2">
                    {categories?.length || 0} categories
                  </p>
                </div>
                <button
                  onClick={() => setIsSearchMode(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--glass-muted)] hover:text-[var(--foreground)] transition-all border border-[var(--glass-border)] shadow-sm hover:scale-105 active:scale-95"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>

              {/* Categories List */}
              {categories && categories.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={categories.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-3">
                      {categories.map((category, index) => (
                        <SortableItem key={category.id} id={category.id}>
                          <div style={{ animationDelay: `${index * 40}ms` }} className="stagger-item">
                            <CategoryCard
                              category={category}
                              onClick={() => navigate(`/category/${category.id}`)}
                              contentCount={0}
                            />
                          </div>
                        </SortableItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="flex flex-col items-center justify-center py-20">
                  <p className="text-white/60 text-lg">No categories yet</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
