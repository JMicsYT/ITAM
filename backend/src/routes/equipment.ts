import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import path from 'path';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { uploadPdf, uploadExcel } from '../lib/upload';
import type { AuthRequest } from '../middleware/auth';

async function writeAudit(
  action: string, entityType: string, entityId: string,
  diff: unknown, userId?: string
) {
  try {
    await prisma.auditLog.create({ data: {
      action, entityType, entityId,
      diff: diff !== null && diff !== undefined ? (diff as object) : undefined,
      userId: userId ?? null,
    }});
  } catch { /* audit не должен ломать основной запрос */ }
}


// ============================================================
// Equipment Router — CRUD для оборудования
// Base path: /api/equipment
// ============================================================

export const equipmentRouter = Router();

// --- Константы допустимых значений (валидация) ---
const VALID_TYPES = ['ups', 'printer', 'pc', 'laptop', 'server', 'monitor'];
const VALID_STATUSES = ['in_use', 'storage', 'repair', 'decommissioned'];

// --- Middleware валидации ---
const validateEquipment = [
  body('type')
    .isIn(VALID_TYPES)
    .withMessage(`Тип должен быть одним из: ${VALID_TYPES.join(', ')}`),
  body('brand').trim().notEmpty().withMessage('Производитель обязателен'),
  body('model').trim().notEmpty().withMessage('Модель обязательна'),
  body('serialNumber').trim().notEmpty().withMessage('Серийный номер обязателен'),
  body('status')
    .isIn(VALID_STATUSES)
    .withMessage(`Статус должен быть одним из: ${VALID_STATUSES.join(', ')}`),
  body('location').trim().notEmpty().withMessage('Расположение обязательно'),
  body('assignedTo').optional().trim(),
  body('ipAddress').optional().trim().isIP().withMessage('Неверный формат IP-адреса'),
  body('notes').optional().trim(),
  body('specs').optional().isObject().withMessage('specs должен быть объектом'),
];

// Хелпер: выбросить ошибки валидации
function handleValidation(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

// ============================================================
// GET /api/equipment
// Список всего оборудования с фильтрами и пагинацией
// ============================================================
equipmentRouter.get(
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
      const page = (req.query.page as unknown as number) || 1;
      const limit = (req.query.limit as unknown as number) || 20;
      const skip = (page - 1) * limit;
      const search = req.query.search as string | undefined;

      // Строим фильтр
      const where: Record<string, unknown> = {};
      if (req.query.type) where.type = req.query.type;
      if (req.query.status) where.status = req.query.status;
      if (search) {
        where.OR = [
          { brand: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { assignedTo: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.equipment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.equipment.count({ where }),
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
// GET /api/equipment/:id
// Получить одну единицу оборудования по ID
// ============================================================
equipmentRouter.get(
  '/:id',
  [param('id').isUUID().withMessage('Некорректный UUID')],
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const item = await prisma.equipment.findUnique({ where: { id: req.params.id } });
      if (!item) {
        res.status(404).json({ success: false, message: 'Оборудование не найдено' });
        return;
      }
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/equipment
// Создать новую единицу оборудования
// ============================================================
equipmentRouter.post(
  '/',
  validateEquipment,
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const { type, brand, model, serialNumber, status, location, assignedTo, ipAddress, notes, specs } = req.body;
      const item = await prisma.equipment.create({
        data: { type, brand, model, serialNumber, status, location, assignedTo, ipAddress, notes, specs },
      });
      await writeAudit('EQUIPMENT_CREATE', 'Equipment', item.id, item, (req as AuthRequest).user?.id);
      logger.info(`Equipment created: ${item.id} (${item.brand} ${item.model})`);
      res.status(201).json({ success: true, data: item, message: 'Оборудование успешно добавлено' });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ success: false, message: 'Оборудование с таким серийным номером уже существует' });
        return;
      }
      next(error);
    }
  }
);


// ============================================================
// PATCH /api/equipment/:id
// Частичное обновление (например, смена статуса, ответственного)
// ============================================================
equipmentRouter.patch(
  '/:id',
  [
    param('id').isUUID().withMessage('Некорректный UUID'),
    body('type').optional().isIn(VALID_TYPES),
    body('brand').optional().trim().notEmpty(),
    body('model').optional().trim().notEmpty(),
    body('serialNumber').optional().trim().notEmpty(),
    body('status').optional().isIn(VALID_STATUSES),
    body('location').optional().trim().notEmpty(),
    body('assignedTo').optional({ nullable: true }).trim(),
    body('ipAddress').optional({ nullable: true }).isIP(),
    body('notes').optional({ nullable: true }).trim(),
    body('specs').optional({ nullable: true }).isObject(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const before = await prisma.equipment.findUnique({ where: { id: req.params.id } });
      const item = await prisma.equipment.update({
        where: { id: req.params.id },
        data: req.body,
      });
      await writeAudit('EQUIPMENT_UPDATE', 'Equipment', item.id,
        { before, after: item }, (req as AuthRequest).user?.id);
      logger.info(`Equipment updated: ${item.id}`);
      res.json({ success: true, data: item, message: 'Оборудование обновлено' });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2025') {
        res.status(404).json({ success: false, message: 'Оборудование не найдено' }); return;
      }
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ success: false, message: 'Серийный номер уже занят' }); return;
      }
      next(error);
    }
  }
);


