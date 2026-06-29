import { trpc } from "@/lib/trpc";
import type { Category, Subcategory } from "@shared/types";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

type AppDataContextValue = {
  categories: Category[] | undefined;
  allSubcategories: Subcategory[] | undefined;
  getCategoryLabel: (categoryIds: number[], subcategoryIds: number[]) => string;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

const STALE_MS = 5 * 60 * 1000;

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const { data: categories } = trpc.categories.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: STALE_MS,
  });

  const { data: allSubcategories } = trpc.subcategories.listAll.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: STALE_MS,
  });

  const value = useMemo<AppDataContextValue>(() => {
    const getCategoryLabel = (categoryIds: number[], subcategoryIds: number[]) => {
      const uniqueCategoryIds = new Set<number>(categoryIds);
      subcategoryIds.forEach(subId => {
        const sub = allSubcategories?.find(s => s.id === subId);
        if (sub) uniqueCategoryIds.add(sub.categoryId);
      });

      const names = Array.from(uniqueCategoryIds)
        .map(id => categories?.find(c => c.id === id)?.name)
        .filter(Boolean) as string[];

      if (names.length === 0) return "";
      if (names.length === 1) return names[0];
      return `${names[0]} +${names.length - 1}`;
    };

    return { categories, allSubcategories, getCategoryLabel };
  }, [categories, allSubcategories]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return ctx;
}
