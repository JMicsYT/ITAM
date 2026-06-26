import { apiClient } from './client';
import type { ApiResponse } from '../types';

// ============================================================
// Auth API — login, me, user management
// ============================================================

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'technician' | 'viewer';
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login', { username, password }).then((r) => r.data),

  me: () =>
    apiClient.get<ApiResponse<AuthUser>>('/auth/me').then((r) => r.data),

  // User management (admin only)
  listUsers: () =>
    apiClient.get<ApiResponse<AuthUser[]>>('/auth/users').then((r) => r.data),

  createUser: (data: { username: string; password: string; fullName: string; role: string }) =>
    apiClient.post<ApiResponse<AuthUser>>('/auth/users', data).then((r) => r.data),

  changePassword: (id: string, password: string) =>
    apiClient.patch<ApiResponse<null>>(`/auth/users/${id}/password`, { password }).then((r) => r.data),

  toggleUser: (id: string) =>
    apiClient.patch<ApiResponse<AuthUser & { isActive: boolean }>>(`/auth/users/${id}/toggle`).then((r) => r.data),
};
