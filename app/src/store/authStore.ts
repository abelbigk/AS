import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  setToken: (token: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
  restoreToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  error: null,

  setToken: async (token: string) => {
    try {
      await AsyncStorage.setItem('auth_token', token);
      set({ token, error: null });
    } catch (error) {
      console.error('Error setting token:', error);
      set({ error: 'Failed to save token' });
    }
  },

  setUser: (user: User | null) => set({ user }),

  setError: (error: string | null) => set({ error }),

  logout: async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      set({ token: null, user: null, error: null });
    } catch (error) {
      console.error('Error during logout:', error);
      set({ error: 'Failed to logout' });
    }
  },

  restoreToken: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      set({ token, isLoading: false });
    } catch (error) {
      console.error('Error restoring token:', error);
      set({ isLoading: false, error: 'Failed to restore session' });
    }
  },
}));
