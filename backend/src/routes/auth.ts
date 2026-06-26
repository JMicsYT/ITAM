import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

// ============================================================
// Auth Router — /api/auth
// ============================================================

export const authRouter = Router();

const JWT_SECRET  = process.env.JWT_SECRET  || 'change-me-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

// ── POST /api/auth/login ──────────────────────────────────────
authRouter.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Введите логин'),
    body('password').notEmpty().withMessage('Введите пароль'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    try {
      const { username, password } = req.body as { username: string; password: string };

      const user = await prisma.user.findUnique({ where: { username } });
      if (!user || !user.isActive) {
        res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
        return;
      }

      const payload = { id: user.id, username: user.username, role: user.role, fullName: user.fullName };
      const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);

      // Записываем в audit log факт входа
      await prisma.auditLog.create({
        data: { action: 'USER_LOGIN', entityType: 'User', entityId: user.id, userId: user.id },
      });

      logger.info(`User login: ${user.username} (${user.role})`);
      res.json({ success: true, data: { token, user: payload } });
    } catch (error) {
      next(error);
    }
  }
);

// ── GET /api/auth/me — текущий пользователь ──────────────────
authRouter.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: req.user });
});

// ── GET /api/auth/users — список пользователей (только admin) ──
authRouter.get(
  '/users',
  requireAuth,
  requireRole('admin'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, username: true, fullName: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }
);

// ── POST /api/auth/users — создать пользователя (только admin) ─
authRouter.post(
  '/users',
  requireAuth,
  requireRole('admin'),
  [
    body('username').trim().notEmpty().isLength({ min: 3 }).withMessage('Логин минимум 3 символа'),
    body('password').notEmpty().isLength({ min: 6 }).withMessage('Пароль минимум 6 символов'),
    body('fullName').trim().notEmpty().withMessage('Укажите ФИО'),
    body('role').isIn(['admin', 'technician', 'viewer']).withMessage('Роль: admin | technician | viewer'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    try {
      const { username, password, fullName, role } = req.body as {
        username: string; password: string; fullName: string; role: string;
      };
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { username, passwordHash, fullName, role },
        select: { id: true, username: true, fullName: true, role: true, isActive: true, createdAt: true },
      });
      logger.info(`User created: ${user.username} (${user.role})`);
      res.status(201).json({ success: true, data: user, message: 'Пользователь создан' });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ success: false, message: 'Пользователь с таким логином уже существует' });
        return;
      }
      next(error);
    }
  }
);

// ── PATCH /api/auth/users/:id/password — смена пароля ─────────
authRouter.patch(
  '/users/:id/password',
  requireAuth,
  requireRole('admin'),
  [body('password').notEmpty().isLength({ min: 6 }).withMessage('Пароль минимум 6 символов')],
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    try {
      const passwordHash = await bcrypt.hash(req.body.password, 12);
      await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
      res.json({ success: true, message: 'Пароль изменён' });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2025') {
        res.status(404).json({ success: false, message: 'Пользователь не найден' });
        return;
      }
      next(error);
    }
  }
);

// ── PATCH /api/auth/users/:id/toggle — блокировка/разблокировка ─
authRouter.patch(
  '/users/:id/toggle',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) { res.status(404).json({ success: false, message: 'Пользователь не найден' }); return; }
      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: { isActive: !user.isActive },
        select: { id: true, username: true, fullName: true, role: true, isActive: true },
      });
      res.json({ success: true, data: updated, message: `Пользователь ${updated.isActive ? 'активирован' : 'заблокирован'}` });
    } catch (error) {
      next(error);
    }
  }
);
