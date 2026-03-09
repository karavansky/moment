-- ================================================
-- TRANSPORT SYSTEM MIGRATION
-- ================================================
-- Adds tables for corporate transport/taxi system
-- with 400 vehicles, orders, routes, GPS tracking
--
-- Dependencies: PostGIS extension
-- Run AFTER: postgis/postgis:16-3.4-alpine image
-- ================================================

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ================================================
-- 1. VEHICLES TABLE (Автопарк)
-- ================================================
CREATE TABLE IF NOT EXISTS vehicles (
  "vehicleID" VARCHAR(21) PRIMARY KEY,
  "firmaID" VARCHAR(21) NOT NULL,
  "plateNumber" VARCHAR(20) UNIQUE NOT NULL,
  "type" VARCHAR(20) NOT NULL CHECK ("type" IN ('STANDARD', 'MINIVAN', 'WHEELCHAIR')),
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'REPAIR', 'INACTIVE')),
  "currentDriverID" VARCHAR(21),
  "currentLat" DOUBLE PRECISION,
  "currentLng" DOUBLE PRECISION,
  "lastLocationUpdate" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("firmaID") REFERENCES organisations("firmaID") ON DELETE CASCADE,
  FOREIGN KEY ("currentDriverID") REFERENCES workers("workerID") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicles_firmaid ON vehicles("firmaID");
CREATE INDEX IF NOT EXISTS idx_vehicles_currentdriverid ON vehicles("currentDriverID");
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles("type");
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles("status");

