import { NextRequest, NextResponse } from 'next/server'

// ── JWT secret resolution (Edge-compatible, no Buffer) ──────────────────────
function getJwtSecret(): string {
  const direct = process.env.JWT_SECRET
  if (direct?.trim()) return direct.trim()

  const b64 = process.env.JWT_SECRET_B64
  if (b64?.trim()) {
    try { return atob(b64.trim()) } catch { /* ignore */ }
  }

  // Dev fallback — same constant used in auth.ts
  return process.env.NODE_ENV === 'production' ? '' : 'fib-dev-local-only'
}

// ── HS256 verification using Web Crypto (available in Edge) ─────────────────
async function verifyHS256(token: string, secret: string): Promise<boolean> {
  if (!secret) return false
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const [hB64, pB64, sB64] = parts

    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify'],
    )

    const toBase64 = (s: string) => {
      const padded = s.replace(/-/g, '+').replace(/_/g, '/')
      return padded + '='.repeat((4 - (padded.length % 4)) % 4)
    }
    const sigBytes = Uint8Array.from(atob(toBase64(sB64)), (c) => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(`${hB64}.${pB64}`))
    if (!valid) return false

    // Check expiry
    const payload = JSON.parse(atob(toBase64(pB64)))
    if (payload.exp && Date.now() / 1000 > payload.exp) return false

    return true
  } catch {
    return false
  }
}

// ── Proxy entry point (Next.js 16+ — replaces middleware) ───────────────────
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect /dashboard/* routes
  if (!pathname.startsWith('/dashboard')) return NextResponse.next()

  const sessionToken = req.cookies.get('fib_session')?.value

  const redirectToLogin = (clearCookie = false) => {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    const res = NextResponse.redirect(url)
    if (clearCookie) res.cookies.set('fib_session', '', { maxAge: 0, path: '/' })
    return res
  }

  if (!sessionToken) return redirectToLogin()

  const secret = getJwtSecret()

  // In production without a configured secret, fail closed (deny all)
  if (!secret) return redirectToLogin()

  const valid = await verifyHS256(sessionToken, secret)
  if (!valid) return redirectToLogin(true)

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
