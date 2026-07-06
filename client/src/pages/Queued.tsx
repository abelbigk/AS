import { trpc } from "@/lib/trpc";
import { Loader2, ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";
import CategoryCard from "@/components/CategoryCard";

const DARK_IMAGE = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80";
const LIGHT_IMAGE = "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1600&q=80";

export default function Queued() {
  const [, navigate] = useLocation();
  const { data: items, isLoading: itemsLoading } = trpc.content.listByStatus.useQuery("queued");
  const { data: categories, isLoading: catsLoading } = trpc.categories.list.useQuery();

  const { data: allSubcategories, isLoading: subsLoading } = trpc.subcategories.list.useQuery({ categoryId: 0 });

  const groupedData = useMemo(() => {
    if (!items || !categories || !allSubcategories) return [];
    
    const catMap = new Map<number, { category: any; subIds: Set<number>; count: number }>();
    
    items.forEach(item => {
      // Find all categories this item belongs to, either directly or via a subcategory
      const relevantCatIds = new Set<number>(item.categoryIds);
      
      const itemSubcategories = item.subcategoryIds
        .map(subId => allSubcategories.find(s => s.id === subId))
        .filter(Boolean);
        
      itemSubcategories.forEach(sub => {
        if (sub) relevantCatIds.add(sub.categoryId);
      });
      
      relevantCatIds.forEach(catId => {
        if (!catMap.has(catId)) {
          const cat = categories.find(c => c.id === catId);
          if (cat) {
            catMap.set(catId, { category: cat, subIds: new Set(), count: 0 });
          }
        }
        const group = catMap.get(catId);
        if (group) {
          // Check if this item is in any subcategory belonging to this specific category
          const subsInThisCat = itemSubcategories.filter(sub => sub!.categoryId === catId);
          
          if (subsInThisCat.length > 0) {
            // It's in a subcategory, so add to subIds but DO NOT increment direct count
            subsInThisCat.forEach(sub => group.subIds.add(sub!.id));
          } else {
            // It's directly in the category, so increment count
            group.count++;
          }
        }
      });
    });

    return Array.from(catMap.values()).sort((a, b) => b.count - a.count);
  }, [items, categories, allSubcategories]);

  const isLoading = itemsLoading || catsLoading || subsLoading;

  return (
    <div className="relative min-h-screen page-enter">
      {/* Blurred background */}
      <div className="fixed inset-0 -z-10">
        {/* Dark mode background — misty mountain cliff */}
        <img src={DARK_IMAGE} alt="" className="hidden dark:block w-full h-full object-cover" />
        <div className="hidden dark:block absolute inset-0 backdrop-blur-xl bg-black/55" />
        {/* Light mode background — bright airy coastal resort */}
        <img src={LIGHT_IMAGE} alt="" className="block dark:hidden w-full h-full object-cover" />
        <div className="block dark:hidden absolute inset-0 backdrop-blur-xl bg-white/65" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      ) : (

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        {/* Header */}
        <div className="mb-10 pt-2 text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-playfair text-gray-900 dark:text-white drop-shadow-lg">
            Queue Overview
          </h1>
        </div>

        {/* Content */}
        {groupedData.length > 0 ? (
          <div className="space-y-8">
            {groupedData.map((group, index) => (
              <div key={group.category.id} style={{ animationDelay: `${index * 50}ms` }} className="stagger-item space-y-3">
                <CategoryCard 
                  category={group.category} 
                  contentCount={group.count}
                  onClick={() => navigate(`/category/${group.category.id}?status=queued`)} 
                />
                
                {group.subIds.size > 0 && (
                  <div className="pl-4 border-l-2 border-gray-300 dark:border-white/10 space-y-2">
                    <p className="text-gray-400 dark:text-white/30 text-[10px] uppercase tracking-widest font-bold ml-1 mb-1">Subcategories</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(group.subIds).map(subId => (
                        <SubcategoryPill 
                          key={subId} 
                          subId={subId} 
                          status="queued"
                          count={items?.filter(i => i.subcategoryIds.includes(subId)).length || 0}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-gray-600 dark:text-white/60 text-lg">Nothing queued yet</p>
            <p className="text-gray-400 dark:text-white/40 text-sm mt-2">Queue items to see them grouped here</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function SubcategoryPill({ subId, count, status }: { subId: number; count: number; status?: string }) {
  const [, navigate] = useLocation();
  const { data: sub } = trpc.subcategories.getById.useQuery({ subcategoryId: subId });
  
  if (!sub) return null;
  
  return (
    <button 
      onClick={() => navigate(`/subcategory/${sub.id}${status ? `?status=${status}` : ""}`)}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all text-xs group"
    >
      <span className="font-medium">{sub.name}</span>
      <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-[9px] font-bold group-hover:bg-gray-300 dark:group-hover:bg-white/20">
        {count}
      </span>
      <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
    </button>
  );
}
