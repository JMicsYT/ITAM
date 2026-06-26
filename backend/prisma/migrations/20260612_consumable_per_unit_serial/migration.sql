-- ============================================================
-- Migration: consumable_per_unit_serial
-- Рефакторинг расходников: от количественного учёта к
-- поштучному учёту по уникальным серийным номерам.
--
-- 1. Удаляем старые колонки quantity и minThreshold
-- 2. Добавляем serialNumber (сначала nullable для совместимости
--    с существующими строками, потом делаем unique + NOT NULL)
-- 3. Добавляем status со значением по умолчанию 'in_stock'
-- 4. Добавляем notes (nullable)
-- ============================================================

-- Шаг 1: Очищаем старые демо-данные (у них нет серийников)
DELETE FROM consumables;

-- Шаг 2: Удаляем старые поля
ALTER TABLE consumables DROP COLUMN IF EXISTS quantity;
ALTER TABLE consumables DROP COLUMN IF EXISTS "minThreshold";

-- Шаг 3: Добавляем новые поля
ALTER TABLE consumables ADD COLUMN "serialNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE consumables ADD COLUMN status TEXT NOT NULL DEFAULT 'in_stock';
ALTER TABLE consumables ADD COLUMN notes TEXT;

-- Шаг 4: Убираем временный дефолт с serialNumber и добавляем ограничение UNIQUE
ALTER TABLE consumables ALTER COLUMN "serialNumber" DROP DEFAULT;
ALTER TABLE consumables ADD CONSTRAINT consumables_serialNumber_key UNIQUE ("serialNumber");
