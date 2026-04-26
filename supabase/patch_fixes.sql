-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FIB Platform — Patch de correcciones                      ║
-- ║  Ejecutar en Supabase SQL Editor                           ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Fix 1: Columna agentesAcceso faltante en tabla casos
-- (Sin esta columna, los casos pueden fallar al guardarse)
ALTER TABLE casos ADD COLUMN IF NOT EXISTS "agentesAcceso" JSONB DEFAULT '[]'::jsonb;

-- Fix 2: Asegurar defaults correctos en columnas JSONB de casos
ALTER TABLE casos ALTER COLUMN evidencias SET DEFAULT '[]'::jsonb;
ALTER TABLE casos ALTER COLUMN notas SET DEFAULT '[]'::jsonb;
ALTER TABLE casos ALTER COLUMN sospechosos SET DEFAULT '[]'::jsonb;
ALTER TABLE casos ALTER COLUMN timeline SET DEFAULT '[]'::jsonb;

-- Fix 3: Migrar casos existentes que tengan agentesAcceso null
UPDATE casos
SET "agentesAcceso" = COALESCE("agentesAsignados", '[]'::jsonb)
WHERE "agentesAcceso" IS NULL OR "agentesAcceso" = 'null'::jsonb;

-- Fix 4: Índices de rendimiento para casos
CREATE INDEX IF NOT EXISTS idx_casos_estado        ON casos (estado);
CREATE INDEX IF NOT EXISTS idx_casos_creado_en     ON casos ("creadoEn" DESC);
CREATE INDEX IF NOT EXISTS idx_casos_agente_lead   ON casos ("agenteLead");

-- Verificación — deberías ver la columna agentesAcceso en el resultado:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'casos'
  AND table_schema = 'public'
ORDER BY ordinal_position;
