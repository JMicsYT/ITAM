import { apiClient } from './client';
import type { ApiResponse } from '../types';

// ============================================================
// Audit Log API
// ============================================================

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  diff: unknown;
  userId: string | null;
  user: { fullName: string; username: string } | null;
  createdAt: string;
}

export const auditApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<ApiResponse<AuditEntry[]>>('/audit', { params }).then((r) => r.data),

  forEntity: (entityId: string) =>
    apiClient.get<ApiResponse<AuditEntry[]>>(`/audit/entity/${entityId}`).then((r) => r.data),
};
