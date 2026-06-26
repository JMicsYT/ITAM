import { useEffect, useState } from 'react';
import { History, User, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { auditApi, type AuditEntry } from '../../api/audit';

// ============================================================
// AuditHistory — История изменений конкретной сущности
// Использование: <AuditHistory entityId={item.id} />
// ============================================================

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function actionLabel(action: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    EQUIPMENT_CREATE:    { label: 'Создано',     color: 'text-emerald-400' },
    EQUIPMENT_UPDATE:    { label: 'Изменено',    color: 'text-cyan-400'    },
    EQUIPMENT_DELETE:    { label: 'Удалено',     color: 'text-rose-400'    },
    CONSUMABLE_CREATE:   { label: 'Создано',     color: 'text-emerald-400' },
    CONSUMABLE_UPDATE:   { label: 'Изменено',    color: 'text-cyan-400'    },
    CONSUMABLE_DELETE:   { label: 'Удалено',     color: 'text-rose-400'    },
    CONSUMABLE_ADJUST:   { label: 'Движение',    color: 'text-amber-400'   },
    TOKEN_CREATE:        { label: 'Создано',     color: 'text-emerald-400' },
    TOKEN_UPDATE:        { label: 'Изменено',    color: 'text-cyan-400'    },
    TOKEN_DELETE:        { label: 'Удалено',     color: 'text-rose-400'    },
    TOKEN_REVOKE:        { label: 'Отозван',     color: 'text-rose-400'    },
    USER_LOGIN:          { label: 'Вход',        color: 'text-purple-400'  },
  };
  return map[action] ?? { label: action, color: 'text-slate-400' };
}

// Renders a diff object showing before/after values
function DiffView({ diff }: { diff: unknown }) {
  const [open, setOpen] = useState(false);
  if (!diff || typeof diff !== 'object') return null;

  const entries = Object.entries(diff as Record<string, { before: unknown; after: unknown }>);
  if (entries.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {open ? 'Скрыть изменения' : `Показать изменения (${entries.length})`}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-navy-600">
          {entries.map(([field, change]) => {
            const c = change as { before?: unknown; after?: unknown };
            return (
              <div key={field} className="text-xs">
                <span className="text-slate-500 font-mono">{field}:</span>{' '}
                {c.before !== undefined && (
                  <span className="text-rose-400 line-through mr-1">
                    {String(c.before ?? '—')}
                  </span>
                )}
                {c.after !== undefined && (
                  <span className="text-emerald-400">
                    {String(c.after ?? '—')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface AuditHistoryProps {
  entityId: string;
}

export function AuditHistory({ entityId }: AuditHistoryProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    auditApi
      .forEntity(entityId)
      .then((res) => { if (!cancelled) setEntries(res.data); })
      .catch(() => { if (!cancelled) setError('Не удалось загрузить историю'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [entityId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-32 rounded" />
              <div className="skeleton h-3 w-48 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-rose-400 text-center py-4">{error}</p>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
        <History className="w-8 h-8 opacity-40" />
        <p className="text-sm">История изменений отсутствует</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-3.5 top-4 bottom-4 w-px bg-navy-700" />

      <ol className="space-y-0">
        {entries.map((entry, idx) => {
          const { label, color } = actionLabel(entry.action);
          const isLast = idx === entries.length - 1;
          return (
            <li key={entry.id} className={`flex gap-4 ${isLast ? '' : 'pb-5'}`}>
              {/* Timeline dot */}
              <div className="relative z-10 flex-shrink-0 mt-0.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-navy-800 ${
                    color.replace('text-', 'bg-').replace('-400', '-500/20')
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${color.replace('text-', 'bg-')}`} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-xs font-semibold ${color}`}>{label}</span>
                  <span className="text-xs text-slate-600 whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(entry.createdAt)}
                  </span>
                </div>

                {entry.user && (
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-600" />
                    {entry.user.fullName}
                    <span className="text-slate-600">(@{entry.user.username})</span>
                  </p>
                )}

                <DiffView diff={entry.diff} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
