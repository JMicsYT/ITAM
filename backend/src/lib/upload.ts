import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ============================================================
// Upload Middleware — конфигурация multer
// Файлы сохраняются в uploads/<тип>/<имя>
// ============================================================

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

// Убедимся что корневая папка существует
if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });

// --- Хранилище для PDF-документов расходников ---
const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOADS_ROOT, 'documents');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

export const uploadPdf = multer({
  storage: pdfStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 МБ
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Допускаются только PDF-файлы'));
    }
  },
});

// --- Хранилище для Excel-файлов импорта ---
const excelStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOADS_ROOT, 'imports');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-import.xlsx`);
  },
});

export const uploadExcel = multer({
  storage: excelStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 МБ
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Допускаются только файлы .xlsx / .xls'));
    }
  },
});

// Путь к папке uploads (для раздачи статики)
export { UPLOADS_ROOT };
