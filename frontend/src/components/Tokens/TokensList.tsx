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
        <input className={clsx("input-field font-mono", errors.serialNumber && "border-red-500 bg-red-500/10")}
          value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)}
          placeholder="RT-000001234" disabled={isEdit} />
        {errors.serialNumber && <p className="text-xs text-red-500 font-bold mt-1.5">{errors.serialNumber}</p>}
        {isEdit && <p className="text-xs text-slate-400 font-medium mt-1.5">Серийный номер нельзя изменить</p>}
      </div>
      <div>
        <label className="form-label">ФИО сотрудника *</label>
        <input className={clsx("input-field", errors.issuedTo && "border-red-500 bg-red-500/10")}
          value={form.issuedTo} onChange={(e) => set('issuedTo', e.target.value)}
          placeholder="Иванов Иван Иванович" />
        {errors.issuedTo && <p className="text-xs text-red-500 font-bold mt-1.5">{errors.issuedTo}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Тип сертификата *</label>
          <input className={clsx("input-field", errors.certificateType && "border-red-500 bg-red-500/10")}
            value={form.certificateType} onChange={(e) => set('certificateType', e.target.value)}
            placeholder="ФНС, Казначейство, ЕГАИС..." />
          {errors.certificateType && <p className="text-xs text-red-500 font-bold mt-1.5">{errors.certificateType}</p>}
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
        <input type="date" className={clsx("input-field", errors.expirationDate && "border-red-500 bg-red-500/10")}
          value={form.expirationDate} onChange={(e) => set('expirationDate', e.target.value)} />
        {errors.expirationDate && <p className="text-xs text-red-500 font-bold mt-1.5">{errors.expirationDate}</p>}
      </div>
      <div>
        <label className="form-label">Примечания</label>
        <textarea className="input-field resize-none" rows={2}
          value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)}
          placeholder="PIN, место хранения, доп. информация..." />
      </div>
      <div className="flex gap-3 pt-4 border-t border-slate-700/50">
        <button type="submit" className="btn-primary flex-1 justify-center" disabled={submitting}>
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
    <div className="space-y-5">
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <TokenStatusBadge status={item.status} />
        <ExpiryBadge daysUntilExpiry={item.daysUntilExpiry} isExpired={item.isExpired} />
        {docs.length > 0 && (
          <span className="badge border bg-sky-500/10 text-sky-400 border-sky-500/20">
            <FileText className="w-3 h-3" /> {docs.length} докум.
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
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
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
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
              value ? (
                <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-700/50">
                  <dt className="text-sm text-slate-400 font-medium shrink-0">{label}</dt>
                  <dd className="text-sm text-slate-100 font-bold text-right break-words">{value}</dd>
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
              const res = await tokensApi.uploadDocument(item.id, file);
              onItemUpdate(res.data);
            }}
            onDelete={async (url) => {
              const res = await tokensApi.deleteDocument(item.id, url);
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
      <div className="flex gap-3 pt-4 border-t border-slate-700">
        <button className="btn-primary flex-1 justify-center" onClick={onEdit}>
          <Pencil className="w-4 h-4" /> Редактировать
        </button>
        {item.status === 'active' && (
          <button className="btn-danger p-2 px-4 whitespace-nowrap font-bold text-sm rounded-xl" onClick={onRevoke}>Отозвать</button>
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
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <KeyRound className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-100">
              Рутокены и ЭЦП
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-400 ml-12">
            Контроль электронных подписей
          </p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-2 ml-12">
            {total} записей
          </p>
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
            className={clsx('btn-ghost bg-slate-800 shadow-sm border border-slate-700', importing && 'opacity-60 cursor-not-allowed')}
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
      <div className="surface p-4 mb-6 rounded-xl">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
            <input className="input-field pl-10 w-full" placeholder="Поиск по серийнику, ФИО, типу сертификата..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="select-field min-w-[160px]" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            className={clsx(
              'btn-ghost whitespace-nowrap bg-slate-800 border border-slate-700 shadow-sm transition-colors',
              expiringSoon && 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-none'
            )}
            onClick={() => { setExpiringSoon((v) => !v); setPage(1); }}
          >
            <Clock className="w-4 h-4" />
            Скоро истекает
          </button>
          <button className="btn-ghost px-3 bg-slate-800 border border-slate-700 shadow-sm" onClick={fetchData}>
            <RefreshCw className={clsx('w-4 h-4 text-slate-400', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="surface overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700">
                {['Серийный №', 'ФИО сотрудника', 'Тип сертификата', 'Истекает', 'Осталось', 'Статус', 'Действия'].map(
                  (h) => <th key={h} className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-4"><div className="skeleton h-4 rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                : items.length === 0
                ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-500">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
                          <KeyRound className="w-8 h-8 text-slate-600" />
                        </div>
                        <p className="font-bold text-slate-300">Рутокены не найдены</p>
                      </td>
                    </tr>
                  )
                : items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-800 cursor-pointer transition-colors" onClick={() => setDetailItem(item)}>
                      <td className="px-4 py-4 font-mono font-medium text-xs text-blue-400">{item.serialNumber}</td>
                      <td className="px-4 py-4 font-bold text-slate-100">{item.issuedTo}</td>
                      <td className="px-4 py-4">
                        <Badge variant="purple">
                          <Shield className="w-3 h-3" /> {item.certificateType}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-400 font-medium text-sm whitespace-nowrap">
                        {new Date(item.expirationDate).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-4">
                        <ExpiryBadge daysUntilExpiry={item.daysUntilExpiry} isExpired={item.isExpired} />
                      </td>
                      <td className="px-4 py-4"><TokenStatusBadge status={item.status} /></td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button className="btn-ghost py-1 px-2 text-slate-400 hover:text-blue-400 border-none bg-transparent" onClick={() => setEditItem(item)}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          {item.status === 'active' && (
                            <button className="text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-md transition-colors"
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
          <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-t border-slate-700">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Страница {page} из {totalPages} · {total} записей</p>
            <div className="flex gap-2">
              <button className="btn-ghost bg-slate-800 border border-slate-700 shadow-sm py-1.5 px-3 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Назад</button>
              <button className="btn-ghost bg-slate-800 border border-slate-700 shadow-sm py-1.5 px-3 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Вперёд →</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface p-4 rounded-xl space-y-3">
                <div className="skeleton h-5 w-3/4 rounded" />
                <div className="skeleton h-4 w-1/2 rounded" />
              </div>
            ))
          : items.map((item) => (
              <button key={item.id} onClick={() => setDetailItem(item)}
                className="w-full text-left p-4 rounded-xl bg-slate-800 border border-slate-700 shadow-sm transition-all active:scale-[0.99] hover:shadow-md cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-display font-bold text-slate-100 text-base">{item.issuedTo}</p>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">{item.serialNumber}</p>
                  </div>
                  <div className="p-1 rounded-full bg-slate-700 text-slate-400">
                    <ChevronRight className="w-5 h-5 shrink-0" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="purple">
                    <Shield className="w-3 h-3" /> {item.certificateType}
                  </Badge>
                  <TokenStatusBadge status={item.status} />
                  <ExpiryBadge daysUntilExpiry={item.daysUntilExpiry} isExpired={item.isExpired} />
                </div>
                {item.notes && (
                  <p className="text-xs font-medium text-slate-500 mt-3 truncate">{item.notes}</p>
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
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
              <AlertTriangle className="w-6 h-6 mb-2 text-amber-500" />
              <p>Отозвать сертификат <strong className="text-amber-200">{revokeConfirm.certificateType}</strong>?</p>
              <p className="text-xs mt-1">Владелец: <span className="font-bold text-amber-200">{revokeConfirm.issuedTo}</span></p>
              <p className="text-xs">SN: <span className="font-mono text-amber-200">{revokeConfirm.serialNumber}</span></p>
              <p className="text-xs mt-2 font-bold text-amber-500">Это действие необратимо.</p>
            </div>
            <div className="flex gap-3">
              <button className="btn-danger flex-1 justify-center py-2.5 rounded-xl font-bold text-sm" onClick={handleRevoke} disabled={revoking}>
                {revoking ? 'Отзываем...' : 'Отозвать'}
              </button>
              <button className="btn-ghost bg-slate-800 py-2.5 px-4 rounded-xl font-bold text-sm text-slate-400 hover:bg-slate-700" onClick={() => setRevokeConfirm(null)}>Отмена</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
