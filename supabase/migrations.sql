-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FIB Platform — Supabase Schema Migration                   ║
-- ║  Run this in your Supabase SQL Editor                       ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── Users ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  rol           TEXT NOT NULL DEFAULT 'federal_agent',
  "discordId"   TEXT,
  "agentNumber" TEXT,
  nombre        TEXT,
  callsign      TEXT,
  "createdAt"   TIMESTAMPTZ DEFAULT now(),
  activo        BOOLEAN DEFAULT true,
  vetado        BOOLEAN DEFAULT false,
  "vetoReason"  TEXT,
  "vetoAt"      TIMESTAMPTZ,
  "vetoBy"      TEXT,
  clases        JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS vetado BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "vetoReason" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "vetoAt" TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "vetoBy" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS clases JSONB DEFAULT '[]'::jsonb;

-- ── Invites ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invites (
  codigo       TEXT PRIMARY KEY,
  rol          TEXT NOT NULL,
  "discordId"  TEXT,
  "agentNumber" TEXT,
  nombre       TEXT,
  "creadoPor"  TEXT NOT NULL,
  "creadoEn"   TIMESTAMPTZ DEFAULT now(),
  "maxUsos"    INTEGER DEFAULT 1,
  usos         INTEGER DEFAULT 0,
  "usadoPor"   JSONB DEFAULT '[]'::jsonb
);

-- Normalize legacy schemas where usadoPor may exist as SQL array/text.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invites'
      AND column_name = 'usadoPor'
      AND udt_name <> 'jsonb'
  ) THEN
    ALTER TABLE invites
      ALTER COLUMN "usadoPor" TYPE JSONB
      USING to_jsonb("usadoPor");
  END IF;
END $$;

-- Insert bootstrap invite if not exists
INSERT INTO invites (codigo, rol, "creadoPor", "maxUsos", usos, "usadoPor", "creadoEn")
VALUES ('FIB-CS-BOOTSTRAP', 'command_staff', 'SYSTEM', 2, 0, '[]'::jsonb, now())
ON CONFLICT (codigo) DO NOTHING;

-- ── Casos ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS casos (
  id                TEXT PRIMARY KEY,
  "numeroCaso"      TEXT NOT NULL,
  titulo            TEXT NOT NULL,
  descripcion       TEXT DEFAULT '',
  tipo              TEXT DEFAULT '',
  estado            TEXT DEFAULT 'abierto',
  prioridad         TEXT DEFAULT 'media',
  unidad            TEXT DEFAULT '',
  "agenteLead"      TEXT DEFAULT '',
  "agentesAsignados" JSONB DEFAULT '[]'::jsonb,
  sospechosos       JSONB DEFAULT '[]'::jsonb,
  evidencias        JSONB DEFAULT '[]'::jsonb,
  notas             JSONB DEFAULT '[]'::jsonb,
  timeline          JSONB DEFAULT '[]'::jsonb,
  "creadoPor"       TEXT NOT NULL,
  "creadoEn"        TIMESTAMPTZ DEFAULT now(),
  "actualizadoEn"   TIMESTAMPTZ DEFAULT now(),
  "cerradoEn"       TIMESTAMPTZ,
  clasificacion     TEXT DEFAULT 'interno'
);

-- ── Tickets ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id              TEXT PRIMARY KEY,
  "numeroTicket"  TEXT NOT NULL,
  titulo          TEXT NOT NULL,
  descripcion     TEXT DEFAULT '',
  tipo            TEXT DEFAULT 'solicitud',
  estado          TEXT DEFAULT 'abierto',
  prioridad       TEXT DEFAULT 'media',
  "creadoPor"     TEXT NOT NULL,
  "asignadoA"     TEXT,
  comentarios     JSONB DEFAULT '[]'::jsonb,
  "creadoEn"      TIMESTAMPTZ DEFAULT now(),
  "actualizadoEn" TIMESTAMPTZ DEFAULT now(),
  "resueltoPor"   TEXT,
  "resueltoEn"    TIMESTAMPTZ,
  tags            JSONB DEFAULT '[]'::jsonb
);

