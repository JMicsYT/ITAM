import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Search, RefreshCw, Package, Pencil, History, Info, Tag, FileText, FileUp } from 'lucide-react';
import clsx from 'clsx';
import { consumablesApi } from '../../api/consumables';
import type { Consumable, ConsumableFormData, ConsumableStatus, ConsumableType } from '../../types';
import { Modal } from '../ui/Modal';
import { Badge, ConsumableTypeBadge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { ExportButton } from '../ui/ExportButton';
import { AuditHistory } from '../ui/AuditHistory';
import { DocumentsTab } from '../ui/DocumentsTab';

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '',           label: 'Все типы' },
  { value: 'cartridge',  label: 'Картриджи' },
  { value: 'drum_unit',  label: 'Фотобарабаны' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',            label: 'Все статусы' },
  { value: 'in_stock',    label: 'На складе' },
  { value: 'in_use',      label: 'Используется' },
  { value: 'depleted',    label: 'Пуст' },
  { value: 'written_off', label: 'Списан' },
];

function ConsumableStatusBadge({ status }: { status: ConsumableStatus }) {
  const cfg: Record<ConsumableStatus, { variant: 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'cyan' | 'purple'; label: string }> = {
    in_stock:    { variant: 'cyan',    label: 'На складе'    },
    in_use:      { variant: 'green',   label: 'Используется' },
    depleted:    { variant: 'amber',   label: 'Пуст'         },
    written_off: { variant: 'slate',   label: 'Списан'       },
  };
  const { variant, label } = cfg[status] ?? { variant: 'slate', label: status };
  return (
    <Badge variant={variant}>{label}</Badge>
  );
}

type ValidationErrors = Partial<Record<keyof ConsumableFormData, string>>;

function validate(data: ConsumableFormData): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!data.model.trim())        errors.model        = 'Укажите артикул/модель';
  if (!data.serialNumber.trim()) errors.serialNumber = 'Укажите серийный номер';
  if (!data.location.trim())     errors.location     = 'Укажите место хранения';
  if (!data.compatibleWith || data.compatibleWith.length === 0 ||
      (data.compatibleWith.length === 1 && !data.compatibleWith[0])) {
    errors.compatibleWith = 'Укажите хотя бы одну совместимую модель принтера';
  }
  return errors;
}

