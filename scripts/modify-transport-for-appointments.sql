-- ================================================
-- МИГРАЦИЯ: Интеграция Orders с Appointments
-- ================================================
-- Описание:
-- 1. Orders может существовать БЕЗ Appointment (Workflow 2: клиент создает заказ)
-- 2. Routes привязываются к appointmentID (когда он создан)
-- 3. Appointments получает поле type (0=визит, 1=поездка)
-- ================================================

-- ================================================
-- 1. Модифицируем таблицу APPOINTMENTS
-- ================================================

-- Добавляем тип события
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "type" INTEGER DEFAULT 0;
COMMENT ON COLUMN appointments."type" IS '0=визит (встреча), 1=поездка (транспорт)';

-- Индекс для быстрой фильтрации по типу
CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments("type");

-- ================================================
-- 2. Модифицируем таблицу ORDERS
-- ================================================

-- appointmentID теперь может быть NULL (до назначения)
ALTER TABLE orders ALTER COLUMN "appointmentID" DROP NOT NULL;

-- Добавляем поле для желаемого времени от клиента
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "requestedTime" TIMESTAMP WITH TIME ZONE;
COMMENT ON COLUMN orders."requestedTime" IS 'Желаемое время подачи (указывает клиент)';

-- Изменяем статусы: добавляем PENDING
-- Статусы: PENDING (ожидает назначения) → CREATED (назначен) → ASSIGNED → ACCEPTED → ARRIVED → IN_PROGRESS → COMPLETED → CANCELLED

-- Добавляем индекс для быстрого поиска неназначенных заказов
CREATE INDEX IF NOT EXISTS idx_orders_pending ON orders("status", "appointmentID") WHERE "appointmentID" IS NULL;

-- ================================================
-- 3. Модифицируем таблицу ROUTES
-- ================================================

-- Маршруты теперь привязываются к appointmentID
-- Но до создания appointment (Workflow 2), нужна временная связь с orderID
-- Решение: храним обе связи, но хотя бы одна должна быть заполнена

ALTER TABLE routes ADD COLUMN IF NOT EXISTS "orderID" VARCHAR(21);

-- Constraint: хотя бы одна связь должна быть
ALTER TABLE routes DROP CONSTRAINT IF EXISTS check_order_or_appointment;
ALTER TABLE routes ADD CONSTRAINT check_order_or_appointment
  CHECK ("orderID" IS NOT NULL OR "appointmentID" IS NOT NULL);

-- Foreign key для orderID
ALTER TABLE routes ADD CONSTRAINT fk_routes_orderid
  FOREIGN KEY ("orderID") REFERENCES orders("orderID") ON DELETE CASCADE;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_routes_orderid ON routes("orderID");
CREATE INDEX IF NOT EXISTS idx_routes_appointmentid ON routes("appointmentID");

-- ================================================
-- 4. Обновляем FOREIGN KEYS в orders
-- ================================================

-- Делаем appointmentID SET NULL при удалении appointment
-- (на случай если appointment удален, но order нужно сохранить для статистики)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_appointmentID_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_appointmentID_fkey
  FOREIGN KEY ("appointmentID") REFERENCES appointments("appointmentID") ON DELETE SET NULL;

-- ================================================
-- 5. ФУНКЦИЯ: Синхронизация routes при создании appointment
-- ================================================

CREATE OR REPLACE FUNCTION sync_routes_on_appointment_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Когда создается appointment для existing order,
  -- переносим routes с orderID на appointmentID
  IF NEW."appointmentID" IS NOT NULL AND OLD."appointmentID" IS NULL THEN
    UPDATE routes
    SET "appointmentID" = NEW."appointmentID"
    WHERE "orderID" = NEW."orderID" AND "appointmentID" IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на обновление orders
DROP TRIGGER IF EXISTS trigger_sync_routes_on_appointment ON orders;
CREATE TRIGGER trigger_sync_routes_on_appointment
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD."appointmentID" IS NULL AND NEW."appointmentID" IS NOT NULL)
  EXECUTE FUNCTION sync_routes_on_appointment_created();

-- ================================================
-- КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ================================================

COMMENT ON TABLE orders IS 'Заказы транспорта. Могут существовать без appointment (PENDING статус) до назначения администратором.';
COMMENT ON TABLE routes IS 'Маршруты. Привязаны либо к orderID (временно), либо к appointmentID (после назначения).';
COMMENT ON COLUMN orders."appointmentID" IS 'NULL для PENDING заказов. Заполняется когда администратор назначает дату/водителя.';
COMMENT ON COLUMN routes."orderID" IS 'Временная связь до создания appointment (Workflow 2: клиент создает заказ).';
COMMENT ON COLUMN routes."appointmentID" IS 'Основная связь после назначения (оба Workflow).';

-- ================================================
-- ПРОВЕРКА МИГРАЦИИ
-- ================================================

-- Проверить, что все поля добавлены
DO $$
BEGIN
  -- Проверка appointments.type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'type'
  ) THEN
    RAISE EXCEPTION 'Поле appointments.type не создано!';
  END IF;

  -- Проверка orders.requestedTime
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'requestedTime'
  ) THEN
    RAISE EXCEPTION 'Поле orders.requestedTime не создано!';
  END IF;

  -- Проверка routes.orderID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'routes' AND column_name = 'orderID'
  ) THEN
    RAISE EXCEPTION 'Поле routes.orderID не создано!';
  END IF;

  RAISE NOTICE 'Миграция выполнена успешно!';
END $$;
