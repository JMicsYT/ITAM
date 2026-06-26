import { apiClient } from './client';
import type { ApiResponse, Consumable, ConsumableFormData } from '../types';

const BASE = '/consumables';

export interface ImportResult {
  success: boolean;
  message: string;
  created: number;
  skipped: { row: number; reason: string }[];
}

export const consumablesApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<ApiResponse<Consumable[]>>(BASE, { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<ApiResponse<Consumable>>(`${BASE}/${id}`).then((r) => r.data),

  create: (data: ConsumableFormData) =>
    apiClient.post<ApiResponse<Consumable>>(BASE, data).then((r) => r.data),

  update: (id: string, data: Partial<ConsumableFormData>) =>
    apiClient.patch<ApiResponse<Consumable>>(`${BASE}/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`${BASE}/${id}`).then((r) => r.data),

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

  /** Прикрепить PDF к расходнику — multipart/form-data, поле "file" */
  uploadDocument: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<ApiResponse<Consumable>>(`${BASE}/${id}/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  /** Открепить PDF от расходника */
  deleteDocument: (id: string, url: string) =>
    apiClient.delete<ApiResponse<Consumable>>(`${BASE}/${id}/document`, { data: { url } }).then((r) => r.data),
};
