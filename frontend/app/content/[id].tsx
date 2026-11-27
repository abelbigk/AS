import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ContentDetailView } from "../../src/components/ContentDetailModal";
import { trpc } from "../../src/lib/trpc";

export default function ContentDetailPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const params = useLocalSearchParams<{
    id: string;
    activeCategoryId?: string;
    activeSubcategoryId?: string;
  }>();

  const itemId = Number(params.id || 0);
  const activeCategoryId = params.activeCategoryId ? Number(params.activeCategoryId) : undefined;
  const activeSubcategoryId = params.activeSubcategoryId ? Number(params.activeSubcategoryId) : undefined;

  const removeFromCategory = trpc.content.batchRemoveFromCategory.useMutation({
    onSuccess: () => {
      if (activeCategoryId) utils.content.listByCategory.invalidate({ categoryId: activeCategoryId });
      utils.content.listByStatus.invalidate();
      utils.content.listUncategorized.invalidate();
    },
  });

  const removeFromSubcategory = trpc.content.batchRemoveFromSubcategory.useMutation({
    onSuccess: () => {
      if (activeSubcategoryId) utils.content.listBySubcategory.invalidate({ subcategoryId: activeSubcategoryId });
      utils.subcategories.getContentCounts.invalidate();
      utils.content.listByStatus.invalidate();
      utils.content.listUncategorized.invalidate();
    },
  });

  if (!itemId) return null;

  return (
    <ContentDetailView
      item={{ id: itemId, userId: 0, heading: "", status: "default" }}
      visible={true}
      activeCategoryId={activeCategoryId}
      activeSubcategoryId={activeSubcategoryId}
      onClose={() => router.back()}
      onDeleted={() => router.back()}
      onRemoveFromCategory={
        activeCategoryId
          ? () => removeFromCategory.mutate({ itemIds: [itemId], categoryId: activeCategoryId })
          : undefined
      }
      onRemoveFromSubcategory={
        activeSubcategoryId
          ? () => removeFromSubcategory.mutate({ itemIds: [itemId], subcategoryId: activeSubcategoryId })
          : undefined
      }
    />
  );
}
