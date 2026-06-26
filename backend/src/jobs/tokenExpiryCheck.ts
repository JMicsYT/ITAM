import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { sendTelegramNotification } from '../lib/notifications';

// ============================================================
// Задача 1: Проверка сроков истечения ЭЦП / Рутокенов
// Запускается раз в сутки (по расписанию из cron.ts)
// ============================================================

interface ExpiringToken {
  id: string;
  serialNumber: string;
  issuedTo: string;
  certificateType: string;
  expirationDate: Date;
  daysLeft: number;
}

export async function checkTokenExpiry(): Promise<void> {
  logger.info('[CRON] Запуск проверки сроков действия ЭЦП...');

  const now = new Date();

  // Пороги уведомлений (в днях)
  const ALERT_THRESHOLDS = [30, 14, 7];

  try {
    // Выбираем все активные токены, срок которых истекает в ближайшие 30 дней
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + 30);

    const tokens = await prisma.token.findMany({
      where: {
        status: { in: ['active', 'in_safe'] },
        expirationDate: {
          gte: now,      // ещё не истёк
          lte: maxDate,  // истекает в течение 30 дней
        },
      },
      orderBy: { expirationDate: 'asc' },
    });

    if (tokens.length === 0) {
      logger.info('[CRON] ✅ Токены с приближающимся сроком истечения не найдены.');
      return;
    }

    // Группируем по порогам
    const groups: Record<number, ExpiringToken[]> = {
      7:  [],
      14: [],
      30: [],
    };

    for (const token of tokens) {
      const msLeft = token.expirationDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      const expiringToken: ExpiringToken = {
        id: token.id,
        serialNumber: token.serialNumber,
        issuedTo: token.issuedTo,
        certificateType: token.certificateType,
        expirationDate: token.expirationDate,
        daysLeft,
      };

      // Помещаем в самый срочный порог
      for (const threshold of ALERT_THRESHOLDS) {
        if (daysLeft <= threshold) {
          groups[threshold].push(expiringToken);
          break;
        }
      }
    }

    // Логируем и отправляем уведомления по каждому порогу
    for (const threshold of ALERT_THRESHOLDS) {
      const group = groups[threshold];
      if (group.length === 0) continue;

      const urgencyLabel = threshold <= 7 ? '🔴 КРИТИЧНО' : threshold <= 14 ? '🟠 ВАЖНО' : '🟡 ВНИМАНИЕ';
      const lines = group.map(
        (t) =>
          `  • ${t.issuedTo} | ${t.certificateType} | SN: ${t.serialNumber} | Истекает: ${t.expirationDate.toLocaleDateString('ru-RU')} (через ${t.daysLeft} дн.)`
      );

      const message =
        `${urgencyLabel}: Истекает ЭЦП (≤ ${threshold} дн.) — ${group.length} шт.\n` +
        lines.join('\n');

      logger.warn(`[CRON] ${message}`);
      await sendTelegramNotification(message);
    }

    logger.info(`[CRON] Проверка ЭЦП завершена. Найдено токенов с предупреждениями: ${tokens.length}`);
  } catch (err) {
    logger.error('[CRON] Ошибка при проверке сроков ЭЦП:', err);
  }
}
