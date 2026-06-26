import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// ============================================================
// Prisma Client — singleton-инстанс для всего приложения
// Предотвращает создание множества соединений при hot-reload в dev-режиме
// ============================================================

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

// Логируем медленные запросы в dev-режиме
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: { query: string; duration: number }) => {
    if (e.duration > 200) {
      logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}

prisma.$on('error' as never, (e: { message: string }) => {
  logger.error(`Prisma error: ${e.message}`);
});

// Сохраняем в global для dev hot-reload
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
