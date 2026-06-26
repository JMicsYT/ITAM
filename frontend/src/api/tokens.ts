import { apiClient } from './client';
import type { ApiResponse, Token, TokenFormData, ImportResult } from '../types';

const BASE = '/tokens';

export const tokensApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<ApiResponse<Token[]>>(BASE, { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<ApiResponse<Token>>(`${BASE}/${id}`).then((r) => r.data),

  create: (data: TokenFormData) =>
    apiClient.post<ApiResponse<Token>>(BASE, data).then((r) => r.data),

  update: (id: string, data: Partial<TokenFormData>) =>
    apiClient.patch<ApiResponse<Token>>(`${BASE}/${id}`, data).then((r) => r.data),

  revoke: (id: string) =>
    apiClient.patch<ApiResponse<Token>>(`${BASE}/${id}/revoke`).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`${BASE}/${id}`).then((r) => r.data),

  stats: () =>
    apiClient
      .get<ApiResponse<{ byStatus: Record<string, number>; expiringSoon: number }>>(`${BASE}/stats/summary`)
      .then((r) => r.data),

  /** Массовый импорт из .xlsx — multipart/form-data, поле "file" */
  importExcel: (file: File, onProgress?: (pct: number) => void) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<ImportResult>(`${BASE}/import`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (e) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)); }
        : undefined,
    }).then((r) => r.data);
  },

  /** Прикрепить PDF к токену/ЭЦП */
  uploadDocument: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<ApiResponse<Token>>(`${BASE}/${id}/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  /** Открепить PDF от токена */
  deleteDocument: (id: string, url: string) =>
    apiClient.delete<ApiResponse<Token>>(`${BASE}/${id}/document`, { data: { url } }).then((r) => r.data),
};
