<<<<<<< HEAD
# FIB HQ — Plataforma Web

Sistema interno de gestión para la división FIB. Todo en un solo proyecto Next.js.

---

## Instalación

```bash
npm install
cp .env.local.example .env.local
# Rellena las variables (ver secciones abajo)
npm run dev
```

Abre http://localhost:3000

---

## Primer acceso

El código **`FIB-CS-BOOTSTRAP`** está precargado con **2 usos** y rol `command_staff`.

1. Ve a `/login` → tab **Registrarse**
2. Usa el código `FIB-CS-BOOTSTRAP`
3. Después crea más códigos desde `/dashboard/admin`

---

## Supabase — Persistencia de Datos (RECOMENDADO)

Sin Supabase, todos los datos viven en RAM y **se pierden** en cada deploy o cold start de Netlify.

### Setup en 5 pasos

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan gratuito suficiente)
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/migrations.sql`
3. Ve a **Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
   - (opcional) `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (más permisos, nunca exponer en frontend)
4. Añade esas variables a tu `.env.local` (local) y a **Netlify → Site settings → Environment variables** (producción)
5. Redeploy

### Qué se persiste en Supabase

| Tabla | Descripción |
|---|---|
| `users` | Cuentas de usuario |
| `invites` | Códigos de invitación |
| `casos` | Expedientes e investigaciones |
| `tickets` | Sistema de tickets |
| `allanamientos` | Solicitudes de allanamiento |
| `operativos` | Operativos e informes |
| `chat_canales` | Canales de chat |
| `config_visual` | Configuración visual de la plataforma |

> **Nota sobre chat mensajes:** Los mensajes de chat siguen en memoria (para baja latencia). Si necesitas historial persistente de mensajes, agrega una tabla `chat_mensajes` en Supabase y adapta el handler.

---

## Google Sheets — Módulo Personal

El módulo `/personal` usa Google Sheets como base de datos de agentes.

### Configuración

1. Crea una Google Sheet y copia su ID desde la URL
2. Ve a [Google Cloud Console](https://console.cloud.google.com)
3. Crea una Service Account y descarga el `credentials.json`
4. Convierte el JSON a una sola línea: `cat credentials.json | jq -c .`
5. Rellena en `.env.local`:
   ```
   SPREADSHEET_ID=tu-id-aqui
   GOOGLE_CREDENTIALS={"type":"service_account",...}
   ```

---

## Deploy en Netlify

```bash
npm run build
```

Variables de entorno requeridas en Netlify:
- `JWT_SECRET`
- `JWT_SECRET_B64` (alternativa codificada en Base64)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` o `SUPABASE_SERVICE_ROLE_KEY_B64` (recomendado para backend)
- `REQUIRE_PERSISTENCE=1` (recomendado: evita fallback en memoria en producción)
- `SPREADSHEET_ID` + `GOOGLE_CREDENTIALS` (si usas Personal)
- `DISCORD_WEBHOOK_*` (opcional, para logs)

Webhooks recomendados:
- `DISCORD_WEBHOOK_IMPORTANTE` o `DISCORD_WEBHOOK_IMPORTANTE_B64`: canal para ascensos, descensos, sanciones y vetos.
- `DISCORD_WEBHOOK_LOGINS` / `DISCORD_WEBHOOK_KEYS` / `DISCORD_WEBHOOK_EXTRAS` (opcionales).

Para codificar en Base64 (PowerShell):
```powershell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("TU_VALOR_AQUI"))
```

---

## Arquitectura

```
src/
  app/
    api/          — Route handlers (Next.js API)
    dashboard/    — Páginas del dashboard (autenticadas)
    login/        — Página de login/registro
  lib/
    db.ts         — Users & invites (Supabase o in-memory)
    casos-db.ts   — Casos (Supabase o in-memory)
    tickets-db.ts — Tickets (Supabase o in-memory)
    allanamientos-db.ts — Allanamientos (Supabase o in-memory)
    operativos-db.ts    — Operativos e informes (Supabase o in-memory)
    chat-db.ts    — Chat canales (Supabase) + mensajes (in-memory)
    config-visual-db.ts — Config visual (Supabase o in-memory)
    supabase-map.ts     — Abstracción Map<K,V> sobre Supabase
    auth.ts       — JWT helpers
    client.ts     — Funciones cliente para llamar a la API
supabase/
  migrations.sql  — Schema completo para ejecutar en Supabase
```

---

## Roles

| Rol | Acceso |
|---|---|
| `command_staff` | Acceso total, admin, configuración |
| `supervisory` | Gestión de casos, tickets, allanamientos |
| `federal_agent` | Operativo, solo sus propios datos |
| `visitante` | Solo lectura básica |

---

## Cambios recientes

- ✅ **Supabase conectado** — Todos los módulos usan Supabase cuando está configurado
- ✅ **`textoMision`** — Campo nuevo en ConfigVisual para el texto de misión
- ✅ **Scroll inteligente** — Chat principal y allanamientos: auto-scroll solo si estás al final
- ✅ **JWT auto-redirect** — El layout detecta tokens expirados y redirige al login
- ✅ **Notificaciones** — Badge en la campana con tickets abiertos y allanamientos pendientes (polling 30s)
- ✅ **Módulo Operativos** — Página completa con editor de bloques, filtros y flujo de aprobación
=======
# nose012031
xd
>>>>>>> 85b7dbfd8c15205d05c7df4f7f83b2b7f7390f6a
