'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, X, CheckCircle, AlertCircle, Eye, Edit, Trash2, Check, ArchiveX, Clock, Image, Type, Minus, MoveUp, MoveDown } from 'lucide-react'
import { getOperativos, crearOperativo, editarOperativo, borrarOperativo } from '@/lib/client'

type EstadoOp = 'borrador' | 'pendiente' | 'publicado' | 'archivado'
type TipoOp   = 'operativo' | 'informe'
type TipoBloque = 'texto' | 'imagen' | 'separador'

interface Bloque { tipo: TipoBloque; contenido: string; caption?: string }

const ESTADO_TAG: Record<EstadoOp, string> = {
  borrador:  'tag border-gray-700 text-gray-400',
  pendiente: 'tag border-yellow-700 bg-yellow-900/20 text-yellow-400',
  publicado: 'tag border-green-700 bg-green-900/20 text-green-400',
  archivado: 'tag border-gray-700 bg-gray-900/20 text-gray-500',
}
const TIPO_TAG: Record<TipoOp, string> = {
  operativo: 'tag border-blue-700/50 bg-blue-900/20 text-blue-400',
  informe:   'tag border-yellow-700/50 bg-yellow-900/10 text-yellow-500',
}
const UNIDADES = ['General','ERT','CIRG','RRHH','RMI','SOG','Task Force','VCTF']

