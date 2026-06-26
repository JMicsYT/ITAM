import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, type AuthUser } from '../api/auth';
import { apiClient } from '../api/client';

// ============================================================
// Auth Context — хранит состояние текущего пользователя
// Читает токен из localStorage при старте
// ============================================================

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const TOKEN_KEY = 'itam_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Устанавливаем Authorization header при каждом рендере если токен есть
  function applyToken(token: string) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // При старте приложения — читаем токен из localStorage
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    applyToken(token);
    authApi.me()
      .then((res) => setUser(res.data))
      .catch(() => {
        // Токен протух — очищаем
        localStorage.removeItem(TOKEN_KEY);
        delete apiClient.defaults.headers.common['Authorization'];
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    const { token, user: userData } = res.data;
    localStorage.setItem(TOKEN_KEY, token);
    applyToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