-- ================================================
-- 2. ORDERS TABLE (Заказы транспорта)
-- ================================================
CREATE TABLE IF NOT EXISTS orders (
  "orderID" VARCHAR(21) PRIMARY KEY,
  "firmaID" VARCHAR(21) NOT NULL,
  "clientID" VARCHAR(21) NOT NULL,
  "dispatcherID" VARCHAR(21),
  "driverID" VARCHAR(21),
  "vehicleID" VARCHAR(21),
  "appointmentID" VARCHAR(21),
  "scheduledTime" TIMESTAMP WITH TIME ZONE,
  "status" VARCHAR(20) NOT NULL DEFAULT 'CREATED'
    CHECK ("status" IN ('CREATED', 'ASSIGNED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  "clientComment" TEXT,
  "phone" VARCHAR(50),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "assignedAt" TIMESTAMP WITH TIME ZONE,
  "acceptedAt" TIMESTAMP WITH TIME ZONE,
  "arrivedAt" TIMESTAMP WITH TIME ZONE,
  "startedAt" TIMESTAMP WITH TIME ZONE,
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "cancelledAt" TIMESTAMP WITH TIME ZONE,

  FOREIGN KEY ("firmaID") REFERENCES organisations("firmaID") ON DELETE CASCADE,
  FOREIGN KEY ("clientID") REFERENCES clients("clientID") ON DELETE CASCADE,
  FOREIGN KEY ("dispatcherID") REFERENCES users("userID") ON DELETE SET NULL,
  FOREIGN KEY ("driverID") REFERENCES workers("workerID") ON DELETE SET NULL,
  FOREIGN KEY ("vehicleID") REFERENCES vehicles("vehicleID") ON DELETE SET NULL,
  FOREIGN KEY ("appointmentID") REFERENCES appointments("appointmentID") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_firmaid ON orders("firmaID");
CREATE INDEX IF NOT EXISTS idx_orders_clientid ON orders("clientID");
CREATE INDEX IF NOT EXISTS idx_orders_driverid ON orders("driverID");
CREATE INDEX IF NOT EXISTS idx_orders_vehicleid ON orders("vehicleID");
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders("status");
CREATE INDEX IF NOT EXISTS idx_orders_scheduledtime ON orders("scheduledTime");
CREATE INDEX IF NOT EXISTS idx_orders_createdat ON orders("createdAt");

-- ================================================
-- 3. ROUTES TABLE (Маршруты для заказов)
-- ================================================
CREATE TABLE IF NOT EXISTS routes (
  "routeID" VARCHAR(21) PRIMARY KEY,
  "firmaID" VARCHAR(21) NOT NULL,
  "orderID" VARCHAR(21) NOT NULL,
  "sequence" INTEGER NOT NULL,
  "pickupAddress" TEXT NOT NULL,
  "dropoffAddress" TEXT NOT NULL,
  "pickupLat" DOUBLE PRECISION,
  "pickupLng" DOUBLE PRECISION,
  "dropoffLat" DOUBLE PRECISION,
  "dropoffLng" DOUBLE PRECISION,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("firmaID") REFERENCES organisations("firmaID") ON DELETE CASCADE,
  FOREIGN KEY ("orderID") REFERENCES orders("orderID") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_routes_orderid ON routes("orderID");
CREATE INDEX IF NOT EXISTS idx_routes_sequence ON routes("orderID", "sequence");

-- ================================================
-- 4. REJECT_REASONS TABLE (Справочник причин отказа)
-- ================================================
CREATE TABLE IF NOT EXISTS reject_reasons (
  "reasonID" VARCHAR(21) PRIMARY KEY,
  "firmaID" VARCHAR(21) NOT NULL,
  "reasonText" VARCHAR(200) NOT NULL,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("firmaID") REFERENCES organisations("firmaID") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reject_reasons_firmaid ON reject_reasons("firmaID");
CREATE INDEX IF NOT EXISTS idx_reject_reasons_active ON reject_reasons("isActive");

-- ================================================
-- 5. ORDER_REJECTS TABLE (История отказов)
-- ================================================
CREATE TABLE IF NOT EXISTS order_rejects (
  "rejectID" VARCHAR(21) PRIMARY KEY,
  "orderID" VARCHAR(21) NOT NULL,
  "driverID" VARCHAR(21) NOT NULL,
  "reasonID" VARCHAR(21),
  "customReason" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("orderID") REFERENCES orders("orderID") ON DELETE CASCADE,
  FOREIGN KEY ("driverID") REFERENCES workers("workerID") ON DELETE CASCADE,
  FOREIGN KEY ("reasonID") REFERENCES reject_reasons("reasonID") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_rejects_orderid ON order_rejects("orderID");
CREATE INDEX IF NOT EXISTS idx_order_rejects_driverid ON order_rejects("driverID");
CREATE INDEX IF NOT EXISTS idx_order_rejects_createdat ON order_rejects("createdAt");

-- ================================================
-- 6. TRACK_POINTS TABLE (GPS треки с PostGIS)
-- ================================================
-- Parent table with partitioning by recordedAt (monthly)
CREATE TABLE IF NOT EXISTS track_points (
  id BIGSERIAL,
  "orderID" VARCHAR(21) NOT NULL,
  "vehicleID" VARCHAR(21) NOT NULL,
  "driverID" VARCHAR(21) NOT NULL,
  location GEOMETRY(POINT, 4326) NOT NULL,
  speed FLOAT,
  heading FLOAT,
  accuracy FLOAT,
  "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id, "recordedAt")
) PARTITION BY RANGE ("recordedAt");

-- Indexes on partitioned table
CREATE INDEX IF NOT EXISTS idx_track_points_order ON track_points("orderID");
CREATE INDEX IF NOT EXISTS idx_track_points_vehicle ON track_points("vehicleID");
CREATE INDEX IF NOT EXISTS idx_track_points_location ON track_points USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_track_points_recorded ON track_points("recordedAt");

-- Initial partitions (current month + next month)
DO $$
DECLARE
  current_month_start DATE := DATE_TRUNC('month', CURRENT_DATE);
  next_month_start DATE := current_month_start + INTERVAL '1 month';
  month_after_start DATE := current_month_start + INTERVAL '2 months';
  partition_name TEXT;
BEGIN
  -- Current month partition
  partition_name := 'track_points_' || TO_CHAR(current_month_start, 'YYYY_MM');
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF track_points
     FOR VALUES FROM (%L) TO (%L)',
    partition_name, current_month_start, next_month_start
  );

  -- Next month partition
  partition_name := 'track_points_' || TO_CHAR(next_month_start, 'YYYY_MM');
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF track_points
     FOR VALUES FROM (%L) TO (%L)',
    partition_name, next_month_start, month_after_start
  );

  RAISE NOTICE 'Created track_points partitions for current and next month';
END $$;

-- ================================================
-- 7. AUTO-PARTITIONING FUNCTION
-- ================================================
-- Automatically creates next month partition and drops old partitions (older than 2 months)
CREATE OR REPLACE FUNCTION create_track_points_partition()
RETURNS void AS $$
DECLARE
  next_month_start DATE := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '2 months');
  month_after_start DATE := next_month_start + INTERVAL '1 month';
  partition_name TEXT := 'track_points_' || TO_CHAR(next_month_start, 'YYYY_MM');
  old_partition_date DATE := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months');
  old_partition_name TEXT := 'track_points_' || TO_CHAR(old_partition_date, 'YYYY_MM');
BEGIN
  -- Create next month partition if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF track_points
       FOR VALUES FROM (%L) TO (%L)',
      partition_name, next_month_start, month_after_start
    );
    RAISE NOTICE 'Created partition: %', partition_name;
  END IF;

  -- Drop old partition (older than 2 months)
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = old_partition_name
  ) THEN
    EXECUTE format('DROP TABLE %I', old_partition_name);
    RAISE NOTICE 'Dropped old partition: %', old_partition_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 8. CRON JOB PLACEHOLDER (Run monthly)
-- ================================================
-- To setup: Add to crontab or use pg_cron extension
-- 0 0 1 * * psql -U hronop -d moment -c "SELECT create_track_points_partition();"

COMMENT ON FUNCTION create_track_points_partition() IS
  'Auto-creates next month partition for track_points and drops partitions older than 2 months.
   Should be called monthly via cron or pg_cron extension.';

-- ================================================
-- 9. UPDATE WORKERS TABLE (Add vehicle fields)
-- ================================================
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS "hasVehicle" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "vehicleID" VARCHAR(21),
  ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN DEFAULT FALSE;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workers_vehicleid_fkey'
  ) THEN
    ALTER TABLE workers
      ADD CONSTRAINT workers_vehicleid_fkey
      FOREIGN KEY ("vehicleID") REFERENCES vehicles("vehicleID") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workers_vehicleid ON workers("vehicleID");
