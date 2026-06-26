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

// ============================================================
// EquipmentList — main page for browsing and managing equipment
// ============================================================

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
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

// Detail drawer / card shown when clicking a row
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
    <div className="space-y-4">
      {/* Header badges */}
      <div className="flex flex-wrap gap-2">
        <EquipmentTypeBadge type={item.type} />
        <EquipmentStatusBadge status={item.status} />
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
        <>
          <dl className="space-y-3">
            {rows.map(([label, value]) =>
              value ? (
                <div key={label} className="flex justify-between gap-4 py-2 border-b border-navy-700/40">
                  <dt className="text-xs text-slate-500 shrink-0">{label}</dt>
                  <dd className="text-sm text-slate-200 text-right font-medium">{value}</dd>
                </div>
              ) : null
            )}
          </dl>

          {item.specs && Object.keys(item.specs).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Характеристики
              </h4>
              <div className="surface p-3 space-y-2 rounded-xl">
                {Object.entries(item.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-slate-400 capitalize">{k}</span>
                    <span className="text-slate-200 font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab: Documents */}
      {tab === 'docs' && (
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
      )}

      {/* Tab: History */}
      {tab === 'history' && (
        <AuditHistory entityId={item.id} />
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button className="btn-primary flex-1" onClick={onEdit}>
          <Pencil className="w-4 h-4" /> Редактировать
        </button>
        <button className="btn-danger" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
        </button>
        <button className="btn-ghost" onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
}

// Mobile card view for each equipment item
function EquipmentCard({ item, onClick }: { item: Equipment; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card-stat w-full text-left p-4 transition-all active:scale-[0.99]"
      style={{ borderColor: '#1e1e3a' }}
    >
      {/* top accent */}
      <div className="h-[1px] w-full -mt-4 mb-4" style={{ background: 'linear-gradient(90deg, #00ff8844, transparent)' }} />
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-sm" style={{ color: '#e8eaff', fontFamily: 'JetBrains Mono, monospace' }}>{item.brand} {item.model}</p>
          <p className="text-[10px] mt-0.5 uppercase tracking-wider" style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}>SN: {item.serialNumber}</p>
        </div>
        <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#00f5ff55' }} />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <EquipmentTypeBadge type={item.type} />
        <EquipmentStatusBadge status={item.status} />
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] uppercase tracking-wider" style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}>
        {item.location && <span>LOC: {item.location}</span>}
        {item.assignedTo && <span>USR: {item.assignedTo}</span>}
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
            <Server className="w-5 h-5" style={{ color: '#00ff88', filter: 'drop-shadow(0 0 6px #00ff88)' }} />
            <h1
              className="text-xl md:text-2xl font-black uppercase tracking-widest"
              style={{ fontFamily: 'Orbitron, monospace', color: '#e8eaff' }}
            >
              Оборудование
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}>
            // Учёт ИТ-активов предприятия
          </p>
          <p className="text-slate-400 text-sm mt-0.5">
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
            className={clsx('btn-ghost', importing && 'opacity-60 cursor-not-allowed')}
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
      <div className="card-cyber p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#00f5ff' }} />
            <input
              className="input-field pl-9"
              placeholder="Поиск по серийнику, модели, кабинету, ФИО..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#00f5ff' }} />
              <select
                className="select-field pl-9 min-w-[160px]"
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
              className="btn-ghost px-3"
              onClick={fetchData}
              title="Обновить"
            >
              <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop table ────────────────────────────────────── */}
      <div className="card-cyber overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            <thead>
              <tr style={{ background: 'rgba(0,245,255,0.03)', borderBottom: '1px solid var(--color-border)' }}>
                {['Тип', 'Производитель / Модель', 'Серийный №', 'Расположение', 'Ответственный', 'Статус', 'QR'].map(
                  (h) => (
                    <th key={h} className="text-left px-4 py-3.5 text-[10px] uppercase tracking-widest" style={{ color: '#00f5ff' }}>
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
                      <td colSpan={6} className="text-center py-16 text-slate-500">
                        <Server className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>Оборудование не найдено</p>
                        {(search || typeFilter || statusFilter) && (
                          <p className="text-xs mt-1">Попробуйте изменить фильтры</p>
                        )}
                      </td>
                    </tr>
                  )
                : items.map((item) => (
                    <tr
                      key={item.id}
                      className="table-row-interactive"
                      onClick={() => setDetailItem(item)}
                    >
                      <td className="px-4 py-3.5">
                        <EquipmentTypeBadge type={item.type} />
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-200">{item.brand} {item.model}</p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-400 text-xs">{item.serialNumber}</td>
                      <td className="px-4 py-3.5 text-slate-300">{item.location}</td>
                      <td className="px-4 py-3.5 text-slate-400">{item.assignedTo ?? '—'}</td>
                      <td className="px-4 py-3.5">
                        <EquipmentStatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3.5">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-navy-700/40">
            <p className="text-xs text-slate-500">
              Страница {page} из {totalPages} · {total} записей
            </p>
            <div className="flex gap-2">
              <button
                className="btn-ghost py-1.5 px-3 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >← Назад</button>
              <button
                className="btn-ghost py-1.5 px-3 text-xs"
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
              <div key={i} className="card-glass p-4 rounded-xl space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="flex gap-2 mt-2">
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-5 w-20 rounded-full" />
                </div>
              </div>
            ))
          : items.length === 0
          ? (
              <div className="text-center py-16 text-slate-500">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Ничего не найдено</p>
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
          <div className="flex justify-center gap-3 pt-2">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Назад</button>
            <span className="flex items-center text-xs text-slate-500">{page}/{totalPages}</span>
            <button className="btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Вперёд →</button>
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
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-sm text-rose-300">
              <AlertTriangle className="w-5 h-5 mb-2 text-rose-400" />
              <p>Удалить <strong>{deleteConfirm.brand} {deleteConfirm.model}</strong> (SN: {deleteConfirm.serialNumber})?</p>
              <p className="mt-1 text-xs text-rose-400">Только оборудование со статусом «Списано» может быть удалено.</p>
            </div>
            <div className="flex gap-3">
              <button
                className="btn-danger flex-1 justify-center"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Удаляем...' : 'Удалить'}
              </button>
              <button className="btn-ghost" onClick={() => setDeleteConfirm(null)}>Отмена</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
