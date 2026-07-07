import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order?: number;
  createdAt: string;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  order?: number;
  createdAt: string;
}

export interface Content {
  id: string;
  categoryId: string;
  subcategoryId?: string;
  title: string;
  description?: string;
  images?: string[];
  videos?: string[];
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ContentStore {
  categories: Category[];
  subcategories: Subcategory[];
  content: Content[];
  isLoading: boolean;

  // Category actions
  fetchCategories: () => Promise<void>;
  createCategory: (name: string, description?: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;

  // Subcategory actions
  fetchSubcategories: (categoryId: string) => Promise<void>;
  createSubcategory: (categoryId: string, name: string, description?: string) => Promise<Subcategory>;
  deleteSubcategory: (id: string) => Promise<void>;

  // Content actions
  fetchContent: (categoryId?: string, subcategoryId?: string) => Promise<void>;
  createContent: (categoryId: string, title: string, description?: string, subcategoryId?: string) => Promise<Content>;
  updateContent: (id: string, updates: Partial<Content>) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  toggleContentDone: (id: string, isDone: boolean) => Promise<void>;
}

export const contentStore = create<ContentStore>((set, get) => ({
  categories: [],
  subcategories: [],
  content: [],
  isLoading: false,

  // Category actions
  fetchCategories: async () => {
    try {
      set({ isLoading: true });
      const response = await apiClient.get('/categories');
      set({ categories: response.data });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  createCategory: async (name: string, description?: string) => {
    try {
      const response = await apiClient.post('/categories', { name, description });
      set((state) => ({
        categories: [...state.categories, response.data],
      }));
      return response.data;
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  },

  deleteCategory: async (id: string) => {
    try {
      await apiClient.delete(`/categories/${id}`);
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  },

  // Subcategory actions
  fetchSubcategories: async (categoryId: string) => {
    try {
      set({ isLoading: true });
      const response = await apiClient.get(`/categories/${categoryId}/subcategories`);
      set({ subcategories: response.data });
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  createSubcategory: async (categoryId: string, name: string, description?: string) => {
    try {
      const response = await apiClient.post(`/categories/${categoryId}/subcategories`, { name, description });
      set((state) => ({
        subcategories: [...state.subcategories, response.data],
      }));
      return response.data;
    } catch (error) {
      console.error('Failed to create subcategory:', error);
      throw error;
    }
  },

  deleteSubcategory: async (id: string) => {
    try {
      await apiClient.delete(`/subcategories/${id}`);
      set((state) => ({
        subcategories: state.subcategories.filter((s) => s.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete subcategory:', error);
      throw error;
    }
  },

  // Content actions
  fetchContent: async (categoryId?: string, subcategoryId?: string) => {
    try {
      set({ isLoading: true });
      let url = '/content';
      const params = new URLSearchParams();
      if (categoryId) params.append('categoryId', categoryId);
      if (subcategoryId) params.append('subcategoryId', subcategoryId);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await apiClient.get(url);
      set({ content: response.data });
    } catch (error) {
      console.error('Failed to fetch content:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  createContent: async (categoryId: string, title: string, description?: string, subcategoryId?: string) => {
    try {
      const response = await apiClient.post('/content', {
        categoryId,
        title,
        description,
        subcategoryId,
      });
      set((state) => ({
        content: [...state.content, response.data],
      }));
      return response.data;
    } catch (error) {
      console.error('Failed to create content:', error);
      throw error;
    }
  },

  updateContent: async (id: string, updates: Partial<Content>) => {
    try {
      await apiClient.patch(`/content/${id}`, updates);
      set((state) => ({
        content: state.content.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }));
    } catch (error) {
      console.error('Failed to update content:', error);
      throw error;
    }
  },

  deleteContent: async (id: string) => {
    try {
      await apiClient.delete(`/content/${id}`);
      set((state) => ({
        content: state.content.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete content:', error);
      throw error;
    }
  },

  toggleContentDone: async (id: string, isDone: boolean) => {
    try {
      await apiClient.patch(`/content/${id}`, { isDone });
      set((state) => ({
        content: state.content.map((c) => (c.id === id ? { ...c, isDone } : c)),
      }));
    } catch (error) {
      console.error('Failed to toggle content done:', error);
      throw error;
    }
  },
}));
