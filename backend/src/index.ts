import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { requireAuth } from './middleware/auth';
import { authRouter } from './routes/auth';
import { auditRouter } from './routes/audit';
import { exportRouter } from './routes/export';
import { equipmentRouter } from './routes/equipment';
import { consumablesRouter } from './routes/consumables';
import { tokensRouter } from './routes/tokens';
import { startScheduler } from './lib/scheduler';
import { UPLOADS_ROOT } from './lib/upload';



// ============================================================
// IT Asset Management — Express Application
// On-Premise: данные хранятся строго на локальном PostgreSQL
// ============================================================

const app = express();
const PORT = process.env.PORT || 3001;

// --- Базовые middleware ---
app.use(helmet()); // Защитные HTTP-заголовки
app.use(
  cors({
    origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(','),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- HTTP логирование ---
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
  })
);

// --- Healthcheck ---
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // Проверка подключения к БД
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// --- API маршруты ---
app.use('/api/auth',      authRouter);
app.use('/api/equipment',   requireAuth, equipmentRouter);
app.use('/api/consumables', requireAuth, consumablesRouter);
app.use('/api/tokens',      requireAuth, tokensRouter);
app.use('/api/audit',       auditRouter);  // auth внутри роутера
app.use('/api/export',      exportRouter); // auth внутри роутера

// --- Статические файлы (загруженные PDF и Excel) ---
// Доступны по URL: GET /uploads/documents/<filename>
app.use('/uploads', requireAuth, express.static(UPLOADS_ROOT));


// --- 404 handler ---
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Маршрут не найден' });
});

// --- Глобальный обработчик ошибок ---
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    success: false,
    message: 'Внутренняя ошибка сервера',
    ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack }),
  });
});

// --- Запуск ---
async function main() {
  try {
    // Проверяем подключение к БД при старте
    await prisma.$connect();
    logger.info('✅ PostgreSQL подключена успешно');

    app.listen(PORT, () => {
      logger.info(`🚀 ITAM API сервер запущен: http://localhost:${PORT}`);
      logger.info(`📦 Healthcheck: http://localhost:${PORT}/health`);
      logger.info(`🗄️  Среда: ${process.env.NODE_ENV || 'development'}`);
    });

    // Запуск планировщика cron-задач после успешного подключения к БД
    startScheduler();
  } catch (error) {
    logger.error('❌ Не удалось подключиться к PostgreSQL:', error);
    process.exit(1);
  }
}

// --- Graceful shutdown ---
process.on('SIGTERM', async () => {
  logger.info('SIGTERM получен, завершаем соединение с БД...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT получен, завершаем соединение с БД...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
