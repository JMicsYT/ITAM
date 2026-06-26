import cron from 'node-cron';
import { logger } from '../lib/logger';
import { checkTokenExpiry } from '../jobs/tokenExpiryCheck';
import { checkLowStock } from '../jobs/lowStockCheck';

// ============================================================
// ITAM — Планировщик фоновых задач (node-cron)
// Вызывается один раз из src/index.ts при старте сервера.
//
// Расписание:
//   '0 8 * * *'   — каждый день в 08:00 (утренняя сверка)
//
// Синтаксис cron:
//   ┌─── секунды (опционально в некоторых реализациях)
//   │  ┌── минуты (0-59)
//   │  │  ┌── часы (0-23)
//   │  │  │  ┌── день месяца (1-31)
//   │  │  │  │  ┌── месяц (1-12)
//   │  │  │  │  │  ┌── день недели (0-7, 0 и 7 = воскресенье)
//   *  *  *  *  *
// ============================================================

const DAILY_SCHEDULE = '0 8 * * *'; // Каждый день в 08:00

export function startScheduler(): void {
  // ── Задача 1: Проверка сроков истечения ЭЦП ──────────────
  const tokenJob = cron.schedule(DAILY_SCHEDULE, async () => {
    logger.info('[SCHEDULER] Запускается задача: проверка сроков ЭЦП');
    await checkTokenExpiry();
  }, {
    timezone: 'Europe/Moscow', // Используем московское время
  });

  // ── Задача 2: Проверка остатков расходников ───────────────
  const stockJob = cron.schedule(DAILY_SCHEDULE, async () => {
    logger.info('[SCHEDULER] Запускается задача: проверка остатков расходников');
    await checkLowStock();
  }, {
    timezone: 'Europe/Moscow',
  });

  logger.info(`[SCHEDULER] ✅ Планировщик запущен. Расписание: "${DAILY_SCHEDULE}" (08:00 МСК)`);
  logger.info('[SCHEDULER] Зарегистрированы задачи: checkTokenExpiry, checkLowStock');

  // Graceful shutdown — останавливаем задачи при завершении процесса
  process.on('SIGTERM', () => {
    tokenJob.stop();
    stockJob.stop();
    logger.info('[SCHEDULER] Все cron-задачи остановлены (SIGTERM).');
  });

  process.on('SIGINT', () => {
    tokenJob.stop();
    stockJob.stop();
    logger.info('[SCHEDULER] Все cron-задачи остановлены (SIGINT).');
  });
}

/**
 * Ручной запуск обеих задач (для тестирования из dev-среды или Postman).
 * Endpoint: POST /api/admin/run-checks (добавьте по необходимости)
 */
export async function runChecksNow(): Promise<void> {
  logger.info('[SCHEDULER] Ручной запуск всех проверок...');
  await Promise.allSettled([checkTokenExpiry(), checkLowStock()]);
  logger.info('[SCHEDULER] Ручной запуск завершён.');
}
