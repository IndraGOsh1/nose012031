'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Lock, ChevronRight, Shield, Globe } from 'lucide-react'
import { buildGoogleFormUrls } from '@/lib/google-forms'
import { readJsonSafely } from '@/lib/client'

const TIPO_TAG: Record<string,string> = {
  operativo: 'tag border-blue-700/50 bg-blue-900/20 text-blue-400',
  informe:   'tag border-yellow-700/50 bg-yellow-900/10 text-yellow-500',
}

function PublicOps() {
  const [ops, setOps] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/operativos?publica=1&tipo=').then(r=>r.json()).then(d=>setOps(Array.isArray(d)?d.slice(0,6):[])).catch(()=>{})
  }, [])
  if (ops.length === 0) return (
    <div className="card p-10 text-center">
      <p className="font-mono text-xs text-tx-muted tracking-widest uppercase">Sin publicaciones recientes</p>
    </div>
  )
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {ops.map(op => (
        <div key={op.id} className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={TIPO_TAG[op.tipo]||''}>{op.tipo}</span>
            <span className="font-mono text-[8px] text-tx-muted uppercase">{op.unidad}</span>
          </div>
          <h3 className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary leading-tight mb-1">{op.titulo}</h3>
          {op.descripcion && <p className="text-xs text-tx-secondary line-clamp-2">{op.descripcion}</p>}
          <p className="font-mono text-[8px] text-tx-muted mt-2">{new Date(op.creadoEn).toLocaleDateString('es')} · {op.nombreAutor}</p>
        </div>
      ))}
    </div>
  )
}

const UNITS = [
  { name:'CIRG',       logo:'https://i.imgur.com/QKAp6O1.png', desc:'Critical Incident Response Group' },
  { name:'ERT',        logo:'https://i.imgur.com/IemqOQh.png', desc:'Evidence Response Team' },
  { name:'RRHH',       logo:'https://i.imgur.com/z5NiemF.png', desc:'Recursos Humanos' },
  { name:'CIRG: SWT',  logo:'https://i.imgur.com/BYWtnQH.png', desc:'Special Weapons & Tactics' },
  { name:'CIRG: UC',   logo:'https://i.imgur.com/wUqoxAe.png', desc:'Undercover Operations' },
  { name:'VCTF',       logo:'https://i.imgur.com/YygbJGY.png', desc:'Violent Crimes Task Force' },
  { name:'Task Force', logo:'https://i.imgur.com/xgJr3Ud.png', desc:'Joint Task Force' },
  { name:'SOG',        logo:'https://i.imgur.com/ec6o9jW.png', desc:'Special Operations Group' },
]

const RANKS = [
  { section:'Command Staff',    color:'border-red-700',       ranks:['Director','Sub Director'] },
  { section:'In charge Agents', color:'border-accent-gold',   ranks:['Coordinador','Jefe de Personal'] },
  { section:'Supervisory',      color:'border-accent-blue',   ranks:['Supervisor','Special Agent Senior'] },
  { section:'Agentes Federales',color:'border-bg-border',     ranks:['Special Agent III','Special Agent II','Special Agent I','Training Agent'] },
]

type LandingConfig = {
  nombreDivision?: string
  descripcionDivision?: string
  logoUrl?: string
  fondoHeroUrl?: string
  textoHero?: string
  textoSubhero?: string
  textoMision?: string
  websiteSettings?: {
    enableAnimations?: boolean
    heroLogoSize?: number
    heroImageOpacity?: number
    heroGridOpacity?: number
    heroImageFit?: 'cover' | 'contain'
    heroImagePosition?: string
    pageMaxWidth?: number
    sectionGap?: number
    cardRadius?: number
    cardBlur?: number
    missionImageHeight?: number
    oposicionesImageHeight?: number
  }
  oposicionesInfo?: {
    titulo?: string
    descripcion?: string
    datos?: string[]
    imagenes?: string[]
    googleFormId?: string
    formularioIntro?: string
    formularioPasos?: string[]
  }
  comunicadosInfo?: {
    titulo?: string
    descripcion?: string
    items?: Array<{
      id?: string
      estado?: string
      titulo?: string
      detalle?: string
      enlace?: string
      fecha?: string
    }>
  }
}

type OposicionPost = {
  id: string
  titulo: string
  creadoEn: string
  descripcion?: string
  nombreAutor?: string
  tags?: string[]
}

