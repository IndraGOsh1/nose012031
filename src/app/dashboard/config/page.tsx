'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Save, RefreshCw, CheckCircle, AlertCircle, RotateCcw, Palette, Image, Type, Bell, Key, Globe } from 'lucide-react'
import { getConfigVisual, setConfigVisual, resetConfigVisual, getInvites, crearInvite, borrarInvite } from '@/lib/client'
import { buildGoogleFormUrls } from '@/lib/google-forms'

type Tab = 'identidad'|'colores'|'fondos'|'banner'|'website'|'invitaciones'

function Toast({ msg, ok, onClose }:{msg:string;ok:boolean;onClose:()=>void}) {
  useEffect(()=>{ const t=setTimeout(onClose,3000);return()=>clearTimeout(t) },[])
  return <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 border font-mono text-xs ${ok?'bg-green-900/40 border-green-700 text-green-300':'bg-red-900/40 border-red-700 text-red-300'}`}>{ok?<CheckCircle size={13}/>:<AlertCircle size={13}/>}{msg}</div>
}

function ColorInput({ label, value, onChange, disabled }: {label:string;value:string;onChange:(v:string)=>void;disabled?:boolean}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2 items-center">
        <input type="color" value={value||'#000000'} onChange={e=>onChange(e.target.value)} className="w-10 h-10 border border-bg-border bg-bg-surface cursor-pointer p-0.5" disabled={disabled}/>
        <input className="input flex-1 font-mono text-xs py-2" value={value} onChange={e=>onChange(e.target.value)} placeholder="#1B6FFF" disabled={disabled}/>
      </div>
    </div>
  )
}

export default function ConfigPage() {
  const [user,    setUser]    = useState<any>(null)
  const [config,  setConfigS] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState<{msg:string;ok:boolean}|null>(null)
  const [tab,     setTab]     = useState<Tab>('identidad')
  const [invites, setInvites] = useState<any[]>([])
  const [invLoading, setInvLoading] = useState(false)
  const [invForm, setInvForm] = useState({ rol:'federal_agent', maxUsos:1, nombre:'' })
  const [copied,  setCopied]  = useState('')

  const isCS    = user?.rol === 'command_staff'
  const isSuperv= ['command_staff','supervisory'].includes(user?.rol)

  useEffect(()=>{ const u=localStorage.getItem('fib_user'); if(u) setUser(JSON.parse(u)) },[])
  useEffect(()=>{
    getConfigVisual().then(c=>{ setConfigS(c); setLoading(false) }).catch(()=>setLoading(false))
  },[])
  useEffect(()=>{ if(tab==='invitaciones') loadInvites() },[tab])

  async function loadInvites() { setInvLoading(true); try { setInvites(await getInvites()) } catch {} finally { setInvLoading(false) } }

  const set = (k:string) => (v:any) => setConfigS((p:any)=>({...p,[k]:v}))
  const setE = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => set(k)(e.target.value)
  const setWS = (k: string, v: any) => setConfigS((p: any) => ({
    ...p,
    websiteSettings: { ...(p.websiteSettings || {}), [k]: v },
  }))

  async function guardar() {
    setSaving(true)
    try { await setConfigVisual(config); setToast({msg:'✅ Configuración guardada',ok:true}) }
    catch(e:any) { setToast({msg:e.message,ok:false}) } finally { setSaving(false) }
  }

  async function restablecer() {
    if (!confirm('¿Restablecer configuración?')) return
    try { await resetConfigVisual(); const c=await getConfigVisual(); setConfigS(c); setToast({msg:'✅ Restablecido',ok:true}) } catch {}
  }

  async function crearCod() {
    try { await crearInvite(invForm); await loadInvites(); setToast({msg:'✅ Código creado',ok:true}) } catch(e:any) { setToast({msg:e.message,ok:false}) }
  }

  function copy(c:string) { navigator.clipboard.writeText(c); setCopied(c); setTimeout(()=>setCopied(''),2000) }

  if (loading||!config) return <div className="flex items-center justify-center h-48"><p className="font-mono text-xs text-tx-muted">Cargando...</p></div>

  const TABS = [
    {id:'identidad'    as Tab, icon:Type,    label:'Identidad'},
    {id:'colores'      as Tab, icon:Palette,  label:'Colores'},
    {id:'fondos'       as Tab, icon:Image,    label:'Fondos'},
    {id:'banner'       as Tab, icon:Bell,     label:'Banner'},
    {id:'website'      as Tab, icon:Globe,    label:'Website'},
    {id:'invitaciones' as Tab, icon:Key,      label:'Invitaciones'},
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={()=>setToast(null)}/>}

      <div className="flex items-center justify-between mb-5">
        <div className="page-header mb-0">
          <span className="section-tag">// Configuración</span>
          <h1 className="font-display text-xl font-semibold tracking-wider uppercase text-tx-primary mt-0.5">Panel de Configuración</h1>
        </div>
        {isCS && (
          <div className="flex gap-2">
            <button onClick={restablecer} className="btn-ghost py-2 px-3 text-[9px]"><RotateCcw size={12}/>Reset</button>
            <button onClick={guardar} disabled={saving} className="btn-primary py-2"><Save size={12}/>{saving?'Guardando...':'Guardar todo'}</button>
          </div>
        )}
      </div>

      {!isCS && <div className="card p-3 mb-5 border-yellow-800/40 bg-yellow-900/10"><p className="font-mono text-xs text-yellow-400">Solo Command Staff puede modificar la configuración global.</p></div>}

      <div className="card p-4 mb-5 border-cyan-800/30 bg-cyan-950/10">
        <p className="font-mono text-[9px] uppercase tracking-widest text-cyan-300 mb-1">Website pública</p>
        <p className="text-xs text-tx-secondary">La edición de misión, oposiciones, Google Forms y comunicados ahora se gestiona desde Admin.</p>
        <Link href="/dashboard/admin" className="btn-ghost py-1.5 text-[9px] inline-flex mt-3">Ir a Admin</Link>
      </div>

      <div className="flex border-b border-bg-border mb-5 overflow-x-auto">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-mono text-[9px] tracking-widest uppercase transition-all border-b-2 -mb-px whitespace-nowrap ${tab===t.id?'border-accent-blue text-accent-blue':'border-transparent text-tx-muted hover:text-tx-secondary'}`}>
            <t.icon size={11}/>{t.label}
          </button>
        ))}
      </div>

      {/* IDENTIDAD */}
      {tab==='identidad' && (
        <div className="flex flex-col gap-4">
          <div className="card p-5 flex flex-col gap-4">
            <span className="section-tag">// División</span>
            <div><label className="label">Nombre</label><input className="input" value={config.nombreDivision||''} onChange={setE('nombreDivision')} disabled={!isCS}/></div>
            <div>
              <label className="label">Descripción institucional</label>
              <textarea className="input min-h-20 resize-none text-sm" value={config.descripcionDivision||''} onChange={setE('descripcionDivision')} disabled={!isCS}
                placeholder="Descripción visible en la página pública..."/>
            </div>
            <div>
              <label className="label">URL del Logo</label>
              <div className="flex gap-3 items-start">
                <input className="input flex-1 text-xs py-2" value={config.logoUrl||''} onChange={setE('logoUrl')} disabled={!isCS} placeholder="https://i.imgur.com/..."/>
                {config.logoUrl && <img src={config.logoUrl} alt="logo" className="w-12 h-12 object-contain border border-bg-border bg-bg-surface p-1"/>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COLORES */}
      {tab==='colores' && (
        <div className="card p-5 flex flex-col gap-4">
          <span className="section-tag">// Paleta</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ColorInput label="Color Primario" value={config.colorPrimario||'#1B6FFF'} onChange={v=>isCS&&set('colorPrimario')(v)} disabled={!isCS}/>
            <ColorInput label="Color Acento"   value={config.colorAcento||'#00C4FF'}   onChange={v=>isCS&&set('colorAcento')(v)} disabled={!isCS}/>
            <ColorInput label="Color Sidebar"  value={config.colorSidebar||'#101820'}  onChange={v=>isCS&&set('colorSidebar')(v)} disabled={!isCS}/>
          </div>
          <div className="flex gap-3 mt-2">
            <button style={{background:config.colorPrimario}} className="px-4 py-2 text-white font-mono text-xs tracking-widest uppercase">Primario</button>
            <button style={{borderColor:config.colorPrimario,color:config.colorPrimario}} className="px-4 py-2 border font-mono text-xs tracking-widest uppercase bg-transparent">Acento</button>
          </div>
        </div>
      )}

      {/* FONDOS */}
      {tab==='fondos' && (
        <div className="flex flex-col gap-4">
          {[{k:'fondoDashboardUrl',l:'Fondo Dashboard'},{k:'fondoHeroUrl',l:'Fondo Hero (Página Pública)'}].map(f=>(
            <div key={f.k} className="card p-5 flex flex-col gap-3">
              <span className="section-tag">// {f.l}</span>
              <input className="input text-xs py-2" value={config[f.k]||''} onChange={setE(f.k)} disabled={!isCS} placeholder="https://i.imgur.com/..."/>
              {config[f.k] && <div className="relative h-28 overflow-hidden border border-bg-border"><img src={config[f.k]} alt="preview" className="w-full h-full object-cover"/><div className="absolute inset-0 flex items-center justify-center"><p className="font-mono text-xs text-white bg-black/50 px-2 py-0.5">Vista previa</p></div></div>}
            </div>
          ))}
          <div className="card p-5">
            <span className="section-tag block mb-3">// Opacidad del Fondo</span>
            <div className="flex items-center gap-4">
              <input type="range" min={0} max={100} value={config.fondoOpacidad||20} onChange={e=>isCS&&set('fondoOpacidad')(Number(e.target.value))} className="flex-1" disabled={!isCS}/>
              <span className="font-mono text-sm text-accent-blue w-10 text-right">{config.fondoOpacidad||20}%</span>
            </div>
          </div>
        </div>
      )}

      {/* BANNER */}
      {tab==='banner' && (
        <div className="card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="section-tag">// Banner Global</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={config.bannerActivo||false} onChange={e=>isCS&&set('bannerActivo')(e.target.checked)} disabled={!isCS} className="w-4 h-4"/>
              <span className="font-mono text-[9px] text-tx-muted uppercase">{config.bannerActivo?'Activo':'Inactivo'}</span>
            </label>
          </div>
          <div><label className="label">Texto del Banner</label><input className="input" value={config.bannerTexto||''} onChange={setE('bannerTexto')} disabled={!isCS} placeholder="Mensaje para todos los usuarios..."/></div>
          <div>
            <label className="label">Color</label>
            <div className="grid grid-cols-4 gap-2">
              {[{id:'blue',c:'bg-blue-900/40 border-blue-700 text-blue-300'},{id:'red',c:'bg-red-900/40 border-red-700 text-red-300'},{id:'gold',c:'bg-yellow-900/40 border-yellow-700 text-yellow-300'},{id:'green',c:'bg-green-900/40 border-green-700 text-green-300'}].map(cc=>(
                <button key={cc.id} onClick={()=>isCS&&set('bannerColor')(cc.id)} className={`py-2 border font-mono text-[9px] uppercase transition-all ${cc.c} ${config.bannerColor===cc.id?'ring-2 ring-accent-blue':''} ${!isCS?'opacity-50 cursor-not-allowed':''}`}>{cc.id}</button>
              ))}
            </div>
          </div>
          {config.bannerActivo && config.bannerTexto && (
            <div className={`p-3 border font-mono text-xs ${config.bannerColor==='red'?'bg-red-900/30 border-red-800 text-red-300':config.bannerColor==='gold'?'bg-yellow-900/30 border-yellow-800 text-yellow-300':config.bannerColor==='green'?'bg-green-900/30 border-green-800 text-green-300':'bg-blue-900/30 border-blue-800 text-blue-300'}`}>
              📢 {config.bannerTexto}
            </div>
          )}
        </div>
      )}

      {/* WEBSITE */}
      {tab==='website' && (
        <div className="flex flex-col gap-4">
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="section-tag">// Textos de la Página Pública</span>
            </div>
            <div><label className="label">Título Hero</label><input className="input" value={config.textoHero||''} onChange={setE('textoHero')} disabled={!isCS} placeholder="Federal Investigation Bureau"/></div>
            <div><label className="label">Subtítulo Hero</label><input className="input" value={config.textoSubhero||''} onChange={setE('textoSubhero')} disabled={!isCS} placeholder="Sistema centralizado de gestión..."/></div>
            <div><label className="label">Texto de Misión</label><textarea className="input min-h-20" value={config.textoMision||''} onChange={setE('textoMision')} disabled={!isCS} /></div>
          </div>
          <div className="card p-5 flex flex-col gap-4">
            <span className="section-tag">// Divisiones en la Página Pública</span>
            {(config.divisionesInfo||[]).map((d:any, i:number) => (
              <div key={i} className="grid grid-cols-3 gap-2 p-3 border border-bg-border bg-bg-surface">
                <input className="input text-xs py-1.5" value={d.nombre||''} placeholder="Nombre" onChange={e=>{if(!isCS)return;const arr=[...(config.divisionesInfo||[])];arr[i]={...arr[i],nombre:e.target.value};set('divisionesInfo')(arr)}}/>
                <input className="input text-xs py-1.5" value={d.descripcion||''} placeholder="Descripción" onChange={e=>{if(!isCS)return;const arr=[...(config.divisionesInfo||[])];arr[i]={...arr[i],descripcion:e.target.value};set('divisionesInfo')(arr)}}/>
                <input className="input text-xs py-1.5" value={d.logoUrl||''} placeholder="URL logo" onChange={e=>{if(!isCS)return;const arr=[...(config.divisionesInfo||[])];arr[i]={...arr[i],logoUrl:e.target.value};set('divisionesInfo')(arr)}}/>
              </div>
            ))}
            {isCS && <button onClick={()=>set('divisionesInfo')([...(config.divisionesInfo||[]),{nombre:'',descripcion:'',logoUrl:''}])} className="btn-ghost text-[9px] py-1.5">+ Agregar División</button>}
          </div>

          <div className="card p-5 flex flex-col gap-4">
            <span className="section-tag">// Apariencia Avanzada (Website)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Animaciones</label>
                <select className="input" value={config.websiteSettings?.enableAnimations ? '1' : '0'} onChange={e => setWS('enableAnimations', e.target.value === '1')} disabled={!isCS}>
                  <option value="1">Activadas</option>
                  <option value="0">Desactivadas</option>
                </select>
              </div>
              <div>
                <label className="label">Tamaño logo hero (px)</label>
                <input className="input" type="number" min={72} max={260} value={config.websiteSettings?.heroLogoSize ?? 130} onChange={e => setWS('heroLogoSize', Number(e.target.value))} disabled={!isCS} />
              </div>
              <div>
                <label className="label">Opacidad imagen hero (%)</label>
                <input className="input" type="number" min={0} max={100} value={config.websiteSettings?.heroImageOpacity ?? 20} onChange={e => setWS('heroImageOpacity', Number(e.target.value))} disabled={!isCS} />
              </div>
              <div>
                <label className="label">Opacidad retícula hero (%)</label>
                <input className="input" type="number" min={0} max={100} value={config.websiteSettings?.heroGridOpacity ?? 20} onChange={e => setWS('heroGridOpacity', Number(e.target.value))} disabled={!isCS} />
              </div>
              <div>
                <label className="label">Ajuste imagen hero</label>
                <select className="input" value={config.websiteSettings?.heroImageFit ?? 'cover'} onChange={e => setWS('heroImageFit', e.target.value)} disabled={!isCS}>
                  <option value="cover">cover</option>
                  <option value="contain">contain</option>
                </select>
              </div>
              <div>
                <label className="label">Posición imagen hero</label>
                <input className="input" value={config.websiteSettings?.heroImagePosition ?? 'center'} onChange={e => setWS('heroImagePosition', e.target.value)} disabled={!isCS} placeholder="center" />
              </div>
              <div>
                <label className="label">Ancho máximo página (rem)</label>
                <input className="input" type="number" min={90} max={180} value={config.websiteSettings?.pageMaxWidth ?? 112} onChange={e => setWS('pageMaxWidth', Number(e.target.value))} disabled={!isCS} />
              </div>
              <div>
                <label className="label">Separación secciones (px)</label>
                <input className="input" type="number" min={12} max={56} value={config.websiteSettings?.sectionGap ?? 28} onChange={e => setWS('sectionGap', Number(e.target.value))} disabled={!isCS} />
              </div>
              <div>
                <label className="label">Radio de cards (px)</label>
                <input className="input" type="number" min={0} max={24} value={config.websiteSettings?.cardRadius ?? 0} onChange={e => setWS('cardRadius', Number(e.target.value))} disabled={!isCS} />
              </div>
              <div>
                <label className="label">Blur de cards (px)</label>
                <input className="input" type="number" min={0} max={20} value={config.websiteSettings?.cardBlur ?? 0} onChange={e => setWS('cardBlur', Number(e.target.value))} disabled={!isCS} />
              </div>
              <div>
                <label className="label">Altura imagen misión (px)</label>
                <input className="input" type="number" min={200} max={720} value={config.websiteSettings?.missionImageHeight ?? 400} onChange={e => setWS('missionImageHeight', Number(e.target.value))} disabled={!isCS} />
              </div>
              <div>
                <label className="label">Altura imagenes oposiciones (px)</label>
                <input className="input" type="number" min={80} max={340} value={config.websiteSettings?.oposicionesImageHeight ?? 112} onChange={e => setWS('oposicionesImageHeight', Number(e.target.value))} disabled={!isCS} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INVITACIONES */}
      {tab==='invitaciones' && (
        <div className="flex flex-col gap-4">
          {isSuperv && (
            <div className="card p-4">
              <span className="section-tag mb-3 block">// Crear Código</span>
              <div className="flex gap-2 flex-wrap">
                <input className="input text-xs py-2 flex-1" placeholder="Nombre IC" value={invForm.nombre} onChange={e=>setInvForm(p=>({...p,nombre:e.target.value}))}/>
                <select className="input text-xs py-2 w-auto" value={invForm.rol} onChange={e=>setInvForm(p=>({...p,rol:e.target.value}))}>
                  <option value="command_staff">Command Staff</option>
                  <option value="supervisory">Supervisory</option>
                  <option value="federal_agent">Federal Agent</option>
                  <option value="visitante">Visitante</option>
                </select>
                <input className="input text-xs py-2 w-20" type="number" min={1} max={10} value={invForm.maxUsos} onChange={e=>setInvForm(p=>({...p,maxUsos:Number(e.target.value)}))} placeholder="Usos"/>
                <button onClick={crearCod} className="btn-primary text-[9px] py-2">Crear</button>
              </div>
            </div>
          )}
          <div className="card overflow-x-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
              <span className="section-tag">// Códigos ({invites.length})</span>
              <button onClick={loadInvites} className="text-tx-muted hover:text-tx-primary"><RefreshCw size={12} className={invLoading?'animate-spin':''}/></button>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-bg-border">{['Código','Rol','Nombre','Usos','Por','Fecha','Estado',''].map(h=><th key={h} className="table-head">{h}</th>)}</tr></thead>
              <tbody>
                {invLoading ? <tr><td colSpan={8} className="text-center py-6 font-mono text-xs text-tx-muted">Cargando...</td></tr>
                : invites.length===0 ? <tr><td colSpan={8} className="text-center py-6 font-mono text-xs text-tx-muted">Sin códigos</td></tr>
                : invites.map(inv=>(
                  <tr key={inv.codigo} className={`table-row ${inv.agotado?'opacity-40':''}`}>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-xs text-accent-blue bg-accent-blue/10 px-1.5 py-0.5">{inv.codigo}</code>
                        <button onClick={()=>copy(inv.codigo)} className="text-tx-muted hover:text-tx-primary text-[10px]">{copied===inv.codigo?'✓':'⧉'}</button>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-[9px] text-tx-secondary">{inv.rol?.replace('_',' ')}</td>
                    <td className="table-cell text-xs text-tx-secondary">{inv.nombre||'—'}</td>
                    <td className="table-cell font-mono text-xs text-tx-muted">{inv.usos}/{inv.maxUsos}</td>
                    <td className="table-cell text-xs text-tx-secondary">{inv.creadoPor}</td>
                    <td className="table-cell font-mono text-[9px] text-tx-muted whitespace-nowrap">{new Date(inv.creadoEn).toLocaleDateString('es')}</td>
                    <td className="table-cell"><span className={`tag border ${inv.agotado?'border-gray-700 text-gray-500':'border-green-700 text-green-400'}`}>{inv.agotado?'Agotado':'Activo'}</span></td>
                    <td className="table-cell">{isSuperv&&<button onClick={()=>borrarInvite(inv.codigo).then(loadInvites)} className="text-tx-muted hover:text-red-400 font-mono text-[9px]">✕</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
