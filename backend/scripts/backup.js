#!/usr/bin/env node
/**
 * ITAM — Скрипт резервного копирования PostgreSQL
 * ─────────────────────────────────────────────────
 * Использование: node backup.js
 *
 * Переменные окружения (можно задать в .env или при запуске):
 *   POSTGRES_USER      — пользователь БД    (по умолчанию: itam_user)
 *   POSTGRES_PASSWORD  — пароль БД
 *   POSTGRES_DB        — имя базы данных    (по умолчанию: itam_db)
 *   POSTGRES_HOST      — хост               (по умолчанию: localhost)
 *   POSTGRES_PORT      — порт на хосте      (по умолчанию: 5433)
 *   DB_CONTAINER       — имя Docker-контейнера (по умолчанию: itam_postgres)
 *   BACKUP_DIR         — папка для бэкапов  (по умолчанию: ./backups)
 *   BACKUP_KEEP_DAYS   — сколько дней хранить (по умолчанию: 14)
 *
 * Настройка автозапуска (Linux/Ubuntu):
 *   crontab -e
 *   Добавьте строку:
 *   0 2 * * * /usr/bin/node /opt/itam/backend/scripts/backup.js >> /var/log/itam/backup.log 2>&1
 *   (Запуск каждый день в 02:00)
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const path  = require('path');
const fs    = require('fs');

// ── Конфигурация ───────────────────────────────────────────
// Загружаем .env из корня backend (если запускаем напрямую)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([A-Z_]+)\s*=\s*["']?(.+?)["']?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

const PG_USER      = process.env.POSTGRES_USER     || 'itam_user';
const PG_PASSWORD  = process.env.POSTGRES_PASSWORD || 'itam_secret_password';
const PG_DB        = process.env.POSTGRES_DB       || 'itam_db';
const PG_HOST      = process.env.POSTGRES_HOST     || 'localhost';
const PG_PORT      = process.env.POSTGRES_PORT     || '5433';
const CONTAINER    = process.env.DB_CONTAINER      || 'itam_postgres';
const BACKUP_DIR   = process.env.BACKUP_DIR        || path.join(__dirname, '..', 'backups');
const KEEP_DAYS    = parseInt(process.env.BACKUP_KEEP_DAYS || '14', 10);

// ── Утилиты ────────────────────────────────────────────────
function log(level, message) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level.toUpperCase()}] ${message}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log('info', `Создана папка для бэкапов: ${dir}`);
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Главная функция ────────────────────────────────────────
function runBackup() {
  log('info', '='.repeat(60));
  log('info', 'Запуск резервного копирования ITAM PostgreSQL...');
  log('info', `БД: ${PG_DB} | Хост: ${PG_HOST}:${PG_PORT} | Контейнер: ${CONTAINER}`);

  ensureDir(BACKUP_DIR);

  // Формируем имя файла с текущей датой и временем
  const now = new Date();
  const dateStr = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  const filename = `itam_backup_${dateStr}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);

  // ── Создание дампа через Docker exec ────────────────────
  // Используем pg_dump внутри контейнера и сразу сжимаем gzip
  log('info', `Создаём дамп: ${filename}`);

  const dumpCmd = [
    'docker', 'exec', CONTAINER,
    'sh', '-c',
    `PGPASSWORD="${PG_PASSWORD}" pg_dump -U ${PG_USER} -d ${PG_DB} --no-owner --no-acl --clean --if-exists | gzip`,
  ];

  let dumpData;
  try {
    // spawnSync чтобы получить stdout в буфер (бинарные данные)
    const result = spawnSync('docker', [
      'exec', CONTAINER,
      'sh', '-c',
      `PGPASSWORD="${PG_PASSWORD}" pg_dump -U ${PG_USER} -d ${PG_DB} --no-owner --no-acl --clean --if-exists`,
    ], { maxBuffer: 512 * 1024 * 1024 }); // 512 MB

    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`pg_dump вернул код ${result.status}: ${result.stderr?.toString()}`);
    }

    dumpData = result.stdout;
  } catch (err) {
    log('error', `Ошибка создания дампа: ${err.message}`);
    process.exit(1);
  }

  // Сжимаем и сохраняем
  try {
    const zlib = require('zlib');
    const compressed = zlib.gzipSync(dumpData);
    fs.writeFileSync(filepath, compressed);

    const stats = fs.statSync(filepath);
    log('info', `✅ Дамп успешно создан: ${filename} (${formatBytes(stats.size)})`);
  } catch (err) {
    log('error', `Ошибка сохранения файла: ${err.message}`);
    process.exit(1);
  }

  // ── Ротация старых бэкапов ───────────────────────────────
  log('info', `Ротация бэкапов: удаляем файлы старше ${KEEP_DAYS} дней...`);

  const cutoffMs = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  let removedCount = 0;
  let removedBytes = 0;

  try {
    const files = fs.readdirSync(BACKUP_DIR);
    for (const file of files) {
      if (!file.startsWith('itam_backup_') || !file.endsWith('.sql.gz')) continue;
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs < cutoffMs) {
        removedBytes += stats.size;
        fs.unlinkSync(filePath);
        log('info', `  Удалён старый бэкап: ${file}`);
        removedCount++;
      }
    }
  } catch (err) {
    log('warn', `Ошибка при ротации: ${err.message}`);
  }

  if (removedCount > 0) {
    log('info', `Ротация завершена: удалено ${removedCount} файл(ов), освобождено ${formatBytes(removedBytes)}`);
  } else {
    log('info', 'Ротация: старых файлов не найдено.');
  }

  // ── Итог ─────────────────────────────────────────────────
  const remaining = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('itam_backup_') && f.endsWith('.sql.gz')).length;

  log('info', `Всего бэкапов в папке: ${remaining}`);
  log('info', '✅ Резервное копирование завершено успешно.');
  log('info', '='.repeat(60));
}

runBackup();
