/**
 * DocumentsTab — переиспользуемая вкладка «Документы»
 * Используется в EquipmentDetail, TokenDetail, ConsumableDetail
 */
import { useRef, useState } from 'react';
import { FileText, Upload, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from './Toast';

interface Props {
  /** Текущий список URL документов */
  docs: string[];
  /** Загрузить PDF — должен обновить родительское состояние */
  onUpload: (file: File) => Promise<void>;
  /** Удалить документ по URL */
  onDelete: (url: string) => Promise<void>;
  /** Базовый URL бэкенда для ссылок на файлы */
  apiBase?: string;
}

const DEFAULT_BASE = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  : 'http://localhost:3001';

export function DocumentsTab({ docs, onUpload, onDelete, apiBase = DEFAULT_BASE }: Props) {
  const { toast } = useToast();
  const inputRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
      toast('success', 'Документ прикреплён', file.name);
    } catch (err: unknown) {
      toast('error', 'Ошибка загрузки', err instanceof Error ? err.message : '');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (url: string) => {
    if (!confirm('Удалить документ?')) return;
    try {
      await onDelete(url);
      toast('success', 'Документ удалён');
    } catch (err: unknown) {
      toast('error', 'Ошибка', err instanceof Error ? err.message : '');
    }
  };

  return (
    <div className="space-y-3">
      {/* Кнопка загрузки */}
      <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleChange} />
      <button
        className={clsx('btn-ghost w-full justify-center', uploading && 'opacity-60 cursor-not-allowed')}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="w-4 h-4" />
        {uploading ? 'Загрузка...' : 'Прикрепить PDF'}
      </button>

      {/* Список документов */}
      {docs.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Нет прикреплённых документов</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((url, i) => {
            const filename    = url.split('/').pop() ?? url;
            const displayName = filename.replace(/^\d+-/, ''); // Убираем timestamp-префикс
            return (
              <li key={url} className="flex items-center gap-3 p-3 surface rounded-xl">
                <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                <a
                  href={`${apiBase}${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-xs text-sky-400 hover:text-sky-300 truncate underline-offset-2 hover:underline"
                  title={displayName}
                >
                  {i + 1}. {displayName}
                </a>
                <button
                  className="btn-ghost p-1 text-rose-400 hover:text-rose-300 shrink-0"
                  onClick={() => handleDelete(url)}
                  title="Удалить документ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
