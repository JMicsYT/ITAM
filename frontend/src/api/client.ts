import axios from 'axios';

// ============================================================
// Axios API client — настроен для локального On-Premise сервера
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Перехватчик для единообразной обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      error.message ||
      'Неизвестная ошибка сети';
    return Promise.reject(new Error(message));
  }
);
