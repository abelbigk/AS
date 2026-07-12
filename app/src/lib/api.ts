import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getApiBaseUrl = () => {
  const expoApiUrl = process.env.EXPO_PUBLIC_API_URL;
  
  // Use the .env variable if explicitly set
  if (expoApiUrl && expoApiUrl.startsWith('https://')) {
    return expoApiUrl;
  }
  
  // For local development with explicit localhost URL
  if (expoApiUrl && (expoApiUrl.startsWith('http://localhost') || expoApiUrl.startsWith('http://127.0.0.1'))) {
    return expoApiUrl;
  }
  
  // Default to production
  return 'https://as-wryo.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Attach token to all requests
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error retrieving token:', error);
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

export default api;
