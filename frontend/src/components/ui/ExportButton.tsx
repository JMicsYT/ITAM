import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { apiClient } from '../../api/client';

// ============================================================
// ExportButton — скачивает CSV напрямую через Axios blob
// Использует Authorization header (устанавливается в AuthContext)
// ============================================================

type ExportEntity = 'equipment' | 'consumables' | 'tokens';

interface ExportButtonProps {
  entity: ExportEntity;
  params?: Record<string, string>; // дополнительные фильтры (status, type и т.д.)
  label?: string;
}

const labels: Record<ExportEntity, string> = {
  equipment:   'Оборудование',
  consumables: 'Расходники',
  tokens:      'Рутокены',
};

export function ExportButton({ entity, params, label }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await apiClient.get(`/export/${entity}`, {
        params,
        responseType: 'blob',
      });

      // Определяем имя файла из Content-Disposition или генерируем
      const disposition = res.headers['content-disposition'] as string | undefined;
      const match = disposition?.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `${entity}_export.csv`;

      // Создаём объект URL и кликаем
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Ошибка экспорта. Проверьте соединение с сервером.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn-ghost" onClick={handleExport} disabled={loading} title={`Экспорт "${labels[entity]}" в CSV`}>
      {loading
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
      }
      {label ?? 'CSV'}
    </button>
  );
}
