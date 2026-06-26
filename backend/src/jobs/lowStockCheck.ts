import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { sendTelegramNotification } from '../lib/notifications';

// ============================================================
// Задача: Проверка состояния расходных материалов
// Теперь каждый расходник — уникальный экземпляр с серийным номером.
// «Мало на складе» = количество экземпляров со статусом 'in_stock'
// по конкретной модели меньше минимального порога (3 шт. — захардкожено,
// можно вынести в переменную окружения LOW_STOCK_THRESHOLD).
// ============================================================

const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD ?? '3', 10);

export async function checkLowStock(): Promise<void> {
  logger.info('[CRON] Запуск проверки остатков расходников...');

  try {
    // Получаем все расходники на складе (status = 'in_stock')
    const inStock = await prisma.consumable.findMany({
      where: { status: 'in_stock' },
      select: { model: true, type: true, location: true },
    });

    // Группируем по модели, считаем количество
    const counts: Record<string, { count: number; type: string; location: string }> = {};
    for (const item of inStock) {
      if (!counts[item.model]) {
        counts[item.model] = { count: 0, type: item.type, location: item.location };
      }
      counts[item.model].count++;
    }

    // Фильтруем позиции ниже порога
    const lowItems = Object.entries(counts).filter(([, v]) => v.count < LOW_STOCK_THRESHOLD);

    if (lowItems.length === 0) {
      logger.info('[CRON] ✅ Расходники с низким остатком не найдены.');
      return;
    }

    const outOfStock = lowItems.filter(([, v]) => v.count === 0);
    const low        = lowItems.filter(([, v]) => v.count > 0);

    const lines: string[] = [];

    if (outOfStock.length > 0) {
      lines.push('🔴 ЗАКОНЧИЛОСЬ (нет на складе):');
      outOfStock.forEach(([model, v]) => {
        lines.push(`  • ${model} | ${v.type === 'cartridge' ? 'Картридж' : 'Фотобарабан'} | Место: ${v.location}`);
      });
    }

    if (low.length > 0) {
      lines.push(`🟡 МАЛО (менее ${LOW_STOCK_THRESHOLD} шт. на складе):`);
      low.forEach(([model, v]) => {
        lines.push(`  • ${model} | ${v.count} шт. | Место: ${v.location}`);
      });
    }

    const message =
      `📦 Уведомление о расходниках: требуется пополнение (${lowItems.length} моделей)\n` +
      lines.join('\n');

    logger.warn(`[CRON] ${message}`);
    await sendTelegramNotification(message);

    logger.info(`[CRON] Проверка расходников завершена. Моделей с низким остатком: ${lowItems.length}`);
  } catch (err) {
    logger.error('[CRON] Ошибка при проверке остатков расходников:', err);
  }
}
