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
// Tokens Router — CRUD для Рутокенов и ЭЦП
// Base path: /api/tokens
// ============================================================

export const tokensRouter = Router();

const VALID_STATUSES = ['active', 'revoked', 'expired', 'in_safe'];

function handleValidation(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

const validateToken = [
  body('serialNumber').trim().notEmpty().withMessage('Серийный номер обязателен'),
  body('issuedTo').trim().notEmpty().withMessage('ФИО сотрудника обязательно'),
  body('certificateType')
    .trim()
    .notEmpty()
    .withMessage('Тип сертификата обязателен (ФНС, Казначейство и т.д.)'),
  body('expirationDate')
    .isISO8601()
    .toDate()
    .withMessage('Дата истечения должна быть в формате ISO 8601 (YYYY-MM-DD)'),
  body('status')
    .isIn(VALID_STATUSES)
    .withMessage(`Статус должен быть одним из: ${VALID_STATUSES.join(', ')}`),
  body('notes').optional().trim(),
];

// ============================================================
// GET /api/tokens
// Список токенов с фильтрацией (статус, истекающие, поиск по ФИО)
// ============================================================
tokensRouter.get(
  '/',
  [
    query('status').optional().isIn(VALID_STATUSES),
    query('expiringSoon').optional().isBoolean().toBoolean(),
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
      const expiringSoon = req.query.expiringSoon as unknown as boolean | undefined;

      const where: Record<string, unknown> = {};
      if (req.query.status) where.status = req.query.status;

      // Показать токены, истекающие в течение 30 дней
      if (expiringSoon) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        where.expirationDate = { lte: thirtyDaysFromNow };
        where.status = 'active'; // Только ещё активные
      }

      if (search) {
        where.OR = [
          { issuedTo: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { certificateType: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.token.findMany({
          where,
          skip,
          take: limit,
          orderBy: { expirationDate: 'asc' }, // Сначала истекающие
        }),
        prisma.token.count({ where }),
      ]);

      // Автоматически помечаем просроченные токены в ответе
      const now = new Date();
      const enriched = items.map((t) => ({
        ...t,
        isExpired: t.expirationDate < now,
        daysUntilExpiry: Math.ceil((t.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      }));

      res.json({
        success: true,
        data: enriched,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// GET /api/tokens/:id
// Получить токен по ID
// ============================================================
tokensRouter.get(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const item = await prisma.token.findUnique({ where: { id: req.params.id } });
      if (!item) {
        res.status(404).json({ success: false, message: 'Токен не найден' });
        return;
      }
      const now = new Date();
      res.json({
        success: true,
        data: {
          ...item,
          isExpired: item.expirationDate < now,
          daysUntilExpiry: Math.ceil(
            (item.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          ),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/tokens
// Зарегистрировать новый Рутокен/ЭЦП
// ============================================================
tokensRouter.post(
  '/',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const { serialNumber, issuedTo, certificateType, expirationDate, status, notes } = req.body;
      const item = await prisma.token.create({
        data: { serialNumber, issuedTo, certificateType, expirationDate, status, notes },
      });
      await writeAudit('TOKEN_CREATE', 'Token', item.id, item, (req as AuthRequest).user?.id);
      logger.info(`Token registered: ${item.id} | SN: ${item.serialNumber} | Владелец: ${item.issuedTo}`);
      res.status(201).json({ success: true, data: item, message: 'Рутокен/ЭЦП успешно зарегистрирован' });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ success: false, message: 'Токен с таким серийным номером уже существует' });
        return;
      }
      next(error);
    }
  }
);

// ============================================================
// PATCH /api/tokens/:id
// Обновить данные токена (смена статуса, продление и т.д.)
// ============================================================
tokensRouter.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('serialNumber').optional().trim().notEmpty(),
    body('issuedTo').optional().trim().notEmpty(),
    body('certificateType').optional().trim().notEmpty(),
    body('expirationDate').optional().isISO8601().toDate(),
    body('status').optional().isIn(VALID_STATUSES),
    body('notes').optional({ nullable: true }).trim(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const item = await prisma.token.update({
        where: { id: req.params.id },
        data: req.body,
      });
      await writeAudit('TOKEN_UPDATE', 'Token', item.id, item, (req as AuthRequest).user?.id);
      logger.info(`Token updated: ${item.id} | Статус: ${item.status}`);
      res.json({ success: true, data: item, message: 'Данные токена обновлены' });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2025') {
        res.status(404).json({ success: false, message: 'Токен не найден' });
        return;
      }
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ success: false, message: 'Серийный номер уже занят другим токеном' });
        return;
      }
      next(error);
    }
  }
);

// ============================================================
// PATCH /api/tokens/:id/revoke
// Специальный эндпоинт: отозвать токен
// ============================================================
tokensRouter.patch(
  '/:id/revoke',
  [param('id').isUUID()],
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const item = await prisma.token.update({
        where: { id: req.params.id },
        data: { status: 'revoked' },
      });
      await writeAudit('TOKEN_REVOKE', 'Token', item.id, { serialNumber: item.serialNumber, issuedTo: item.issuedTo }, (req as AuthRequest).user?.id);
      logger.warn(`Token REVOKED: ${item.id} | SN: ${item.serialNumber} | Владелец: ${item.issuedTo}`);
      res.json({ success: true, data: item, message: `Токен ${item.serialNumber} отозван` });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2025') {
        res.status(404).json({ success: false, message: 'Токен не найден' });
        return;
      }
      next(error);
    }
  }
);

