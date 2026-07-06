import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface Category {
  id: number;
  userId: number;
  name: string;
  description?: string;
  color?: string;
  coverImageUrl?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  id: number;
  categoryId: number;
  userId: number;
  name: string;
  description?: string;
  coverImageUrl?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentItem {
  id: number;
  userId: number;
  heading: string;
  description?: string;
  status: 'default' | 'queued' | 'done';
  posterUrl?: string;
  posterThumbnail?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ContentStore {
  categories: Category[];
  subcategories: Subcategory[];
  contentItems: ContentItem[];
  isLoading: boolean;

  // Category actions
  fetchCategories: () => Promise<void>;
  createCategory: (data: Partial<Category>) => Promise<Category>;
  updateCategory: (id: number, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  reorderCategories: (order: number[]) => Promise<void>;

  // Subcategory actions
  fetchSubcategories: (categoryId?: number) => Promise<void>;
  createSubcategory: (categoryId: number, data: Partial<Subcategory>) => Promise<void>;
  updateSubcategory: (id: number, data: Partial<Subcategory>) => Promise<void>;
  deleteSubcategory: (id: number) => Promise<void>;

  // Content actions
  fetchContentByCategory: (categoryId: number) => Promise<void>;
  fetchContentByStatus: (status: string) => Promise<void>;
  createContent: (data: Partial<ContentItem>) => Promise<void>;
  updateContent: (id: number, data: Partial<ContentItem>) => Promise<void>;
  deleteContent: (id: number) => Promise<void>;

  // Utils
  setLoading: (loading: boolean) => void;
  clearContent: () => void;
}

export const contentStore = create<ContentStore>((set, get) => ({
  categories: [],
  subcategories: [],
  contentItems: [],
  isLoading: false,

  fetchCategories: async () => {
    try {
      set({ isLoading: true });
      const response = await apiClient.get('/categories');
      set({ categories: response.data });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createCategory: async (data: Partial<Category>) => {
    try {
      const response = await apiClient.post('/categories', data);
      set((state) => ({
        categories: [...state.categories, response.data],
      }));
      return response.data;
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  },

  updateCategory: async (id: number, data: Partial<Category>) => {
    try {
      await apiClient.patch(`/categories/${id}`, data);
      set((state) => ({
        categories: state.categories.map((cat) =>
          cat.id === id ? { ...cat, ...data } : cat
        ),
      }));
    } catch (error) {
      console.error('Failed to update category:', error);
      throw error;
    }
  },

  deleteCategory: async (id: number) => {
    try {
      await apiClient.delete(`/categories/${id}`);
      set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  },

  reorderCategories: async (order: number[]) => {
    try {
      await apiClient.post('/categories/reorder', { order });
      const state = get();
      const sortedCategories = [...state.categories].sort(
        (a, b) => order.indexOf(a.id) - order.indexOf(b.id)
      );
      set({ categories: sortedCategories });
    } catch (error) {
      console.error('Failed to reorder categories:', error);
      throw error;
    }
  },

  fetchSubcategories: async (categoryId?: number) => {
    try {
      set({ isLoading: true });
      const url = categoryId
        ? `/subcategories?categoryId=${categoryId}`
        : '/subcategories';
      const response = await apiClient.get(url);
      set({ subcategories: response.data });
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createSubcategory: async (categoryId: number, data: Partial<Subcategory>) => {
    try {
      const response = await apiClient.post('/subcategories', {
        categoryId,
        ...data,
      });
      set((state) => ({
        subcategories: [...state.subcategories, response.data],
      }));
    } catch (error) {
      console.error('Failed to create subcategory:', error);
      throw error;
    }
  },

  updateSubcategory: async (id: number, data: Partial<Subcategory>) => {
    try {
      await apiClient.patch(`/subcategories/${id}`, data);
      set((state) => ({
        subcategories: state.subcategories.map((sub) =>
          sub.id === id ? { ...sub, ...data } : sub
        ),
      }));
    } catch (error) {
      console.error('Failed to update subcategory:', error);
      throw error;
    }
  },

  deleteSubcategory: async (id: number) => {
    try {
      await apiClient.delete(`/subcategories/${id}`);
      set((state) => ({
        subcategories: state.subcategories.filter((sub) => sub.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete subcategory:', error);
      throw error;
    }
  },

  fetchContentByCategory: async (categoryId: number) => {
    try {
      set({ isLoading: true });
      const response = await apiClient.get(`/content/category/${categoryId}`);
      set({ contentItems: response.data });
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchContentByStatus: async (status: string) => {
    try {
      set({ isLoading: true });
      const response = await apiClient.get(`/content?status=${status}`);
      set({ contentItems: response.data });
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createContent: async (data: Partial<ContentItem>) => {
    try {
      const response = await apiClient.post('/content', data);
      set((state) => ({
        contentItems: [...state.contentItems, response.data],
      }));
    } catch (error) {
      console.error('Failed to create content:', error);
      throw error;
    }
  },

  updateContent: async (id: number, data: Partial<ContentItem>) => {
    try {
      await apiClient.patch(`/content/${id}`, data);
      set((state) => ({
        contentItems: state.contentItems.map((item) =>
          item.id === id ? { ...item, ...data } : item
        ),
      }));
    } catch (error) {
      console.error('Failed to update content:', error);
      throw error;
    }
  },

  deleteContent: async (id: number) => {
    try {
      await apiClient.delete(`/content/${id}`);
      set((state) => ({
        contentItems: state.contentItems.filter((item) => item.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete content:', error);
      throw error;
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  clearContent: () => {
    set({
      categories: [],
      subcategories: [],
      contentItems: [],
    });
  },
}));
