'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Send, Hash, MessageSquare, Plus, User, Lock,
  Star, Crown, Image as ImageIcon, ChevronDown,
  Music, VolumeX, Volume2, X
} from 'lucide-react'
import {
  getCanales, getMensajes, getStoredUser, enviarMensaje,
  crearDM, crearChatPrivado, subscribeStoredUser
} from '@/lib/client'
import { uiAlert, uiPrompt } from '@/lib/ui-dialog'
import '../carpeta/carpeta.css'

/* ── Helpers ───────────────────────────────────────────── */
function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffH = (now.getTime() - d.getTime()) / 3_600_000
  if (diffH < 24) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

function isImgUrl(s: string) {
  return /^https?:\/\//i.test(s) && /(imgur\.com|\.(png|jpg|jpeg|webp|gif)(\?.*)?)$/i.test(s)
}

function normalizeImgUrl(raw: string) {
  const s = String(raw || '').trim()
  const d = s.match(/^https?:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)(\.(png|jpg|jpeg|webp|gif))?/i)
  if (d) return `https://i.imgur.com/${d[1]}.${d[3] || 'png'}`
  const p = s.match(/^https?:\/\/(?:www\.)?imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]+)/i)
  if (p) return `https://i.imgur.com/${p[1]}.png`
  return s
}

function playPing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.start(); osc.stop(ctx.currentTime + 0.25)
  } catch { }
}

