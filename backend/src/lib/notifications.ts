import { logger } from './logger';

// ============================================================
// Сервис уведомлений (On-Premise)
// Стратегия: Telegram Bot (основной канал) + Winston (fallback)
//
// Для активации Telegram-уведомлений — задайте в .env:
//   TELEGRAM_BOT_TOKEN=<токен вашего бота от @BotFather>
//   TELEGRAM_CHAT_ID=<ID чата или группы для уведомлений>
//
// Получить CHAT_ID: добавьте бота в нужный чат/группу,
// затем вызовите: https://api.telegram.org/bot<TOKEN>/getUpdates
// ============================================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

const TELEGRAM_ENABLED =
  typeof TELEGRAM_BOT_TOKEN === 'string' && TELEGRAM_BOT_TOKEN.length > 10 &&
  typeof TELEGRAM_CHAT_ID   === 'string' && TELEGRAM_CHAT_ID.length > 0;

/**
 * Отправляет уведомление через Telegram Bot API или
 * делает подробную запись в лог (если Telegram не настроен).
 *
 * @param message  Текст сообщения (поддерживается Markdown)
 */
export async function sendTelegramNotification(message: string): Promise<void> {
  if (!TELEGRAM_ENABLED) {
    // --- Fallback: подробное логирование через Winston ---
    logger.warn(
      '📢 [УВЕДОМЛЕНИЕ] Telegram не настроен — сообщение выведено только в лог.\n' +
      '   Задайте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в файле .env для активации.\n' +
      '─'.repeat(60) + '\n' +
      message + '\n' +
      '─'.repeat(60)
    );
    return;
  }

  // --- Основной канал: Telegram ---
  const url =
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const body = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      // Таймаут 10 сек — не блокируем основной поток долго
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Telegram API error ${response.status}: ${errBody}`);
    }

    logger.info('[NOTIFY] Уведомление успешно отправлено в Telegram.');
  } catch (err) {
    // Не прерываем работу сервиса при сбое уведомлений
    logger.error('[NOTIFY] Ошибка отправки Telegram-уведомления:', err);
    // Дублируем текст в лог, чтобы сообщение не потерялось
    logger.warn('[NOTIFY] Текст упавшего уведомления:\n' + message);
  }
}
