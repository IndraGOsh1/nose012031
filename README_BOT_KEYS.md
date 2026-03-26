# Implementacion Bot Keys Seguras (Discord)

Este documento deja operativo el sistema de keys para bot con:
- API firmada por HMAC SHA-256
- Keys almacenadas con hash SHA-256
- Valor secreto guardado cifrado con AES-256-GCM
- Rotacion, revocacion, auditoria y reenvio de eventos a Discord

## Archivos principales

- src/app/api/bot/key/route.ts
- src/lib/bot-keys.ts
- src/lib/crypto-aes.ts
- src/lib/audit-log.ts
- src/app/api/logs/route.ts
- supabase/migrations.sql

## Requisitos de entorno

Agregar estas variables en local y en produccion:

- BOT_API_SIGNING_SECRET
  - Se usa para validar firmas HMAC de solicitudes del bot.
- BOT_KEYS_AES256_KEY
  - Clave de cifrado AES-256-GCM para guardar la key cifrada.
  - Recomendado: 32 bytes aleatorios (o base64 de 32 bytes).
- DISCORD_WEBHOOK_AUDIT (opcional, recomendado)
  - Destino principal para reenvio de logs de auditoria.

## Migracion de base de datos

Ejecutar en Supabase SQL Editor el archivo:

- supabase/migrations.sql

Esto crea tambien la tabla:

- bot_keys

Y sus indices:

- idx_bot_keys_created_at_desc
- idx_bot_keys_revoked

## Seguridad del endpoint bot

La ruta POST /api/bot/key exige:

- Header x-bot-ts: timestamp en milisegundos
- Header x-bot-signature: HMAC SHA-256 hexadecimal

Firma esperada:

- HMAC_SHA256(BOT_API_SIGNING_SECRET, x-bot-ts + "." + rawBody)

Ventana temporal:

- Maximo 5 minutos de drift

Rate limit:

- 60 requests por minuto por IP

## Operaciones disponibles

### 1) Emision de key (bot firmado)

POST /api/bot/key

Body JSON:

- action: issue
- operator: nombre del bot o servicio
- label: etiqueta de la key
- scope: alcance logico

Respuesta:

- keyId
- key (solo se devuelve en este momento)
- createdAt
- scope

### 2) Verificacion de key (bot firmado)

POST /api/bot/key

Body JSON:

- action: verify
- key: key en texto plano

Respuesta:

- ok
- keyId
- scope

### 3) Listado de keys (panel interno)

GET /api/bot/key

Permiso:

- command_staff

### 4) Revocacion de key (panel interno)

PATCH /api/bot/key

Body JSON:

- action: revoke
- id: keyId

Permiso:

- command_staff

## Auditoria y reenvio

Se registran eventos de seguridad para:

- emision de key
- revocacion
- verificacion valida/invalida
- firmas invalidas

Consulta de logs:

- GET /api/logs?limit=100

Reenvio a Discord:

- POST /api/logs
- body: { action: "resend", ids: ["audit-..."] }

## Recomendaciones de hardening

- Rotar BOT_API_SIGNING_SECRET cada 30-90 dias.
- Rotar BOT_KEYS_AES256_KEY con ventana de mantenimiento.
- Usar un canal Discord exclusivo para auditoria.
- No reutilizar keys de bot entre entornos (dev/staging/prod).
- Revocar keys inmediatamente ante sospecha de fuga.

## Checklist de despliegue

1. Ejecutar migracion en Supabase.
2. Cargar variables BOT_API_SIGNING_SECRET y BOT_KEYS_AES256_KEY.
3. Configurar DISCORD_WEBHOOK_AUDIT (recomendado).
4. Redeploy.
5. Probar issue y verify con firma valida.
6. Probar revoke desde cuenta command_staff.
7. Verificar que los eventos aparecen en /api/logs.
