import { create } from 'zustand';
import client from '../api/client';

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Content {
  id: string;
  subcategoryId: string;
  categoryId: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  done: boolean;
  createdAt: string;
}

interface ContentStore {
  categories: Category[];
  subcategories: Subcategory[];
  content: Content[];
  loading: boolean;

  // Actions
  fetchCategories: () => Promise<void>;
  fetchSubcategories: (categoryId: string) => Promise<void>;
  fetchContent: (subcategoryId?: string) => Promise<void>;
  
  addCategory: (name: string, description?: string) => Promise<void>;
  updateCategory: (id: string, name: string, description?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addSubcategory: (categoryId: string, name: string, description?: string) => Promise<void>;
  updateSubcategory: (id: string, name: string, description?: string) => Promise<void>;
  deleteSubcategory: (id: string) => Promise<void>;

  addContent: (subcategoryId: string, categoryId: string, title: string, description?: string, mediaUrl?: string, mediaType?: string) => Promise<void>;
  updateContent: (id: string, done?: boolean) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
}

export const useContentStore = create<ContentStore>((set, get) => ({
  categories: [],
  subcategories: [],
  content: [],
  loading: false,

  fetchCategories: async () => {
    set({ loading: true });
    try {
      const response = await client.get('/categories');
      set({ categories: response.data, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  fetchSubcategories: async (categoryId: string) => {
    try {
      const response = await client.get(`/categories/${categoryId}/subcategories`);
      set({ subcategories: response.data });
    } catch (error) {
      throw error;
    }
  },

  fetchContent: async (subcategoryId?: string) => {
    set({ loading: true });
    try {
      const url = subcategoryId ? `/content?subcategoryId=${subcategoryId}` : '/content';
      const response = await client.get(url);
      set({ content: response.data, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  addCategory: async (name: string, description?: string) => {
    try {
      const response = await client.post('/categories', { name, description });
      const categories = [...get().categories, response.data];
      set({ categories });
    } catch (error) {
      throw error;
    }
  },

  updateCategory: async (id: string, name: string, description?: string) => {
    try {
      const response = await client.patch(`/categories/${id}`, { name, description });
      const categories = get().categories.map((c) => (c.id === id ? response.data : c));
      set({ categories });
    } catch (error) {
      throw error;
    }
  },

  deleteCategory: async (id: string) => {
    try {
      await client.delete(`/categories/${id}`);
      const categories = get().categories.filter((c) => c.id !== id);
      set({ categories });
    } catch (error) {
      throw error;
    }
  },

  addSubcategory: async (categoryId: string, name: string, description?: string) => {
    try {
      const response = await client.post(`/categories/${categoryId}/subcategories`, { name, description });
      const subcategories = [...get().subcategories, response.data];
      set({ subcategories });
    } catch (error) {
      throw error;
    }
  },

  updateSubcategory: async (id: string, name: string, description?: string) => {
    try {
      const response = await client.patch(`/subcategories/${id}`, { name, description });
      const subcategories = get().subcategories.map((s) => (s.id === id ? response.data : s));
      set({ subcategories });
    } catch (error) {
      throw error;
    }
  },

  deleteSubcategory: async (id: string) => {
    try {
      await client.delete(`/subcategories/${id}`);
      const subcategories = get().subcategories.filter((s) => s.id !== id);
      set({ subcategories });
    } catch (error) {
      throw error;
    }
  },

  addContent: async (subcategoryId: string, categoryId: string, title: string, description?: string, mediaUrl?: string, mediaType?: string) => {
    try {
      const response = await client.post('/content', { subcategoryId, categoryId, title, description, mediaUrl, mediaType });
      const content = [...get().content, response.data];
      set({ content });
    } catch (error) {
      throw error;
    }
  },

  updateContent: async (id: string, done?: boolean) => {
    try {
      const response = await client.patch(`/content/${id}`, { done });
      const content = get().content.map((c) => (c.id === id ? response.data : c));
      set({ content });
    } catch (error) {
      throw error;
    }
  },

  deleteContent: async (id: string) => {
    try {
      await client.delete(`/content/${id}`);
      const content = get().content.filter((c) => c.id !== id);
      set({ content });
    } catch (error) {
      throw error;
    }
  },
}));
