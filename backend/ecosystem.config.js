// ============================================================
// PM2 Ecosystem Config — ITAM Backend (On-Premise)
// Запуск:  pm2 start ecosystem.config.js
// Статус:  pm2 status
// Логи:    pm2 logs itam-backend
// Перезапуск после изменений: pm2 reload itam-backend
// Автозапуск при загрузке OS: pm2 startup && pm2 save
// ============================================================

module.exports = {
  apps: [
    {
      name: 'itam-backend',

      // Запуск скомпилированного JS (production)
      // Перед первым запуском выполните: npm run build
      script: './dist/index.js',

      // Рабочая директория (путь к папке backend)
      cwd: '/opt/itam/backend',   // ← Замените на реальный путь, например /home/admin/itam/backend

      // Переменные окружения (production)
      // Лучше использовать настоящий .env файл через env_file ниже,
      // но здесь продублированы критичные переменные как fallback
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // DATABASE_URL и JWT_SECRET берутся из .env файла
      },

      // Автоматически читает .env из рабочей директории
      // (dotenv/config вызывается в src/index.ts)

      // Cluster mode для многоядерных серверов
      // Для одного CPU используйте instances: 1
      instances: 1,
      exec_mode: 'fork',

      // Перезапуск при падении
      autorestart: true,
      watch: false,            // Не слушать файлы (для production)
      max_memory_restart: '512M',

      // Логи
      log_file: '/var/log/itam/combined.log',
      out_file: '/var/log/itam/out.log',
      error_file: '/var/log/itam/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,        // Ждёт process.send('ready') — можно добавить в src/index.ts
      listen_timeout: 8000,
    },
  ],
};