// ============================================================
// DELETE /api/equipment/:id
// Удалить оборудование (только если статус 'decommissioned')
// ============================================================
equipmentRouter.delete(
  '/:id',
  [param('id').isUUID().withMessage('Некорректный UUID')],
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const existing = await prisma.equipment.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ success: false, message: 'Оборудование не найдено' }); return; }
      if (existing.status !== 'decommissioned') {
        res.status(400).json({ success: false, message: 'Удаление разрешено только для оборудования со статусом "Списано"' }); return;
      }
      await prisma.equipment.delete({ where: { id: req.params.id } });
      await writeAudit('EQUIPMENT_DELETE', 'Equipment', existing.id, existing, (req as AuthRequest).user?.id);
      logger.info(`Equipment deleted: ${existing.id} (${existing.brand} ${existing.model})`);
      res.json({ success: true, message: 'Оборудование удалено из системы' });
    } catch (error) { next(error); }
  }
);


// ============================================================
// GET /api/equipment/stats/summary
// Сводная статистика по типам и статусам
// ============================================================
equipmentRouter.get('/stats/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [byType, byStatus] = await Promise.all([
      prisma.equipment.groupBy({ by: ['type'], _count: { _all: true } }),
      prisma.equipment.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    res.json({
      success: true,
      data: {
        byType: Object.fromEntries(byType.map((r) => [r.type, r._count._all])),
        byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/equipment/:id/upload
// Прикрепить PDF-документ к карточке оборудования
// ============================================================
equipmentRouter.post(
  '/:id/upload',
  [param('id').isUUID()],
  uploadPdf.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ success: false, errors: errors.array() }); return; }
    if (!req.file) { res.status(400).json({ success: false, message: 'PDF-файл не прикреплён (поле: file)' }); return; }
    try {
      const existing = await prisma.equipment.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ success: false, message: 'Оборудование не найдено' }); return; }

      const relUrl      = `/uploads/documents/${path.basename(req.file.path)}`;
      const currentDocs = Array.isArray(existing.documentUrls) ? (existing.documentUrls as string[]) : [];
      const item = await prisma.equipment.update({
        where: { id: req.params.id },
        data: { documentUrls: [...currentDocs, relUrl] },
      });
      await writeAudit('EQUIPMENT_DOCUMENT_UPLOAD', 'Equipment', item.id, { addedFile: relUrl }, (req as AuthRequest).user?.id);
      logger.info(`Document uploaded for equipment ${item.id}: ${relUrl}`);
      res.json({ success: true, data: item, message: 'Документ прикреплён', url: relUrl });
    } catch (error) { next(error); }
  }
);

