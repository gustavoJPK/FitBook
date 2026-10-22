-- =========================================================
-- FitBook - Esquema de base de datos (PostgreSQL 14+)
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  phone         VARCHAR(20),
  role          VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(100)  NOT NULL,
  description  TEXT          NOT NULL,
  category     VARCHAR(30)   NOT NULL CHECK (category IN ('yoga','spinning','crossfit','pilates','funcional','boxeo','baile')),
  level        VARCHAR(20)   NOT NULL CHECK (level IN ('principiante','intermedio','avanzado')),
  instructor   VARCHAR(80)   NOT NULL,
  starts_at    TIMESTAMPTZ   NOT NULL,
  duration_min INTEGER       NOT NULL CHECK (duration_min BETWEEN 15 AND 240),
  capacity     INTEGER       NOT NULL CHECK (capacity BETWEEN 1 AND 100),
  price        NUMERIC(8,2)  NOT NULL DEFAULT 0 CHECK (price >= 0),
  status       VARCHAR(12)   NOT NULL DEFAULT 'activa' CHECK (status IN ('activa','cancelada')),
  created_by   INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  class_id   INTEGER     NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  status     VARCHAR(12) NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada','cancelada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_booking_user_class UNIQUE (user_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_classes_category  ON classes (category);
CREATE INDEX IF NOT EXISTS idx_classes_level     ON classes (level);
CREATE INDEX IF NOT EXISTS idx_classes_starts_at ON classes (starts_at);
CREATE INDEX IF NOT EXISTS idx_classes_status    ON classes (status);
CREATE INDEX IF NOT EXISTS idx_bookings_class    ON bookings (class_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user     ON bookings (user_id, status);