function Toast({ msg, ok, onClose }: { msg:string; ok:boolean; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 border font-mono text-xs ${ok?'bg-green-900/40 border-green-700 text-green-300':'bg-red-900/40 border-red-700 text-red-300'}`}>
      {ok?<CheckCircle size={13}/>:<AlertCircle size={13}/>}{msg}
    </div>
  )
}

// ── Block Editor ──────────────────────────────────────────────────────────────
function BlockEditor({ bloques, onChange }: { bloques: Bloque[]; onChange: (b: Bloque[]) => void }) {
  function add(tipo: TipoBloque) {
    onChange([...bloques, { tipo, contenido: '', caption: '' }])
  }
  function update(i: number, data: Partial<Bloque>) {
    const next = [...bloques]; next[i] = { ...next[i], ...data }; onChange(next)
  }
  function remove(i: number) { onChange(bloques.filter((_,j)=>j!==i)) }
  function move(i: number, dir: -1|1) {
    const next = [...bloques]
    const tmp = next[i]; next[i] = next[i+dir]; next[i+dir] = tmp
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Existing blocks */}
      {bloques.map((b, i) => (
        <div key={i} className="border border-bg-border bg-bg-surface group">
          {/* Block header */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-bg-border bg-bg-card">
            <span className="font-mono text-[8px] text-tx-muted uppercase flex items-center gap-1">
              {b.tipo === 'texto' && <><Type size={9}/>Texto</>}
              {b.tipo === 'imagen' && <><Image size={9}/>Imagen</>}
              {b.tipo === 'separador' && <><Minus size={9}/>Separador</>}
            </span>
            <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {i > 0 && <button onClick={()=>move(i,-1)} className="text-tx-muted hover:text-tx-primary p-0.5"><MoveUp size={11}/></button>}
              {i < bloques.length-1 && <button onClick={()=>move(i,1)} className="text-tx-muted hover:text-tx-primary p-0.5"><MoveDown size={11}/></button>}
              <button onClick={()=>remove(i)} className="text-tx-muted hover:text-red-400 p-0.5"><X size={11}/></button>
            </div>
          </div>

          {/* Block content */}
          <div className="p-3">
            {b.tipo === 'texto' && (
              <textarea
                className="w-full bg-transparent text-sm text-tx-primary focus:outline-none resize-none min-h-20 placeholder-tx-muted font-sans leading-relaxed"
                placeholder="Escribe el texto aquí..."
                value={b.contenido}
                onChange={e=>update(i,{contenido:e.target.value})}
                rows={4}
              />
            )}
            {b.tipo === 'imagen' && (
              <div className="flex flex-col gap-2">
                <input
                  className="input text-xs py-2 font-mono"
                  placeholder="URL de la imagen (https://i.imgur.com/...)"
                  value={b.contenido}
                  onChange={e=>update(i,{contenido:e.target.value})}
                />
                {b.contenido && (
                  <img src={b.contenido} alt="preview" className="max-h-48 object-contain border border-bg-border" onError={e=>(e.target as any).style.display='none'} />
                )}
                <input
                  className="input text-xs py-1.5"
                  placeholder="Pie de imagen (opcional)"
                  value={b.caption||''}
                  onChange={e=>update(i,{caption:e.target.value})}
                />
              </div>
            )}
            {b.tipo === 'separador' && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-bg-border" />
                <span className="font-mono text-[9px] text-tx-dim uppercase">separador</span>
                <div className="flex-1 h-px bg-bg-border" />
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Add block buttons */}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={()=>add('texto')}
          className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-bg-border text-tx-muted hover:border-accent-blue hover:text-accent-blue transition-colors font-mono text-[9px] uppercase tracking-widest">
          <Type size={11}/>Texto
        </button>
        <button type="button" onClick={()=>add('imagen')}
          className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-bg-border text-tx-muted hover:border-accent-blue hover:text-accent-blue transition-colors font-mono text-[9px] uppercase tracking-widest">
          <Image size={11}/>Imagen
        </button>
        <button type="button" onClick={()=>add('separador')}
          className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-bg-border text-tx-muted hover:border-bg-border hover:text-tx-secondary transition-colors font-mono text-[9px] uppercase tracking-widest">
          <Minus size={11}/>Separador
        </button>
      </div>
    </div>
  )
}

// ── Block Renderer ────────────────────────────────────────────────────────────
function BlockRenderer({ item }: { item: any }) {
  // If has bloques use those, else fall back to contenido
  const bloques: Bloque[] = item.bloques?.length > 0 ? item.bloques : [{ tipo:'texto', contenido: item.contenido||'' }]

  return (
    <div className="flex flex-col gap-4">
      {bloques.map((b, i) => (
        <div key={i}>
          {b.tipo === 'texto' && b.contenido && (
            <p className="text-sm text-tx-primary leading-relaxed whitespace-pre-wrap">{b.contenido}</p>
          )}
          {b.tipo === 'imagen' && b.contenido && (
            <div className="flex flex-col gap-1">
              <img src={b.contenido} alt={b.caption||'imagen'} className="max-w-full object-contain border border-bg-border cursor-pointer hover:opacity-90 transition-opacity"
                onClick={()=>window.open(b.contenido,'_blank')}
                onError={e=>(e.target as any).style.display='none'} />
              {b.caption && <p className="font-mono text-[9px] text-tx-muted text-center">{b.caption}</p>}
            </div>
          )}
          {b.tipo === 'separador' && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-bg-border" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Modal Editor ──────────────────────────────────────────────────────────────
function ModalEditor({ item, onClose, onSuccess }: { item?:any; onClose:()=>void; onSuccess:(m:string)=>void }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    tipo:          item?.tipo          || 'operativo',
    titulo:        item?.titulo        || '',
    descripcion:   item?.descripcion   || '',
    clasificacion: item?.clasificacion || 'interno',
    unidad:        item?.unidad        || 'General',
    tags:          item?.tags?.join(', ') || '',
  })
  const [bloques, setBloques] = useState<Bloque[]>(
    item?.bloques?.length > 0 ? item.bloques : [{ tipo:'texto' as const, contenido: item?.contenido||'' }]
  )
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const set = (k:keyof typeof form) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setForm(p=>({...p,[k]:e.target.value}))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const body = {
        ...form,
        bloques,
        contenido: bloques.filter(b=>b.tipo==='texto').map(b=>b.contenido).join('\n\n'),
        imagenes: bloques.filter(b=>b.tipo==='imagen').map(b=>b.contenido).filter(Boolean),
        tags: form.tags.split(',').map((t:string)=>t.trim()).filter(Boolean),
      }
      if (isEdit) { await editarOperativo(item.id, body); onSuccess('Actualizado') }
      else        { await crearOperativo(body);            onSuccess('Creado — pendiente de aprobación') }
      onClose()
    } catch(err:any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-bg-card border border-bg-border w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border sticky top-0 bg-bg-card z-10">
          <div>
            <span className="section-tag">// {isEdit?'Editar':'Crear'}</span>
            <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary mt-0.5">{isEdit?item.titulo:'Nuevo Operativo / Informe'}</p>
          </div>
          <button onClick={onClose} className="text-tx-muted hover:text-tx-primary"><X size={16}/></button>
        </div>
        <form onSubmit={submit} className="p-5 flex flex-col gap-4">
          {/* Metadata row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Tipo *</label>
              <select className="input text-xs py-2" value={form.tipo} onChange={set('tipo')}>
                <option value="operativo">Operativo</option>
                <option value="informe">Informe</option>
              </select>
            </div>
            <div>
              <label className="label">Clasificación</label>
              <select className="input text-xs py-2" value={form.clasificacion} onChange={set('clasificacion')}>
                <option value="publico">Público</option>
                <option value="interno">Interno</option>
                <option value="confidencial">Confidencial</option>
              </select>
            </div>
            <div>
              <label className="label">Unidad</label>
              <select className="input text-xs py-2" value={form.unidad} onChange={set('unidad')}>
                {UNIDADES.map(u=><option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Etiquetas</label>
              <input className="input text-xs py-2" value={form.tags} onChange={set('tags')} placeholder="tag1, tag2" />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="label">Título *</label>
            <input className="input text-base font-display tracking-wider" value={form.titulo} onChange={set('titulo')} placeholder="Título del operativo o informe" required />
          </div>

          {/* Description */}
          <div>
            <label className="label">Descripción corta (aparece en el listado)</label>
            <input className="input text-sm" value={form.descripcion} onChange={set('descripcion')} placeholder="Breve resumen..." />
          </div>

          {/* Rich block editor */}
          <div>
            <label className="label mb-2 block">Contenido — Editor de Bloques</label>
            <p className="font-mono text-[8px] text-tx-muted mb-3">Agrega bloques de texto e imágenes en el orden que quieras.</p>
            <BlockEditor bloques={bloques} onChange={setBloques} />
          </div>

          {error && <div className="flex items-center gap-2 p-2.5 bg-red-950/30 border border-red-900/50 text-red-400 text-xs font-mono"><AlertCircle size={12}/>{error}</div>}

          <div className="flex gap-2 pt-1 sticky bottom-0 bg-bg-card pb-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal View ────────────────────────────────────────────────────────────────
function ModalVer({ item, user, onClose, onAction }: { item:any; user:any; onClose:()=>void; onAction:(m:string)=>void }) {
  const [loading, setLoading] = useState(false)
  const isCS    = user?.rol === 'command_staff'
  const isSuperv= ['command_staff','supervisory'].includes(user?.rol)

  async function doAction(accion: string) {
    setLoading(true)
    try {
      await editarOperativo(item.id, { accion })
      const msgs: Record<string,string> = { aprobar:'Publicado', rechazar:'Devuelto a borrador', archivar:'Archivado', pendiente:'Enviado para aprobación' }
      onAction(msgs[accion]||'Actualizado'); onClose()
    } catch(e:any) { alert(e.message) }
    finally { setLoading(false) }
  }

  async function eliminar() {
    if (!window.confirm(`¿Eliminar "${item.titulo}"?`)) return
    setLoading(true)
    try { await borrarOperativo(item.id); onAction('Eliminado'); onClose() }
    catch(e:any) { alert(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-bg-card border border-bg-border w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-bg-border sticky top-0 bg-bg-card z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={TIPO_TAG[item.tipo as TipoOp]}>{item.tipo}</span>
                <span className={ESTADO_TAG[item.estado as EstadoOp]}>{item.estado}</span>
                <span className="font-mono text-[8px] text-tx-muted uppercase">{item.clasificacion}</span>
                <span className="font-mono text-[8px] text-tx-muted">· {item.unidad}</span>
              </div>
              <h2 className="font-display text-xl font-semibold tracking-wider uppercase text-tx-primary leading-tight">{item.titulo}</h2>
              <p className="font-mono text-[8px] text-tx-muted mt-1">
                <span className="text-accent-blue">{item.nombreAutor}</span> · {new Date(item.creadoEn).toLocaleDateString('es',{day:'2-digit',month:'long',year:'numeric'})}
                {item.aprobadoPor && ` · aprobado por ${item.aprobadoPor}`}
              </p>
            </div>
            <button onClick={onClose} className="text-tx-muted hover:text-tx-primary shrink-0"><X size={15}/></button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {item.descripcion && (
            <p className="text-tx-secondary text-sm mb-5 pb-4 border-b border-bg-border leading-relaxed italic">{item.descripcion}</p>
          )}

          <BlockRenderer item={item} />

          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-5 pt-4 border-t border-bg-border">
              {item.tags.map((t:string)=><span key={t} className="font-mono text-[8px] px-2 py-0.5 bg-bg-surface border border-bg-border text-tx-muted">#{t}</span>)}
            </div>
          )}
        </div>

        {/* Actions */}
        {(isSuperv || item.creadoPor === user?.username) && (
          <div className="px-5 py-3 border-t border-bg-border flex flex-wrap gap-2 sticky bottom-0 bg-bg-card">
            {item.estado==='pendiente' && isSuperv && <button onClick={()=>doAction('aprobar')}   disabled={loading} className="btn-success py-1.5 px-3 text-[9px]"><Check size={11}/>Aprobar</button>}
            {item.estado==='pendiente' && isSuperv && <button onClick={()=>doAction('rechazar')}  disabled={loading} className="btn-ghost   py-1.5 px-3 text-[9px]"><X size={11}/>Rechazar</button>}
            {item.estado==='publicado' && isCS      && <button onClick={()=>doAction('archivar')}  disabled={loading} className="btn-ghost   py-1.5 px-3 text-[9px]"><ArchiveX size={11}/>Archivar</button>}
            {item.estado==='borrador'               && <button onClick={()=>doAction('pendiente')} disabled={loading} className="btn-primary py-1.5 px-3 text-[9px]"><Clock size={11}/>Enviar para revisión</button>}
            {(item.creadoPor===user?.username||isCS) && <button onClick={eliminar} disabled={loading} className="btn-danger py-1.5 px-3 text-[9px] ml-auto"><Trash2 size={11}/>Eliminar</button>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OperativosPage() {
  const [user,    setUser]    = useState<any>(null)
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)
  const [editItem,    setEditItem]    = useState<any>(null)
  const [viewItem,    setViewItem]    = useState<any>(null)
  const [toast,       setToast]       = useState<{msg:string;ok:boolean}|null>(null)
  const [filtroTipo,   setFiltroTipo]   = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroUnidad, setFiltroUnidad] = useState('')
  const [tab, setTab] = useState<'todos'|'pendientes'>('todos')

  useEffect(() => { const u = localStorage.getItem('fib_user'); if (u) setUser(JSON.parse(u)) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p: Record<string,string> = {}
      if (filtroTipo)   p.tipo   = filtroTipo
      if (filtroUnidad) p.unidad = filtroUnidad
      if (tab==='pendientes') p.estado = 'pendiente'
      else if (filtroEstado) p.estado = filtroEstado
      const data = await getOperativos(p)
      setItems(Array.isArray(data)?data:[])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [filtroTipo, filtroEstado, filtroUnidad, tab])

  useEffect(() => { load() }, [load])

  const notify   = (msg:string, ok=true) => { setToast({msg,ok}); load() }
  const isCS     = user?.rol === 'command_staff'
  const isSuperv = ['command_staff','supervisory'].includes(user?.rol)
  const pendientes = items.filter(i=>i.estado==='pendiente').length

  return (
    <div className="max-w-6xl mx-auto">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={()=>setToast(null)}/>}
      {showCreate && <ModalEditor onClose={()=>setShowCreate(false)} onSuccess={m=>notify(m)}/>}
      {editItem   && <ModalEditor item={editItem} onClose={()=>setEditItem(null)} onSuccess={m=>notify(m)}/>}
      {viewItem   && <ModalVer item={viewItem} user={user} onClose={()=>setViewItem(null)} onAction={m=>notify(m)}/>}

      <div className="flex items-center justify-between mb-5">
        <div className="page-header mb-0">
          <span className="section-tag">// Operativos e Informes</span>
          <h1 className="font-display text-xl font-semibold tracking-wider uppercase text-tx-primary mt-0.5">Publicaciones</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost py-2 px-3"><RefreshCw size={12} className={loading?'animate-spin':''}/></button>
          <button onClick={()=>setShowCreate(true)} className="btn-primary py-2"><Plus size={12}/>Crear</button>
        </div>
      </div>

      <div className="flex border-b border-bg-border mb-4">
        {[{id:'todos',label:'Todos'},{id:'pendientes',label:`Pendientes${pendientes>0?` (${pendientes})`:''}`,show:isSuperv}]
          .filter(t=>t.show!==false).map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            className={`px-4 py-2.5 font-mono text-[9px] tracking-widest uppercase transition-all border-b-2 -mb-px ${tab===t.id?'border-accent-blue text-accent-blue':'border-transparent text-tx-muted hover:text-tx-secondary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==='todos' && (
        <div className="flex flex-wrap gap-2 mb-4">
          <select className="input py-2 text-xs w-auto" value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="operativo">Operativos</option>
            <option value="informe">Informes</option>
          </select>
          <select className="input py-2 text-xs w-auto" value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {['borrador','pendiente','publicado','archivado'].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input py-2 text-xs w-auto" value={filtroUnidad} onChange={e=>setFiltroUnidad(e.target.value)}>
            <option value="">Todas las unidades</option>
            {UNIDADES.map(u=><option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 font-mono text-xs text-tx-muted">Cargando...</div>
      ) : items.length===0 ? (
        <div className="card p-14 flex flex-col items-center gap-3 text-tx-muted">
          <div className="w-5 h-5 border border-bg-border opacity-30"/>
          <p className="font-mono text-xs tracking-widest uppercase">Sin publicaciones</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(item => {
            // Get first image from bloques for thumbnail
            const firstImg = item.bloques?.find((b:any)=>b.tipo==='imagen' && b.contenido)?.contenido
              || item.imagenes?.[0]

            return (
              <div key={item.id} className="card hover:bg-bg-hover transition-all cursor-pointer group overflow-hidden" onClick={()=>setViewItem(item)}>
                {/* Thumbnail if has image */}
                {firstImg && (
                  <div className="h-32 overflow-hidden border-b border-bg-border">
                    <img src={firstImg} alt={item.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e=>(e.target as any).parentElement.style.display='none'} />
                  </div>
                )}

                <div className="p-4 border-b border-bg-border">
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    <span className={TIPO_TAG[item.tipo as TipoOp]}>{item.tipo}</span>
                    <span className={ESTADO_TAG[item.estado as EstadoOp]}>{item.estado}</span>
                    <span className="font-mono text-[7px] text-tx-muted uppercase ml-auto">{item.clasificacion}</span>
                  </div>
                  <h3 className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary group-hover:text-accent-blue transition-colors leading-tight">{item.titulo}</h3>
                  {item.descripcion && <p className="text-xs text-tx-secondary mt-1 line-clamp-2">{item.descripcion}</p>}
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[8px] text-tx-muted">{item.unidad} · {item.nombreAutor}</p>
                    <p className="font-mono text-[8px] text-tx-dim">{new Date(item.creadoEn).toLocaleDateString('es')}</p>
                  </div>
                  <div className="flex gap-1">
                    {(item.creadoPor===user?.username||isCS) && (
                      <button onClick={e=>{e.stopPropagation();setEditItem(item)}} className="text-tx-muted hover:text-accent-blue p-1 transition-colors"><Edit size={11}/></button>
                    )}
                    <button onClick={e=>{e.stopPropagation();setViewItem(item)}} className="text-tx-muted hover:text-tx-primary p-1 transition-colors"><Eye size={11}/></button>
                  </div>
                </div>
                {item.tags?.length > 0 && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1">
                    {item.tags.slice(0,3).map((t:string)=><span key={t} className="font-mono text-[7px] px-1 py-0.5 bg-bg-surface border border-bg-border text-tx-dim">#{t}</span>)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
