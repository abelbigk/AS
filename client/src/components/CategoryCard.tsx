import { cn } from "@/lib/utils";
import type { Category } from "@shared/types";
import CroppedImage from "./CroppedImage";

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

// Map category names to beautiful Unsplash images
const CATEGORY_IMAGES: Record<string, string> = {
  "Movies": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80",
  "Food": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  "Place": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
  "Must": "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&q=80",
  "Quotes": "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80",
  "Business and money management": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
  "How to": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
  "Health": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  "Workout": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
  "Her": "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80",
  "Games": "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&q=80",
  "Home and Designs": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
  "😈 Time": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
  "Ai and sites": "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80",
  "Books": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
  "Family": "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800&q=80",
  "Tech": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80";

interface CategoryCardProps {
  category: Category;
  onClick?: () => void;
  contentCount?: number;
}

export default function CategoryCard({ category, onClick, contentCount = 0 }: CategoryCardProps) {
  const rawUrl = category.coverImageUrl || CATEGORY_IMAGES[category.name] || FALLBACK_IMAGE;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl cursor-pointer group",
        "h-28 w-full",
        "shadow-lg hover:shadow-2xl",
        "transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-0.5"
      )}
    >
      {/* Background image with crop applied */}
      <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-110">
        <CroppedImage
          src={rawUrl}
          cropData={category.coverCropData}
          alt={category.name}
        />
      </div>

      {/* Dark gradient overlay — lighter so the photo shows through */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex items-center h-full px-5 gap-4">
        <div className="min-w-0">
          <h3 className="font-bold text-white text-base leading-tight line-clamp-2 drop-shadow-md">
            {category.name}
          </h3>
          {contentCount > 0 && (
            <p className="text-white/70 text-xs mt-0.5">
              {contentCount} item{contentCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Right arrow indicator */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 group-hover:text-white/90 transition-all duration-200 group-hover:translate-x-1">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </div>
    </div>
  );
}
