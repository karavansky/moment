-- Таблицы для системы планирования (scheduling)
-- Таблицы workers и clients уже созданы в add-workers-clients.sql

-- Команды работников
CREATE TABLE IF NOT EXISTS teams (
  "teamID" VARCHAR(20) PRIMARY KEY,
  "firmaID" VARCHAR(21) NOT NULL REFERENCES organisations("firmaID") ON DELETE CASCADE,
  "teamName" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_firmaID ON teams("firmaID");

-- Категории клиентов
CREATE TABLE IF NOT EXISTS groupes (
  "groupeID" VARCHAR(20) PRIMARY KEY,
  "firmaID" VARCHAR(21) NOT NULL REFERENCES organisations("firmaID") ON DELETE CASCADE,
  "groupeName" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_groupes_firmaID ON groupes("firmaID");

-- Добавляем groupeID в clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "groupeID" VARCHAR(20) REFERENCES groupes("groupeID") ON DELETE SET NULL;

-- Услуги (дерево: группы и услуги в одной таблице)
CREATE TABLE IF NOT EXISTS services (
  "serviceID" VARCHAR(20) PRIMARY KEY,
  "firmaID" VARCHAR(21) NOT NULL REFERENCES organisations("firmaID") ON DELETE CASCADE,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "duration" INTEGER DEFAULT 0,
  "price" NUMERIC(10,2),
  "parentId" VARCHAR(20) REFERENCES services("serviceID") ON DELETE CASCADE,
  "isGroup" BOOLEAN DEFAULT FALSE,
  "order" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_firmaID ON services("firmaID");
CREATE INDEX IF NOT EXISTS idx_services_parentId ON services("parentId");

-- Назначения (appointments)
CREATE TABLE IF NOT EXISTS appointments (
  "appointmentID" VARCHAR(20) PRIMARY KEY,
  "firmaID" VARCHAR(21) NOT NULL REFERENCES organisations("firmaID") ON DELETE CASCADE,
  "userID" VARCHAR(20) NOT NULL,
  "clientID" VARCHAR(20) NOT NULL REFERENCES clients("clientID") ON DELETE CASCADE,
  "workerId" VARCHAR(20) NOT NULL REFERENCES workers("workerID") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "isFixedTime" BOOLEAN DEFAULT FALSE,
  "startTime" TIMESTAMP WITH TIME ZONE NOT NULL,
  "endTime" TIMESTAMP WITH TIME ZONE NOT NULL,
  "duration" INTEGER NOT NULL,
  "fahrzeit" INTEGER DEFAULT 0,
  "isOpen" BOOLEAN DEFAULT FALSE,
  "openedAt" TIMESTAMP WITH TIME ZONE,
  "closedAt" TIMESTAMP WITH TIME ZONE,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_firmaID ON appointments("firmaID");
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments("date");
CREATE INDEX IF NOT EXISTS idx_appointments_workerId ON appointments("workerId");
CREATE INDEX IF NOT EXISTS idx_appointments_clientID ON appointments("clientID");

-- Связь appointments ↔ services (many-to-many)
CREATE TABLE IF NOT EXISTS appointment_services (
  "appointmentID" VARCHAR(20) NOT NULL REFERENCES appointments("appointmentID") ON DELETE CASCADE,
  "serviceID" VARCHAR(20) NOT NULL REFERENCES services("serviceID") ON DELETE CASCADE,
  PRIMARY KEY ("appointmentID", "serviceID")
);

-- Отчёты
CREATE TABLE IF NOT EXISTS reports (
  "reportID" VARCHAR(20) PRIMARY KEY,
  "firmaID" VARCHAR(21) NOT NULL REFERENCES organisations("firmaID") ON DELETE CASCADE,
  "workerId" VARCHAR(20) NOT NULL REFERENCES workers("workerID") ON DELETE CASCADE,
  "appointmentId" VARCHAR(20) NOT NULL REFERENCES appointments("appointmentID") ON DELETE CASCADE,
  "notes" TEXT,
  "date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_firmaID ON reports("firmaID");
CREATE INDEX IF NOT EXISTS idx_reports_appointmentId ON reports("appointmentId");

-- Фото отчётов
CREATE TABLE IF NOT EXISTS report_photos (
  "photoID" VARCHAR(20) PRIMARY KEY,
  "reportID" VARCHAR(20) NOT NULL REFERENCES reports("reportID") ON DELETE CASCADE,
  "url" TEXT NOT NULL,
  "note" TEXT DEFAULT '',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_photos_reportID ON report_photos("reportID");