// ============================================================
// DELETE /api/tokens/:id
// Удалить токен (только revoked или expired)
// ============================================================
tokensRouter.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const existing = await prisma.token.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        res.status(404).json({ success: false, message: 'Токен не найден' });
        return;
      }
      if (!['revoked', 'expired'].includes(existing.status)) {
        res.status(400).json({
          success: false,
          message: 'Удаление разрешено только для отозванных или истёкших токенов',
        });
        return;
      }
      await prisma.token.delete({ where: { id: req.params.id } });
      await writeAudit('TOKEN_DELETE', 'Token', existing.id, existing, (req as AuthRequest).user?.id);
      logger.info(`Token deleted: ${existing.serialNumber}`);
      res.json({ success: true, message: 'Токен удалён из системы' });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// GET /api/tokens/stats/summary
// Количество токенов по статусам + истекающие скоро
// ============================================================
tokensRouter.get('/stats/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const thirtyDays = new Date(now);
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const [byStatus, expiringSoon] = await Promise.all([
      prisma.token.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.token.count({
        where: { status: 'active', expirationDate: { lte: thirtyDays } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
        expiringSoon,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/tokens/:id/upload
// Прикрепить PDF-документ к токену/ЭЦП
// ============================================================
tokensRouter.post(
  '/:id/upload',
  [param('id').isUUID()],
  uploadPdf.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ success: false, errors: errors.array() }); return; }
    if (!req.file) { res.status(400).json({ success: false, message: 'PDF-файл не прикреплён (поле: file)' }); return; }
    try {
      const existing = await prisma.token.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ success: false, message: 'Токен не найден' }); return; }

      const relUrl      = `/uploads/documents/${path.basename(req.file.path)}`;
      const currentDocs = Array.isArray(existing.documentUrls) ? (existing.documentUrls as string[]) : [];
      const item = await prisma.token.update({
        where: { id: req.params.id },
        data: { documentUrls: [...currentDocs, relUrl] },
      });
      await writeAudit('TOKEN_DOCUMENT_UPLOAD', 'Token', item.id, { addedFile: relUrl }, (req as AuthRequest).user?.id);
      logger.info(`Document uploaded for token ${item.id}: ${relUrl}`);
      res.json({ success: true, data: item, message: 'Документ прикреплён', url: relUrl });
    } catch (error) { next(error); }
  }
);

// ============================================================
// DELETE /api/tokens/:id/document
// Открепить PDF-документ от токена
// Body: { url: "/uploads/documents/..." }
// ============================================================
tokensRouter.delete(
  '/:id/document',
  [param('id').isUUID(), body('url').trim().notEmpty()],
  async (req: Request, res: Response, next: NextFunction) => {
    if (handleValidation(req, res)) return;
    try {
      const existing = await prisma.token.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ success: false, message: 'Токен не найден' }); return; }
      const currentDocs = Array.isArray(existing.documentUrls) ? (existing.documentUrls as string[]) : [];
      const item = await prisma.token.update({
        where: { id: req.params.id },
        data: { documentUrls: currentDocs.filter((u) => u !== req.body.url) },
      });
      await writeAudit('TOKEN_DOCUMENT_DELETE', 'Token', item.id, { removedFile: req.body.url }, (req as AuthRequest).user?.id);
      res.json({ success: true, data: item, message: 'Документ откреплён' });
    } catch (error) { next(error); }
  }
);

// ============================================================
// POST /api/tokens/import
// Массовый импорт токенов/ЭЦП из Excel (.xlsx)
// Ожидаемые колонки:
//   serialNumber | issuedTo | certificateType | expirationDate | status | notes
// ============================================================
tokensRouter.post(
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

      const parseExcelDate = (val: any): Date | null => {
        if (!val) return null;
        if (val instanceof Date) return val;
        const num = Number(val);
        if (!isNaN(num) && !String(val).includes('-') && !String(val).includes('/')) {
          return new Date((num - 25569) * 86400 * 1000);
        }
        const parsed = new Date(String(val).trim());
        if (!isNaN(parsed.getTime())) return parsed;
        return null;
      };

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

        const sn         = r['serialnumber'] || r['серийный номер'] || r['сн'] || r['s/n'] || '';
        const issuedTo   = r['issuedto'] || r['владелец'] || r['фио'] || r['сотрудник'] || '';
        const certType   = r['certificatetype'] || r['тип сертификата'] || r['тип'] || '';
        const expDateVal = r['expirationdate'] || r['дата истечения'] || r['истекает'] || r['срок'] || '';
        const status     = r['status'] || r['статус'] || 'active';
        const notes      = r['notes'] || r['примечания'] || r['заметки'] || '';

        if (!sn || !issuedTo || !certType || !expDateVal) {
          skipped.push({ row: rowNum, reason: `Пустые обязательные поля: serialNumber="${sn}" issuedTo="${issuedTo}" certificateType="${certType}" expirationDate="${expDateVal}"` });
          continue;
        }

        const expDate = parseExcelDate(expDateVal);
        if (!expDate) {
          skipped.push({ row: rowNum, reason: `Неверный формат даты истечения: "${expDateVal}"` });
          continue;
        }

        const resolvedStatus = VALID_STATUSES.includes(status) ? status : 'active';

        try {
          const item = await prisma.token.create({
            data: {
              serialNumber: sn,
              issuedTo,
              certificateType: certType,
              expirationDate: expDate,
              status: resolvedStatus,
              notes: notes || null,
              documentUrls: [],
            },
          });
          await writeAudit('TOKEN_IMPORT', 'Token', item.id, item, (req as AuthRequest).user?.id);
          created.push(sn);
        } catch (e: unknown) {
          if ((e as { code?: string }).code === 'P2002') {
            skipped.push({ row: rowNum, reason: `Серийный номер уже существует: "${sn}"` });
          } else {
            skipped.push({ row: rowNum, reason: `Ошибка БД: ${String(e)}` });
          }
        }
      }

      logger.info(`Excel import tokens: ${created.length} создано, ${skipped.length} пропущено`);
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
