'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Hash, MessageSquare, Plus, User, Lock, Star, Crown, Image as ImageIcon, ChevronDown, Music, VolumeX, Volume2 } from 'lucide-react'
import { getCanales, getMensajes, enviarMensaje, crearDM, crearChatPrivado } from '@/lib/client'

function timeLabel(iso: string) {
  const d = new Date(iso), now = new Date()
  const diffH = (now.getTime() - d.getTime()) / 3600000
  return diffH < 24
    ? d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

function playPing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 880; gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(); osc.stop(ctx.currentTime + 0.3)
  } catch { }
}

export default function ChatPage() {
  const [user, setUser] = useState<any>(null)
  const [canalesData, setCanalesData] = useState<any>({ canales: [], totalDMUnread: 0, totalUnread: 0 })
  const [canalActivo, setCanalActivo] = useState('general')
  const [mensajes, setMensajes] = useState<any[]>([])
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)
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
  const [sendError, setSendError] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>()
  const lastMsgIdRef = useRef<string>('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isAtBottomRef = useRef(true)

  useEffect(() => {
    const u = localStorage.getItem('fib_user')
    if (u) setUser(JSON.parse(u))
    // init audio
    audioRef.current = new Audio()
    audioRef.current.loop = true
    audioRef.current.volume = 0.15
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
          // There are new messages
          const newItems = msgs.slice(prev.length)
          const u = JSON.parse(localStorage.getItem('fib_user') || '{}')
          const fromOthers = newItems.filter((m: any) => m.autor !== u.username && m.tipo !== 'sistema')
          if (fromOthers.length > 0) {
            playPing()
            if (!isAtBottomRef.current) {
              setNewMsgCount(c => c + fromOthers.length)
            }
          }
        }

        if (newLast) lastMsgIdRef.current = newLast
        return msgs
      })
    } catch { }
  }, [canalActivo])

  // Canal change — reset everything
  useEffect(() => {
    setMensajes([])
    setNewMsgCount(0)
    lastMsgIdRef.current = ''
    isAtBottomRef.current = true
    setIsAtBottom(true)

    loadMensajes()
    clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      loadMensajes()
      loadCanales()
    }, 5000)
    return () => clearInterval(pollRef.current)
  }, [canalActivo])

  useEffect(() => { loadCanales() }, [])

  // Auto-scroll only when pinned to bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setNewMsgCount(0)
    }
  }, [mensajes])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    isAtBottomRef.current = atBottom
    setIsAtBottom(atBottom)
    if (atBottom) setNewMsgCount(0)
  }, [])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    isAtBottomRef.current = true
    setIsAtBottom(true)
    setNewMsgCount(0)
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim() || sending) return
    setSendError('')
    const txt = texto.trim()
    setTexto('')
    setSending(true)
    try {
      await enviarMensaje(canalActivo, txt)
      isAtBottomRef.current = true
      setIsAtBottom(true)
      await loadMensajes()
    } catch (e: any) {
      setTexto(txt)
      setSendError(e?.message || 'No se pudo enviar el mensaje')
    }
    finally { setSending(false); setTimeout(() => inputRef.current?.focus(), 50) }
  }

  async function abrirDM() {
    if (!dmTarget.trim()) return
    try {
      const r = await crearDM(dmTarget.trim())
      await loadCanales()
      setCanalActivo(r.id)
      setDmTarget(''); setShowDM(false)
    } catch (e: any) { alert(e.message) }
  }

  async function crearSalaPrivada() {
    const nombre = privateRoomName.trim()
    if (!nombre) return
    const participantes = privateRoomUsers
      .split(/[,\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean)

    try {
      const r = await crearChatPrivado(nombre, participantes, privateRoomDescription.trim())
      await loadCanales()
      setCanalActivo(r.id)
      setPrivateRoomName('')
      setPrivateRoomUsers('')
      setPrivateRoomDescription('')
      setShowDM(false)
    } catch (e: any) {
      alert(e.message)
    }
  }

  function activarMusica() {
    const url = musicInputVal.trim()
    if (!url || !audioRef.current) return
    audioRef.current.src = url
    audioRef.current.muted = musicMuted
    audioRef.current.play().catch(() => { })
    setMusicUrl(url)
    setShowMusicInput(false)
  }

  function detenerMusica() {
    if (!audioRef.current) return
    audioRef.current.pause()
    audioRef.current.src = ''
    setMusicUrl('')
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = musicMuted
  }, [musicMuted])

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
    const closeTime = prev && (new Date(msg.fecha).getTime() - new Date(prev.fecha).getTime()) < 120000
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
    canalInfo.tipo === 'dm' ||
    canalInfo.tipo === 'private' ||
    (canalInfo.tipo === 'supervisory' && isSuperv) ||
    (canalInfo.tipo === 'comando' && isCS) ||
    ['general', 'unidad'].includes(canalInfo.tipo)
  )

  function CanalBtn({ c }: { c: any }) {
    const isActive = canalActivo === c.id
    const other = c.tipo === 'dm' ? (c.participantes?.find((p: string) => p !== user?.username) || c.id) : null
    const label = c.tipo === 'dm' ? other : (c.icono ? `${c.icono} ${c.nombre}` : c.nombre)
    const unread = c.unread || 0
    const isPrivate = c.tipo === 'private'
    return (
      <button onClick={() => setCanalActivo(c.id)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 transition-all text-left ${isActive ? 'bg-accent-blue/10 text-accent-blue' : 'text-tx-muted hover:text-tx-secondary hover:bg-bg-hover'}`}>
        {c.tipo === 'dm' ? <User size={10} className="shrink-0" /> : isPrivate ? <Lock size={10} className="shrink-0" /> : <Hash size={10} className="shrink-0" />}
        <span className="font-mono text-[10px] truncate flex-1">{label}</span>
        {unread > 0 && <span className="bg-red-500 text-white font-mono text-[8px] rounded-full px-1 min-w-[14px] text-center">{unread}</span>}
        {c.tipo === 'supervisory' && <Star size={9} className="shrink-0 text-accent-gold/60" />}
        {c.tipo === 'comando' && <Crown size={9} className="shrink-0 text-red-500/60" />}
      </button>
    )
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex border border-bg-border overflow-hidden relative">
      {/* Sidebar */}
      <div className="w-52 bg-bg-card border-r border-bg-border flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-bg-border flex items-center justify-between">
          <div>
            <p className="font-display text-xs font-semibold tracking-widest uppercase text-tx-primary">Comunicaciones</p>
            <p className="font-mono text-[7px] text-tx-muted">FIB HQ · En vivo</p>
          </div>
          <button onClick={() => setShowMusicInput(p => !p)} className={`transition-colors ${musicUrl ? 'text-accent-blue' : 'text-tx-dim hover:text-tx-muted'}`} title="Música de fondo">
            <Music size={11} />
          </button>
        </div>

        {/* Music panel */}
        {showMusicInput && (
          <div className="px-3 py-2 border-b border-bg-border bg-bg-surface flex flex-col gap-1.5">
            <p className="font-mono text-[7px] text-tx-muted uppercase tracking-widest">Música de fondo</p>
            <input
              className="input text-[10px] py-1"
              placeholder="URL audio (mp3, stream...)"
              value={musicInputVal}
              onChange={e => setMusicInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && activarMusica()}
            />
            <div className="flex gap-1">
              <button onClick={activarMusica} className="btn-primary text-[8px] py-1 px-2 flex-1 justify-center">▶ Play</button>
              {musicUrl && (
                <>
                  <button onClick={() => setMusicMuted(p => !p)} className="btn-ghost text-[8px] py-1 px-2" title={musicMuted ? 'Activar' : 'Silenciar'}>
                    {musicMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                  </button>
                  <button onClick={detenerMusica} className="btn-ghost text-[8px] py-1 px-2 text-red-400">■</button>
                </>
              )}
            </div>
            {musicUrl && <p className="font-mono text-[8px] text-accent-green truncate">▶ {musicUrl.split('/').pop()}</p>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {generales.length > 0 && <>
            <p className="px-3 py-1 font-mono text-[7px] tracking-widest uppercase text-tx-dim">General</p>
            {generales.map((c: any) => <CanalBtn key={c.id} c={c} />)}
          </>}
          {unidades.length > 0 && <>
            <p className="px-3 py-1 font-mono text-[7px] tracking-widest uppercase text-tx-dim mt-1">Unidades</p>
            {unidades.map((c: any) => <CanalBtn key={c.id} c={c} />)}
          </>}
          {privados.length > 0 && <>
            <p className="px-3 py-1 font-mono text-[7px] tracking-widest uppercase text-tx-dim mt-1">Restringido</p>
            {privados.map((c: any) => <CanalBtn key={c.id} c={c} />)}
          </>}
          <div className="mt-1">
            <div className="flex items-center justify-between px-3 py-1">
              <p className="font-mono text-[7px] tracking-widest uppercase text-tx-dim flex items-center gap-1">
                Privados
                {(canalesData.totalDMUnread > 0 || canalesData.totalUnread > 0) && (
                  <span className="bg-red-500 text-white font-mono text-[7px] rounded-full px-1">
                    {canalesData.totalDMUnread || canalesData.totalUnread}
                  </span>
                )}
              </p>
              <button onClick={() => setShowDM(p => !p)} className="text-tx-dim hover:text-tx-muted"><Plus size={10} /></button>
            </div>
            {showDM && (
              <div className="px-3 pb-2 flex flex-col gap-2">
                <div className="flex gap-1">
                  <input className="input text-[10px] py-1 flex-1" placeholder="DM por username"
                    value={dmTarget} onChange={e => setDmTarget(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && abrirDM()} />
                  <button onClick={abrirDM} className="text-accent-blue text-[10px] px-1.5 border border-accent-blue/40 hover:bg-accent-blue/10">→</button>
                </div>
                <div className="border border-bg-border bg-bg-surface p-2 flex flex-col gap-1.5">
                  <input
                    className="input text-[10px] py-1"
                    placeholder="Nombre del canal privado"
                    value={privateRoomName}
                    onChange={e => setPrivateRoomName(e.target.value)}
                  />
                  <input
                    className="input text-[10px] py-1"
                    placeholder="Participantes por username, separados por coma"
                    value={privateRoomUsers}
                    onChange={e => setPrivateRoomUsers(e.target.value)}
                  />
                  <input
                    className="input text-[10px] py-1"
                    placeholder="Descripción opcional"
                    value={privateRoomDescription}
                    onChange={e => setPrivateRoomDescription(e.target.value)}
                  />
                  <button onClick={crearSalaPrivada} className="btn-primary py-1 text-[9px] justify-center">Crear canal privado</button>
                </div>
              </div>
            )}
            {privateRooms.map((c: any) => <CanalBtn key={c.id} c={c} />)}
            {dms.map((c: any) => <CanalBtn key={c.id} c={c} />)}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <div className="h-11 flex items-center gap-2 px-4 border-b border-bg-border shrink-0 bg-bg-card">
          {canalInfo?.tipo === 'dm' ? <User size={13} className="text-tx-muted" /> : canalInfo?.tipo === 'private' ? <Lock size={13} className="text-tx-muted" /> : <Hash size={13} className="text-tx-muted" />}
          <p className="font-display text-xs font-semibold tracking-wider uppercase text-tx-primary">
            {canalInfo?.icono && <span className="mr-1">{canalInfo.icono}</span>}
            {canalInfo?.tipo === 'dm'
              ? (canalInfo.participantes?.find((p: string) => p !== user?.username) || canalActivo)
              : (canalInfo?.nombre || canalActivo)}
          </p>
          {canalInfo?.descripcion && <p className="font-mono text-[8px] text-tx-muted hidden sm:block">— {canalInfo.descripcion}</p>}
          <div className="ml-auto flex items-center gap-2">
            {(canalInfo?.tipo === 'supervisory' || canalInfo?.tipo === 'comando' || canalInfo?.tipo === 'private') && (
              <div className="flex items-center gap-1">
                <Lock size={10} className="text-tx-muted" />
                <span className="font-mono text-[7px] text-tx-muted uppercase">{canalInfo?.tipo === 'private' ? 'Participantes' : 'Restringido'}</span>
              </div>
            )}
            {canalInfo?.tipo === 'private' && Array.isArray(canalInfo.participantes) && (
              <span className="font-mono text-[7px] text-tx-dim hidden md:block">{canalInfo.participantes.join(', ')}</span>
            )}
            <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            <span className="font-mono text-[7px] text-accent-green tracking-widest hidden sm:block">EN VIVO</span>
          </div>
        </div>

        {/* Messages list */}
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-0.5">
          {mensajes.length === 0 && (
            <div className="flex-1 flex items-center justify-center min-h-40">
              <div className="text-center">
                <MessageSquare size={28} className="text-tx-muted opacity-20 mx-auto mb-2" />
                <p className="font-mono text-xs text-tx-muted tracking-widest uppercase">Sin mensajes</p>
                <p className="font-mono text-[8px] text-tx-dim mt-1">Sé el primero en escribir</p>
              </div>
            </div>
          )}
          {grouped.map((group: any, gi: number) => (
            <div key={`${group.id}-${gi}`}
              className={`flex gap-3 py-0.5 hover:bg-bg-hover/30 rounded px-2 -mx-2 transition-colors ${group.tipo === 'sistema' ? 'opacity-40 justify-center' : ''}`}>
              {group.tipo === 'sistema' ? (
                <p className="font-mono text-[9px] text-tx-muted italic py-1">{group.msgs[0].contenido}</p>
              ) : (
                <>
                  <div className="w-8 h-8 shrink-0 mt-0.5 bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center">
                    <span className="font-display text-[10px] font-bold text-accent-blue uppercase">{group.nombre?.[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                      <span className={`font-display text-xs font-semibold tracking-wider uppercase ${group.autor === user?.username ? 'text-accent-cyan' : 'text-tx-primary'}`}>
                        {group.nombre}
                      </span>
                      {group.callsign && (
                        <span className="font-mono text-[8px] text-accent-gold border border-accent-gold/30 px-1">[{group.callsign}]</span>
                      )}
                      <span className="font-mono text-[8px] text-tx-muted">{timeLabel(group.fecha)}</span>
                    </div>
                    {group.msgs.map((m: any) => (
                      <div key={m.id}>
                        {m.tipo === 'imagen'
                          ? <img src={m.contenido} alt="img" className="max-w-xs max-h-48 object-contain border border-bg-border mt-1 hover:opacity-90 transition-opacity cursor-pointer"
                            onError={e => (e.target as any).style.display = 'none'}
                            onClick={() => window.open(m.contenido, '_blank')} />
                          : <p className="text-sm text-tx-secondary leading-relaxed break-words">{m.contenido}</p>
                        }
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Floating "scroll to bottom" button */}
        {!isAtBottom && (
          <div className="absolute bottom-20 right-6 z-20">
            <button onClick={scrollToBottom}
              className="flex items-center gap-1.5 bg-accent-blue text-white font-mono text-[9px] uppercase px-3 py-1.5 shadow-lg hover:bg-accent-blue/90 transition-all">
              <ChevronDown size={11} />
              {newMsgCount > 0 ? `${newMsgCount} nuevo${newMsgCount > 1 ? 's' : ''}` : 'Bajar'}
            </button>
          </div>
        )}

        {/* Input bar */}
        <form onSubmit={enviar} className="px-4 py-3 border-t border-bg-border bg-bg-card shrink-0">
          {!canWrite ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-bg-border">
              <Lock size={12} className="text-tx-muted" />
              <p className="font-mono text-[9px] text-tx-muted uppercase tracking-widest">Sin acceso de escritura en este canal</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 bg-bg-surface border border-bg-border focus-within:border-accent-blue transition-colors">
                <button type="button"
                  onClick={() => { const url = prompt('URL de imagen:'); if (url?.trim()) setTexto(url.trim()) }}
                  className="px-2.5 py-2.5 text-tx-muted hover:text-accent-blue border-r border-bg-border transition-colors shrink-0">
                  <ImageIcon size={13} />
                </button>
                <input
                  ref={inputRef}
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm text-tx-primary placeholder-tx-muted focus:outline-none"
                  placeholder={`Mensaje${canalInfo?.nombre ? ` en ${['dm', 'private'].includes(canalInfo.tipo) ? '@' : '#'}${canalInfo.nombre}` : ''}...`}
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  disabled={sending}
                  autoComplete="off"
                />
                <button type="submit" disabled={sending || !texto.trim()}
                  className="px-3 py-2.5 text-tx-muted hover:text-accent-blue disabled:opacity-30 transition-colors shrink-0">
                  <Send size={14} />
                </button>
              </div>
              {sendError && <p className="font-mono text-[9px] text-red-400">{sendError}</p>}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
