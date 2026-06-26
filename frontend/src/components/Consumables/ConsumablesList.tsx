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

// ============================================================
// ConsumablesList — поштучный учёт расходников по серийным номерам
// ============================================================

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
      <div className="grid grid-cols-2 gap-3">
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
        <input className={`input-field ${errors.model ? 'border-rose-500/60' : ''}`}
          value={form.model} onChange={(e) => set('model', e.target.value)}
          placeholder="Kyocera TK-1170, HP CE285A..." />
        {errors.model && <p className="text-xs text-rose-400 mt-1">{errors.model}</p>}
      </div>

      <div>
        <label className="form-label">Серийный номер *</label>
        <input className={`input-field ${errors.serialNumber ? 'border-rose-500/60' : ''}`}
          value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)}
          placeholder="SN-0001, ABC123456..." />
        {errors.serialNumber && <p className="text-xs text-rose-400 mt-1">{errors.serialNumber}</p>}
      </div>

      <div>
        <label className="form-label">Совместимые принтеры *</label>
        <input className={`input-field ${errors.compatibleWith ? 'border-rose-500/60' : ''}`}
          value={compatStr}
          onChange={(e) => set('compatibleWith', e.target.value.split(','))}
          placeholder="Kyocera ECOSYS M2135dn, Kyocera ECOSYS P2235d" />
        <p className="text-xs text-slate-500 mt-1">Перечислите через запятую</p>
        {errors.compatibleWith && <p className="text-xs text-rose-400 mt-1">{errors.compatibleWith}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Место хранения *</label>
          <input className={`input-field ${errors.location ? 'border-rose-500/60' : ''}`}
            value={form.location} onChange={(e) => set('location', e.target.value)}
            placeholder="Склад А, Шкаф 1" />
          {errors.location && <p className="text-xs text-rose-400 mt-1">{errors.location}</p>}
        </div>
        <div>
          <label className="form-label">Примечания</label>
          <input className="input-field"
            value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)}
            placeholder="Установлен в HP LaserJet..." />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={submitting}>
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
    <div className="space-y-4">
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <ConsumableTypeBadge type={item.type} />
        <ConsumableStatusBadge status={item.status} />
        {docs.length > 0 && (
          <span className="badge bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/25">
            <FileText className="w-3 h-3" /> {docs.length} докум.
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1" style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid var(--color-border)' }}>
        {([
          { key: 'info',    icon: <Info className="w-3.5 h-3.5" />,     label: 'Инфо' },
          { key: 'docs',    icon: <FileText className="w-3.5 h-3.5" />, label: `Доки${docs.length ? ` (${docs.length})` : ''}` },
          { key: 'history', icon: <History className="w-3.5 h-3.5" />,  label: 'Лог' },
        ] as const).map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-semibold uppercase tracking-wider transition-all"
            style={{
              color: tab === key ? '#00f5ff' : '#555577',
              background: tab === key ? 'rgba(0,245,255,0.08)' : 'transparent',
              borderBottom: tab === key ? '1px solid #00f5ff66' : '1px solid transparent',
              fontFamily: 'JetBrains Mono, monospace',
              textShadow: tab === key ? '0 0 8px #00f5ff88' : 'none',
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <dl className="space-y-3">
          {rows.map(([label, value]) =>
            value !== null && value !== undefined ? (
              <div key={label} className="flex justify-between gap-4 py-2 border-b border-navy-700/40">
                <dt className="text-xs text-slate-500 shrink-0">{label}</dt>
                <dd className="text-sm text-slate-200 text-right font-medium">{String(value)}</dd>
              </div>
            ) : null
          )}
        </dl>
      )}

      {/* Tab: Documents */}
      {tab === 'docs' && (
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
      )}

      {/* Tab: History */}
      {tab === 'history' && <AuditHistory entityId={item.id} />}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button className="btn-primary flex-1" onClick={onEdit}>
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
            <Package className="w-5 h-5" style={{ color: '#ffaa00', filter: 'drop-shadow(0 0 6px #ffaa00)' }} />
            <h1
              className="text-xl md:text-2xl font-black uppercase tracking-widest"
              style={{ fontFamily: 'Orbitron, monospace', color: '#e8eaff' }}
            >
              Расходники
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}>
            // Управление расходными материалами
          </p>
          <p className="text-slate-400 text-sm mt-0.5">{total} экземпляров в базе</p>
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
            className={clsx('btn-ghost', importing && 'opacity-60 cursor-not-allowed')}
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
      <div className="card-cyber p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#ffaa00' }} />
            <input className="input-field pl-9" placeholder="Поиск по артикулу, серийному номеру, месту хранения..."
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
          <button className="btn-ghost px-3" onClick={fetchData}>
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="card-cyber overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            <thead>
              <tr style={{ background: 'rgba(255,170,0,0.03)', borderBottom: '1px solid var(--color-border)' }}>
                {['Тип', 'Артикул / Модель', 'Серийный номер', 'Статус', 'Место хранения', 'Действия'].map((h) => (
                  <th key={h} className="text-left px-4 py-3.5 text-[10px] uppercase tracking-widest" style={{ color: '#ffaa00' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5"><div className="skeleton h-4 rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                : items.length === 0
                ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-slate-500">
                        <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>Расходники не найдены</p>
                      </td>
                    </tr>
                  )
                : items.map((item) => (
                    <tr key={item.id} className="table-row-interactive" onClick={() => setDetailItem(item)}>
                      <td className="px-4 py-3.5"><ConsumableTypeBadge type={item.type} /></td>
                      <td className="px-4 py-3.5 font-semibold text-slate-200">{item.model}</td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
                          <Tag className="w-3 h-3 text-slate-500" />
                          {item.serialNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3.5"><ConsumableStatusBadge status={item.status} /></td>
                      <td className="px-4 py-3.5 text-slate-300">{item.location}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button className="btn-ghost py-1 px-2"
                            onClick={() => setEditItem(item)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-navy-700/40">
            <p className="text-xs text-slate-500">Страница {page} из {totalPages}</p>
            <div className="flex gap-2">
              <button className="btn-ghost py-1.5 px-3 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Назад</button>
              <button className="btn-ghost py-1.5 px-3 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Вперёд →</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-stat p-4 space-y-2" style={{ borderColor: '#1e1e3a' }}>
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
              </div>
            ))
          : items.map((item) => (
              <div key={item.id} className="card-stat p-4" style={{ borderColor: '#1e1e3a' }} onClick={() => setDetailItem(item)}>
                <div className="h-[1px] w-full -mt-4 mb-4" style={{ background: 'linear-gradient(90deg, #ffaa0044, transparent)' }} />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ConsumableTypeBadge type={item.type} />
                      <ConsumableStatusBadge status={item.status} />
                    </div>
                    <p className="font-semibold text-sm mt-2" style={{ color: '#e8eaff', fontFamily: 'JetBrains Mono, monospace' }}>{item.model}</p>
                    <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}>
                      <Tag className="w-3 h-3 inline mr-1" />SN: {item.serialNumber}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}>LOC: {item.location}</p>
                  </div>
                  <button className="btn-ghost py-1 px-2 shrink-0"
                    onClick={(e) => { e.stopPropagation(); setEditItem(item); }}>
                    <Pencil className="w-3.5 h-3.5" />
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
