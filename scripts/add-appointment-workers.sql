-- Связующая таблица appointment ↔ workers (many-to-many)
-- Заменяет единственное поле appointments.workerId на множественную связь

-- 1. Создать связующую таблицу
CREATE TABLE IF NOT EXISTS appointment_workers (
  "appointmentID" VARCHAR(20) NOT NULL REFERENCES appointments("appointmentID") ON DELETE CASCADE,
  "workerID" VARCHAR(20) NOT NULL REFERENCES workers("workerID") ON DELETE CASCADE,
  PRIMARY KEY ("appointmentID", "workerID")
);

CREATE INDEX IF NOT EXISTS idx_appointment_workers_workerID ON appointment_workers("workerID");

-- 2. Мигрировать существующие данные: appointments.workerId → appointment_workers
INSERT INTO appointment_workers ("appointmentID", "workerID")
SELECT "appointmentID", "workerId"
FROM appointments
WHERE "workerId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Убрать NOT NULL и FK constraint с workerId (оставляем поле для обратной совместимости)
-- Чтобы убрать NOT NULL:
ALTER TABLE appointments ALTER COLUMN "workerId" DROP NOT NULL;
-- Убираем FK constraint (имя может отличаться, ищем по pattern):
-- ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_workerId_fkey;
