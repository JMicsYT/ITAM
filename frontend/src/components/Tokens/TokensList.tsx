import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Search, RefreshCw, KeyRound, AlertTriangle, Clock, Pencil, Shield, ChevronRight, History, Info, FileText, FileUp } from 'lucide-react';
import clsx from 'clsx';
import { tokensApi } from '../../api/tokens';
import type { Token, TokenFormData, TokenStatus } from '../../types';
import { Modal } from '../ui/Modal';
import { Badge, TokenStatusBadge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { ExportButton } from '../ui/ExportButton';
import { AuditHistory } from '../ui/AuditHistory';
import { DocumentsTab } from '../ui/DocumentsTab';

// ============================================================
// TokensList — Рутокены и ЭЦП
// ============================================================

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',        label: 'Все статусы' },
  { value: 'active',  label: 'Активные' },
  { value: 'in_safe', label: 'В сейфе' },
  { value: 'expired', label: 'Истёкшие' },
  { value: 'revoked', label: 'Отозванные' },
];

type ValidationErrors = Partial<Record<keyof TokenFormData, string>>;

function validate(data: TokenFormData): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!data.serialNumber.trim())    errors.serialNumber = 'Укажите серийный номер';
  if (!data.issuedTo.trim())        errors.issuedTo = 'Укажите ФИО';
  if (!data.certificateType.trim()) errors.certificateType = 'Укажите тип сертификата';
  if (!data.expirationDate)         errors.expirationDate = 'Укажите дату истечения';
  return errors;
}

function TokenForm({
  initial,
  onSuccess,
  onCancel,
}: {
  initial?: Token;
  onSuccess: (item: Token) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;

  const toDateInput = (iso?: string) => {
    if (!iso) return '';
    return iso.split('T')[0];
  };

  const [form, setForm] = useState<TokenFormData>({
    serialNumber: initial?.serialNumber ?? '',
    issuedTo: initial?.issuedTo ?? '',
    certificateType: initial?.certificateType ?? '',
    expirationDate: toDateInput(initial?.expirationDate),
    status: (initial?.status ?? 'active') as TokenStatus,
    notes: initial?.notes ?? '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function set(field: keyof TokenFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const res = isEdit
        ? await tokensApi.update(initial!.id, { ...form, expirationDate: new Date(form.expirationDate).toISOString() })
        : await tokensApi.create({ ...form, expirationDate: new Date(form.expirationDate).toISOString() });
      toast('success', isEdit ? 'Токен обновлён' : 'Токен зарегистрирован');
      onSuccess(res.data);
    } catch (err: unknown) {
      toast('error', 'Ошибка', err instanceof Error ? err.message : '');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="form-label">Серийный номер Рутокена *</label>
        <input className={`input-field font-mono ${errors.serialNumber ? 'border-rose-500/60' : ''}`}
          value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)}
          placeholder="RT-000001234" disabled={isEdit} />
        {errors.serialNumber && <p className="text-xs text-rose-400 mt-1">{errors.serialNumber}</p>}
        {isEdit && <p className="text-xs text-slate-500 mt-1">Серийный номер нельзя изменить</p>}
      </div>
      <div>
        <label className="form-label">ФИО сотрудника *</label>
        <input className={`input-field ${errors.issuedTo ? 'border-rose-500/60' : ''}`}
          value={form.issuedTo} onChange={(e) => set('issuedTo', e.target.value)}
          placeholder="Иванов Иван Иванович" />
        {errors.issuedTo && <p className="text-xs text-rose-400 mt-1">{errors.issuedTo}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Тип сертификата *</label>
          <input className={`input-field ${errors.certificateType ? 'border-rose-500/60' : ''}`}
            value={form.certificateType} onChange={(e) => set('certificateType', e.target.value)}
            placeholder="ФНС, Казначейство, ЕГАИС..." />
          {errors.certificateType && <p className="text-xs text-rose-400 mt-1">{errors.certificateType}</p>}
        </div>
        <div>
          <label className="form-label">Статус</label>
          <select className="select-field" value={form.status}
            onChange={(e) => set('status', e.target.value)}>
            <option value="active">Активен</option>
            <option value="in_safe">В сейфе</option>
            <option value="expired">Истёк</option>
            <option value="revoked">Отозван</option>
          </select>
        </div>
      </div>
      <div>
        <label className="form-label">Дата истечения сертификата *</label>
        <input type="date" className={`input-field ${errors.expirationDate ? 'border-rose-500/60' : ''}`}
          value={form.expirationDate} onChange={(e) => set('expirationDate', e.target.value)} />
        {errors.expirationDate && <p className="text-xs text-rose-400 mt-1">{errors.expirationDate}</p>}
      </div>
      <div>
        <label className="form-label">Примечания</label>
        <textarea className="input-field resize-none" rows={2}
          value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)}
          placeholder="PIN, место хранения, доп. информация..." />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={submitting}>
          {submitting ? 'Сохраняем...' : isEdit ? 'Сохранить' : 'Зарегистрировать'}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
}

