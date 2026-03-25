'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, FolderOpen, FileSearch, Ticket, MessageSquare, FolderArchive, Shield, Settings, LogOut, Menu, X, Bell, MapPin, Activity } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'
import { readJsonSafely } from '@/lib/client'

function isTokenExpired(token: string): boolean {
  try {
    const part = token.split('.')[1]
    if (!part) return true
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))
    return Date.now() / 1000 > payload.exp
  } catch { return true }
}

const NAV_GROUPS = [
  { label:'Principal', items:[
    { icon:LayoutDashboard, label:'Inicio',    href:'/dashboard' },
    { icon:Users,           label:'Personal',  href:'/dashboard/personal' },
  ]},
  { label:'Operaciones', items:[
    { icon:Shield,       label:'Operativos',    href:'/dashboard/operativos' },
    { icon:FolderOpen,   label:'Casos',         href:'/dashboard/casos' },
    { icon:FileSearch,   label:'Allanamientos', href:'/dashboard/allanamientos' },
    { icon:Ticket,       label:'Tickets',       href:'/dashboard/tickets' },
  ]},
  { label:'Personal', items:[
    { icon:MessageSquare, label:'Chat',    href:'/dashboard/chat' },
    { icon:FolderArchive, label:'Carpeta', href:'/dashboard/carpeta' },
  ]},
  { label:'Administración', items:[
    { icon:Shield,   label:'Admin',         href:'/dashboard/admin' },
    { icon:Settings, label:'Configuración', href:'/dashboard/config' },
  ]},
]

function canSeeNavItem(rol: string, href: string) {
  if (rol === 'command_staff') return true
  if (rol === 'supervisory') {
    if (href === '/dashboard/config') return false
    return true
  }
  if (rol === 'federal_agent') {
    if (href === '/dashboard/admin' || href === '/dashboard/config') return false
    return true
  }
  if (rol === 'visitante') {
    return href === '/dashboard' || href === '/dashboard/chat'
  }
  return false
}

const ROL_COLOR: Record<string,string> = {
  command_staff: 'text-red-400',
  supervisory:   'text-blue-400',
  federal_agent: 'text-green-400',
  visitante:     'text-gray-400',
}

const DEFAULT_DASHBOARD_BG = 'https://i.imgur.com/7NxeszI.png'
const HQ_LOCATION = 'LOS SANTOS, HQ'