/* ── Canal button ──────────────────────────────────────── */
function CanalBtn({ c, active, user, onClick }: { c: any; active: boolean; user: any; onClick: () => void }) {
  const other = c.tipo === 'dm' ? (c.participantes?.find((p: string) => p !== user?.username) || c.id) : null
  const label = c.tipo === 'dm' ? other : c.nombre
  const unread = c.unread || 0
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-all"
      style={{
        background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
        borderRight: active ? '2px solid var(--fib-gold-dim)' : '2px solid transparent',
        color: active ? 'var(--fib-gold)' : 'var(--fib-text3)',
      }}>
      {c.tipo === 'dm' ? <User size={10} className="shrink-0" />
        : c.tipo === 'private' ? <Lock size={10} className="shrink-0" />
        : <Hash size={10} className="shrink-0" style={{ color: active ? 'var(--fib-gold)' : 'var(--fib-text4)' }} />}
      <span className="font-mono text-[10px] truncate flex-1" style={{ fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.5px' }}>
        {c.icono && `${c.icono} `}{label}
      </span>
      {unread > 0 && <span style={{ background: 'var(--fib-gold)', color: '#0A0800', fontFamily: 'Share Tech Mono, monospace', fontSize: 8, borderRadius: 999, padding: '1px 5px', fontWeight: 700 }}>{unread}</span>}
      {c.tipo === 'supervisory' && <Star size={9} style={{ color: 'var(--fib-gold-dim)', flexShrink: 0 }} />}
      {c.tipo === 'comando' && <Crown size={9} style={{ color: 'var(--fib-red)', flexShrink: 0 }} />}
    </button>
  )
}

/* ── Main component ────────────────────────────────────── */
export default function ChatPage() {
  const [user, setUser] = useState<any>(null)
  const [canalesData, setCanalesData] = useState<any>({ canales: [], totalDMUnread: 0, totalUnread: 0 })
  const [canalActivo, setCanalActivo] = useState('general')
  const [mensajes, setMensajes] = useState<any[]>([])
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [dmTarget, setDmTarget] = useState('')
  const [showDM, setShowDM] = useState(false)
  const [privateRoomName, setPrivateRoomName] = useState('')
  const [privateRoomUsers, setPrivateRoomUsers] = useState('')
  const [privateRoomDescription, setPrivateRoomDescription] = useState('')
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const [musicUrl, setMusicUrl] = useState('')
  const [musicMuted, setMusicMuted] = useState(false)
  const [showMusicInput, setShowMusicInput] = useState(false)
  const [musicInputVal, setMusicInputVal] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>()
  const lastMsgIdRef = useRef<string>('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isAtBottomRef = useRef(true)

  useEffect(() => {
    setUser(getStoredUser())
    const unsub = subscribeStoredUser(setUser)
    audioRef.current = new Audio()
    audioRef.current.loop = true
    audioRef.current.volume = 0.12
    return () => unsub()
  }, [])

  const loadCanales = useCallback(async () => {
    try { const d = await getCanales(); setCanalesData(d) } catch { }
  }, [])

  const loadMensajes = useCallback(async () => {
    try {
      const msgs = await getMensajes(canalActivo)
      if (!Array.isArray(msgs)) return
      setMensajes(prev => {
        const newLast = msgs[msgs.length - 1]?.id
        const prevLast = prev[prev.length - 1]?.id
        if (newLast && newLast !== prevLast && prev.length > 0) {
          const newItems = msgs.slice(prev.length)
          const u = JSON.parse(localStorage.getItem('fib_user') || '{}')
          const fromOthers = newItems.filter((m: any) => m.autor !== u.username && m.tipo !== 'sistema')
          if (fromOthers.length > 0) {
            playPing()
            if (!isAtBottomRef.current) setNewMsgCount(c => c + fromOthers.length)
          }
        }
        if (newLast) lastMsgIdRef.current = newLast
        return msgs
      })
    } catch { }
  }, [canalActivo])

  useEffect(() => {
    setMensajes([]); setNewMsgCount(0); lastMsgIdRef.current = ''; isAtBottomRef.current = true; setIsAtBottom(true)
    loadMensajes()
    clearInterval(pollRef.current)
    pollRef.current = setInterval(() => { loadMensajes(); loadCanales() }, 5000)
    return () => clearInterval(pollRef.current)
  }, [canalActivo])

  useEffect(() => { loadCanales() }, [])

  useEffect(() => {
    if (isAtBottomRef.current) { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setNewMsgCount(0) }
  }, [mensajes])

  const onScroll = useCallback(() => {
    const el = scrollRef.current; if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    isAtBottomRef.current = atBottom; setIsAtBottom(atBottom)
    if (atBottom) setNewMsgCount(0)
  }, [])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim() || sending) return
    setSendError(''); const txt = texto.trim(); setTexto(''); setSending(true)
    try {
      await enviarMensaje(canalActivo, txt)
      isAtBottomRef.current = true; setIsAtBottom(true); await loadMensajes()
    } catch (e: any) { setTexto(txt); setSendError(e?.message || 'No se pudo enviar') }
    finally { setSending(false); setTimeout(() => inputRef.current?.focus(), 50) }
  }

  async function abrirDM() {
    if (!dmTarget.trim()) return
    try { const r = await crearDM(dmTarget.trim()); await loadCanales(); setCanalActivo(r.id); setDmTarget(''); setShowDM(false) }
    catch (e: any) { uiAlert(e?.message || 'No se pudo abrir el DM', 'Chat') }
  }

  async function crearSalaPrivada() {
    const nombre = privateRoomName.trim(); if (!nombre) return
    const participantes = privateRoomUsers.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    try { const r = await crearChatPrivado(nombre, participantes, privateRoomDescription.trim()); await loadCanales(); setCanalActivo(r.id); setPrivateRoomName(''); setPrivateRoomUsers(''); setPrivateRoomDescription(''); setShowDM(false) }
    catch (e: any) { uiAlert(e?.message || 'No se pudo crear la sala', 'Chat') }
  }

  function activarMusica() {
    const url = musicInputVal.trim(); if (!url || !audioRef.current) return
    audioRef.current.src = url; audioRef.current.muted = musicMuted
    audioRef.current.play().catch(() => {}); setMusicUrl(url); setShowMusicInput(false)
  }

  function detenerMusica() {
    if (!audioRef.current) return
    audioRef.current.pause(); audioRef.current.src = ''; setMusicUrl('')
  }

  useEffect(() => { if (audioRef.current) audioRef.current.muted = musicMuted }, [musicMuted])

  const canales: any[] = canalesData.canales || []
  const canalInfo = canales.find((c: any) => c.id === canalActivo)
  const generales = canales.filter((c: any) => c.tipo === 'general')
  const unidades = canales.filter((c: any) => c.tipo === 'unidad')
  const privados = canales.filter((c: any) => ['supervisory', 'comando'].includes(c.tipo))
  const dms = canales.filter((c: any) => c.tipo === 'dm')
  const privateRooms = canales.filter((c: any) => c.tipo === 'private')

  const grouped = mensajes.reduce((acc: any[], msg: any, i: number) => {
    const prev = mensajes[i - 1]
    const sameAuthor = prev?.autor === msg.autor
    const closeTime = prev && (new Date(msg.fecha).getTime() - new Date(prev.fecha).getTime()) < 120_000
    if (sameAuthor && closeTime && msg.tipo !== 'sistema') {
      acc[acc.length - 1].msgs.push(msg)
    } else {
      acc.push({ ...msg, msgs: [msg] })
    }
    return acc
  }, [])

  const isSuperv = ['command_staff', 'supervisory'].includes(user?.rol)
  const isCS = user?.rol === 'command_staff'
  const canWrite = canalInfo && (
    canalInfo.tipo === 'dm' || canalInfo.tipo === 'private' ||
    (canalInfo.tipo === 'supervisory' && isSuperv) ||
    (canalInfo.tipo === 'comando' && isCS) ||
    ['general', 'unidad'].includes(canalInfo.tipo)
  )

  /* ── RENDER ────────────────────────────────────────────── */
  return (
    <div className="fib-panel-container" style={{ margin: '-1.5rem' }}>
      <div style={{ display: 'flex', height: 'calc(100vh - 4.5rem)', overflow: 'hidden' }}>

        {/* ── Sidebar ─────────────────────────────────────── */}
        <div style={{ width: 200, background: 'rgba(5,7,10,0.92)', borderRight: '1px solid var(--fib-border)', display: 'flex', flexDirection: 'column', flexShrink: 0, backdropFilter: 'blur(12px)' }}>

          {/* Sidebar header */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--fib-border-gold)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(8,11,15,0.6)' }}>
            <div>
              <p style={{ fontFamily: 'Oswald, sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: 3, color: 'var(--fib-gold)', textTransform: 'uppercase' }}>FIB</p>
              <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-text4)', letterSpacing: 1.5 }}>COMUNICACIONES</p>
            </div>
            <button onClick={() => setShowMusicInput(p => !p)} title="Música de fondo"
              style={{ color: musicUrl ? 'var(--fib-gold)' : 'var(--fib-text4)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Music size={11} />
            </button>
          </div>

          {/* Music panel */}
          {showMusicInput && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--fib-border)', background: 'rgba(201,168,76,0.03)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'var(--fib-text4)', letterSpacing: 2, textTransform: 'uppercase' }}>Música de fondo</p>
              <input className="fib-form-ctrl" style={{ fontSize: 10, padding: '5px 8px' }} placeholder="URL audio mp3/stream..."
                value={musicInputVal} onChange={e => setMusicInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && activarMusica()} />
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={activarMusica} className="fib-add-btn" style={{ flex: 1, fontSize: 9, padding: '4px 0' }}>▶ Play</button>
                {musicUrl && <>
                  <button onClick={() => setMusicMuted(p => !p)} className="fib-action-btn" style={{ padding: '4px 8px' }}>{musicMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}</button>
                  <button onClick={detenerMusica} className="fib-action-btn" style={{ padding: '4px 8px', color: 'var(--fib-red2)' }}>■</button>
                </>}
              </div>
              {musicUrl && <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>▶ {musicUrl.split('/').pop()}</p>}
            </div>
          )}

          {/* Channel list */}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
            {generales.length > 0 && <>
              <p style={{ padding: '4px 12px', fontFamily: 'Share Tech Mono, monospace', fontSize: 7, letterSpacing: 2, color: 'var(--fib-text4)', textTransform: 'uppercase' }}>General</p>
              {generales.map((c: any) => <CanalBtn key={c.id} c={c} active={canalActivo === c.id} user={user} onClick={() => setCanalActivo(c.id)} />)}
            </>}
            {unidades.length > 0 && <>
              <p style={{ padding: '8px 12px 4px', fontFamily: 'Share Tech Mono, monospace', fontSize: 7, letterSpacing: 2, color: 'var(--fib-text4)', textTransform: 'uppercase' }}>Unidades</p>
              {unidades.map((c: any) => <CanalBtn key={c.id} c={c} active={canalActivo === c.id} user={user} onClick={() => setCanalActivo(c.id)} />)}
            </>}
            {privados.length > 0 && <>
              <p style={{ padding: '8px 12px 4px', fontFamily: 'Share Tech Mono, monospace', fontSize: 7, letterSpacing: 2, color: 'var(--fib-text4)', textTransform: 'uppercase' }}>Restringido</p>
              {privados.map((c: any) => <CanalBtn key={c.id} c={c} active={canalActivo === c.id} user={user} onClick={() => setCanalActivo(c.id)} />)}
            </>}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px 4px' }}>
                <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, letterSpacing: 2, color: 'var(--fib-text4)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Privados
                  {canalesData.totalDMUnread > 0 && <span style={{ background: 'var(--fib-gold)', color: '#0A0800', borderRadius: 999, fontSize: 7, padding: '0 4px', fontWeight: 700 }}>{canalesData.totalDMUnread}</span>}
                </p>
                <button onClick={() => setShowDM(p => !p)} style={{ background: 'none', border: 'none', color: 'var(--fib-text4)', cursor: 'pointer', padding: 2 }}><Plus size={10} /></button>
              </div>
              {showDM && (
                <div style={{ padding: '0 10px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input className="fib-form-ctrl" style={{ fontSize: 10, padding: '4px 8px', flex: 1 }} placeholder="DM a @username"
                      value={dmTarget} onChange={e => setDmTarget(e.target.value)} onKeyDown={e => e.key === 'Enter' && abrirDM()} />
                    <button onClick={abrirDM} className="fib-action-btn" style={{ padding: '4px 8px', color: 'var(--fib-gold)' }}>→</button>
                  </div>
                  <div style={{ border: '1px solid var(--fib-border)', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input className="fib-form-ctrl" style={{ fontSize: 10, padding: '4px 8px' }} placeholder="Nombre canal privado"
                      value={privateRoomName} onChange={e => setPrivateRoomName(e.target.value)} />
                    <input className="fib-form-ctrl" style={{ fontSize: 10, padding: '4px 8px' }} placeholder="Participantes, separados por coma"
                      value={privateRoomUsers} onChange={e => setPrivateRoomUsers(e.target.value)} />
                    <input className="fib-form-ctrl" style={{ fontSize: 10, padding: '4px 8px' }} placeholder="Descripción (opcional)"
                      value={privateRoomDescription} onChange={e => setPrivateRoomDescription(e.target.value)} />
                    <button onClick={crearSalaPrivada} className="fib-add-btn" style={{ fontSize: 9, padding: '4px 0' }}>CREAR CANAL</button>
                  </div>
                </div>
              )}
              {privateRooms.map((c: any) => <CanalBtn key={c.id} c={c} active={canalActivo === c.id} user={user} onClick={() => setCanalActivo(c.id)} />)}
              {dms.map((c: any) => <CanalBtn key={c.id} c={c} active={canalActivo === c.id} user={user} onClick={() => setCanalActivo(c.id)} />)}
            </div>
          </div>
        </div>

        {/* ── Chat area ───────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'rgba(5,7,10,0.6)', backdropFilter: 'blur(6px)' }}>

          {/* Channel header */}
          <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderBottom: '1px solid var(--fib-border)', background: 'rgba(8,11,15,0.7)', flexShrink: 0 }}>
            {canalInfo?.tipo === 'dm' ? <User size={13} style={{ color: 'var(--fib-text3)' }} />
              : canalInfo?.tipo === 'private' ? <Lock size={13} style={{ color: 'var(--fib-text3)' }} />
              : <Hash size={13} style={{ color: 'var(--fib-gold-dim)' }} />}
            <p style={{ fontFamily: 'Oswald, sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: 2, color: 'var(--fib-text)', textTransform: 'uppercase' }}>
              {canalInfo?.icono && `${canalInfo.icono} `}
              {canalInfo?.tipo === 'dm'
                ? (canalInfo.participantes?.find((p: string) => p !== user?.username) || canalActivo)
                : (canalInfo?.nombre || canalActivo)}
            </p>
            {canalInfo?.descripcion && <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'var(--fib-text4)' }}>— {canalInfo.descripcion}</p>}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {(canalInfo?.tipo === 'supervisory' || canalInfo?.tipo === 'comando') && (
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-gold-dim)', border: '1px solid var(--fib-gold-dim)', padding: '2px 6px', textTransform: 'uppercase', letterSpacing: 1 }}>RESTRINGIDO</span>
              )}
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fib-green)', boxShadow: '0 0 6px rgba(46,204,113,0.5)' }} />
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-green)', letterSpacing: 2 }}>EN VIVO</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
            {mensajes.length === 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160 }}>
                <div style={{ textAlign: 'center', opacity: 0.3 }}>
                  <MessageSquare size={28} style={{ margin: '0 auto 8px', color: 'var(--fib-gold)' }} />
                  <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: 2, color: 'var(--fib-text4)', textTransform: 'uppercase' }}>Sin mensajes en este canal</p>
                </div>
              </div>
            )}
            {grouped.map((group: any, gi: number) => (
              <div key={`${group.id}-${gi}`}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '3px 8px',
                  borderRadius: 2,
                  transition: 'background .1s',
                  justifyContent: group.tipo === 'sistema' ? 'center' : 'flex-start',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                {group.tipo === 'sistema' ? (
                  <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'var(--fib-text4)', fontStyle: 'italic', padding: '2px 12px', border: '1px solid var(--fib-border)', background: 'rgba(5,7,10,0.5)' }}>
                    {group.msgs[0].contenido}
                  </p>
                ) : (
                  <>
                    {/* Avatar */}
                    <div style={{ width: 32, height: 32, flexShrink: 0, marginTop: 2, background: group.autor === user?.username ? 'rgba(201,168,76,0.15)' : 'rgba(26,37,52,0.7)', border: `1px solid ${group.autor === user?.username ? 'var(--fib-gold-dim)' : 'var(--fib-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald, sans-serif', fontSize: 12, fontWeight: 700, color: group.autor === user?.username ? 'var(--fib-gold)' : 'var(--fib-text3)', borderRadius: 2 }}>
                      {group.nombre?.[0]?.toUpperCase()}
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: group.autor === user?.username ? 'var(--fib-gold)' : 'var(--fib-text)' }}>
                          {group.nombre}
                        </span>
                        {group.callsign && (
                          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-gold-dim)', border: '1px solid var(--fib-gold-dim)', padding: '1px 5px', letterSpacing: 1 }}>[{group.callsign}]</span>
                        )}
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-text4)' }}>{fmtTime(group.fecha)}</span>
                      </div>
                      {group.msgs.map((m: any) => (
                        <div key={m.id} style={{ marginBottom: 1 }}>
                          {isImgUrl(m.contenido) ? (
                            <a href={normalizeImgUrl(m.contenido)} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 4 }}>
                              <img src={normalizeImgUrl(m.contenido)} alt="img"
                                style={{ maxWidth: 320, maxHeight: 200, objectFit: 'contain', border: '1px solid var(--fib-border)', display: 'block' }}
                                onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />
                            </a>
                          ) : (
                            <p style={{ fontSize: 13, color: 'var(--fib-text2)', lineHeight: 1.55, wordBreak: 'break-word' }}>{m.contenido}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Scroll-to-bottom button */}
          {!isAtBottom && (
            <div style={{ position: 'absolute', bottom: 80, right: 24, zIndex: 20 }}>
              <button onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); isAtBottomRef.current = true; setIsAtBottom(true); setNewMsgCount(0) }}
                className="fib-add-btn flex items-center gap-1.5" style={{ borderRadius: 3, fontSize: 10 }}>
                <ChevronDown size={11} />
                {newMsgCount > 0 ? `${newMsgCount} nuevo${newMsgCount > 1 ? 's' : ''}` : 'Bajar'}
              </button>
            </div>
          )}

          {/* Input bar */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--fib-border)', background: 'rgba(8,11,15,0.8)', flexShrink: 0, backdropFilter: 'blur(8px)' }}>
            {!canWrite ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(5,7,10,0.6)', border: '1px solid var(--fib-border)' }}>
                <Lock size={12} style={{ color: 'var(--fib-text4)' }} />
                <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'var(--fib-text4)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Sin acceso de escritura en este canal</p>
              </div>
            ) : (
              <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(11,15,20,0.9)', border: '1px solid var(--fib-border)', transition: 'border-color .15s' }}
                  onFocus={() => {}} >
                  <button type="button"
                    onClick={async () => { const url = await uiPrompt('URL de imagen:', { title: 'Insertar imagen', placeholder: 'https://i.imgur.com/...' }); if (url?.trim()) setTexto(url.trim()) }}
                    style={{ padding: '10px 11px', color: 'var(--fib-text4)', background: 'none', border: 'none', borderRight: '1px solid var(--fib-border)', cursor: 'pointer', flexShrink: 0 }}>
                    <ImageIcon size={13} />
                  </button>
                  <input ref={inputRef}
                    style={{ flex: 1, background: 'transparent', padding: '10px 12px', fontSize: 13, color: 'var(--fib-text)', outline: 'none', fontFamily: 'Barlow, sans-serif' }}
                    placeholder={`Mensaje en ${canalInfo?.tipo === 'dm' ? '@' : '#'}${canalInfo?.nombre || canalActivo}...`}
                    value={texto} onChange={e => setTexto(e.target.value)} disabled={sending} autoComplete="off" />
                  <button type="submit" disabled={sending || !texto.trim()}
                    style={{ padding: '10px 14px', color: texto.trim() ? 'var(--fib-gold)' : 'var(--fib-text4)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color .15s', flexShrink: 0 }}>
                    <Send size={14} />
                  </button>
                </div>
                {sendError && <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'var(--fib-red2)' }}>{sendError}</p>}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
