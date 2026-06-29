export const CATEGORY_IMAGES: Record<string, string> = {
  Movies: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80",
  Food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  Place: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
  Must: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&q=80",
  Quotes: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80",
  "Business and money management":
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
  "How to": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
  Health: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  Workout: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
  Her: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80",
  Games: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&q=80",
  "Home and Designs":
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
  "😈 Time": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
  "Ai and sites": "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80",
  Books: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
  Family: "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800&q=80",
  Tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
};

export const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80";

export function categoryImageUrl(name: string, coverUrl?: string | null): string {
  return coverUrl || CATEGORY_IMAGES[name] || FALLBACK_IMAGE;
}

export function getCategoryLabel(
  categoryIds: number[],
  subcategoryIds: number[],
  categories: { id: number; name: string }[] | undefined,
  subcategories: { id: number; categoryId: number }[] | undefined
): string {
  const ids = new Set<number>(categoryIds);
  subcategoryIds.forEach((subId) => {
    const sub = subcategories?.find((s) => s.id === subId);
    if (sub) ids.add(sub.categoryId);
  });
  const names = Array.from(ids)
    .map((id) => categories?.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[];
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
}
