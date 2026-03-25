import { NextRequest } from 'next/server'

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export function getRequestIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for') || ''
  if (xf) return xf.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

export function rateLimit(opts: {
  key: string
  max: number
  windowMs: number
}): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now()
  const current = buckets.get(opts.key)

  if (!current || current.resetAt <= now) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs })
    return { ok: true, remaining: Math.max(opts.max - 1, 0), retryAfterSec: Math.ceil(opts.windowMs / 1000) }
  }

  current.count += 1
  buckets.set(opts.key, current)

  const remaining = Math.max(opts.max - current.count, 0)
  const retryAfterSec = Math.max(Math.ceil((current.resetAt - now) / 1000), 1)
  return { ok: current.count <= opts.max, remaining, retryAfterSec }
}

export function isStrongEnoughPassword(password: string): boolean {
  if (!password || password.length < 8) return false
  const hasLetter = /[A-Za-z]/.test(password)
  const hasNumber = /\d/.test(password)
  return hasLetter && hasNumber
}
