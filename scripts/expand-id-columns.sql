-- Expand entity ID columns from VARCHAR(20) to VARCHAR(21)
-- Required to support generate-id.ts which generates 21-character crypto-secure IDs
-- (firmaID was already VARCHAR(21) — this aligns the rest)

ALTER TABLE workers ALTER COLUMN "workerID" TYPE VARCHAR(21);
ALTER TABLE workers ALTER COLUMN "teamId" TYPE VARCHAR(21);
ALTER TABLE appointment_workers ALTER COLUMN "workerID" TYPE VARCHAR(21);
ALTER TABLE teams ALTER COLUMN "teamID" TYPE VARCHAR(21);
