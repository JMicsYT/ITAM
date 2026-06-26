import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import path from 'path';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { uploadPdf, uploadExcel } from '../lib/upload';
import type { AuthRequest } from '../middleware/auth';

async function writeAudit(action: string, entityType: string, entityId: string, diff: unknown, userId?: string) {
  try { await prisma.auditLog.create({ data: {
    action, entityType, entityId,
    diff: diff !== null && diff !== undefined ? (diff as object) : undefined,
    userId: userId ?? null,
  }}); } catch { /**/ }
}

// ============================================================
// Consumables Router — поштучный учёт расходников по серийным номерам
// Base path: /api/consumables
// ============================================================

export const consumablesRouter = Router();

const VALID_TYPES    = ['cartridge', 'drum_unit'];
const VALID_STATUSES = ['in_stock', 'in_use', 'depleted', 'written_off'];

function handleValidation(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

const validateConsumable = [
  body('type')
    .isIn(VALID_TYPES)
    .withMessage(`Тип должен быть: ${VALID_TYPES.join(', ')}`),
  body('model').trim().notEmpty().withMessage('Модель/артикул обязательна'),
  body('serialNumber').trim().notEmpty().withMessage('Серийный номер обязателен'),
  body('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Статус должен быть: ${VALID_STATUSES.join(', ')}`),
  body('compatibleWith')
    .isArray({ min: 1 })
    .withMessage('compatibleWith должен быть массивом моделей принтеров'),
  body('location').trim().notEmpty().withMessage('Место хранения обязательно'),
  body('notes').optional().trim(),
];

// ============================================================
// GET /api/consumables
// Список расходников с фильтрами (тип, статус, поиск)
// ============================================================
consumablesRouter.get(
  '/',
  [
    query('type').optional().isIn(VALID_TYPES),
    query('status').optional().isIn(VALID_STATUSES),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('search').optional().trim(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page  = (req.query.page  as unknown as number) || 1;
      const limit = (req.query.limit as unknown as number) || 20;
      const skip  = (page - 1) * limit;
      const search = req.query.search as string | undefined;

      const where: Record<string, unknown> = {};
      if (req.query.type)   where.type   = req.query.type;
      if (req.query.status) where.status = req.query.status;
      if (search) {
        where.OR = [
          { model:        { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { location:     { contains: search, mode: 'insensitive' } },
          { notes:        { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.consumable.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.consumable.count({ where }),
      ]);

      res.json({
        success: true,
        data: items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// GET /api/consumables/:id
// Получить расходник по ID
// ============================================================
consumablesRouter.get(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const item = await prisma.consumable.findUnique({ where: { id: req.params.id } });
      if (!item) {
        res.status(404).json({ success: false, message: 'Расходник не найден' });
        return;
      }
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/consumables
// Добавить новый экземпляр расходника (с уникальным серийным номером)
// ============================================================
consumablesRouter.post(
  '/',
  validateConsumable,
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const { type, model, serialNumber, status, compatibleWith, location, notes } = req.body;
      const item = await prisma.consumable.create({
        data: {
          type,
          model,
          serialNumber: serialNumber.trim(),
          status: status ?? 'in_stock',
          compatibleWith,
          location,
          notes: notes ?? null,
        },
      });
      await writeAudit('CONSUMABLE_CREATE', 'Consumable', item.id, item, (req as AuthRequest).user?.id);
      logger.info(`Consumable created: ${item.id} | ${item.model} | s/n: ${item.serialNumber}`);
      res.status(201).json({ success: true, data: item, message: 'Расходник добавлен' });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ success: false, message: `Серийный номер уже существует в базе` });
        return;
      }
      next(error);
    }
  }
);

// ============================================================
// PATCH /api/consumables/:id
// Обновить данные расходника (в т.ч. сменить статус)
// ============================================================
consumablesRouter.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('type').optional().isIn(VALID_TYPES),
    body('model').optional().trim().notEmpty(),
    body('serialNumber').optional().trim().notEmpty(),
    body('status').optional().isIn(VALID_STATUSES),
    body('compatibleWith').optional().isArray({ min: 1 }),
    body('location').optional().trim().notEmpty(),
    body('notes').optional().trim(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const before = await prisma.consumable.findUnique({ where: { id: req.params.id } });
      if (!before) {
        res.status(404).json({ success: false, message: 'Расходник не найден' });
        return;
      }

      // Trim serialNumber if provided
      const updateData = { ...req.body };
      if (updateData.serialNumber) updateData.serialNumber = updateData.serialNumber.trim();

      const item = await prisma.consumable.update({
        where: { id: req.params.id },
        data: updateData,
      });
      await writeAudit(
        'CONSUMABLE_UPDATE', 'Consumable', item.id,
        { before, after: item },
        (req as AuthRequest).user?.id
      );
      logger.info(`Consumable updated: ${item.id} | status: ${item.status}`);
      res.json({ success: true, data: item, message: 'Данные расходника обновлены' });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ success: false, message: 'Серийный номер уже занят другим расходником' });
        return;
      }
      if ((error as { code?: string }).code === 'P2025') {
        res.status(404).json({ success: false, message: 'Расходник не найден' });
        return;
      }
      next(error);
    }
  }
);

// ============================================================
// DELETE /api/consumables/:id
// Удалить запись расходника
// ============================================================
consumablesRouter.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const existing = await prisma.consumable.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        res.status(404).json({ success: false, message: 'Расходник не найден' });
        return;
      }
      await prisma.consumable.delete({ where: { id: req.params.id } });
      await writeAudit('CONSUMABLE_DELETE', 'Consumable', existing.id, existing, (req as AuthRequest).user?.id);
      logger.info(`Consumable deleted: ${existing.model} | s/n: ${existing.serialNumber}`);
      res.json({ success: true, message: 'Расходник удалён' });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/consumables/import
// Массовый импорт расходников из Excel (.xlsx)
// Ожидаемые колонки (регистр не важен):
//   type | model | serialNumber | status | compatibleWith | location | notes
// compatibleWith: строка через запятую или пустая
// ============================================================
consumablesRouter.post(
  '/import',
  uploadExcel.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Файл не прикреплён (поле: file)' });
      return;
    }
    try {
      const wb = XLSX.readFile(req.file.path);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

      if (rows.length === 0) {
        res.status(400).json({ success: false, message: 'Excel-файл не содержит строк данных' });
        return;
      }

      // Нормализуем заголовки (lowercase + trim)
      const normalise = (row: Record<string, unknown>): Record<string, string> => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          out[k.trim().toLowerCase()] = String(v ?? '').trim();
        }
        return out;
      };

      const created: string[] = [];
      const skipped: { row: number; reason: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const r  = normalise(rows[i]);
        const rowNum = i + 2; // строка заголовка = 1

        const type   = r['type']   || r['тип']   || '';
        const model  = r['model']  || r['модель'] || r['артикул'] || '';
        const sn     = r['serialnumber'] || r['серийный номер'] || r['сн'] || r['s/n'] || '';
        const status = r['status'] || r['статус'] || 'in_stock';
        const loc    = r['location'] || r['место хранения'] || r['место'] || '';
        const compat = r['compatiblewith'] || r['совместим с'] || r['совместимые принтеры'] || '';
        const notes  = r['notes']  || r['примечания'] || r['заметки'] || '';

        if (!type || !model || !sn) {
          skipped.push({ row: rowNum, reason: `Пустые обязательные поля: type="${type}" model="${model}" serialNumber="${sn}"` });
          continue;
        }
        if (!VALID_TYPES.includes(type)) {
          skipped.push({ row: rowNum, reason: `Неизвестный тип: "${type}". Допустимо: ${VALID_TYPES.join(', ')}` });
          continue;
        }
        const resolvedStatus = VALID_STATUSES.includes(status) ? status : 'in_stock';
        const compatibleWith = compat ? compat.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

        try {
          const item = await prisma.consumable.create({
            data: {
              type,
              model,
              serialNumber: sn,
              status: resolvedStatus,
              compatibleWith: compatibleWith.length ? compatibleWith : [model],
              location: loc || 'Не указано',
              notes: notes || null,
              documentUrls: [],
            },
          });
          await writeAudit('CONSUMABLE_IMPORT', 'Consumable', item.id, item, (req as AuthRequest).user?.id);
          created.push(sn);
        } catch (e: unknown) {
          if ((e as { code?: string }).code === 'P2002') {
            skipped.push({ row: rowNum, reason: `Серийный номер уже существует: "${sn}"` });
          } else {
            skipped.push({ row: rowNum, reason: `Ошибка БД: ${String(e)}` });
          }
        }
      }

      logger.info(`Excel import: ${created.length} создано, ${skipped.length} пропущено`);
      res.json({
        success: true,
        message: `Импорт завершён: создано ${created.length}, пропущено ${skipped.length}`,
        created: created.length,
        skipped,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/consumables/:id/upload
// Прикрепить PDF-документ к карточке расходника
// ============================================================
consumablesRouter.post(
  '/:id/upload',
  [param('id').isUUID()],
  uploadPdf.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ success: false, errors: errors.array() }); return; }
    if (!req.file) {
      res.status(400).json({ success: false, message: 'PDF-файл не прикреплён (поле: file)' });
      return;
    }
    try {
      const existing = await prisma.consumable.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ success: false, message: 'Расходник не найден' }); return; }

      const relUrl      = `/uploads/documents/${path.basename(req.file.path)}`;
      const currentDocs = Array.isArray(existing.documentUrls) ? (existing.documentUrls as string[]) : [];
      const updatedDocs = [...currentDocs, relUrl];

      const item = await prisma.consumable.update({
        where: { id: req.params.id },
        data: { documentUrls: updatedDocs },
      });

      await writeAudit('CONSUMABLE_DOCUMENT_UPLOAD', 'Consumable', item.id, { addedFile: relUrl }, (req as AuthRequest).user?.id);
      logger.info(`Document uploaded for consumable ${item.id}: ${relUrl}`);
      res.json({ success: true, data: item, message: 'Документ прикреплён', url: relUrl });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// DELETE /api/consumables/:id/document
// Открепить PDF-документ от карточки расходника
// Body: { url: "/uploads/documents/..." }
// ============================================================
consumablesRouter.delete(
  '/:id/document',
  [
    param('id').isUUID(),
    body('url').trim().notEmpty().withMessage('Укажите url документа для удаления'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const existing = await prisma.consumable.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ success: false, message: 'Расходник не найден' }); return; }

      const currentDocs = Array.isArray(existing.documentUrls) ? (existing.documentUrls as string[]) : [];
      const updatedDocs = currentDocs.filter((u) => u !== req.body.url);

      const item = await prisma.consumable.update({
        where: { id: req.params.id },
        data: { documentUrls: updatedDocs },
      });
      await writeAudit('CONSUMABLE_DOCUMENT_DELETE', 'Consumable', item.id, { removedFile: req.body.url }, (req as AuthRequest).user?.id);
      res.json({ success: true, data: item, message: 'Документ откреплён' });
    } catch (error) {
      next(error);
    }
  }
);

