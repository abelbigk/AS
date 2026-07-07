import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

// Get API URL from app config or fallback to hardcoded
const getApiUrl = () => {
  // Try to get from app.json extra
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }
  // Fallback to env variable (for web/dev)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Final fallback
  return 'https://as-wryo.onrender.com';
};

const API_URL = getApiUrl();

console.log('API Client initialized with URL:', API_URL);

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Add token to every request
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

export default client;
