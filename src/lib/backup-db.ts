/**
 * backup-db.ts
 * Generates and persists a single random backup security code in Supabase.
 * The code is generated once on first use and never changes unless explicitly regenerated.
 */
import { createClient } from '@supabase/supabase-js'
import { getSecret } from './secrets'

// ── Allowed owner username (always has access without a code) ─────────────
export const BACKUP_OWNER_USERNAME = 'indra'

// ── Crypto-safe random code generator ────────────────────────────────────
function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = typeof crypto !== 'undefined' && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint8Array(40))
    : Array.from({ length: 40 }, () => Math.floor(Math.random() * 256))
  return Array.from(bytes)
    .map(b => chars[b % chars.length])
    .join('')
}

// ── In-memory singleton ───────────────────────────────────────────────────
let _cachedCode: string | null = null

let _client: ReturnType<typeof createClient> | null = null

function getClient() {
  if (_client) return _client
  const url = getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key =
    getSecret('SUPABASE_SERVICE_ROLE_KEY') ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  if (!url || !key) return null
  _client = createClient(url, key)
  return _client
}

const TABLE = 'backup_config'
const ROW_ID = 'backup_security_code'

/**
 * Returns the current backup security code.
 * Creates it in Supabase on first call; falls back to an in-process value if Supabase is unavailable.
 */
export async function getBackupCode(): Promise<string> {
  if (_cachedCode) return _cachedCode

  const client = getClient()

  if (client) {
    // Try to load from Supabase
    const { data } = await (client.from(TABLE) as any)
      .select('value')
      .eq('key', ROW_ID)
      .maybeSingle()

    if (data?.value) {
      _cachedCode = String(data.value)
      return _cachedCode
    }

    // First time: generate and persist
    const code = generateCode()
    await (client.from(TABLE) as any).insert({ key: ROW_ID, value: code }).select()
    _cachedCode = code
    return _cachedCode
  }

  // No Supabase: generate in-process (won't survive restarts, but functional)
  if (!_cachedCode) _cachedCode = generateCode()
  return _cachedCode
}

/**
 * Regenerates the backup security code.
 * Only callable by the backup owner.
 */
export async function regenerateBackupCode(): Promise<string> {
  const code = generateCode()
  _cachedCode = code

  const client = getClient()
  if (client) {
    await (client.from(TABLE) as any).upsert({ key: ROW_ID, value: code })
  }

  return code
}

/**
 * Checks whether a candidate code matches the stored backup security code.
 */
export async function isValidBackupCode(candidate: string): Promise<boolean> {
  const stored = await getBackupCode()
  return candidate === stored
}
