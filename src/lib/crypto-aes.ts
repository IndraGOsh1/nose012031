import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { getSecret } from './secrets'

function keyFromSecret(raw: string) {
  if (!raw) throw new Error('Missing BOT_KEYS_AES256_KEY')
  const normalized = raw.trim()

  if (/^[A-Za-z0-9+/=]+$/.test(normalized) && normalized.length >= 43) {
    try {
      const b = Buffer.from(normalized, 'base64')
      if (b.length >= 32) return b.subarray(0, 32)
    } catch {}
  }

  return createHash('sha256').update(normalized).digest().subarray(0, 32)
}

function getAesKey() {
  const value = getSecret('BOT_KEYS_AES256_KEY') || getSecret('JWT_SECRET')
  return keyFromSecret(value)
}

export function encryptAes256Gcm(plainText: string): string {
  const key = getAesKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${iv.toString('base64')}.${encrypted.toString('base64')}.${tag.toString('base64')}`
}

export function decryptAes256Gcm(payload: string): string {
  const key = getAesKey()
  const [ver, ivB64, dataB64, tagB64] = String(payload || '').split('.')
  if (ver !== 'v1' || !ivB64 || !dataB64 || !tagB64) throw new Error('Invalid encrypted payload')

  const iv = Buffer.from(ivB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  return plain
}
