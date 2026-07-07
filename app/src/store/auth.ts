import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

interface User {
  id: string;
  username: string;
  name?: string;
  email?: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  isLoggedIn: boolean;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, name?: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  loading: false,
  isLoggedIn: false,

  login: async (username: string, password: string) => {
    set({ loading: true });
    try {
      const response = await client.post('/auth/login', { username, password });
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('auth_token', token);
      set({ user, token, isLoggedIn: true, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  register: async (username: string, password: string, name?: string, email?: string) => {
    set({ loading: true });
    try {
      const response = await client.post('/auth/register', { username, password, name, email });
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('auth_token', token);
      set({ user, token, isLoggedIn: true, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    set({ user: null, token: null, isLoggedIn: false });
  },

  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        set({ isLoggedIn: false });
        return;
      }

      const response = await client.get('/auth/me');
      set({ user: response.data, token, isLoggedIn: true });
    } catch (error) {
      await AsyncStorage.removeItem('auth_token');
      set({ user: null, token: null, isLoggedIn: false });
    }
  },

  setUser: (user: User | null) => {
    set({ user, isLoggedIn: !!user });
  },
}));
