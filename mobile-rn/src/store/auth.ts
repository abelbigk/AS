import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

export interface User {
  id: number;
  username: string;
  name?: string;
  email?: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  theme: 'light' | 'dark';

  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
  toggleTheme: () => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const authStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  theme: 'dark',

  login: async (username: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', {
        username,
        password,
      });

      const { token, user } = response.data;
      await AsyncStorage.setItem('auth_token', token);
      
      set({
        token,
        user,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  register: async (username: string, password: string, name?: string) => {
    try {
      const response = await apiClient.post('/auth/register', {
        username,
        password,
        name,
      });

      const { token, user } = response.data;
      await AsyncStorage.setItem('auth_token', token);

      set({
        token,
        user,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const response = await apiClient.get('/auth/me');
        set({
          token,
          user: response.data,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await AsyncStorage.removeItem('auth_token');
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user: User) => {
    set({ user });
  },

  loadTheme: async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        set({ theme: savedTheme });
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  },

  toggleTheme: async () => {
    try {
      const newTheme = get().theme === 'dark' ? 'light' : 'dark';
      await AsyncStorage.setItem('app_theme', newTheme);
      set({ theme: newTheme });
    } catch (error) {
      console.error('Failed to toggle theme:', error);
    }
  },
}));