// ============================================================
// DELETE /api/equipment/:id/document
// Открепить PDF-документ от оборудования
// Body: { url: "/uploads/documents/..." }
// ============================================================
equipmentRouter.delete(
  '/:id/document',
  [param('id').isUUID(), body('url').trim().notEmpty()],
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const existing = await prisma.equipment.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ success: false, message: 'Оборудование не найдено' }); return; }
      const currentDocs = Array.isArray(existing.documentUrls) ? (existing.documentUrls as string[]) : [];
      const item = await prisma.equipment.update({
        where: { id: req.params.id },
        data: { documentUrls: currentDocs.filter((u) => u !== req.body.url) },
      });
      await writeAudit('EQUIPMENT_DOCUMENT_DELETE', 'Equipment', item.id, { removedFile: req.body.url }, (req as AuthRequest).user?.id);
      res.json({ success: true, data: item, message: 'Документ откреплён' });
    } catch (error) { next(error); }
  }
);

// ============================================================
// POST /api/equipment/import
// Массовый импорт оборудования из Excel (.xlsx)
// Ожидаемые колонки (регистр не важен):
//   type | brand | model | serialNumber | status | location | assignedTo | ipAddress | specs | notes
// ============================================================
equipmentRouter.post(
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

        const type     = r['type'] || r['тип'] || '';
        const brand    = r['brand'] || r['бренд'] || r['производитель'] || '';
        const model    = r['model'] || r['модель'] || '';
        const sn       = r['serialnumber'] || r['серийный номер'] || r['сн'] || r['s/n'] || '';
        const status   = r['status'] || r['статус'] || 'storage';
        const loc      = r['location'] || r['расположение'] || r['кабинет'] || r['место'] || '';
        const assigned = r['assignedto'] || r['ответственный'] || r['фио'] || '';
        const ip       = r['ipaddress'] || r['ip'] || r['ip-адрес'] || '';
        const specsStr = r['specs'] || r['характеристики'] || r['спецификации'] || '';
        const notes    = r['notes'] || r['примечания'] || r['заметки'] || '';

        if (!type || !brand || !model || !sn) {
          skipped.push({ row: rowNum, reason: `Пустые обязательные поля: type="${type}" brand="${brand}" model="${model}" serialNumber="${sn}"` });
          continue;
        }
        if (!VALID_TYPES.includes(type)) {
          skipped.push({ row: rowNum, reason: `Неизвестный тип: "${type}". Допустимо: ${VALID_TYPES.join(', ')}` });
          continue;
        }
        const resolvedStatus = VALID_STATUSES.includes(status) ? status : 'storage';
        let resolvedSpecs = null;
        if (specsStr) {
          try {
            resolvedSpecs = JSON.parse(specsStr);
          } catch {
            resolvedSpecs = { info: specsStr };
          }
        }

        try {
          const item = await prisma.equipment.create({
            data: {
              type,
              brand,
              model,
              serialNumber: sn,
              status: resolvedStatus,
              location: loc || 'Не указано',
              assignedTo: assigned || null,
              ipAddress: ip || null,
              specs: resolvedSpecs || undefined,
              notes: notes || null,
              documentUrls: [],
            },
          });
          await writeAudit('EQUIPMENT_IMPORT', 'Equipment', item.id, item, (req as AuthRequest).user?.id);
          created.push(sn);
        } catch (e: unknown) {
          if ((e as { code?: string }).code === 'P2002') {
            skipped.push({ row: rowNum, reason: `Серийный номер уже существует: "${sn}"` });
          } else {
            skipped.push({ row: rowNum, reason: `Ошибка БД: ${String(e)}` });
          }
        }
      }

      logger.info(`Excel import equipment: ${created.length} создано, ${skipped.length} пропущено`);
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