function formatClock(date: Date) {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function getInitialLatency() {
  if (typeof window === 'undefined') return 24
  const saved = window.localStorage.getItem('fib_ui_latency')
  const parsed = Number(saved)
  return Number.isFinite(parsed) && parsed >= 10 && parsed <= 99 ? parsed : 24
}

function getUserInitials(user: any) {
  const source = String(user?.nombre || user?.username || 'FB').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [notifCount, setNotifCount] = useState(0)
  const [showNotifDot, setShowNotifDot] = useState(false)
  const [notifTargets, setNotifTargets] = useState({ tickets: 0, allanamientos: 0 })
  const [clock, setClock] = useState('--:--:--')
  const [latency, setLatency] = useState(() => getInitialLatency())
  const [contentReady, setContentReady] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { theme } = useTheme()
  const pollingRef = useRef<ReturnType<typeof setInterval>|null>(null)

  // Check token and load user from backend to keep session state consistent.
  // 'checking' starts true so zero dashboard HTML renders until auth is confirmed.
  useEffect(() => {
    let alive = true

    const clearAndRedirect = () => {
      localStorage.removeItem('fib_token')
      localStorage.removeItem('fib_user')
      window.location.href = '/login'
    }

    // Retry up to 3 times (1.5s apart) for transient server/network errors.
    // Only log out immediately if the server definitively rejects the token (401/403).
    const validate = async (attempt = 0): Promise<void> => {
      if (!alive) return

      const token = localStorage.getItem('fib_token')
      if (!token || isTokenExpired(token)) { clearAndRedirect(); return }

      let res: Response | null = null
      try {
        res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      } catch {
        // Network error — retry
        if (attempt < 3) { setTimeout(() => validate(attempt + 1), 1500); return }
        clearAndRedirect(); return
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { clearAndRedirect(); return }
        // 5xx / unexpected — retry
        if (attempt < 3) { setTimeout(() => validate(attempt + 1), 1500); return }
        clearAndRedirect(); return
      }

      const me = await readJsonSafely<any>(res, null)
      if (!me) {
        if (attempt < 3) { setTimeout(() => validate(attempt + 1), 1500); return }
        clearAndRedirect(); return
      }

      if (!alive) return
      localStorage.setItem('fib_user', JSON.stringify(me))
      setUser(me)
      setChecking(false)
    }

    validate()
    return () => { alive = false }
  }, [])

  // Periodic token validity check (every 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('fib_token')
      if (!token || isTokenExpired(token)) {
        localStorage.removeItem('fib_token')
        localStorage.removeItem('fib_user')
        window.location.href = '/login'
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Notification polling: check for pending tickets + allanamientos every 30s
  const pollNotifications = useCallback(async () => {
    const token = localStorage.getItem('fib_token')
    if (!token) return
    try {
      const [ticketsRes, allRes] = await Promise.all([
        fetch('/api/tickets?estado=abierto', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/allanamientos?estado=pendiente', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const tickets = ticketsRes.ok ? await readJsonSafely<any[]>(ticketsRes, []) : []
      const alls    = allRes.ok    ? await readJsonSafely<any[]>(allRes, [])    : []
      const count   = (Array.isArray(tickets) ? tickets.length : 0) + (Array.isArray(alls) ? alls.length : 0)
      setNotifTargets({ tickets: Array.isArray(tickets) ? tickets.length : 0, allanamientos: Array.isArray(alls) ? alls.length : 0 })
      setNotifCount(count)
      setShowNotifDot(count > 0)
    } catch { /* silent */ }
  }, [])

  const openNotifications = () => {
    if (notifTargets.allanamientos > 0) {
      router.push('/dashboard/allanamientos')
      return
    }
    router.push('/dashboard/tickets')
  }

  useEffect(() => {
    pollNotifications()
    pollingRef.current = setInterval(pollNotifications, 30_000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [pollNotifications])

  // Reset dot when visiting tickets or allanamientos
  useEffect(() => {
    if (pathname.includes('tickets') || pathname.includes('allanamientos')) {
      setShowNotifDot(false)
    }
  }, [pathname])

  useEffect(() => {
    setClock(formatClock(new Date()))

    const clockInterval = setInterval(() => setClock(formatClock(new Date())), 1000)
    const latencyInterval = setInterval(() => {
      const next = 18 + Math.floor(Math.random() * 11)
      setLatency(next)
      try { window.localStorage.setItem('fib_ui_latency', String(next)) } catch { /* ignore */ }
    }, 3000)
    const enterFrame = requestAnimationFrame(() => setContentReady(true))
    return () => {
      clearInterval(clockInterval)
      clearInterval(latencyInterval)
      cancelAnimationFrame(enterFrame)
    }
  }, [])

  const logout = async () => {
    localStorage.removeItem('fib_token')
    localStorage.removeItem('fib_user')
    // Clear the httpOnly session cookie server-side so middleware blocks immediately
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch { /* ignore */ }
    window.location.href = '/login'
  }

  const sidebarStyle = {
    backgroundColor: theme.sidebarColor,
    color: theme.sidebarTextColor,
  }
  const accentStyle = { color: theme.accentColor }
  const accentBg    = { backgroundColor: `${theme.accentColor}18`, borderColor: theme.accentColor }

  // Block ALL rendering — including nav/children HTML — until session is verified.
  // This prevents microsecond-window leaks to unauthenticated requests/scripts.
  if (checking) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 opacity-40">
          <div className="w-5 h-5 border border-accent-blue border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-[9px] tracking-widest uppercase text-tx-muted">Verificando sesión…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base flex">
      {open && <div className="fixed inset-0 bg-black/70 z-40 md:hidden" onClick={()=>setOpen(false)}/>}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-56 border-r border-bg-border z-50 flex flex-col transition-transform duration-200 ${open?'translate-x-0':'-translate-x-full md:translate-x-0'}`} style={sidebarStyle}>
        {/* Logo */}
        <div className="h-13 flex items-center gap-2.5 px-4 py-3 border-b border-white/10 shrink-0">
          <Image src={theme.logoUrl||'https://i.imgur.com/EAimMhx.png'} alt="Logo" width={22} height={22} className="opacity-80 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-xs font-semibold tracking-widest uppercase truncate" style={{color:theme.sidebarTextColor}}>{theme.divisionName?.split(' ').slice(0,2).join(' ')||'FIB HQ'}</p>
            <p className="font-mono text-[7px] tracking-widest opacity-50" style={{color:theme.sidebarTextColor}}>SISTEMA INTERNO</p>
          </div>
          <button onClick={()=>setOpen(false)} className="md:hidden opacity-60 hover:opacity-100 shrink-0"><X size={13}/></button>
        </div>

        {/* User */}
        {user && (
          <div className="px-3 py-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[10px] font-bold uppercase" style={{...accentBg, borderWidth:'1px', borderStyle:'solid'}}>
                <span style={accentStyle}>{user.username?.[0]}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[10px] font-semibold tracking-wider uppercase truncate" style={{color:theme.sidebarTextColor}}>{user.username}</p>
                <p className={`font-mono text-[7px] tracking-widest uppercase ${ROL_COLOR[user.rol]||''}`}>{user.rol?.replace('_',' ')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map(group => {
            const visibleItems = group.items.filter(item => canSeeNavItem(user?.rol, item.href))
            if (visibleItems.length === 0) return null
            return (
            <div key={group.label} className="mb-1">
              <p className="px-4 py-1.5 font-mono text-[7px] tracking-widest uppercase opacity-30" style={{color:theme.sidebarTextColor}}>{group.label}</p>
              {visibleItems.map(item => {
                const active = pathname===item.href||(item.href!=='/dashboard'&&pathname.startsWith(item.href))
                return (
                  <Link key={item.href} href={item.href} onClick={()=>setOpen(false)}>
                    <div className={`flex items-center gap-2.5 px-4 py-2 transition-all cursor-pointer`}
                      style={active ? { ...accentBg, borderRight:`2px solid ${theme.accentColor}` } : { color:theme.sidebarTextColor, opacity:0.65 }}>
                      <item.icon size={13} className="shrink-0" style={active?accentStyle:{}}/>
                      <span className="font-display text-[10px] tracking-wider uppercase" style={active?accentStyle:{}}>{item.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )})}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-1.5 opacity-50 hover:opacity-100 hover:text-red-400 transition-all" style={{color:theme.sidebarTextColor}}>
            <LogOut size={12}/>
            <span className="font-mono text-[9px] tracking-widest uppercase">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col md:ml-56">
        {/* Topbar */}
        <header className="sticky top-0 z-30 shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-md">
          <div className="grid grid-cols-1 items-center gap-3 px-4 py-3 md:grid-cols-[1fr_auto_1fr] md:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={()=>setOpen(true)} className="md:hidden text-white/70 hover:text-white transition-colors"><Menu size={17}/></button>
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-[0_0_25px_rgba(255,255,255,0.04)]">
                  <Image src={theme.logoUrl||'https://i.imgur.com/EAimMhx.png'} alt="FIB Logo" fill sizes="44px" className="object-contain p-2 opacity-90" />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.34em] text-white/95 sm:text-[11px]">
                    Federal Investigation Bureau
                  </p>
                  <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/45">
                    Internal Tactical Command
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5">
                <div className="text-center">
                  <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/45">System Time</p>
                  <p className="font-mono text-[18px] leading-none tracking-[0.18em] text-white">{clock}</p>
                </div>
                <div className="h-7 w-px bg-white/10" />
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-cyan-300/80" />
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/80">{HQ_LOCATION}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 sm:gap-3 md:justify-end">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.08)]">
                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-200 sm:text-[11px]">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  SYSTEM ONLINE ● {latency}ms
                </p>
              </div>

              <button onClick={openNotifications} className="relative rounded-2xl border border-white/10 bg-white/5 p-2.5 text-white/70 transition-colors hover:text-white" title={notifCount > 0 ? `${notifCount} pendiente(s)` : 'Sin pendientes'}>
                <Bell size={15}/>
                {showNotifDot && (
                  <span className="absolute -top-1 -right-1 min-w-[0.9rem] rounded-full bg-emerald-400 px-1 py-[1px] text-center text-[8px] font-bold leading-none text-black">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>

              {user && (
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 shadow-[0_0_24px_rgba(255,255,255,0.04)]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    {getUserInitials(user)}
                  </div>
                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90">
                      {user.nombre || user.username}
                    </p>
                    <div className="flex items-center gap-2">
                      <Activity size={11} className="text-emerald-400" />
                      <p className={`truncate font-mono text-[8px] uppercase tracking-[0.24em] ${ROL_COLOR[user.rol]||'text-white/60'}`}>
                        {String(user.rol || '').replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard background */}
        <div className="flex-1 relative overflow-auto">
          {(theme.dashboardBgUrl || DEFAULT_DASHBOARD_BG) && (
            <div className="absolute inset-0 pointer-events-none z-0">
              <img src={theme.dashboardBgUrl || DEFAULT_DASHBOARD_BG} alt="" className="w-full h-full object-cover opacity-[0.14]"/>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(17,24,39,0.18),transparent_30%),linear-gradient(180deg,rgba(4,7,12,0.38),rgba(4,7,12,0.92))]" />
            </div>
          )}

          <div className={`relative z-10 p-5 flex min-h-full flex-col gap-4 dashboard-enter ${contentReady ? 'dashboard-enter-ready' : ''}`}>
            {/* Welcome banner */}
            {theme.welcomeEnabled && theme.welcomeBanner && (
              <div className="px-4 py-3 border-l-2 text-sm" style={{borderColor:theme.accentColor, backgroundColor:`${theme.accentColor}10`}}>
                <p className="font-mono text-[9px] uppercase mb-0.5" style={{color:theme.accentColor}}>Aviso</p>
                <p className="text-tx-secondary text-xs">{theme.welcomeBanner}</p>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
