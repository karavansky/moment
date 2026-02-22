-- Expand entity ID columns from VARCHAR(20) to VARCHAR(21)
-- Required to support generate-id.ts which generates 21-character crypto-secure IDs
-- (firmaID was already VARCHAR(21) — this aligns the rest)
-- Run this once against the production/dev database.

BEGIN;

-- Workers table: primary key and team FK
ALTER TABLE workers ALTER COLUMN "workerID" TYPE VARCHAR(21);
ALTER TABLE workers ALTER COLUMN "teamId"   TYPE VARCHAR(21);

-- Teams table: primary key
ALTER TABLE teams ALTER COLUMN "teamID" TYPE VARCHAR(21);

-- Appointments: denormalized primary worker FK
ALTER TABLE appointments ALTER COLUMN "workerId" TYPE VARCHAR(21);

-- appointment_workers join table: FK to workers
ALTER TABLE appointment_workers ALTER COLUMN "workerID" TYPE VARCHAR(21);

-- Reports: FK to workers
ALTER TABLE reports ALTER COLUMN "workerId" TYPE VARCHAR(21);

COMMIT;