-- ── Allanamientos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS allanamientos (
  id                    TEXT PRIMARY KEY,
  "numeroSolicitud"     TEXT NOT NULL,
  direccion             TEXT NOT NULL,
  motivacion            TEXT NOT NULL,
  descripcion           TEXT DEFAULT '',
  sospechoso            TEXT DEFAULT 'Sin identificar',
  "casoVinculado"       TEXT,
  estado                TEXT DEFAULT 'pendiente',
  "solicitadoPor"       TEXT NOT NULL,
  "nombreSolicitante"   TEXT NOT NULL,
  "callsignSolicitante" TEXT,
  unidad                TEXT DEFAULT 'General',
  "fechaSolicitud"      TIMESTAMPTZ DEFAULT now(),
  "fechaEjecucion"      TIMESTAMPTZ,
  firmas                JSONB DEFAULT '[]'::jsonb,
  "motivoDenegacion"    TEXT,
  observaciones         TEXT DEFAULT '',
  mensajes              JSONB DEFAULT '[]'::jsonb,
  "actualizadoEn"       TIMESTAMPTZ DEFAULT now()
);

-- ── Operativos ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operativos (
  id              TEXT PRIMARY KEY,
  tipo            TEXT DEFAULT 'operativo',
  titulo          TEXT NOT NULL,
  descripcion     TEXT DEFAULT '',
  contenido       TEXT DEFAULT '',
  bloques         JSONB DEFAULT '[]'::jsonb,
  estado          TEXT DEFAULT 'borrador',
  clasificacion   TEXT DEFAULT 'interno',
  unidad          TEXT DEFAULT 'General',
  archivos        JSONB DEFAULT '[]'::jsonb,
  media           JSONB DEFAULT '[]'::jsonb,
  imagenes        JSONB DEFAULT '[]'::jsonb,
  "creadoPor"     TEXT NOT NULL,
  "nombreAutor"   TEXT NOT NULL,
  "creadoEn"      TIMESTAMPTZ DEFAULT now(),
  "actualizadoEn" TIMESTAMPTZ DEFAULT now(),
  "aprobadoPor"   TEXT,
  "aprobadoEn"    TIMESTAMPTZ,
  tags            JSONB DEFAULT '[]'::jsonb
);

-- ── Chat Canales ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_canales (
  id              TEXT PRIMARY KEY,
  nombre          TEXT NOT NULL,
  descripcion     TEXT DEFAULT '',
  tipo            TEXT DEFAULT 'general',
  unidad          TEXT,
  participantes   JSONB DEFAULT '[]'::jsonb,
  acceso          JSONB DEFAULT '["*"]'::jsonb,
  "creadoEn"      TIMESTAMPTZ DEFAULT now(),
  icono           TEXT
);

