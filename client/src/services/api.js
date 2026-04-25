import axios from 'axios';

/**
 * Axios API Instance
 *
 * Pre-configured with base URL from env vars.
 * Includes response interceptor for consistent error handling.
 */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: attach JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trustvote_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: normalize errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Network error';
    console.error(`[API Error] ${message}`);
    return Promise.reject(error);
  }
);

export default api;
