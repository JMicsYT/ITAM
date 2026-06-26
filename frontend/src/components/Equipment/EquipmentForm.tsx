import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { equipmentApi } from '../../api/equipment';
import type { Equipment, EquipmentFormData, EquipmentStatus, EquipmentType } from '../../types';
import { useToast } from '../ui/Toast';

// ============================================================
// Equipment Add / Edit Form (used inside a Modal)
// ============================================================

interface EquipmentFormProps {
  initial?: Equipment;
  onSuccess: (item: Equipment) => void;
  onCancel: () => void;
}

const TYPES: { value: EquipmentType; label: string }[] = [
  { value: 'pc',      label: 'ПК' },
  { value: 'laptop',  label: 'Ноутбук' },
  { value: 'server',  label: 'Сервер' },
  { value: 'monitor', label: 'Монитор' },
  { value: 'printer', label: 'Принтер / МФУ' },
  { value: 'ups',     label: 'ИБП' },
];

const STATUSES: { value: EquipmentStatus; label: string }[] = [
  { value: 'in_use',         label: 'В эксплуатации' },
  { value: 'storage',        label: 'На складе' },
  { value: 'repair',         label: 'В ремонте' },
  { value: 'decommissioned', label: 'Списано' },
];

const EMPTY: EquipmentFormData = {
  type: 'pc',
  brand: '',
  model: '',
  serialNumber: '',
  status: 'storage',
  location: '',
  assignedTo: '',
  ipAddress: '',
  notes: '',
  specs: null,
};

type ValidationErrors = Partial<Record<keyof EquipmentFormData, string>>;

function validate(data: EquipmentFormData): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!data.brand.trim())        errors.brand = 'Укажите производителя';
  if (!data.model.trim())        errors.model = 'Укажите модель';
  if (!data.serialNumber.trim()) errors.serialNumber = 'Укажите серийный номер';
  if (!data.location.trim())     errors.location = 'Укажите расположение';
  if (data.ipAddress && !/^(\d{1,3}\.){3}\d{1,3}$/.test(data.ipAddress.trim())) {
    errors.ipAddress = 'Неверный формат IP (например: 192.168.1.100)';
  }
  return errors;
}

export function EquipmentForm({ initial, onSuccess, onCancel }: EquipmentFormProps) {
  const { toast } = useToast();
  const isEdit = !!initial;

  const [form, setForm] = useState<EquipmentFormData>({
    ...EMPTY,
    ...(initial
      ? {
          type: initial.type,
          brand: initial.brand,
          model: initial.model,
          serialNumber: initial.serialNumber,
          status: initial.status,
          location: initial.location,
          assignedTo: initial.assignedTo ?? '',
          ipAddress: initial.ipAddress ?? '',
          notes: initial.notes ?? '',
          specs: initial.specs ?? null,
        }
      : {}),
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function set(field: keyof EquipmentFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      const payload: EquipmentFormData = {
        ...form,
        brand: form.brand.trim(),
        model: form.model.trim(),
        serialNumber: form.serialNumber.trim(),
        location: form.location.trim(),
        assignedTo: form.assignedTo?.trim() || null,
        ipAddress: form.ipAddress?.trim() || null,
        notes: form.notes?.trim() || null,
      };
      const res = isEdit
        ? await equipmentApi.update(initial!.id, payload)
        : await equipmentApi.create(payload);

      toast('success', isEdit ? 'Оборудование обновлено' : 'Оборудование добавлено', res.message);
      onSuccess(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения';
      toast('error', 'Ошибка', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type + Status row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Тип устройства *</label>
          <select
            className="select-field"
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
          >
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Статус *</label>
          <select
            className="select-field"
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Brand + Model */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Производитель *</label>
          <input
            className={`input-field ${errors.brand ? 'border-rose-500/60 focus:ring-rose-500/50' : ''}`}
            value={form.brand}
            onChange={(e) => set('brand', e.target.value)}
            placeholder="HP, Dell, Kyocera..."
          />
          {errors.brand && <p className="text-xs text-rose-400 mt-1">{errors.brand}</p>}
        </div>
        <div>
          <label className="form-label">Модель *</label>
          <input
            className={`input-field ${errors.model ? 'border-rose-500/60 focus:ring-rose-500/50' : ''}`}
            value={form.model}
            onChange={(e) => set('model', e.target.value)}
            placeholder="EliteBook 840, TK-1170..."
          />
          {errors.model && <p className="text-xs text-rose-400 mt-1">{errors.model}</p>}
        </div>
      </div>

      {/* Serial Number */}
      <div>
        <label className="form-label">Серийный номер *</label>
        <input
          className={`input-field ${errors.serialNumber ? 'border-rose-500/60 focus:ring-rose-500/50' : ''}`}
          value={form.serialNumber}
          onChange={(e) => set('serialNumber', e.target.value)}
          placeholder="SN-PC-001"
          disabled={isEdit} // Серийный номер нельзя менять при редактировании
        />
        {errors.serialNumber && <p className="text-xs text-rose-400 mt-1">{errors.serialNumber}</p>}
        {isEdit && <p className="text-xs text-slate-500 mt-1">Серийный номер нельзя изменить</p>}
      </div>

      {/* Location + Assigned To */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Расположение *</label>
          <input
            className={`input-field ${errors.location ? 'border-rose-500/60 focus:ring-rose-500/50' : ''}`}
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="Кабинет 402"
          />
          {errors.location && <p className="text-xs text-rose-400 mt-1">{errors.location}</p>}
        </div>
        <div>
          <label className="form-label">Ответственный</label>
          <input
            className="input-field"
            value={form.assignedTo ?? ''}
            onChange={(e) => set('assignedTo', e.target.value)}
            placeholder="Иванов И.И."
          />
        </div>
      </div>

      {/* IP Address */}
      <div>
        <label className="form-label">IP-адрес</label>
        <input
          className={`input-field ${errors.ipAddress ? 'border-rose-500/60 focus:ring-rose-500/50' : ''}`}
          value={form.ipAddress ?? ''}
          onChange={(e) => set('ipAddress', e.target.value)}
          placeholder="192.168.1.101 (для ПК, серверов, принтеров)"
        />
        {errors.ipAddress && <p className="text-xs text-rose-400 mt-1">{errors.ipAddress}</p>}
      </div>

      {/* Notes */}
      <div>
        <label className="form-label">Примечания</label>
        <textarea
          className="input-field resize-none"
          rows={3}
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Любые дополнительные сведения..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-2 justify-center">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Сохраняем...
            </span>
          ) : (
            <>
              {isEdit ? null : <Plus className="w-4 h-4" />}
              {isEdit ? 'Сохранить изменения' : 'Добавить оборудование'}
            </>
          )}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          <X className="w-4 h-4" />
          Отмена
        </button>
      </div>
    </form>
  );
}