-- Insert default channels
INSERT INTO chat_canales (id, nombre, descripcion, tipo, acceso, "creadoEn") VALUES
  ('general',     'general',      'Canal principal',                    'general',     '["*"]'::jsonb,                                                  now()),
  ('operaciones', 'operaciones',  'Coordinación operativa',             'general',     '["command_staff","supervisory","federal_agent"]'::jsonb,          now()),
  ('ert',         'ert',          'Canal ERT',                          'unidad',      '["*"]'::jsonb,                                                   now()),
  ('cirg',        'cirg',         'Canal CIRG',                         'unidad',      '["*"]'::jsonb,                                                   now()),
  ('rrhh',        'rrhh',         'Canal RRHH',                         'unidad',      '["*"]'::jsonb,                                                   now()),
  ('supervisory', 'supervisory',  'Command Staff y Supervisory',        'supervisory', '["command_staff","supervisory"]'::jsonb,                          now()),
  ('command',     'command-staff','Solo Command Staff',                  'comando',     '["command_staff"]'::jsonb,                                       now())
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS chat_messages (
  id         TEXT PRIMARY KEY,
  canal      TEXT NOT NULL,
  autor      TEXT NOT NULL,
  nombre     TEXT NOT NULL,
  callsign   TEXT,
  contenido  TEXT NOT NULL,
  fecha      TIMESTAMPTZ DEFAULT now(),
  tipo       TEXT DEFAULT 'texto',
  leido      JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_canal_fecha ON chat_messages (canal, fecha DESC);

CREATE TABLE IF NOT EXISTS chat_reads (
  canal        TEXT NOT NULL,
  username     TEXT NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (canal, username)
);

-- ── Config Visual ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config_visual (
  id                    TEXT PRIMARY KEY DEFAULT 'singleton',
  "nombreDivision"      TEXT DEFAULT 'Federal Investigation Bureau',
  "descripcionDivision" TEXT DEFAULT 'División de investigación federal.',
  "logoUrl"             TEXT DEFAULT 'https://i.imgur.com/EAimMhx.png',
  "colorPrimario"       TEXT DEFAULT '#1B6FFF',
  "colorSidebar"        TEXT DEFAULT '#101820',
  "colorAcento"         TEXT DEFAULT '#00C4FF',
  "fondoDashboardUrl"   TEXT DEFAULT '',
  "fondoHeroUrl"        TEXT DEFAULT '',
  "fondoOpacidad"       INTEGER DEFAULT 20,
  "bannerActivo"        BOOLEAN DEFAULT false,
  "bannerTexto"         TEXT DEFAULT '',
  "bannerColor"         TEXT DEFAULT 'blue',
  "modoOscuroDefault"   BOOLEAN DEFAULT true,
  "textoHero"           TEXT DEFAULT 'Federal Investigation Bureau',
  "textoSubhero"        TEXT DEFAULT 'Sistema centralizado de gestión operativa',
  "textoMision"         TEXT DEFAULT 'Proteger la integridad del estado de derecho.',
  "oposicionesInfo"     JSONB DEFAULT '{"titulo":"Oposiciones","descripcion":"Proceso de oposiciones para ingreso y asignacion de perfiles en la division.","datos":["Convocatoria abierta por periodos","Requiere cuenta activa","Un envio por usuario o IP"],"imagenes":["https://i.imgur.com/7NxeszI.png"],"googleFormId":"1HaC8ZxgE4dCHu57ZB9IhzGDoNsRmriDccGg3BD_kX94","formularioIntro":"Completa el formulario de forma simple y en un solo envio. Adjunta evidencia solo cuando se solicite.","formularioPasos":["Lee los requisitos","Completa datos personales","Revisa respuestas antes de enviar"]}'::jsonb,
  "comunicadosInfo"     JSONB DEFAULT '{"titulo":"Comunicados y Estado Operativo","descripcion":"Actualizaciones institucionales y estado de convocatorias.","items":[{"id":"com-1","estado":"activo","titulo":"Convocatoria de Oposiciones","detalle":"Se habilita periodo de inscripcion para nuevos aspirantes.","enlace":"","fecha":"2026-01-01T00:00:00.000Z"}]}'::jsonb,
  "websiteSettings"     JSONB DEFAULT '{"enableAnimations":true,"heroLogoSize":130,"heroImageOpacity":20,"heroGridOpacity":20,"heroImageFit":"cover","heroImagePosition":"center","pageMaxWidth":112,"sectionGap":28,"cardRadius":0,"cardBlur":0,"missionImageHeight":400,"oposicionesImageHeight":112}'::jsonb,
  "indraRecoveryUsedAt" TIMESTAMPTZ,
  "divisionesInfo"      JSONB DEFAULT '[{"nombre":"CIRG","descripcion":"Critical Incident Response Group","logoUrl":"https://i.imgur.com/QKAp6O1.png"},{"nombre":"ERT","descripcion":"Evidence Response Team","logoUrl":"https://i.imgur.com/IemqOQh.png"},{"nombre":"RRHH","descripcion":"Recursos Humanos","logoUrl":"https://i.imgur.com/z5NiemF.png"}]'::jsonb,
  "actualizadoPor"      TEXT DEFAULT 'SYSTEM',
  "actualizadoEn"       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE config_visual ADD COLUMN IF NOT EXISTS "oposicionesInfo" JSONB DEFAULT '{"titulo":"Oposiciones","descripcion":"Proceso de oposiciones para ingreso y asignacion de perfiles en la division.","datos":["Convocatoria abierta por periodos","Requiere cuenta activa","Un envio por usuario o IP"],"imagenes":["https://i.imgur.com/7NxeszI.png"],"googleFormId":"1HaC8ZxgE4dCHu57ZB9IhzGDoNsRmriDccGg3BD_kX94","formularioIntro":"Completa el formulario de forma simple y en un solo envio. Adjunta evidencia solo cuando se solicite.","formularioPasos":["Lee los requisitos","Completa datos personales","Revisa respuestas antes de enviar"]}'::jsonb;
ALTER TABLE config_visual ADD COLUMN IF NOT EXISTS "comunicadosInfo" JSONB DEFAULT '{"titulo":"Comunicados y Estado Operativo","descripcion":"Actualizaciones institucionales y estado de convocatorias.","items":[{"id":"com-1","estado":"activo","titulo":"Convocatoria de Oposiciones","detalle":"Se habilita periodo de inscripcion para nuevos aspirantes.","enlace":"","fecha":"2026-01-01T00:00:00.000Z"}]}'::jsonb;
ALTER TABLE config_visual ADD COLUMN IF NOT EXISTS "websiteSettings" JSONB DEFAULT '{"enableAnimations":true,"heroLogoSize":130,"heroImageOpacity":20,"heroGridOpacity":20,"heroImageFit":"cover","heroImagePosition":"center","pageMaxWidth":112,"sectionGap":28,"cardRadius":0,"cardBlur":0,"missionImageHeight":400,"oposicionesImageHeight":112}'::jsonb;
ALTER TABLE config_visual ADD COLUMN IF NOT EXISTS "indraRecoveryUsedAt" TIMESTAMPTZ;

INSERT INTO config_visual (id) VALUES ('singleton') ON CONFLICT (id) DO NOTHING;

-- ── Forms ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forms (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT DEFAULT '',
  active       BOOLEAN DEFAULT true,
  kind         TEXT DEFAULT 'general',
  branch       TEXT DEFAULT 'General',
  icon         TEXT DEFAULT 'ClipboardList',
  "acceptsResponses" BOOLEAN DEFAULT true,
  "deadlineAt" TIMESTAMPTZ,
  "timeLimitMinutes" INTEGER,
  "maxResponses" INTEGER,
  "allowedSubmitRoles" JSONB NOT NULL DEFAULT '["command_staff","supervisory","federal_agent"]'::jsonb,
  "allowedViewerKeys" JSONB NOT NULL DEFAULT '["command_staff","supervisory"]'::jsonb,
  theme        JSONB NOT NULL DEFAULT '{"mode":"glass","accent":"#4f7cff","surface":"#121a33","background":"#090f1f"}'::jsonb,
  "createdBy"  TEXT NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ DEFAULT now(),
  fields       JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE forms ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'general';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'General';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'ClipboardList';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS "acceptsResponses" BOOLEAN DEFAULT true;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS "deadlineAt" TIMESTAMPTZ;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS "timeLimitMinutes" INTEGER;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS "maxResponses" INTEGER;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS "allowedSubmitRoles" JSONB NOT NULL DEFAULT '["command_staff","supervisory","federal_agent"]'::jsonb;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS "allowedViewerKeys" JSONB NOT NULL DEFAULT '["command_staff","supervisory"]'::jsonb;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS theme JSONB NOT NULL DEFAULT '{"mode":"glass","accent":"#4f7cff","surface":"#121a33","background":"#090f1f"}'::jsonb;

INSERT INTO forms (id, title, description, active, "createdBy", fields)
VALUES (
  'frm-reporte-interno',
  'Reporte Interno',
  'Formulario para reportes operativos y administrativos.',
  true,
  'SYSTEM',
  '[{"id":"asunto","label":"Asunto","type":"text","required":true},{"id":"detalle","label":"Detalle","type":"textarea","required":true},{"id":"fecha_evento","label":"Fecha del evento","type":"date","required":false}]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS form_submissions (
  id          TEXT PRIMARY KEY,
  "formId"    TEXT NOT NULL,
  "byUser"    TEXT NOT NULL,
  "byRole"    TEXT NOT NULL,
  "byClasses" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  answers     JSONB NOT NULL DEFAULT '{}'::jsonb,
  state       TEXT NOT NULL DEFAULT 'active',
  ip          TEXT,
  "userAgent" TEXT
);

ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS "byClasses" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'active';

-- Restricciones para oposiciones: un envio activo por usuario o IP por formulario.
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_submissions_oposicion_user_once
ON form_submissions ("formId", "byUser")
WHERE state <> 'removed' AND "formId" IN (SELECT id FROM forms WHERE kind = 'oposicion');

CREATE UNIQUE INDEX IF NOT EXISTS idx_form_submissions_oposicion_ip_once
ON form_submissions ("formId", ip)
WHERE state <> 'removed' AND ip IS NOT NULL AND ip <> '' AND "formId" IN (SELECT id FROM forms WHERE kind = 'oposicion');

CREATE TABLE IF NOT EXISTS forms_config (
  id                  TEXT PRIMARY KEY,
  "responsesOpen"    BOOLEAN NOT NULL DEFAULT true,
  "allowedEditorRoles" JSONB NOT NULL DEFAULT '["command_staff","supervisory"]'::jsonb,
  "updatedAt"        TIMESTAMPTZ DEFAULT now(),
  "updatedBy"        TEXT DEFAULT 'SYSTEM'
);

INSERT INTO forms_config (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;

-- ── Carpetas ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carpetas (
  username    TEXT PRIMARY KEY,
  anotaciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  documentos  JSONB NOT NULL DEFAULT '[]'::jsonb,
  hilos       JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE carpetas ADD COLUMN IF NOT EXISTS hilos JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ── RLS Policies (disable for service role, enable if using anon) ─
-- If using SUPABASE_SERVICE_ROLE_KEY, RLS is bypassed automatically.
-- If using anon key, uncomment and adjust these policies:

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Service role full access" ON users USING (true);
-- (repeat for each table)

