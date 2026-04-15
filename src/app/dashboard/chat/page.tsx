'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Hash, MessageSquare, Plus, User, Lock, Star, Crown, Image as ImageIcon, ChevronDown, Music, VolumeX, Volume2, Wifi } from 'lucide-react'
import { getCanales, getMensajes, getStoredUser, enviarMensaje, crearDM, crearChatPrivado, subscribeStoredUser } from '@/lib/client'
import { uiAlert, uiPrompt } from '@/lib/ui-dialog'

function timeLabel(iso: string) {
  const d = new Date(iso), now = new Date()
  const diffH = (now.getTime() - d.getTime()) / 3600000
  return diffH < 24
    ? d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

function fullTime(iso: string) {
  return new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
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

const ROL_ACCENT: Record<string, string> = {
  command_staff: '#ef4444',
  supervisory:   '#1B6FFF',
  federal_agent: '#2ECC71',
  visitante:     '#8799AE',
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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isAtBottomRef = useRef(true)

  useEffect(() => {
    setUser(getStoredUser())
    const unsubscribe = subscribeStoredUser(setUser)
    audioRef.current = new Audio()
    audioRef.current.loop = true
    audioRef.current.volume = 0.15
    return () => unsubscribe()
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
        return msgs
      })
    } catch { }
  }, [canalActivo])

  useEffect(() => {
    setMensajes([])
    setNewMsgCount(0)
    isAtBottomRef.current = true
    setIsAtBottom(true)
    loadMensajes()
    clearInterval(pollRef.current)
    pollRef.current = setInterval(() => { loadMensajes(); loadCanales() }, 5000)
    return () => clearInterval(pollRef.current)
  }, [canalActivo])

  useEffect(() => { loadCanales() }, [])

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
    } catch (e: any) { uiAlert(e?.message || 'No se pudo abrir el DM', 'Chat') }
  }

  async function crearSalaPrivada() {
    const nombre = privateRoomName.trim()
    if (!nombre) return
    const participantes = privateRoomUsers.split(/[,\n]/).map((entry) => entry.trim()).filter(Boolean)
    try {
      const r = await crearChatPrivado(nombre, participantes, privateRoomDescription.trim())
      await loadCanales()
      setCanalActivo(r.id)
      setPrivateRoomName(''); setPrivateRoomUsers(''); setPrivateRoomDescription('')
      setShowDM(false)
    } catch (e: any) { uiAlert(e?.message || 'No se pudo crear la sala privada', 'Chat') }
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
        className={`w-full flex items-center gap-2 px-3 py-1.5 transition-all text-left group border-l-2 ${
          isActive
            ? 'bg-accent-blue/12 text-accent-blue border-accent-blue pl-[10px]'
            : 'text-tx-muted hover:text-tx-secondary hover:bg-bg-hover border-transparent pl-[10px]'
        }`}>
        <span className={`shrink-0 transition-colors ${isActive ? 'text-accent-blue' : 'text-tx-dim group-hover:text-tx-muted'}`}>
          {c.tipo === 'dm' ? <User size={11} /> : isPrivate ? <Lock size={11} /> : <Hash size={11} />}
        </span>
        <span className="font-mono text-[11px] truncate flex-1">{label}</span>
        {unread > 0 && (
          <span className="bg-red-500 text-white font-bold text-[8px] rounded-full px-1.5 py-px min-w-[18px] text-center leading-none">{unread}</span>
        )}
        {c.tipo === 'supervisory' && <Star size={9} className="shrink-0 text-accent-gold/70" />}
        {c.tipo === 'comando' && <Crown size={9} className="shrink-0 text-red-400/70" />}
      </button>
    )
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex border border-bg-border overflow-hidden relative">
      {/* Sidebar */}
      <div className="w-56 bg-bg-surface border-r border-bg-border flex flex-col shrink-0">
        <div className="px-3 py-2.5 border-b border-bg-border flex items-center justify-between bg-bg-card">
          <div>
            <p className="font-display text-[11px] font-semibold tracking-widest uppercase text-tx-primary">Comunicaciones</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              <p className="font-mono text-[8px] text-tx-muted">FIB HQ · EN VIVO</p>
            </div>
          </div>
          <button onClick={() => setShowMusicInput(p => !p)}
            className={`p-1.5 transition-colors ${musicUrl ? 'text-accent-blue bg-accent-blue/10' : 'text-tx-dim hover:text-tx-muted hover:bg-bg-hover'}`}
            title="Música de fondo">
            <Music size={11} />
          </button>
        </div>

        {showMusicInput && (
          <div className="px-3 py-2.5 border-b border-bg-border bg-bg-base flex flex-col gap-2">
            <p className="font-mono text-[8px] text-accent-blue uppercase tracking-widest">♪ Música de fondo</p>
            <input className="input text-[11px] py-1.5" placeholder="URL audio (mp3, stream...)" value={musicInputVal}
              onChange={e => setMusicInputVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && activarMusica()} />
            <div className="flex gap-1">
              <button onClick={activarMusica} className="btn-primary text-[9px] py-1 px-2 flex-1 justify-center">▶ Play</button>
              {musicUrl && (
                <>
                  <button onClick={() => setMusicMuted(p => !p)} className="btn-ghost text-[9px] py-1 px-2">
                    {musicMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                  </button>
                  <button onClick={detenerMusica} className="btn-ghost text-[9px] py-1 px-2 text-red-400">■</button>
                </>
              )}
            </div>
            {musicUrl && <p className="font-mono text-[9px] text-accent-green truncate">▶ {musicUrl.split('/').pop()}</p>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {generales.length > 0 && <>
            <p className="px-3 pt-2 pb-1 font-mono text-[8px] tracking-widest uppercase text-tx-dim font-semibold">General</p>
            {generales.map((c: any) => <CanalBtn key={c.id} c={c} />)}
          </>}
          {unidades.length > 0 && <>
            <p className="px-3 pt-2 pb-1 font-mono text-[8px] tracking-widest uppercase text-tx-dim font-semibold">Unidades</p>
            {unidades.map((c: any) => <CanalBtn key={c.id} c={c} />)}
          </>}
          {privados.length > 0 && <>
            <p className="px-3 pt-2 pb-1 font-mono text-[8px] tracking-widest uppercase text-tx-dim font-semibold flex items-center gap-1"><Lock size={8} /> Restringido</p>
            {privados.map((c: any) => <CanalBtn key={c.id} c={c} />)}
          </>}
          <div className="mt-1">
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <p className="font-mono text-[8px] tracking-widest uppercase text-tx-dim font-semibold flex items-center gap-1">
                Privados
                {(canalesData.totalDMUnread > 0 || canalesData.totalUnread > 0) && (
                  <span className="bg-red-500 text-white font-bold text-[7px] rounded-full px-1 ml-1">
                    {canalesData.totalDMUnread || canalesData.totalUnread}
                  </span>
                )}
              </p>
              <button onClick={() => setShowDM(p => !p)}
                className="w-5 h-5 flex items-center justify-center text-tx-dim hover:text-accent-blue hover:bg-accent-blue/10 transition-colors">
                <Plus size={11} />
              </button>
            </div>
            {showDM && (
              <div className="mx-2 mb-2 p-2.5 bg-bg-base border border-bg-border flex flex-col gap-2">
                <div className="flex gap-1">
                  <input className="input text-[11px] py-1.5 flex-1" placeholder="DM por username"
                    value={dmTarget} onChange={e => setDmTarget(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && abrirDM()} />
                  <button onClick={abrirDM} className="text-accent-blue text-[11px] px-2 border border-accent-blue/40 hover:bg-accent-blue/10 transition-colors">→</button>
                </div>
                <div className="border-t border-bg-border pt-2 flex flex-col gap-1.5">
                  <p className="font-mono text-[8px] text-tx-dim uppercase">Nueva sala privada</p>
                  <input className="input text-[11px] py-1.5" placeholder="Nombre del canal" value={privateRoomName} onChange={e => setPrivateRoomName(e.target.value)} />
                  <input className="input text-[11px] py-1.5" placeholder="Participantes (separados por coma)" value={privateRoomUsers} onChange={e => setPrivateRoomUsers(e.target.value)} />
                  <input className="input text-[11px] py-1.5" placeholder="Descripción (opcional)" value={privateRoomDescription} onChange={e => setPrivateRoomDescription(e.target.value)} />
                  <button onClick={crearSalaPrivada} className="btn-primary py-1 text-[9px] justify-center w-full">Crear</button>
                </div>
              </div>
            )}
            {privateRooms.map((c: any) => <CanalBtn key={c.id} c={c} />)}
            {dms.map((c: any) => <CanalBtn key={c.id} c={c} />)}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-base">
        {/* Header */}
        <div className="h-12 flex items-center gap-3 px-5 border-b border-bg-border shrink-0 bg-bg-card">
          <span className="text-tx-muted">
            {canalInfo?.tipo === 'dm' ? <User size={14} /> : canalInfo?.tipo === 'private' ? <Lock size={14} /> : <Hash size={14} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary leading-none">
              {canalInfo?.icono && <span className="mr-1">{canalInfo.icono}</span>}
              {canalInfo?.tipo === 'dm'
                ? (canalInfo.participantes?.find((p: string) => p !== user?.username) || canalActivo)
                : (canalInfo?.nombre || canalActivo)}
            </p>
            {canalInfo?.descripcion && <p className="font-mono text-[9px] text-tx-muted mt-0.5 truncate">{canalInfo.descripcion}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {(canalInfo?.tipo === 'supervisory' || canalInfo?.tipo === 'comando' || canalInfo?.tipo === 'private') && (
              <div className="flex items-center gap-1.5 bg-bg-surface border border-bg-border px-2 py-1">
                <Lock size={9} className="text-tx-muted" />
                <span className="font-mono text-[8px] text-tx-muted uppercase">{canalInfo?.tipo === 'private' ? 'Privado' : 'Restringido'}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Wifi size={11} className="text-accent-green" />
              <span className="font-mono text-[8px] text-accent-green tracking-widest hidden sm:block">EN VIVO</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-0.5">
          {mensajes.length === 0 && (
            <div className="flex-1 flex items-center justify-center min-h-40">
              <div className="text-center">
                <MessageSquare size={32} className="text-tx-dim opacity-20 mx-auto mb-3" />
                <p className="font-mono text-xs text-tx-muted tracking-widest uppercase">Canal vacío</p>
                <p className="font-mono text-[9px] text-tx-dim mt-1">Sé el primero en escribir algo</p>
              </div>
            </div>
          )}
          {grouped.map((group: any, gi: number) => {
            if (group.tipo === 'sistema') {
              return (
                <div key={`${group.id}-${gi}`} className="flex justify-center my-2">
                  <span className="font-mono text-[9px] text-tx-dim italic px-3 py-1 bg-bg-surface border border-bg-border/50">
                    {group.msgs[0].contenido}
                  </span>
                </div>
              )
            }
            const accentCol = ({ command_staff: '#ef4444', supervisory: '#1B6FFF', federal_agent: '#2ECC71', visitante: '#8799AE' } as any)[group.rol] || '#8799AE'
            return (
              <div key={`${group.id}-${gi}`}
                className="flex gap-3 py-1 px-2 -mx-2 hover:bg-bg-hover/40 transition-colors group">
                <div className="w-9 h-9 shrink-0 mt-0.5 flex items-center justify-center font-display text-[12px] font-bold uppercase border"
                  style={{ backgroundColor: `${accentCol}15`, borderColor: `${accentCol}35`, color: accentCol }}>
                  {group.nombre?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                    <span className="font-display text-[12px] font-semibold tracking-wider uppercase" style={{ color: accentCol }}>
                      {group.nombre}
                    </span>
                    {group.callsign && (
                      <span className="font-mono text-[8px] px-1.5 py-px border" style={{ color: accentCol, borderColor: `${accentCol}40`, backgroundColor: `${accentCol}10` }}>
                        [{group.callsign}]
                      </span>
                    )}
                    {group.rol && (
                      <span className="font-mono text-[7px] text-tx-dim uppercase tracking-widest">
                        {String(group.rol).replace('_', ' ')}
                      </span>
                    )}
                    <span className="font-mono text-[8px] text-tx-dim opacity-0 group-hover:opacity-100 transition-opacity" title={fullTime(group.fecha)}>
                      {timeLabel(group.fecha)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {group.msgs.map((m: any) => (
                      <div key={m.id}>
                        {m.tipo === 'imagen'
                          ? <img src={m.contenido} alt="img" className="max-w-xs max-h-64 object-contain border border-bg-border mt-1 hover:opacity-90 transition-opacity cursor-pointer"
                              onError={e => (e.target as any).style.display = 'none'}
                              onClick={() => window.open(m.contenido, '_blank')} />
                          : <p className="text-sm text-tx-secondary leading-relaxed break-words">{m.contenido}</p>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {!isAtBottom && (
          <div className="absolute bottom-20 right-6 z-20">
            <button onClick={scrollToBottom}
              className="flex items-center gap-1.5 bg-accent-blue text-white font-mono text-[9px] uppercase px-3 py-1.5 shadow-lg hover:bg-blue-500 transition-all">
              <ChevronDown size={11} />
              {newMsgCount > 0 ? `${newMsgCount} nuevo${newMsgCount > 1 ? 's' : ''}` : 'Bajar'}
            </button>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-bg-border bg-bg-card shrink-0">
          {!canWrite ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-bg-border">
              <Lock size={12} className="text-tx-muted" />
              <p className="font-mono text-[9px] text-tx-muted uppercase tracking-widest">Sin acceso de escritura en este canal</p>
            </div>
          ) : (
            <form onSubmit={enviar} className="flex flex-col gap-2">
              <div className="flex items-center gap-0 bg-bg-surface border border-bg-border focus-within:border-accent-blue/60 transition-colors overflow-hidden">
                <button type="button"
                  onClick={async () => {
                    const url = await uiPrompt('URL de imagen:', { title: 'Insertar imagen', placeholder: 'https://...' })
                    if (url?.trim()) setTexto(url.trim())
                  }}
                  className="px-3 py-3 text-tx-dim hover:text-accent-blue border-r border-bg-border transition-colors shrink-0 bg-bg-card">
                  <ImageIcon size={14} />
                </button>
                <input
                  ref={inputRef}
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-tx-primary placeholder-tx-muted focus:outline-none"
                  placeholder={`Mensaje${canalInfo?.nombre ? ` en ${['dm', 'private'].includes(canalInfo.tipo) ? '@' : '#'}${canalInfo.nombre}` : ''}…`}
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  disabled={sending}
                  autoComplete="off"
                />
                <button type="submit" disabled={sending || !texto.trim()}
                  className="px-4 py-3 text-tx-dim hover:text-accent-blue disabled:opacity-30 transition-colors shrink-0 bg-bg-card border-l border-bg-border">
                  <Send size={14} />
                </button>
              </div>
              {sendError && <p className="font-mono text-[9px] text-red-400">{sendError}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