// ── Форма добавления/редактирования ──────────────────────────
function ConsumableForm({
  initial,
  onSuccess,
  onCancel,
}: {
  initial?: Consumable;
  onSuccess: (item: Consumable) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;

  const [form, setForm] = useState<ConsumableFormData>({
    type:          (initial?.type ?? 'cartridge') as ConsumableType,
    model:         initial?.model         ?? '',
    serialNumber:  initial?.serialNumber  ?? '',
    status:        (initial?.status       ?? 'in_stock') as ConsumableStatus,
    compatibleWith: initial?.compatibleWith ?? [''],
    location:      initial?.location      ?? '',
    notes:         initial?.notes         ?? '',
  });
  const [errors, setErrors]     = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof ConsumableFormData>(field: K, value: ConsumableFormData[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  const compatStr = form.compatibleWith.join(', ');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const payload: ConsumableFormData = {
        ...form,
        model:         form.model.trim(),
        serialNumber:  form.serialNumber.trim(),
        location:      form.location.trim(),
        compatibleWith: form.compatibleWith.map((s) => s.trim()).filter(Boolean),
        notes:         form.notes?.trim() || null,
      };
      const res = isEdit
        ? await consumablesApi.update(initial!.id, payload)
        : await consumablesApi.create(payload);
      toast('success', isEdit ? 'Расходник обновлён' : 'Расходник добавлен');
      onSuccess(res.data);
    } catch (err: unknown) {
      toast('error', 'Ошибка', err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Тип *</label>
          <select className="select-field" value={form.type}
            onChange={(e) => set('type', e.target.value as ConsumableType)}>
            <option value="cartridge">Картридж</option>
            <option value="drum_unit">Фотобарабан</option>
          </select>
        </div>
        <div>
          <label className="form-label">Статус *</label>
          <select className="select-field" value={form.status}
            onChange={(e) => set('status', e.target.value as ConsumableStatus)}>
            <option value="in_stock">На складе</option>
            <option value="in_use">Используется</option>
            <option value="depleted">Пуст</option>
            <option value="written_off">Списан</option>
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">Артикул / Модель *</label>
        <input className={clsx('input-field', errors.model && 'border-red-500 bg-red-50')}
          value={form.model} onChange={(e) => set('model', e.target.value)}
          placeholder="Kyocera TK-1170, HP CE285A..." />
        {errors.model && <p className="text-xs text-red-500 font-bold mt-1.5">{errors.model}</p>}
      </div>

      <div>
        <label className="form-label">Серийный номер *</label>
        <input className={clsx('input-field', errors.serialNumber && 'border-red-500 bg-red-50')}
          value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)}
          placeholder="SN-0001, ABC123456..." />
        {errors.serialNumber && <p className="text-xs text-red-500 font-bold mt-1.5">{errors.serialNumber}</p>}
      </div>

      <div>
        <label className="form-label">Совместимые принтеры *</label>
        <input className={clsx('input-field', errors.compatibleWith && 'border-red-500 bg-red-50')}
          value={compatStr}
          onChange={(e) => set('compatibleWith', e.target.value.split(','))}
          placeholder="Kyocera ECOSYS M2135dn, Kyocera ECOSYS P2235d" />
        <p className="text-xs font-medium text-slate-500 mt-1.5">Перечислите через запятую</p>
        {errors.compatibleWith && <p className="text-xs text-red-500 font-bold mt-1.5">{errors.compatibleWith}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Место хранения *</label>
          <input className={clsx('input-field', errors.location && 'border-red-500 bg-red-50')}
            value={form.location} onChange={(e) => set('location', e.target.value)}
            placeholder="Склад А, Шкаф 1" />
          {errors.location && <p className="text-xs text-red-500 font-bold mt-1.5">{errors.location}</p>}
        </div>
        <div>
          <label className="form-label">Примечания</label>
          <input className="input-field"
            value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)}
            placeholder="Установлен в HP LaserJet..." />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-100">
        <button type="submit" className="btn-primary flex-1 justify-center" disabled={submitting}>
          {submitting ? 'Сохраняем...' : isEdit ? 'Сохранить' : 'Добавить'}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
}

// ── Детальная карточка с вкладками Информация / Документы / История ──
function ConsumableDetail({
  item,
  onEdit,
  onClose,
  onItemUpdate,
}: {
  item: Consumable;
  onEdit: () => void;
  onClose: () => void;
  onItemUpdate: (updated: Consumable) => void;
}) {
  const [tab, setTab] = useState<'info' | 'docs' | 'history'>('info');

  const docs: string[] = Array.isArray(item.documentUrls) ? (item.documentUrls as string[]) : [];

  const rows: [string, string | null | undefined][] = [
    ['Тип',             item.type === 'cartridge' ? 'Картридж' : 'Фотобарабан'],
    ['Серийный номер',  item.serialNumber],
    ['Место хранения',  item.location],
    ['Совместим с',     (item.compatibleWith as string[]).join(', ')],
    ['Примечания',      item.notes],
    ['Добавлено',       new Date(item.createdAt).toLocaleDateString('ru-RU')],
    ['Обновлено',       new Date(item.updatedAt).toLocaleDateString('ru-RU')],
  ];

  return (
    <div className="space-y-5">
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <ConsumableTypeBadge type={item.type} />
        <ConsumableStatusBadge status={item.status} />
        {docs.length > 0 && (
          <span className="badge border bg-sky-50 text-sky-700 border-sky-200">
            <FileText className="w-3 h-3" /> {docs.length} докум.
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {([
          { key: 'info',    icon: <Info className="w-4 h-4" />,     label: 'Инфо' },
          { key: 'docs',    icon: <FileText className="w-4 h-4" />, label: `Доки${docs.length ? ` (${docs.length})` : ''}` },
          { key: 'history', icon: <History className="w-4 h-4" />,  label: 'Лог' },
        ] as const).map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2",
              tab === key
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <div className="animate-fade-in">
          <dl className="space-y-3 mb-4">
            {rows.map(([label, value]) =>
              value !== null && value !== undefined ? (
                <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-100">
                  <dt className="text-sm text-slate-500 font-medium shrink-0">{label}</dt>
                  <dd className="text-sm text-slate-800 font-bold text-right break-words">{String(value)}</dd>
                </div>
              ) : null
            )}
          </dl>
        </div>
      )}

      {/* Tab: Documents */}
      {tab === 'docs' && (
        <div className="animate-fade-in">
          <DocumentsTab
            docs={docs}
            onUpload={async (file) => {
              const res = await consumablesApi.uploadDocument(item.id, file);
              onItemUpdate(res.data);
            }}
            onDelete={async (url) => {
              const res = await consumablesApi.deleteDocument(item.id, url);
              onItemUpdate(res.data);
            }}
          />
        </div>
      )}

      {/* Tab: History */}
      {tab === 'history' && (
        <div className="animate-fade-in">
          <AuditHistory entityId={item.id} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <button className="btn-primary flex-1 justify-center" onClick={onEdit}>
          <Pencil className="w-4 h-4" /> Редактировать
        </button>
        <button className="btn-ghost" onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
}

// ── Главный компонент ─────────────────────────────────────────
export function ConsumablesList() {
  const { toast } = useToast();
  const [items, setItems]       = useState<Consumable[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const LIMIT = 15;

  const [addOpen, setAddOpen]       = useState(false);
  const [editItem, setEditItem]     = useState<Consumable | null>(null);
  const [detailItem, setDetailItem] = useState<Consumable | null>(null);

  // --- Excel import ---
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const res = await consumablesApi.importExcel(file);
      if (res.skipped.length > 0) {
        toast('warning',
          `Импорт: создано ${res.created}, пропущено ${res.skipped.length}`,
          res.skipped.slice(0, 3).map((s) => `Строка ${s.row}: ${s.reason}`).join(' | ')
        );
      } else {
        toast('success', `Импорт завершён`, `Создано ${res.created} расходников`);
      }
      fetchData();
    } catch (err: unknown) {
      toast('error', 'Ошибка импорта', err instanceof Error ? err.message : '');
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: LIMIT };
      if (search)       params.search = search;
      if (typeFilter)   params.type   = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await consumablesApi.list(params);
      setItems(res.data);
      setTotal(res.pagination?.total ?? res.data.length);
    } catch (err: unknown) {
      toast('error', 'Ошибка загрузки', err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter, toast]);

  useEffect(() => {
    const t = setTimeout(() => setPage(1), search ? 400 : 0);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSuccess = (item: Consumable) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = item; return n; }
      return [item, ...prev];
    });
    setTotal((t) => items.find((i) => i.id === item.id) ? t : t + 1);
    setAddOpen(false);
    setEditItem(null);
    setDetailItem(null);
  };

  const handleDelete = async (item: Consumable) => {
    if (!confirm(`Удалить "${item.model}" (с/н: ${item.serialNumber})?`)) return;
    try {
      await consumablesApi.delete(item.id);
      toast('success', 'Расходник удалён');
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setTotal((t) => t - 1);
      setDetailItem(null);
    } catch (err: unknown) {
      toast('error', 'Ошибка удаления', err instanceof Error ? err.message : '');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-800">
              Расходники
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-500 ml-12">
            Управление расходными материалами
          </p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2 ml-12">
            {total} экземпляров в базе
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton entity="consumables" />
          {/* Скрытый input для выбора Excel */}
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportExcel}
          />
          <button
            className={clsx('btn-ghost bg-white shadow-sm border border-slate-200', importing && 'opacity-60 cursor-not-allowed')}
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            title="Импортировать расходники из Excel (.xlsx)"
          >
            <FileUp className="w-4 h-4" />
            {importing ? 'Импорт...' : 'Excel'}
          </button>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="surface p-4 mb-6 rounded-xl">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
            <input className="input-field pl-10 w-full" placeholder="Поиск по артикулу, серийному номеру, месту хранения..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="select-field min-w-[160px]" value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="select-field min-w-[160px]" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="btn-ghost px-3 bg-white border border-slate-200 shadow-sm" onClick={fetchData} title="Обновить">
            <RefreshCw className={clsx('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="surface overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Тип', 'Артикул / Модель', 'Серийный номер', 'Статус', 'Место хранения', 'Действия'].map((h) => (
                  <th key={h} className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-4"><div className="skeleton h-4 rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                : items.length === 0
                ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-slate-500">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                          <Package className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="font-bold text-slate-700">Расходники не найдены</p>
                      </td>
                    </tr>
                  )
                : items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setDetailItem(item)}>
                      <td className="px-4 py-4"><ConsumableTypeBadge type={item.type} /></td>
                      <td className="px-4 py-4 font-bold text-slate-800">{item.model}</td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-2 font-mono font-medium text-xs text-slate-500">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          {item.serialNumber}
                        </span>
                      </td>
                      <td className="px-4 py-4"><ConsumableStatusBadge status={item.status} /></td>
                      <td className="px-4 py-4 text-slate-600 font-medium">{item.location}</td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button className="btn-ghost py-1 px-2 text-slate-500 hover:text-blue-600"
                            onClick={() => setEditItem(item)}>
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Страница {page} из {totalPages}</p>
            <div className="flex gap-2">
              <button className="btn-ghost bg-white border border-slate-200 shadow-sm py-1.5 px-3 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Назад</button>
              <button className="btn-ghost bg-white border border-slate-200 shadow-sm py-1.5 px-3 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Вперёд →</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface p-4 rounded-xl space-y-3">
                <div className="skeleton h-5 w-2/3 rounded" />
                <div className="skeleton h-4 w-1/3 rounded" />
              </div>
            ))
          : items.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm transition-all active:scale-[0.99] hover:shadow-md cursor-pointer" onClick={() => setDetailItem(item)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <ConsumableTypeBadge type={item.type} />
                      <ConsumableStatusBadge status={item.status} />
                    </div>
                    <p className="font-display font-bold text-slate-800 text-base mt-2">{item.model}</p>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />SN: {item.serialNumber}
                    </p>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">ЛОК: {item.location}</p>
                  </div>
                  <button className="btn-ghost py-1 px-2 shrink-0 text-slate-400 hover:text-blue-600"
                    onClick={(e) => { e.stopPropagation(); setEditItem(item); }}>
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
      </div>

      {/* Modals */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Добавить расходник" size="md">
        <ConsumableForm onSuccess={handleSuccess} onCancel={() => setAddOpen(false)} />
      </Modal>
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Редактировать расходник" size="md">
        {editItem && <ConsumableForm initial={editItem} onSuccess={handleSuccess} onCancel={() => setEditItem(null)} />}
      </Modal>

      {/* Detail modal with Info + Documents + History tabs */}
      <Modal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem ? `${detailItem.model} — ${detailItem.serialNumber}` : ''}
        size="md"
      >
        {detailItem && (
          <ConsumableDetail
            item={detailItem}
            onEdit={() => { setEditItem(detailItem); setDetailItem(null); }}
            onClose={() => setDetailItem(null)}
            onItemUpdate={(updated) => {
              setDetailItem(updated);
              setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
            }}
          />
        )}
      </Modal>


      {/* Inline delete from detail — surfaced via a separate handler */}
      {detailItem && (
        <div style={{ display: 'none' }} id="delete-handler-placeholder">
          <button onClick={() => handleDelete(detailItem)}>Удалить</button>
        </div>
      )}
    </div>
  );
}
