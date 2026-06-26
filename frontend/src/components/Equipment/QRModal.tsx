import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useReactToPrint } from 'react-to-print';
import { QrCode, Printer, X, Download } from 'lucide-react';
import type { Equipment } from '../../types';
import { Modal } from '../ui/Modal';

// ============================================================
// QRModal — генерирует и печатает QR-код для единицы оборудования
// Содержимое QR: serialNumber + brand + model + location
// ============================================================

interface QRModalProps {
  open: boolean;
  onClose: () => void;
  item: Equipment;
}

// Компонент печати — отдельный div чтобы react-to-print не захватил всё окно
function PrintContent({
  printRef,
  dataUrl,
  item,
}: {
  printRef: React.RefObject<HTMLDivElement | null>;
  dataUrl: string;
  item: Equipment;
}) {
  return (
    <div ref={printRef} className="flex flex-col items-center gap-2 p-4 bg-white text-black"
         style={{ width: 200, fontFamily: 'Inter, sans-serif' }}>
      {dataUrl && <img src={dataUrl} alt="QR" width={160} height={160} />}
      <div className="text-center leading-tight">
        <p className="font-bold text-xs">{item.brand} {item.model}</p>
        <p className="text-[10px] font-mono text-gray-600">{item.serialNumber}</p>
        <p className="text-[10px] text-gray-500">{item.location}</p>
      </div>
    </div>
  );
}

export function QRModal({ open, onClose, item }: QRModalProps) {
  const [dataUrl, setDataUrl] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  // Данные в QR — JSON для будущего сканера
  const qrContent = JSON.stringify({
    sn: item.serialNumber,
    brand: item.brand,
    model: item.model,
    location: item.location,
    type: item.type,
  });

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(qrContent, {
      errorCorrectionLevel: 'M',
      width: 256,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then(setDataUrl);
  }, [open, qrContent]);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr_${item.serialNumber}.png`;
    a.click();
  };

  return (
    <Modal open={open} onClose={onClose} title="QR-код оборудования" size="sm">
      <div className="flex flex-col items-center gap-4">
        {/* QR preview */}
        <div className="p-4 rounded-2xl bg-white shadow-lg">
          {dataUrl
            ? <img src={dataUrl} alt="QR-код" className="w-40 h-40" />
            : <div className="w-40 h-40 skeleton rounded-xl" />
          }
        </div>

        {/* Info */}
        <div className="text-center">
          <p className="font-semibold text-slate-200 text-sm">{item.brand} {item.model}</p>
          <p className="font-mono text-xs text-slate-400 mt-0.5">{item.serialNumber}</p>
          <p className="text-xs text-slate-500 mt-0.5">📍 {item.location}</p>
        </div>

        {/* Скрытый контент для печати */}
        <div className="absolute -left-[9999px] top-0">
          <PrintContent printRef={printRef} dataUrl={dataUrl} item={item} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 w-full">
          <button className="btn-primary flex-1 justify-center" onClick={() => handlePrint()}>
            <Printer className="w-4 h-4" /> Печать
          </button>
          <button className="btn-ghost flex-1 justify-center" onClick={handleDownload} disabled={!dataUrl}>
            <Download className="w-4 h-4" /> Скачать PNG
          </button>
          <button className="btn-ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Маленькая кнопка-иконка для встраивания в таблицу/карточку
export function QRButton({ item }: { item: Equipment }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="btn-ghost py-1 px-2"
        title="QR-код"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        <QrCode className="w-3.5 h-3.5" />
      </button>
      {open && <QRModal open={open} onClose={() => setOpen(false)} item={item} />}
    </>
  );
}
