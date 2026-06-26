import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus, Search, Filter, RefreshCw, ChevronRight,
  Server, AlertTriangle, Pencil, Trash2, History, Info, FileText, FileUp
} from 'lucide-react';
import { AuditHistory } from '../ui/AuditHistory';
import { DocumentsTab } from '../ui/DocumentsTab';
import clsx from 'clsx';
import { equipmentApi } from '../../api/equipment';
import type { Equipment } from '../../types';
import { Modal } from '../ui/Modal';
import { EquipmentStatusBadge, EquipmentTypeBadge } from '../ui/Badge';
import { EquipmentForm } from './EquipmentForm';
import { QRButton } from './QRModal';
import { ExportButton } from '../ui/ExportButton';
import { useToast } from '../ui/Toast';

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '',        label: 'Все типы' },
  { value: 'pc',      label: 'ПК' },
  { value: 'laptop',  label: 'Ноутбуки' },
  { value: 'server',  label: 'Серверы' },
  { value: 'printer', label: 'Принтеры / МФУ' },
  { value: 'ups',     label: 'ИБП' },
  { value: 'monitor', label: 'Мониторы' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',              label: 'Все статусы' },
  { value: 'in_use',        label: 'В работе' },
  { value: 'storage',       label: 'На складе' },
  { value: 'repair',        label: 'В ремонте' },
  { value: 'decommissioned',label: 'Списано' },
];

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-700/50">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