function Ticker() {
  const [on, setOn] = useState(true)
  useEffect(() => { const t = setInterval(() => setOn(v => !v), 1100); return () => clearInterval(t) }, [])
  return (
    <div className="flex items-center gap-3 font-mono text-[10px] tracking-widest">
      <span className={`text-red-500 transition-opacity duration-200 ${on?'opacity-100':'opacity-20'}`}>██ CLASIFICADO</span>
      <span className="text-tx-muted">|</span><span className="text-tx-muted">ACCESO RESTRINGIDO</span><span className="text-tx-muted">|</span>
      <span className={`text-red-500 transition-opacity duration-200 ${on?'opacity-20':'opacity-100'}`}>NIVEL ALFA</span>
    </div>
  )
}

export default function Home() {
  const [config, setConfig] = useState<LandingConfig>({})
  const [oposPosts, setOposPosts] = useState<OposicionPost[]>([])

  useEffect(() => {
    fetch('/api/config-visual', { cache:'no-store' })
      .then(r => readJsonSafely<LandingConfig>(r, {}))
      .then(setConfig)
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/operativos?publica=1', { cache:'no-store' })
      .then(r => readJsonSafely<any[]>(r, []))
      .then((rows) => {
        const all = Array.isArray(rows) ? rows : []
        const related = all
          .filter((item: any) => {
            const tags = Array.isArray(item?.tags) ? item.tags.map((x: any) => String(x || '').toLowerCase()) : []
            const titulo = String(item?.titulo || '').toLowerCase()
            const descripcion = String(item?.descripcion || '').toLowerCase()
            return tags.includes('oposiciones') || titulo.includes('oposicion') || descripcion.includes('oposicion')
          })
          .slice(0, 4)
        setOposPosts(related)
      })
      .catch(() => {})
  }, [])

  const oposInfo = config.oposicionesInfo || {}
  const oposDatos = Array.isArray(oposInfo.datos) ? oposInfo.datos : []
  const oposImagenes = Array.isArray(oposInfo.imagenes) ? oposInfo.imagenes : []
  const configuredFormId = String(oposInfo.googleFormId || '').trim()
  const googleFormRef = configuredFormId || 'd:1HaC8ZxgE4dCHu57ZB9IhzGDoNsRmriDccGg3BD_kX94'
  const { embedUrl: googleFormEmbedUrl, openUrl: googleFormOpenUrl } = buildGoogleFormUrls(googleFormRef)
  const ws = {
    enableAnimations: config.websiteSettings?.enableAnimations !== false,
    heroLogoSize: config.websiteSettings?.heroLogoSize ?? 130,
    heroImageOpacity: config.websiteSettings?.heroImageOpacity ?? 20,
    heroGridOpacity: config.websiteSettings?.heroGridOpacity ?? 20,
    heroImageFit: config.websiteSettings?.heroImageFit ?? 'cover',
    heroImagePosition: config.websiteSettings?.heroImagePosition ?? 'center',
    pageMaxWidth: config.websiteSettings?.pageMaxWidth ?? 112,
    sectionGap: config.websiteSettings?.sectionGap ?? 28,
    cardRadius: config.websiteSettings?.cardRadius ?? 0,
    cardBlur: config.websiteSettings?.cardBlur ?? 0,
    missionImageHeight: config.websiteSettings?.missionImageHeight ?? 400,
    oposicionesImageHeight: config.websiteSettings?.oposicionesImageHeight ?? 112,
  }
  const maxWidthStyle = { maxWidth: `${ws.pageMaxWidth}rem` }
  const sectionPadding = `${ws.sectionGap * 4}px`
  const compactSectionPadding = `${Math.round(ws.sectionGap * 3)}px`
  const cardStyle = {
    borderRadius: `${ws.cardRadius}px`,
    backdropFilter: ws.cardBlur > 0 ? `blur(${ws.cardBlur}px)` : undefined,
  } as CSSProperties
  const animated = ws.enableAnimations
  const divisionName = config.nombreDivision || 'Federal Investigation Bureau'
  const heroTitle = config.textoHero || 'Federal Investigation Bureau'
  const heroSubtitle = config.textoSubhero || 'Sistema centralizado de gestión operativa'
  const comunicados = config.comunicadosInfo || {}
  const comunicadosItems = Array.isArray(comunicados.items) ? comunicados.items : []
  const formSteps = Array.isArray(oposInfo.formularioPasos) ? oposInfo.formularioPasos : []

  return (
    <main className="min-h-screen bg-bg-base" style={{ backgroundImage: 'radial-gradient(circle at 12% 18%, rgba(27,111,255,0.10), transparent 35%), radial-gradient(circle at 88% 82%, rgba(0,196,255,0.08), transparent 35%)' }}>
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-bg-border/0 hover:border-bg-border bg-bg-base/0 hover:bg-bg-base/90 transition-all duration-300 backdrop-blur-sm">
        <div className="mx-auto px-6 h-14 flex items-center justify-between" style={maxWidthStyle}>
          <div className="flex items-center gap-2.5">
            <Image src={config.logoUrl || 'https://i.imgur.com/EAimMhx.png'} alt="FIB" width={28} height={28} className="opacity-90" />
            <div>
              <p className="font-display text-xs font-semibold tracking-widest uppercase text-tx-primary leading-none">{divisionName}</p>
              <p className="font-mono text-[8px] text-tx-muted tracking-widest">HQ SYSTEM</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['unidades','rangos','mision','oposiciones'].map(s => (
              <a key={s} href={`#${s}`} className="font-display text-[10px] tracking-widest uppercase text-tx-muted hover:text-tx-primary transition-colors">{s}</a>
            ))}
          </div>
          <Link href="/login">
            <button className="flex items-center gap-1.5 border border-accent-blue/40 hover:border-accent-blue hover:bg-accent-blue/10 text-accent-blue font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 transition-all">
              <Lock size={10} />Acceso Interno
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">
        {config.fondoHeroUrl && (
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: ws.heroImageOpacity / 100 }}>
            <img src={config.fondoHeroUrl} alt="Hero background" className="w-full h-full" style={{ objectFit: ws.heroImageFit, objectPosition: ws.heroImagePosition }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ opacity: ws.heroGridOpacity / 100, backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%231A2535' fill-opacity='1'%3E%3Cpath d='M0 0h1v40H0zm39 0h1v40h-1zM0 0v1h40V0zm0 39v1h40v-1z'/%3E%3C/g%3E%3C/svg%3E\")"}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent-blue/5 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`w-full h-px bg-gradient-to-r from-transparent via-accent-blue/20 to-transparent ${animated ? 'animate-scan' : ''}`} />
        </div>
        {(['top-8 left-8','top-8 right-8','bottom-8 left-8','bottom-8 right-8'] as const).map((pos,i) => (
          <div key={i} className={`absolute ${pos} w-7 h-7 opacity-20`}>
            <div className={`absolute w-full h-px bg-accent-blue ${i<2?'top-0':'bottom-0'}`} />
            <div className={`absolute h-full w-px bg-accent-blue ${i%2===0?'left-0':'right-0'}`} />
          </div>
        ))}

        <div className={`relative z-10 flex flex-col items-center text-center max-w-4xl ${animated ? 'animate-fade-up' : ''}`}>
          <div className="mb-6"><Ticker /></div>
          <div className="relative mb-8">
            <div className="absolute inset-0 blur-2xl bg-accent-blue/10 rounded-full scale-150" />
            <Image src={config.logoUrl || 'https://i.imgur.com/naw30N7.png'} alt="FIB" width={ws.heroLogoSize} height={ws.heroLogoSize} className="relative z-10 drop-shadow-2xl" />
          </div>
          <p className="font-mono text-accent-cyan text-[10px] tracking-[0.4em] uppercase mb-3">Department of Justice</p>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-wider text-tx-primary uppercase leading-none">{heroTitle}</h1>
          <div className="flex items-center gap-4 my-5">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-accent-blue" />
            <span className="font-mono text-accent-gold text-[10px] tracking-[0.3em] uppercase">HQ Operations Center</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-accent-blue" />
          </div>
          <p className="text-tx-secondary text-sm max-w-lg leading-relaxed mb-8">{heroSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/login"><button className="btn-primary"><Lock size={12} />Acceso al Sistema<ChevronRight size={12} /></button></Link>
            <a href="#unidades"><button className="btn-ghost"><Globe size={12} />Ver División</button></a>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-30">
          <span className="font-mono text-[9px] tracking-widest text-tx-muted">SCROLL</span>
          <div className="w-px h-6 bg-gradient-to-b from-tx-muted to-transparent" />
        </div>
      </section>

      {/* Operativos Públicos */}
      <section className="px-6 bg-bg-surface/40" style={{ paddingTop: compactSectionPadding, paddingBottom: compactSectionPadding }}>
        <div className="mx-auto" style={maxWidthStyle}>
          <div className="mb-10 flex items-end justify-between">
            <div>
              <span className="section-tag">// Actividad Reciente</span>
              <div className="divider" />
              <h2 className="font-display text-3xl font-semibold tracking-wider uppercase text-tx-primary">Operativos e Informes</h2>
            </div>
            <Link href="/login"><button className="btn-ghost py-2 text-[9px]"><Lock size={10}/>Ver todo</button></Link>
          </div>
          <PublicOps />
        </div>
      </section>

      {/* Unidades */}
      <section id="unidades" className="px-6" style={{ paddingTop: sectionPadding, paddingBottom: sectionPadding }}>
        <div className="mx-auto" style={maxWidthStyle}>
          <div className="mb-10">
            <span className="section-tag">// Unidades Especializadas</span>
            <div className="divider" />
            <h2 className="font-display text-3xl font-semibold tracking-wider uppercase text-tx-primary">Grupos Operativos</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-bg-border">
            {UNITS.map((u, idx) => (
              <div key={u.name} className={`group bg-bg-card hover:bg-bg-hover transition-all duration-300 p-7 flex flex-col items-center gap-3 ${animated ? 'animate-fade-up' : ''}`} style={{ ...cardStyle, animationDelay: `${idx * 60}ms` }}>
                <div className="relative w-16 h-16">
                  <Image src={u.logo} alt={u.name} fill className="object-contain grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all duration-500" />
                </div>
                <div className="text-center">
                  <p className="font-display text-xs font-semibold tracking-widest uppercase text-tx-primary group-hover:text-accent-blue transition-colors">{u.name}</p>
                  <p className="font-mono text-[9px] text-tx-muted mt-0.5">{u.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rangos */}
      <section id="rangos" className="px-6 bg-bg-surface/40" style={{ paddingTop: sectionPadding, paddingBottom: sectionPadding }}>
        <div className="mx-auto" style={maxWidthStyle}>
          <div className="mb-10">
            <span className="section-tag">// Jerarquía Institucional</span>
            <div className="divider" />
            <h2 className="font-display text-3xl font-semibold tracking-wider uppercase text-tx-primary">Estructura de Rangos</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-px bg-bg-border">
            {RANKS.map((s, idx) => (
              <div key={s.section} className={`bg-bg-card border-t-2 ${s.color} p-5 ${animated ? 'animate-fade-up' : ''}`} style={{ ...cardStyle, animationDelay: `${idx * 70}ms` }}>
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={13} className="text-tx-muted" />
                  <h3 className="font-display text-xs font-semibold tracking-widest uppercase text-tx-primary">{s.section}</h3>
                </div>
                {s.ranks.map((r,i) => (
                  <div key={r} className="flex items-center justify-between py-1.5 border-b border-bg-border last:border-0">
                    <span className="text-xs text-tx-secondary">{r}</span>
                    <span className="font-mono text-[9px] text-tx-muted">{String(i+1).padStart(2,'0')}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission + Oposiciones */}
      <section id="mision" className="px-6" style={{ paddingTop: sectionPadding, paddingBottom: sectionPadding }}>
        <div className="mx-auto grid md:grid-cols-2 gap-8 items-start" style={maxWidthStyle}>
          <div>
            <span className="section-tag">// Declaración Institucional</span>
            <div className="divider" />
            <h2 className="font-display text-3xl font-semibold tracking-wider uppercase text-tx-primary mb-5">Misión y Valores</h2>
            <p className="text-tx-secondary text-sm leading-relaxed mb-7">{config.textoMision || 'La FIB es la principal agencia de inteligencia e investigación federal. Protegemos el estado de derecho mediante operaciones encubiertas, investigación criminal avanzada y coordinación inter-divisional.'}</p>
            <Link href="/login"><button className="btn-primary"><Lock size={12} />Ingresar al Sistema<ChevronRight size={12} /></button></Link>
          </div>
          <div className="relative border border-bg-border overflow-hidden" style={cardStyle}>
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-blue/50 to-transparent" />
            <Image src={oposImagenes[0] || 'https://i.imgur.com/7NxeszI.png'} alt="FIB Gala" width={600} height={400} className="w-full object-cover grayscale hover:grayscale-0 transition-all duration-700" style={{ height: `${ws.missionImageHeight}px` }} />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-bg-base/80 to-transparent p-4">
              <p className="font-mono text-[9px] text-tx-muted tracking-widest uppercase">FIB — Gala Institucional</p>
            </div>
          </div>
        </div>

        <div id="oposiciones" className="mx-auto mt-8 grid md:grid-cols-2 gap-8" style={maxWidthStyle}>
          <div className="card p-6" style={cardStyle}>
            <span className="section-tag">// Convocatoria</span>
            <h3 className="font-display text-2xl font-semibold tracking-wider uppercase text-tx-primary mt-2 mb-3">{oposInfo.titulo || 'Oposiciones'}</h3>
            <p className="text-sm text-tx-secondary leading-relaxed mb-4">{oposInfo.descripcion || 'Proceso de oposiciones para ingreso y asignacion de perfiles en la division.'}</p>
            <div className="space-y-2 mb-4">
              {oposDatos.map((d, idx) => (
                <p key={`${d}-${idx}`} className="text-xs text-tx-secondary border-l border-accent-blue/40 pl-3">{d}</p>
              ))}
            </div>
            {oposImagenes.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {oposImagenes.slice(0, 4).map((img, idx) => (
                  <img key={`${img}-${idx}`} src={img} alt="Oposiciones" className="w-full object-cover border border-bg-border" style={{ height: `${ws.oposicionesImageHeight}px` }} />
                ))}
              </div>
            )}
          </div>

          <div className="card p-6" style={cardStyle}>
            <span className="section-tag">// Google Forms</span>
            <h4 className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary mt-3 mb-2">Postulación de Oposiciones</h4>
            <div className="mb-3 border border-bg-border bg-bg-surface p-3">
              <p className="text-xs text-tx-secondary">{oposInfo.formularioIntro || 'Formulario simplificado: completa tus datos y envia una sola vez.'}</p>
              {formSteps.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formSteps.map((s, idx) => (
                    <p key={`${s}-${idx}`} className="font-mono text-[10px] text-tx-muted">{idx + 1}. {s}</p>
                  ))}
                </div>
              )}
            </div>
            <iframe
              title="Formulario de Oposiciones"
              src={googleFormEmbedUrl}
              className="w-full h-[560px] border border-bg-border bg-black"
              loading="lazy"
            />
            <a href={googleFormOpenUrl} target="_blank" rel="noreferrer" className="font-mono text-[9px] text-accent-blue hover:underline mt-2 inline-block">Abrir formulario en nueva pestaña</a>

            <div className="mt-5 pt-4 border-t border-bg-border">
              <span className="section-tag">// Novedades de Oposiciones</span>
              <div className="mt-2 space-y-2">
                {oposPosts.length === 0 && (
                  <p className="text-xs text-tx-muted">Sin novedades publicadas por el momento.</p>
                )}
                {oposPosts.map((post) => (
                  <div key={post.id} className="border border-bg-border bg-bg-surface p-2.5" style={cardStyle}>
                    <p className="font-display text-xs tracking-wider uppercase text-tx-primary">{post.titulo}</p>
                    {post.descripcion && <p className="text-xs text-tx-secondary mt-1">{post.descripcion}</p>}
                    <p className="font-mono text-[8px] text-tx-muted mt-1.5">{new Date(post.creadoEn).toLocaleDateString('es')} · {post.nombreAutor || 'FIB'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 bg-bg-surface/30" style={{ paddingTop: compactSectionPadding, paddingBottom: compactSectionPadding }}>
        <div className="mx-auto" style={maxWidthStyle}>
          <div className="mb-6">
            <span className="section-tag">// Estado y Comunicados</span>
            <div className="divider" />
            <h2 className="font-display text-2xl font-semibold tracking-wider uppercase text-tx-primary">{comunicados.titulo || 'Comunicados y Estado Operativo'}</h2>
            <p className="text-xs text-tx-secondary mt-1">{comunicados.descripcion || 'Actualizaciones oficiales de la división y estado de procesos.'}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {comunicadosItems.length === 0 && (
              <div className="card p-4" style={cardStyle}>
                <p className="text-xs text-tx-muted">Sin comunicados activos por el momento.</p>
              </div>
            )}
            {comunicadosItems.map((it, idx) => (
              <div key={`${it.id || idx}`} className="card p-4" style={cardStyle}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-xs tracking-wider uppercase text-tx-primary">{it.titulo || 'Comunicado'}</p>
                  <span className="tag border-cyan-700 text-cyan-300">{(it.estado || 'activo').toUpperCase()}</span>
                </div>
                <p className="text-xs text-tx-secondary mt-2">{it.detalle || 'Sin detalle'}</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="font-mono text-[9px] text-tx-muted">{it.fecha ? new Date(it.fecha).toLocaleDateString('es') : ''}</p>
                  {it.enlace && (
                    <a href={it.enlace} target="_blank" rel="noreferrer" className="font-mono text-[9px] text-accent-blue hover:underline">Ver más</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-bg-border py-5 px-6">
        <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-3" style={maxWidthStyle}>
          <div className="flex items-center gap-2.5">
            <Image src={config.logoUrl || 'https://i.imgur.com/EAimMhx.png'} alt="FIB" width={18} height={18} className="opacity-30" />
            <span className="font-mono text-[9px] text-tx-muted tracking-widest uppercase">{divisionName} © 2024 — All Rights Reserved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            <span className="font-mono text-[9px] text-accent-green tracking-widest">SYSTEMS ONLINE</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