CREATE INDEX IF NOT EXISTS idx_workers_isonline ON workers("isOnline");
CREATE INDEX IF NOT EXISTS idx_workers_hasvehicle ON workers("hasVehicle");

-- ================================================
-- 10. UPDATE APPOINTMENTS TABLE (Link to orders)
-- ================================================
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS "orderID" VARCHAR(21);

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_orderid_fkey'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_orderid_fkey
      FOREIGN KEY ("orderID") REFERENCES orders("orderID") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_orderid ON appointments("orderID");

-- ================================================
-- 11. UPDATE REVIEWS TABLE (Support transport reviews)
-- ================================================
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS "orderID" VARCHAR(21);

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_orderid_fkey'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_orderid_fkey
      FOREIGN KEY ("orderID") REFERENCES orders("orderID") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reviews_orderid ON reviews("orderID");

COMMENT ON COLUMN reviews."orderID" IS 'Link to transport order (NULL for appointment reviews)';
COMMENT ON COLUMN reviews.type IS '0 = appointment review, 1 = transport order review';

-- ================================================
-- 12. INSERT DEFAULT REJECT REASONS (Optional)
-- ================================================
-- Uncomment and modify firmaID to add default reasons
-- DO $$
-- DECLARE
--   default_firma_id VARCHAR(21) := 'YOUR_FIRMA_ID_HERE';
-- BEGIN
--   INSERT INTO reject_reasons ("reasonID", "firmaID", "reasonText") VALUES
--     (substring(md5(random()::text) from 1 for 21), default_firma_id, 'Поломка автомобиля'),
--     (substring(md5(random()::text) from 1 for 21), default_firma_id, 'Не успеваю добраться'),
--     (substring(md5(random()::text) from 1 for 21), default_firma_id, 'Окончание смены'),
--     (substring(md5(random()::text) from 1 for 21), default_firma_id, 'Нет топлива'),
--     (substring(md5(random()::text) from 1 for 21), default_firma_id, 'Другая причина')
--   ON CONFLICT DO NOTHING;
-- END $$;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
-- To verify installation:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%track%';
-- SELECT PostGIS_Full_Version();
