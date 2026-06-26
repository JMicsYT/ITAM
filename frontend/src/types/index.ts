// ============================================================
// Shared TypeScript types for the ITAM application
// ============================================================

// --- Equipment ---
export type EquipmentType = 'ups' | 'printer' | 'pc' | 'laptop' | 'server' | 'monitor';
export type EquipmentStatus = 'in_use' | 'storage' | 'repair' | 'decommissioned';

export interface Equipment {
  id: string;
  type: EquipmentType;
  brand: string;
  model: string;
  serialNumber: string;
  status: EquipmentStatus;
  location: string;
  assignedTo?: string | null;
  ipAddress?: string | null;
  specs?: Record<string, unknown> | null;
  notes?: string | null;
  documentUrls: string[];     // Прикреплённые PDF
  createdAt: string;
  updatedAt: string;
}

export type EquipmentFormData = Omit<Equipment, 'id' | 'createdAt' | 'updatedAt' | 'documentUrls'>;

// --- Consumable ---
export type ConsumableType   = 'cartridge' | 'drum_unit';
export type ConsumableStatus = 'in_stock' | 'in_use' | 'depleted' | 'written_off';

export interface Consumable {
  id: string;
  type: ConsumableType;
  model: string;
  serialNumber: string;
  status: ConsumableStatus;
  compatibleWith: string[];
  location: string;
  notes?: string | null;
  documentUrls: string[];      // Прикреплённые PDF (пути /uploads/documents/...)
  createdAt: string;
  updatedAt: string;
}

// documentUrls управляется сервером через /upload — исключаем из формы
export type ConsumableFormData = Omit<Consumable, 'id' | 'createdAt' | 'updatedAt' | 'documentUrls'>;


// --- Token ---
export type TokenStatus = 'active' | 'revoked' | 'expired' | 'in_safe';

export interface Token {
  id: string;
  serialNumber: string;
  issuedTo: string;
  certificateType: string;
  expirationDate: string;
  status: TokenStatus;
  notes?: string | null;
  documentUrls: string[];     // Прикреплённые PDF
  isExpired?: boolean;
  daysUntilExpiry?: number;
  createdAt: string;
  updatedAt: string;
}

export type TokenFormData = Omit<Token, 'id' | 'createdAt' | 'updatedAt' | 'isExpired' | 'daysUntilExpiry' | 'documentUrls'>;

// --- API responses ---
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ msg: string; path: string }>;
}

// --- Dashboard stats ---
export interface DashboardStats {
  equipment: {
    byType: Record<EquipmentType, number>;
    byStatus: Record<EquipmentStatus, number>;
  };
  consumables: {
    total: number;
    inStock: number;
    inUse: number;
  };
  tokens: {
    byStatus: Record<TokenStatus, number>;
    expiringSoon: number;
  };
}

// --- Navigation ---
export type NavSection = 'dashboard' | 'equipment' | 'consumables' | 'tokens' | 'users';

// --- Toast ---
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

// --- Import Result ---
export interface ImportResult {
  success: boolean;
  message: string;
  created: number;
  skipped: { row: number; reason: string }[];
}
