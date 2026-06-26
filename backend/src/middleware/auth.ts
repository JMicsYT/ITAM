import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

// ============================================================
// Auth middleware — проверка JWT и роли
// ============================================================

export interface AuthRequest extends Request {
  user?: { id: string; username: string; role: string; fullName: string };
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Требуется авторизация' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthRequest['user'];
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Токен недействителен или истёк' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Недостаточно прав' });
      return;
    }
    next();
  };
}

// Middleware записи в audit_log — вызывается после успешного ответа
export function auditLog(action: string, entityType: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    // Навешиваем функцию на req, чтобы роутер вызвал её после записи
    (req as { _audit?: () => Promise<void> })._audit = async () => {
      const entityId: string = req.params.id || '';
      try {
        await prisma.auditLog.create({
          data: {
            action,
            entityType,
            entityId,
            diff: req.body ?? null,
            userId: req.user?.id ?? null,
          },
        });
      } catch (e) {
        // Audit log не должен ломать основной запрос
        console.error('AuditLog write error:', e);
      }
    };
    next();
  };
}
