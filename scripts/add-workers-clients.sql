-- Таблица работников
CREATE TABLE IF NOT EXISTS workers (
  "workerID" VARCHAR(20) PRIMARY KEY,
  "userID" VARCHAR(20) REFERENCES users("userID") ON DELETE SET NULL,
  "firmaID" VARCHAR(21) NOT NULL REFERENCES organisations("firmaID") ON DELETE CASCADE,
  "name" VARCHAR(100) NOT NULL,
  "surname" VARCHAR(100),
  "email" VARCHAR(255),
  "phone" VARCHAR(50),
  "phone2" VARCHAR(50),
  "teamId" VARCHAR(20),
  "isAdress" BOOLEAN DEFAULT FALSE,
  "status" INTEGER DEFAULT 0,
  "country" VARCHAR(100),
  "street" VARCHAR(200),
  "postalCode" VARCHAR(20),
  "city" VARCHAR(100),
  "houseNumber" VARCHAR(20),
  "apartment" VARCHAR(20),
  "district" VARCHAR(100),
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workers_firmaID ON workers("firmaID");
CREATE INDEX IF NOT EXISTS idx_workers_userID ON workers("userID");

-- Таблица клиентов
CREATE TABLE IF NOT EXISTS clients (
  "clientID" VARCHAR(20) PRIMARY KEY,
  "userID" VARCHAR(20) REFERENCES users("userID") ON DELETE SET NULL,
  "firmaID" VARCHAR(21) NOT NULL REFERENCES organisations("firmaID") ON DELETE CASCADE,
  "name" VARCHAR(100) NOT NULL,
  "surname" VARCHAR(100),
  "email" VARCHAR(255),
  "phone" VARCHAR(50),
  "phone2" VARCHAR(50),
  "status" INTEGER DEFAULT 0,
  "country" VARCHAR(100),
  "street" VARCHAR(200),
  "postalCode" VARCHAR(20),
  "city" VARCHAR(100),
  "houseNumber" VARCHAR(20),
  "apartment" VARCHAR(20),
  "district" VARCHAR(100),
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_firmaID ON clients("firmaID");
CREATE INDEX IF NOT EXISTS idx_clients_userID ON clients("userID");
