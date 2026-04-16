-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  FIB HQ — Supabase Update Script v3                             ║
-- ║  Run in Supabase SQL Editor (Settings → SQL Editor)             ║
-- ║  Safe to run multiple times — all changes are IF NOT EXISTS     ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════
-- 1. ALLANAMIENTOS — nuevas columnas
-- ═══════════════════════════════════════════════════════

-- Album de fotos (array de URLs)
ALTER TABLE allanamientos
  ADD COLUMN IF NOT EXISTS "albumFotos" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Caso vinculado (FK a casos.id)
ALTER TABLE allanamientos
  ADD COLUMN IF NOT EXISTS "casoVinculado" TEXT;

-- Número de solicitud puede ser NULL temporalmente durante la creación
ALTER TABLE allanamientos
  ALTER COLUMN "numeroSolicitud" DROP NOT NULL;

-- Índice para búsqueda rápida por caso vinculado
CREATE INDEX IF NOT EXISTS idx_allanamientos_caso_vinculado
  ON allanamientos ("casoVinculado");

-- Índice por estado para filtros del listado
CREATE INDEX IF NOT EXISTS idx_allanamientos_estado
  ON allanamientos (estado);

-- Índice por solicitante
CREATE INDEX IF NOT EXISTS idx_allanamientos_solicitado_por
  ON allanamientos ("solicitadoPor");

-- ═══════════════════════════════════════════════════════
-- 2. CASOS — columnas faltantes
-- ═══════════════════════════════════════════════════════

-- Agentes con acceso explícito al caso
ALTER TABLE casos
  ADD COLUMN IF NOT EXISTS "agentesAcceso" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Índice por estado
CREATE INDEX IF NOT EXISTS idx_casos_estado
  ON casos (estado);

-- Índice por agente lead
CREATE INDEX IF NOT EXISTS idx_casos_agente_lead
  ON casos ("agenteLead");

-- ═══════════════════════════════════════════════════════
-- 3. USERS — columnas de freeze/veto (seguridad)
-- ═══════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN IF NOT EXISTS congelado       BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "congeladoReason" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "congeladoAt"   TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "congeladoPor"  TEXT;

-- ═══════════════════════════════════════════════════════
-- 4. CARPETAS — columnas hilos, acceso, supervisor
-- ═══════════════════════════════════════════════════════

ALTER TABLE carpetas ADD COLUMN IF NOT EXISTS hilos      JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE carpetas ADD COLUMN IF NOT EXISTS acceso     JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE carpetas ADD COLUMN IF NOT EXISTS supervisor TEXT;

-- ═══════════════════════════════════════════════════════
-- 5. CONFIG VISUAL — columnas nuevas
-- ═══════════════════════════════════════════════════════

ALTER TABLE config_visual ADD COLUMN IF NOT EXISTS "faqInfo"
  JSONB DEFAULT '{"titulo":"Preguntas Frecuentes","descripcion":"","items":[]}'::jsonb;

ALTER TABLE config_visual ADD COLUMN IF NOT EXISTS "organigramaInfo"
  JSONB DEFAULT '{"titulo":"Organigrama","imageUrl":"","descripcion":"Estructura organizacional."}'::jsonb;

ALTER TABLE config_visual ADD COLUMN IF NOT EXISTS "indraRecoveryUsedAt" TIMESTAMPTZ;

ALTER TABLE config_visual ADD COLUMN IF NOT EXISTS "divisionesInfo"
  JSONB DEFAULT '[{"nombre":"CIRG","descripcion":"Critical Incident Response Group","logoUrl":"https://i.imgur.com/QKAp6O1.png"},{"nombre":"ERT","descripcion":"Evidence Response Team","logoUrl":"https://i.imgur.com/IemqOQh.png"},{"nombre":"RRHH","descripcion":"Recursos Humanos","logoUrl":"https://i.imgur.com/z5NiemF.png"}]'::jsonb;

-- ═══════════════════════════════════════════════════════
-- 6. CHAT — índices de rendimiento
-- ═══════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_chat_messages_canal_fecha
  ON chat_messages (canal, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_autor
  ON chat_messages (autor);

-- ═══════════════════════════════════════════════════════
-- 7. TICKETS — índices de rendimiento
-- ═══════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_tickets_estado
  ON tickets (estado);

CREATE INDEX IF NOT EXISTS idx_tickets_creado_por
  ON tickets ("creadoPor");

CREATE INDEX IF NOT EXISTS idx_tickets_asignado_a
  ON tickets ("asignadoA");

-- ═══════════════════════════════════════════════════════
-- 8. AUDIT LOGS — índices ya existentes (idempotente)
-- ═══════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp_desc
  ON audit_logs ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level  ON audit_logs (level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_source ON audit_logs (source);

-- ═══════════════════════════════════════════════════════
-- 9. VERIFICACIÓN — consulta de estado de tablas
-- ═══════════════════════════════════════════════════════
-- Ejecuta esto al final para confirmar que todo existe:

SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns c2
   WHERE c2.table_name = t.table_name AND c2.table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'users','invites','casos','tickets','allanamientos',
    'operativos','chat_canales','chat_messages','chat_reads',
    'config_visual','forms','form_submissions','carpetas',
    'audit_logs','bot_keys','backup_config'
  )
ORDER BY table_name;