// Expiry indicator
function ExpiryBadge({ daysUntilExpiry, isExpired }: { daysUntilExpiry?: number; isExpired?: boolean }) {
  if (isExpired) return <Badge variant="slate">Истёк</Badge>;
  if (daysUntilExpiry === undefined) return null;
  if (daysUntilExpiry <= 0) return <Badge variant="red">Истёк</Badge>;
  if (daysUntilExpiry <= 30) return (
    <Badge variant="amber" className="animate-pulse">
      <Clock className="w-3 h-3" /> {daysUntilExpiry}д
    </Badge>
  );
  return <Badge variant="green">{daysUntilExpiry}д</Badge>;
}

// ── Детальный вид токена с вкладками Информация / Документы / История ──
function TokenDetail({
  item,
  onEdit,
  onRevoke,
  onClose,
  onItemUpdate,
}: {
  item: Token;
  onEdit: () => void;
  onRevoke: () => void;
  onClose: () => void;
  onItemUpdate: (updated: Token) => void;
}) {
  const [tab, setTab] = useState<'info' | 'docs' | 'history'>('info');
  const docs = Array.isArray(item.documentUrls) ? (item.documentUrls as string[]) : [];

  const rows: [string, string | null | undefined][] = [
    ['Серийный №',  item.serialNumber],
    ['Владелец',     item.issuedTo],
    ['Тип сертификата', item.certificateType],
    ['Истекает',     new Date(item.expirationDate).toLocaleDateString('ru-RU')],
    ['Примечания',   item.notes],
    ['Добавлено',    new Date(item.createdAt).toLocaleDateString('ru-RU')],
    ['Обновлено',    new Date(item.updatedAt).toLocaleDateString('ru-RU')],
  ];

  return (
    <div className="space-y-4">
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <TokenStatusBadge status={item.status} />
        <ExpiryBadge daysUntilExpiry={item.daysUntilExpiry} isExpired={item.isExpired} />
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
            value ? (
              <div key={label} className="flex justify-between gap-4 py-2 border-b border-navy-700/40">
                <dt className="text-xs text-slate-500 shrink-0">{label}</dt>
                <dd className="text-sm text-slate-200 text-right font-medium font-mono">{value}</dd>
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
            const res = await tokensApi.uploadDocument(item.id, file);
            onItemUpdate(res.data);
          }}
          onDelete={async (url) => {
            const res = await tokensApi.deleteDocument(item.id, url);
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
        {item.status === 'active' && (
          <button className="btn-danger" onClick={onRevoke}>Отозвать</button>
        )}
        <button className="btn-ghost" onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
}

export function TokensList() {
  const { toast } = useToast();
  const [items, setItems] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 15;

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Token | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<Token | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [detailItem, setDetailItem] = useState<Token | null>(null);

  // --- Excel import ---
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const res = await tokensApi.importExcel(file);
      if (res.skipped.length > 0) {
        toast('warning',
          `Импорт: создано ${res.created}, пропущено ${res.skipped.length}`,
          res.skipped.slice(0, 3).map((s) => `Строка ${s.row}: ${s.reason}`).join(' | ')
        );
      } else {
        toast('success', `Импорт завершён`, `Создано ${res.created} токенов`);
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
      if (statusFilter) params.status = statusFilter;
      if (expiringSoon) params.expiringSoon = true;
      const res = await tokensApi.list(params);
      setItems(res.data);
      setTotal(res.pagination?.total ?? res.data.length);
    } catch (err: unknown) {
      toast('error', 'Ошибка загрузки', err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, expiringSoon, toast]);

  useEffect(() => {
    const t = setTimeout(() => setPage(1), search ? 400 : 0);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRevoke = async () => {
    if (!revokeConfirm) return;
    setRevoking(true);
    try {
      const res = await tokensApi.revoke(revokeConfirm.id);
      setItems((prev) => prev.map((i) => (i.id === res.data.id ? res.data : i)));
      toast('warning', 'Токен отозван', `Серийный №: ${revokeConfirm.serialNumber}`);
      setRevokeConfirm(null);
    } catch (err: unknown) {
      toast('error', 'Ошибка', err instanceof Error ? err.message : '');
    } finally {
      setRevoking(false);
    }
  };

  const handleSuccess = (item: Token) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = item; return n; }
      return [item, ...prev];
    });
    setTotal((t) => items.find((i) => i.id === item.id) ? t : t + 1);
    setAddOpen(false);
    setEditItem(null);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <KeyRound className="w-5 h-5" style={{ color: '#b955ff', filter: 'drop-shadow(0 0 6px #b955ff)' }} />
            <h1
              className="text-xl md:text-2xl font-black uppercase tracking-widest"
              style={{ fontFamily: 'Orbitron, monospace', color: '#e8eaff' }}
            >
              Рутокены и ЭЦП
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}>
            // Контроль электронных подписей
          </p>
          <p className="text-slate-400 text-sm mt-0.5">{total} записей</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton entity="tokens" />
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
            title="Импортировать токены из Excel (.xlsx)"
          >
            <FileUp className="w-4 h-4" />
            {importing ? 'Импорт...' : 'Excel'}
          </button>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Зарегистрировать
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-cyber p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#b955ff' }} />
            <input className="input-field pl-9" placeholder="Поиск по серийнику, ФИО, типу сертификата..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="select-field min-w-[160px]" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            className={clsx('btn-ghost whitespace-nowrap', expiringSoon && 'bg-[#ffaa0022] border-[#ffaa0088] text-[#ffaa00]')}
            onClick={() => { setExpiringSoon((v) => !v); setPage(1); }}
          >
            <Clock className="w-4 h-4" />
            {expiringSoon ? 'Скоро истекает' : 'Скоро истекает'}
          </button>
          <button className="btn-ghost px-3" onClick={fetchData}>
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card-cyber overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            <thead>
              <tr style={{ background: 'rgba(185,85,255,0.03)', borderBottom: '1px solid var(--color-border)' }}>
                {['Серийный №', 'ФИО сотрудника', 'Тип сертификата', 'Истекает', 'Осталось', 'Статус', 'Действия'].map(
                  (h) => <th key={h} className="text-left px-4 py-3.5 text-[10px] uppercase tracking-widest" style={{ color: '#b955ff' }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5"><div className="skeleton h-4 rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                : items.length === 0
                ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-500">
                        <KeyRound className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>Рутокены не найдены</p>
                      </td>
                    </tr>
                  )
                : items.map((item) => (
                    <tr key={item.id} className="table-row-interactive" onClick={() => setDetailItem(item)}>
                      <td className="px-4 py-3.5 font-mono text-xs" style={{ color: '#00f5ff' }}>{item.serialNumber}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-200">{item.issuedTo}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant="purple">
                          <Shield className="w-3 h-3" /> {item.certificateType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(item.expirationDate).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3.5">
                        <ExpiryBadge daysUntilExpiry={item.daysUntilExpiry} isExpired={item.isExpired} />
                      </td>
                      <td className="px-4 py-3.5"><TokenStatusBadge status={item.status} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button className="btn-ghost py-1 px-2" onClick={() => setEditItem(item)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {item.status === 'active' && (
                            <button className="btn-danger py-1 px-2 text-xs"
                              onClick={() => setRevokeConfirm(item)}>
                              Отозвать
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-navy-700/40">
            <p className="text-xs text-slate-500">Страница {page} из {totalPages} · {total} записей</p>
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
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            ))
          : items.map((item) => (
              <button key={item.id} onClick={() => setDetailItem(item)}
                className="card-stat w-full text-left p-4 transition-all active:scale-[0.99]" style={{ borderColor: '#1e1e3a' }}>
                <div className="h-[1px] w-full -mt-4 mb-4" style={{ background: 'linear-gradient(90deg, #b955ff44, transparent)' }} />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#e8eaff', fontFamily: 'JetBrains Mono, monospace' }}>{item.issuedTo}</p>
                    <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#00f5ff', fontFamily: 'JetBrains Mono, monospace' }}>{item.serialNumber}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#b955ff55' }} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="purple">
                    <Shield className="w-3 h-3" /> {item.certificateType}
                  </Badge>
                  <TokenStatusBadge status={item.status} />
                  <ExpiryBadge daysUntilExpiry={item.daysUntilExpiry} isExpired={item.isExpired} />
                </div>
                {item.notes && (
                  <p className="text-[10px] uppercase tracking-wider mt-2 truncate" style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}>{item.notes}</p>
                )}
              </button>
            ))}
      </div>

      {/* Modals */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Регистрация Рутокена / ЭЦП" size="md">
        <TokenForm onSuccess={handleSuccess} onCancel={() => setAddOpen(false)} />
      </Modal>
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Редактировать Рутокен" size="md">
        {editItem && <TokenForm initial={editItem} onSuccess={handleSuccess} onCancel={() => setEditItem(null)} />}
      </Modal>

      {/* Detail drawer with Info + Documents + History tabs */}
      <Modal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem ? `Рутокен — ${detailItem.issuedTo}` : ''}
        size="md"
      >
        {detailItem && (
          <TokenDetail
            item={detailItem}
            onEdit={() => { setEditItem(detailItem); setDetailItem(null); }}
            onRevoke={() => { setRevokeConfirm(detailItem); setDetailItem(null); }}
            onClose={() => setDetailItem(null)}
            onItemUpdate={(updated) => {
              setDetailItem(updated);
              setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
            }}
          />
        )}
      </Modal>

      {/* Revoke confirm */}
      <Modal open={!!revokeConfirm} onClose={() => setRevokeConfirm(null)} title="Отозвать токен" size="sm">
        {revokeConfirm && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-sm text-amber-300">
              <AlertTriangle className="w-5 h-5 mb-2 text-amber-400" />
              <p>Отозвать сертификат <strong>{revokeConfirm.certificateType}</strong>?</p>
              <p className="text-xs mt-1">Владелец: {revokeConfirm.issuedTo}</p>
              <p className="text-xs">SN: {revokeConfirm.serialNumber}</p>
              <p className="text-xs mt-1 text-amber-400">Это действие необратимо.</p>
            </div>
            <div className="flex gap-3">
              <button className="btn-danger flex-1 justify-center" onClick={handleRevoke} disabled={revoking}>
                {revoking ? 'Отзываем...' : 'Отозвать'}
              </button>
              <button className="btn-ghost" onClick={() => setRevokeConfirm(null)}>Отмена</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
