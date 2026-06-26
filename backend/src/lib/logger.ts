import winston from 'winston';

// ============================================================
// Централизованный логгер (Winston)
// Уровни: error | warn | info | http | debug
// ============================================================

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Консоль с цветами для разработки
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
    // Файл для ошибок (production)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    // Все логи в отдельный файл
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
