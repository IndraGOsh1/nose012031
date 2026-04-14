import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ mensaje: '✅ Sesión cerrada' })
  // Expire the httpOnly session cookie immediately
  res.cookies.set('fib_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return res
}
