# Инструкция по развертыванию ITAM на Ubuntu Server

> **Версии:** Ubuntu 22.04 LTS | Node.js 20 LTS | Docker 24+ | Nginx 1.24+ | PM2 5+

---

## Содержание

1. [Подготовка сервера](#1-подготовка-сервера)
2. [Установка Node.js и PM2](#2-установка-nodejs-и-pm2)
3. [Установка Docker и Docker Compose](#3-установка-docker-и-docker-compose)
4. [Установка и настройка Nginx](#4-установка-и-настройка-nginx)
5. [Развертывание приложения](#5-развертывание-приложения)
6. [Запуск базы данных](#6-запуск-базы-данных)
7. [Генерация SSL-сертификатов](#7-генерация-ssl-сертификатов)
8. [Сборка и деплой фронтенда](#8-сборка-и-деплой-фронтенда)
9. [Запуск бэкенда через PM2](#9-запуск-бэкенда-через-pm2)
10. [Применение конфигурации Nginx](#10-применение-конфигурации-nginx)
11. [Настройка автобэкапа](#11-настройка-автобэкапа)
12. [Проверка работоспособности](#12-проверка-работоспособности)
13. [Управление системой](#13-управление-системой)

---

## 1. Подготовка сервера

```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем необходимые утилиты
sudo apt install -y curl wget git unzip build-essential

# Создаём системного пользователя для ITAM (без пароля, без shell)
sudo useradd --system --create-home --shell /bin/bash itam

# Создаём директории для приложения и логов
sudo mkdir -p /opt/itam
sudo mkdir -p /var/log/itam
sudo chown -R itam:itam /opt/itam /var/log/itam
```

---

## 2. Установка Node.js и PM2

```bash
# Добавляем NodeSource репозиторий (Node.js 20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Устанавливаем Node.js
sudo apt install -y nodejs

# Проверяем версии
node --version   # должно быть v20.x.x
npm --version    # должно быть 10.x.x

# Устанавливаем PM2 глобально
sudo npm install -g pm2

# Регистрируем PM2 для автозапуска после перезагрузки сервера
pm2 startup systemd -u itam --hp /home/itam
# Выполните команду, которую выведет эта утилита (начинается с sudo env PATH=...)
```

---

## 3. Установка Docker и Docker Compose

```bash
# Устанавливаем зависимости
sudo apt install -y ca-certificates curl gnupg lsb-release

# Добавляем GPG-ключ Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Добавляем репозиторий Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Устанавливаем Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Добавляем пользователя itam в группу docker
sudo usermod -aG docker itam

# Запускаем и включаем автостарт Docker
sudo systemctl enable --now docker

# Проверяем
docker --version
docker compose version
```

---

## 4. Установка и настройка Nginx

```bash
# Устанавливаем Nginx
sudo apt install -y nginx

# Включаем и запускаем Nginx
sudo systemctl enable --now nginx
```

---

## 5. Развертывание приложения

```bash
# Переключаемся на пользователя itam
sudo su - itam

# Копируем файлы проекта на сервер
# Вариант А — через git (рекомендуется)
git clone https://your-repo-url.git /opt/itam

# Вариант Б — через SCP с рабочей машины (запустить на Windows-машине разработчика):
# scp -r F:\ITAM\* user@SERVER_IP:/opt/itam/

# Устанавливаем зависимости бэкенда
cd /opt/itam/backend
npm install --production
npm install  # включая devDependencies для TypeScript

# Создаём production .env (на основе .env.example)
cp .env.example .env
nano .env
# Обязательно измените:
#   DATABASE_URL — измените порт если нужно
#   JWT_SECRET   — сгенерируйте длинную случайную строку (32+ символа)
#   NODE_ENV=production
#   ALLOWED_ORIGINS=https://ваш-домен-или-IP
```

> **⚠️ Важно:** Задайте в `.env` сложный `JWT_SECRET`. Пример генерации:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

---

## 6. Запуск базы данных

```bash
cd /opt/itam

# Запускаем контейнеры PostgreSQL и pgAdmin
docker compose up -d

# Проверяем, что контейнеры работают
docker compose ps
# Оба должны иметь статус "Up" / "healthy"

# Ждём ~10 секунд пока PostgreSQL полностью инициализируется
sleep 10

# Применяем миграции базы данных
cd /opt/itam/backend
npx prisma migrate deploy

# Создаём первоначальные данные (пользователи admin/admin123 и тестовые записи)
# ВНИМАНИЕ: Запустите seed только при первом деплое!
npx ts-node prisma/seed.ts

# Или для production (только создаёт пользователя admin):
# После seed немедленно смените пароль через UI!
```

> **💡 Подключение к pgAdmin:** `http://SERVER_IP:5050` — логин `admin@example.com` / пароль из `.env` (PGADMIN_PASSWORD)

---

## 7. Генерация SSL-сертификатов

> **Зачем?** PWA-манифест и Service Worker требуют HTTPS. Nginx откажется запускаться без сертификатов.

```bash
# Создаём директорию для сертификатов
sudo mkdir -p /etc/nginx/ssl/itam

# Генерируем самоподписанный сертификат (действителен 5 лет)
sudo openssl req -x509 -nodes -days 1825 \
  -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/itam/key.pem \
  -out /etc/nginx/ssl/itam/cert.pem \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=Your Organization/CN=SERVER_IP_OR_HOSTNAME"

# Устанавливаем правильные права доступа
sudo chmod 600 /etc/nginx/ssl/itam/key.pem
sudo chmod 644 /etc/nginx/ssl/itam/cert.pem
```

> **📝 Замените** `SERVER_IP_OR_HOSTNAME` на реальный IP-адрес или имя хоста сервера.
> При использовании самоподписанного сертификата браузеры покажут предупреждение — это нормально для внутренней сети.

---

## 8. Сборка и деплой фронтенда

```bash
cd /opt/itam/frontend

# Устанавливаем зависимости
npm install

# Собираем production-бандл
npm run build

# Готовые файлы находятся в /opt/itam/frontend/dist/
# Nginx будет раздавать их напрямую — копировать никуда не нужно,
# если nginx.conf настроен на /opt/itam/frontend/dist
ls -la dist/
```

> **💡 Совет:** Если путь к файлам в `nginx.conf` отличается от `/opt/itam/frontend/dist`, отредактируйте директиву `root` в конфиге.

---

## 9. Запуск бэкенда через PM2

```bash
cd /opt/itam/backend

# Компилируем TypeScript для production
npm run build
# Скомпилированные файлы появятся в /opt/itam/backend/dist/

# Проверяем что ecosystem.config.js указывает правильные пути
cat ecosystem.config.js

# Запускаем через PM2 в production-режиме
pm2 start ecosystem.config.js --env production

# Сохраняем список процессов (для автостарта после reboot)
pm2 save

# Проверяем статус
pm2 status
pm2 logs itam-backend --lines 30
```

---

## 10. Применение конфигурации Nginx

```bash
# Копируем конфигурацию
sudo cp /opt/itam/nginx.conf /etc/nginx/sites-available/itam

# Активируем сайт
sudo ln -sf /etc/nginx/sites-available/itam /etc/nginx/sites-enabled/itam

# Отключаем дефолтный сайт Nginx (если мешает)
sudo rm -f /etc/nginx/sites-enabled/default

# Проверяем синтаксис конфигурации
sudo nginx -t
# Должно вывести: syntax is ok / test is successful

# Применяем конфигурацию (перезагружаем Nginx без downtime)
sudo systemctl reload nginx
```

> **📝 Если nginx.conf содержит IP-адрес** в директиве `server_name` — замените его на реальный IP вашего сервера или FQDN.

---

## 11. Настройка автобэкапа

```bash
# Создаём директорию для бэкапов
mkdir -p /opt/itam/backend/backups

# Проверяем скрипт бэкапа вручную
node /opt/itam/backend/scripts/backup.js

# Должно создать файл вида: backups/itam_backup_YYYY-MM-DD_HH-MM-SS.sql.gz

# Настраиваем cron для автоматического запуска в 02:00 каждую ночь
crontab -e
# Добавьте строку:
0 2 * * * /usr/bin/node /opt/itam/backend/scripts/backup.js >> /var/log/itam/backup.log 2>&1

# Проверяем crontab
crontab -l
```

---

## 12. Проверка работоспособности

```bash
# 1. Docker-контейнеры работают
docker compose -f /opt/itam/docker-compose.yml ps

# 2. Бэкенд отвечает на healthcheck
curl -k https://localhost/api/health
# Ожидаемый ответ: {"status":"ok","database":"connected"}

# 3. Фронтенд загружается
curl -k -s -o /dev/null -w "%{http_code}" https://localhost/
# Ожидаемый ответ: 200

# 4. PM2 процессы работают
pm2 status
# itam-backend должен быть в статусе "online"

# 5. Nginx работает
sudo systemctl status nginx
```

**Если всё работает — откройте браузер:**
- `https://SERVER_IP/` — основное приложение
- `https://SERVER_IP/api/health` — статус API
- `http://SERVER_IP:5050/` — pgAdmin (для администрирования БД)

---

## 13. Управление системой

### Обновление приложения

```bash
# 1. Получить новые файлы
cd /opt/itam && git pull

# 2. Применить миграции БД (если схема изменилась)
cd backend && npx prisma migrate deploy

# 3. Пересобрать бэкенд и перезапустить
npm run build
pm2 restart itam-backend

# 4. Пересобрать фронтенд
cd ../frontend && npm run build
# Nginx автоматически начнёт раздавать новые файлы из dist/
```

### Основные команды PM2

| Команда | Действие |
|---|---|
| `pm2 status` | Список процессов |
| `pm2 logs itam-backend` | Просмотр логов в реальном времени |
| `pm2 restart itam-backend` | Перезапуск бэкенда |
| `pm2 stop itam-backend` | Остановка бэкенда |
| `pm2 monit` | Интерактивный мониторинг CPU/RAM |

### Логи системы

| Файл | Содержимое |
|---|---|
| `/var/log/itam/combined.log` | Все логи бэкенда (Winston) |
| `/var/log/itam/error.log` | Только ошибки |
| `/var/log/itam/backup.log` | Логи резервного копирования |
| `sudo journalctl -u nginx` | Логи Nginx |

### Ручной запуск бэкапа

```bash
node /opt/itam/backend/scripts/backup.js
ls -lah /opt/itam/backend/backups/
```

### Восстановление из бэкапа

```bash
# Разархивируем дамп
gunzip -c /opt/itam/backend/backups/itam_backup_YYYY-MM-DD_HH-MM-SS.sql.gz > restore.sql

# Восстанавливаем в контейнер
docker exec -i itam_postgres psql \
  -U itam_user \
  -d itam_db \
  < restore.sql
```

---

## Переменные окружения (production)

| Переменная | Описание | Пример |
|---|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql://itam_user:PASSWORD@localhost:5433/itam_db` |
| `JWT_SECRET` | Секрет для JWT (32+ символа) | `openssl rand -hex 48` |
| `JWT_EXPIRES` | Срок жизни токена | `8h` |
| `NODE_ENV` | Режим окружения | `production` |
| `PORT` | Порт бэкенда | `3001` |
| `ALLOWED_ORIGINS` | Разрешённые CORS-источники | `https://your-server-ip` |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота (опционально) | `1234567890:ABC...` |
| `TELEGRAM_CHAT_ID` | ID чата для уведомлений | `-1001234567890` |
