export interface Category {
  id: number;
  userId: number;
  name: string;
  icon?: string | null;
  color?: string | null;
  coverImageUrl?: string | null;
  coverImageKey?: string | null;
  coverCropData?: string | null;
  isPredefined: "yes" | "no";
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
  createdAt: string;
  updatedAt: string;
}

export interface Sound {
  id: number;
  uploadedByUserId?: number;
  title: string;
  name: string;
  url: string;
  key: string;
  createdAt?: string;
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
  sound?: Sound | null;
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

export interface UserPreference {
  id: number;
  userId: number;
  theme: "dark" | "light";
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  username: string;
  name: string | null;
  email?: string | null;
}

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}
