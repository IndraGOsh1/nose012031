'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Lock, User, Key, AlertCircle, ChevronRight, ArrowLeft } from 'lucide-react'
import { login, register } from '@/lib/client'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode]       = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState({ username:'', password:'', codigo:'', nombre:'' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({...f,[k]:e.target.value}))

  useEffect(() => {
    let alive = true
    const checkExistingSession = async () => {
      const token = localStorage.getItem('fib_token')
      if (!token) return
      try {
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error('unauthorized')
        const me = await res.json()
        if (!alive) return
        localStorage.setItem('fib_user', JSON.stringify(me))
        window.location.href = '/dashboard'
      } catch {
        localStorage.removeItem('fib_token')
        localStorage.removeItem('fib_user')
      }
    }

    checkExistingSession()
    return () => { alive = false }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      localStorage.removeItem('fib_token')
      localStorage.removeItem('fib_user')
      const d = mode === 'login'
        ? await login(form.username, form.password)
        : await register(form.username, form.password, form.codigo, form.nombre)
      localStorage.setItem('fib_token', d.token)
      localStorage.setItem('fib_user',  JSON.stringify(d.usuario))
      window.location.href = '/dashboard'
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen bg-bg-base flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-15" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%231A2535' fill-opacity='1'%3E%3Cpath d='M0 0h1v40H0zm39 0h1v40h-1zM0 0v1h40V0zm0 39v1h40v-1z'/%3E%3C/g%3E%3C/svg%3E\")"}} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-accent-blue/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        <Link href="/" className="inline-flex items-center gap-1.5 text-tx-muted hover:text-tx-secondary font-mono text-[9px] tracking-widest uppercase mb-7 transition-colors">
          <ArrowLeft size={10} />Volver
        </Link>

        <div className="card overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-accent-blue to-transparent" />

          <div className="p-7 pb-5 flex flex-col items-center gap-3 border-b border-bg-border">
            <div className="relative">
              <div className="absolute inset-0 bg-accent-blue/10 blur-xl rounded-full" />
              <Image src="https://i.imgur.com/EAimMhx.png" alt="FIB" width={52} height={52} className="relative opacity-90" />
            </div>
            <div className="text-center">
              <p className="font-mono text-[9px] text-accent-blue tracking-[0.3em] uppercase mb-1">Federal Investigation Bureau</p>
              <h1 className="font-display text-xl font-semibold tracking-widest uppercase text-tx-primary">
                {mode === 'login' ? 'Autenticación' : 'Crear Cuenta'}
              </h1>
              <p className="font-mono text-[8px] text-tx-muted mt-1 tracking-widest">HQ SECURE ACCESS</p>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b border-bg-border">
            {(['login','register'] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                className={`py-2.5 font-mono text-[9px] tracking-widest uppercase transition-all ${
                  mode===m ? 'bg-accent-blue/10 text-accent-blue border-b-2 border-accent-blue' : 'text-tx-muted hover:text-tx-secondary'
                }`}>
                {m==='login' ? 'Ingresar' : 'Registrarse'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="p-6 flex flex-col gap-3.5">
            {mode === 'register' && (
              <div>
                <label className="label">Nombre completo (IC)</label>
                <div className="relative">
                  <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-muted" />
                  <input className="input pl-8" value={form.nombre} onChange={set('nombre')} placeholder="Juan García" />
                </div>
              </div>
            )}
            <div>
              <label className="label">Usuario</label>
              <div className="relative">
                <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-muted" />
                <input className="input pl-8" value={form.username} onChange={set('username')} placeholder="ID del agente" required autoComplete="off" />
              </div>
            </div>
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-muted" />
                <input className="input pl-8" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
              </div>
            </div>
            {mode === 'register' && (
              <div>
                <label className="label">Código de Invitación</label>
                <div className="relative">
                  <Key size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-muted" />
                  <input className="input pl-8" value={form.codigo} onChange={set('codigo')} placeholder="XXXXXXXX" required />
                </div>
                <p className="font-mono text-[8px] text-tx-muted mt-1.5">Emitido por Command Staff. Un solo uso.</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-red-950/30 border border-red-900/50 text-red-400">
                <AlertCircle size={12} className="shrink-0" />
                <span className="font-mono text-xs">{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1">
              {loading ? <span className="animate-pulse font-mono text-xs">Verificando...</span> : (
                <><Lock size={12} />{mode==='login'?'Acceder':'Crear Cuenta'}<ChevronRight size={12} /></>
              )}
            </button>
          </form>

          <div className="px-6 pb-5 text-center border-t border-bg-border pt-3">
            <p className="font-mono text-[8px] text-tx-muted tracking-widest">ACCESO MONITOREADO — ACTIVIDAD REGISTRADA</p>
          </div>
        </div>
      </div>
    </main>
  )
}
