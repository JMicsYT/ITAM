import { Router, Request, Response, NextFunction } from 'express';
import { query, param } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

// ============================================================
// Audit Log Router — /api/audit
// GET /api/audit               — журнал всех действий
// GET /api/audit/entity/:id    — история конкретной записи
// ============================================================

export const auditRouter = Router();

// Все маршруты требуют авторизации
auditRouter.use(requireAuth);

auditRouter.get(
  '/',
  [
    query('entityType').optional().isIn(['Equipment', 'Consumable', 'Token', 'User']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page  = (req.query.page  as unknown as number) || 1;
      const limit = (req.query.limit as unknown as number) || 30;
      const skip  = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (req.query.entityType) where.entityType = req.query.entityType;
      if (req.query.entityId)   where.entityId   = req.query.entityId;

      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { fullName: true, username: true } } },
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({ success: true, data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error) {
      next(error);
    }
  }
);

// История конкретной сущности
auditRouter.get(
  '/entity/:id',
  [param('id').notEmpty()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await prisma.auditLog.findMany({
        where: { entityId: req.params.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { fullName: true, username: true } } },
      });
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }
);
