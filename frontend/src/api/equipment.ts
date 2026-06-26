import { apiClient } from './client';
import type { ApiResponse, Equipment, EquipmentFormData, ImportResult } from '../types';

const BASE = '/equipment';

export const equipmentApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<ApiResponse<Equipment[]>>(BASE, { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<ApiResponse<Equipment>>(`${BASE}/${id}`).then((r) => r.data),

  create: (data: EquipmentFormData) =>
    apiClient.post<ApiResponse<Equipment>>(BASE, data).then((r) => r.data),

  update: (id: string, data: Partial<EquipmentFormData>) =>
    apiClient.patch<ApiResponse<Equipment>>(`${BASE}/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`${BASE}/${id}`).then((r) => r.data),

  stats: () =>
    apiClient
      .get<ApiResponse<{ byType: Record<string, number>; byStatus: Record<string, number> }>>(`${BASE}/stats/summary`)
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

  /** Прикрепить PDF к оборудованию */
  uploadDocument: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<ApiResponse<Equipment>>(`${BASE}/${id}/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  /** Открепить PDF от оборудования */
  deleteDocument: (id: string, url: string) =>
    apiClient.delete<ApiResponse<Equipment>>(`${BASE}/${id}/document`, { data: { url } }).then((r) => r.data),
};
