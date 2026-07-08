import { create } from 'zustand';
import axios from 'axios';

const API_URL = 'https://as-wryo.onrender.com';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('auth_token') || null,
  loading: false,
  isLoggedIn: !!localStorage.getItem('auth_token'),

  login: async (username, password) => {
    set({ loading: true });
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      });
      const { token, user } = response.data;
      localStorage.setItem('auth_token', token);
      set({ token, user, isLoggedIn: true, loading: false });
      return { token, user };
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  register: async (username, password, name, email) => {
    set({ loading: true });
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        password,
        name,
        email,
      });
      const { token, user } = response.data;
      localStorage.setItem('auth_token', token);
      set({ token, user, isLoggedIn: true, loading: false });
      return { token, user };
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    localStorage.removeItem('auth_token');
    set({ user: null, token: null, isLoggedIn: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ isLoggedIn: false, loading: false });
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ user: response.data, token, isLoggedIn: true, loading: false });
    } catch (error) {
      localStorage.removeItem('auth_token');
      set({ user: null, token: null, isLoggedIn: false, loading: false });
    }
  },

  setUser: (user) => {
    set({ user, isLoggedIn: !!user });
  },
}));

export default useAuthStore;
