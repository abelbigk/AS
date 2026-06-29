export interface Category {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  coverImageUrl?: string | null;
  coverImageKey?: string | null;
  coverCropData?: string | null;
  isPredefined: "yes" | "no";
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  id: number;
  categoryId: number;
  userId: number;
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  coverImageKey?: string | null;
  coverCropData?: string | null;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentItem {
  id: number;
  userId: number;
  categoryIds: number[];
  subcategoryIds: number[];
  heading: string;
  description?: string | null;
  posterImageUrl?: string | null;
  posterImageKey?: string | null;
  posterCropData?: string | null;
  soundId?: number | null;
  status: "default" | "queued" | "done";
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: number;
  contentItemId: number;
  userId: number;
  url: string;
  key: string;
  type: "image" | "video";
  order: number;
  createdAt: string;
}

export interface AuthUser {
  id: number;
  username: string;
  name?: string | null;
  role: "user" | "admin";
}