function EquipmentDetail({
  item,
  onEdit,
  onDelete,
  onClose,
  onItemUpdate,
}: {
  item: Equipment;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onItemUpdate: (updated: Equipment) => void;
}) {
  const [tab, setTab] = useState<'info' | 'docs' | 'history'>('info');

  const docs = Array.isArray(item.documentUrls) ? (item.documentUrls as string[]) : [];

  const rows: [string, string | null | undefined][] = [
    ['Серийный номер', item.serialNumber],
    ['Расположение', item.location],
    ['Ответственный', item.assignedTo],
    ['IP-адрес', item.ipAddress],
    ['Примечания', item.notes],
    ['Добавлено', new Date(item.createdAt).toLocaleDateString('ru-RU')],
    ['Обновлено', new Date(item.updatedAt).toLocaleDateString('ru-RU')],
  ];

  return (
    <div className="space-y-5">
      {/* Header badges */}
      <div className="flex flex-wrap gap-2">
        <EquipmentTypeBadge type={item.type} />
        <EquipmentStatusBadge status={item.status} />
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
          <dl className="space-y-3 mb-5">
            {rows.map(([label, value]) =>
              value ? (
                <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-700/50">
                  <dt className="text-sm text-slate-400 font-medium shrink-0">{label}</dt>
                  <dd className="text-sm text-slate-100 font-bold text-right break-words">{value}</dd>
                </div>
              ) : null
            )}
          </dl>

          {item.specs && Object.keys(item.specs).length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Характеристики
              </h4>
              <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 space-y-3">
                {Object.entries(item.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium capitalize">{k}</span>
                    <span className="text-slate-100 font-bold">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Documents */}
      {tab === 'docs' && (
        <div className="animate-fade-in">
          <DocumentsTab
            docs={docs}
            onUpload={async (file) => {
              const res = await equipmentApi.uploadDocument(item.id, file);
              onItemUpdate(res.data);
            }}
            onDelete={async (url) => {
              const res = await equipmentApi.deleteDocument(item.id, url);
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
        <button className="btn-danger p-2 px-3" onClick={onDelete} title="Удалить">
          <Trash2 className="w-5 h-5" />
        </button>
        <button className="btn-ghost" onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
}

function EquipmentCard({ item, onClick }: { item: Equipment; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl bg-slate-800 border border-slate-700 shadow-sm transition-all active:scale-[0.99] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-display font-bold text-slate-100 text-base">{item.brand} {item.model}</p>
          <p className="text-xs font-medium mt-0.5 text-slate-400 uppercase tracking-wider">SN: {item.serialNumber}</p>
        </div>
        <div className="p-1 rounded-full bg-slate-700 text-slate-400">
          <ChevronRight className="w-5 h-5 shrink-0" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <EquipmentTypeBadge type={item.type} />
        <EquipmentStatusBadge status={item.status} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-400">
        {item.location && <span>ЛОК: {item.location}</span>}
        {item.assignedTo && <span>ПОЛЬЗ: {item.assignedTo}</span>}
      </div>
    </button>
  );
}

export function EquipmentList() {
  const { toast } = useToast();

  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  // Modal states
  const [addOpen, setAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Equipment | null>(null);
  const [editItem, setEditItem] = useState<Equipment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Equipment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // --- Excel import ---
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const res = await equipmentApi.importExcel(file);
      if (res.skipped.length > 0) {
        toast('warning',
          `Импорт: создано ${res.created}, пропущено ${res.skipped.length}`,
          res.skipped.slice(0, 3).map((s) => `Строка ${s.row}: ${s.reason}`).join(' | ')
        );
      } else {
        toast('success', `Импорт завершён`, `Создано ${res.created} единиц оборудования`);
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
      if (typeFilter)   params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await equipmentApi.list(params);
      setItems(res.data);
      setTotal(res.pagination?.total ?? 0);
    } catch (err: unknown) {
      toast('error', 'Ошибка загрузки', err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter, toast]);

  // Re-fetch on filter change (debounced search)
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); }, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdded = (item: Equipment) => {
    setAddOpen(false);
    setItems((prev) => [item, ...prev]);
    setTotal((t) => t + 1);
  };

  const handleEdited = (item: Equipment) => {
    setEditItem(null);
    setDetailItem(null);
    setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    toast('success', 'Изменения сохранены');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await equipmentApi.delete(deleteConfirm.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteConfirm.id));
      setTotal((t) => t - 1);
      setDeleteConfirm(null);
      setDetailItem(null);
      toast('success', 'Оборудование удалено');
    } catch (err: unknown) {
      toast('error', 'Не удалось удалить', err instanceof Error ? err.message : '');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Server className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-100">
              Оборудование
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-400 ml-12">
            Учёт ИТ-активов предприятия
          </p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-2 ml-12">
            {total > 0 ? `${total} единиц в базе` : 'Нет данных'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton entity="equipment"
            params={{ ...(typeFilter && { type: typeFilter }), ...(statusFilter && { status: statusFilter }) }}
          />
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
            title="Импортировать оборудование из Excel (.xlsx)"
          >
            <FileUp className="w-4 h-4" />
            {importing ? 'Импорт...' : 'Excel'}
          </button>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="surface p-4 mb-6 rounded-xl">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
            <input
              className="input-field pl-10 w-full"
              placeholder="Поиск по серийнику, модели, кабинету, ФИО..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
              <select
                className="select-field pl-10 min-w-[160px]"
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              >
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <select
              className="select-field min-w-[160px]"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              className="btn-ghost px-3 bg-slate-800 border border-slate-700 shadow-sm"
              onClick={fetchData}
              title="Обновить"
            >
              <RefreshCw className={clsx('w-4 h-4 text-slate-400', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop table ────────────────────────────────────── */}
      <div className="surface overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700">
                {['Тип', 'Производитель / Модель', 'Серийный №', 'Расположение', 'Ответственный', 'Статус', 'QR'].map(
                  (h) => (
                    <th key={h} className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : items.length === 0
                ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-500">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-700">
                          <Server className="w-8 h-8 text-slate-600" />
                        </div>
                        <p className="font-bold text-slate-300">Оборудование не найдено</p>
                        {(search || typeFilter || statusFilter) && (
                          <p className="text-sm mt-1 text-slate-400">Попробуйте изменить фильтры</p>
                        )}
                      </td>
                    </tr>
                  )
                : items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-700/50 hover:bg-slate-800 cursor-pointer transition-colors"
                      onClick={() => setDetailItem(item)}
                    >
                      <td className="px-4 py-4">
                        <EquipmentTypeBadge type={item.type} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-200">{item.brand} {item.model}</p>
                      </td>
                      <td className="px-4 py-4 font-mono font-medium text-slate-400 text-xs">{item.serialNumber}</td>
                      <td className="px-4 py-4 text-slate-300 font-medium">{item.location}</td>
                      <td className="px-4 py-4 text-slate-300 font-medium">{item.assignedTo ?? '—'}</td>
                      <td className="px-4 py-4">
                        <EquipmentStatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <QRButton item={item} />
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-t border-slate-700">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Страница {page} из {totalPages} · {total} записей
            </p>
            <div className="flex gap-2">
              <button
                className="btn-ghost bg-slate-800 border border-slate-700 shadow-sm py-1.5 px-3 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >← Назад</button>
              <button
                className="btn-ghost bg-slate-800 border border-slate-700 shadow-sm py-1.5 px-3 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >Вперёд →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile cards ─────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface p-4 rounded-xl space-y-3">
                <div className="skeleton h-5 w-3/4 rounded" />
                <div className="skeleton h-4 w-1/2 rounded" />
                <div className="flex gap-2 mt-2">
                  <div className="skeleton h-6 w-20 rounded-full" />
                  <div className="skeleton h-6 w-24 rounded-full" />
                </div>
              </div>
            ))
          : items.length === 0
          ? (
              <div className="text-center py-16 text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
                  <Server className="w-8 h-8 text-slate-600" />
                </div>
                <p className="font-bold text-slate-300">Ничего не найдено</p>
              </div>
            )
          : items.map((item) => (
              <EquipmentCard
                key={item.id}
                item={item}
                onClick={() => setDetailItem(item)}
              />
            ))}

        {/* Mobile pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <button className="btn-ghost bg-slate-800 border border-slate-700 shadow-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Назад</button>
            <span className="flex items-center text-xs font-bold text-slate-400">{page} / {totalPages}</span>
            <button className="btn-ghost bg-slate-800 border border-slate-700 shadow-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Вперёд →</button>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}

      {/* Add new */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Добавить оборудование" size="lg">
        <EquipmentForm onSuccess={handleAdded} onCancel={() => setAddOpen(false)} />
      </Modal>

      {/* Detail view */}
      <Modal
        open={!!detailItem && !editItem}
        onClose={() => setDetailItem(null)}
        title={detailItem ? `${detailItem.brand} ${detailItem.model}` : ''}
        size="md"
      >
        {detailItem && (
          <EquipmentDetail
            item={detailItem}
            onEdit={() => setEditItem(detailItem)}
            onDelete={() => setDeleteConfirm(detailItem)}
            onClose={() => setDetailItem(null)}
            onItemUpdate={(updated) => {
              setDetailItem(updated);
              setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
            }}
          />
        )}
      </Modal>


      {/* Edit */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Редактировать" size="lg">
        {editItem && (
          <EquipmentForm initial={editItem} onSuccess={handleEdited} onCancel={() => setEditItem(null)} />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Подтверждение удаления" size="sm">
        {deleteConfirm && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              <AlertTriangle className="w-6 h-6 mb-2 text-red-500" />
              <p>Удалить <strong>{deleteConfirm.brand} {deleteConfirm.model}</strong> (SN: {deleteConfirm.serialNumber})?</p>
              <p className="mt-2 text-xs font-medium text-red-500">Только оборудование со статусом «Списано» может быть удалено.</p>
            </div>
            <div className="flex gap-3">
              <button
                className="btn-danger flex-1 justify-center"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Удаляем...' : 'Удалить'}
              </button>
              <button className="btn-ghost bg-slate-800" onClick={() => setDeleteConfirm(null)}>Отмена</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
