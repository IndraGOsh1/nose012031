export interface ConfigVisual {
  nombreDivision:     string
  descripcionDivision:string
  logoUrl:            string
  colorPrimario:      string
  colorSidebar:       string
  colorAcento:        string
  fondoDashboardUrl:  string
  fondoHeroUrl:       string
  fondoOpacidad:      number
  bannerActivo:       boolean
  bannerTexto:        string
  bannerColor:        string
  modoOscuroDefault:  boolean
  textoHero:          string
  textoSubhero:       string
  textoMision:        string
  oposicionesInfo:    {
    titulo: string
    descripcion: string
    datos: string[]
    imagenes: string[]
    googleFormId: string
    googleFormOpen: boolean
    googleResponsesSheetId: string
    googleResponsesRange: string
    formularioIntro: string
    formularioPasos: string[]
  }
  comunicadosInfo: {
    titulo: string
    descripcion: string
    items: Array<{
      id: string
      estado: string
      titulo: string
      detalle: string
      enlace: string
      fecha: string
    }>
  }
  websiteSettings: {
    enableAnimations: boolean
    heroLogoSize: number
    heroImageOpacity: number
    heroGridOpacity: number
    heroImageFit: 'cover' | 'contain'
    heroImagePosition: string
    pageMaxWidth: number
    sectionGap: number
    cardRadius: number
    cardBlur: number
    missionImageHeight: number
    oposicionesImageHeight: number
  }
  divisionesInfo:     { nombre:string; descripcion:string; logoUrl:string }[]
  faqInfo: {
    titulo: string
    descripcion: string
    items: Array<{ id: string; pregunta: string; respuesta: string }>
  }
  organigramaInfo: {
    titulo: string
    imageUrl: string
    descripcion: string
  }
  indraRecoveryUsedAt: string | null
  actualizadoPor:     string
  actualizadoEn:      string
}

const DEFAULT: ConfigVisual = {
  nombreDivision:     'Federal Investigation Bureau',
  descripcionDivision:'División de investigación federal. Protegemos el estado de derecho.',
  logoUrl:            'https://i.imgur.com/EAimMhx.png',
  colorPrimario:      '#1B6FFF',
  colorSidebar:       '#101820',
  colorAcento:        '#00C4FF',
  fondoDashboardUrl:  '',
  fondoHeroUrl:       '',
  fondoOpacidad:      20,
  bannerActivo:       false,
  bannerTexto:        '',
  bannerColor:        'blue',
  modoOscuroDefault:  true,
  textoHero:          'Federal Investigation Bureau',
  textoSubhero:       'Sistema centralizado de gestión operativa',
  textoMision:        'Proteger la integridad del estado de derecho mediante investigaciones federales de alto nivel, garantizando la seguridad de los ciudadanos y la justicia.',
  oposicionesInfo: {
    titulo: 'Oposiciones',
    descripcion: 'Proceso de oposiciones para ingreso y asignacion de perfiles en la division.',
    datos: ['Convocatoria abierta por periodos', 'Requiere cuenta activa', 'Un envio por usuario o IP'],
    imagenes: ['https://i.imgur.com/7NxeszI.png'],
    googleFormId: '1HaC8ZxgE4dCHu57ZB9IhzGDoNsRmriDccGg3BD_kX94',
    googleFormOpen: true,
    googleResponsesSheetId: '',
    googleResponsesRange: 'A:Z',
    formularioIntro: 'Completa el formulario de forma simple y en un solo envio. Adjunta evidencia solo cuando se solicite.',
    formularioPasos: ['Lee los requisitos', 'Completa datos personales', 'Revisa respuestas antes de enviar'],
  },
  comunicadosInfo: {
    titulo: 'Comunicados y Estado Operativo',
    descripcion: 'Actualizaciones institucionales y estado de convocatorias.',
    items: [
      {
        id: 'com-1',
        estado: 'activo',
        titulo: 'Convocatoria de Oposiciones',
        detalle: 'Se habilita periodo de inscripcion para nuevos aspirantes.',
        enlace: '',
        fecha: new Date().toISOString(),
      },
    ],
  },
  websiteSettings: {
    enableAnimations: true,
    heroLogoSize: 130,
    heroImageOpacity: 20,
    heroGridOpacity: 20,
    heroImageFit: 'cover',
    heroImagePosition: 'center',
    pageMaxWidth: 112,
    sectionGap: 28,
    cardRadius: 0,
    cardBlur: 0,
    missionImageHeight: 400,
    oposicionesImageHeight: 112,
  },
  divisionesInfo:     [
    { nombre:'CIRG', descripcion:'Critical Incident Response Group', logoUrl:'https://i.imgur.com/QKAp6O1.png' },
    { nombre:'ERT',  descripcion:'Evidence Response Team',           logoUrl:'https://i.imgur.com/IemqOQh.png' },
    { nombre:'RRHH', descripcion:'Recursos Humanos',                 logoUrl:'https://i.imgur.com/z5NiemF.png' },
  ],
  faqInfo: {
    titulo: 'Preguntas Frecuentes',
    descripcion: '',
    items: [],
  },
  organigramaInfo: {
    titulo: 'Organigrama',
    imageUrl: '',
    descripcion: 'Estructura organizacional de la División Federal.',
  },
  indraRecoveryUsedAt: null,
  actualizadoPor:'SYSTEM', actualizadoEn:new Date().toISOString(),
}

// ── Supabase persistence ──────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
import { getSecret } from './secrets'

const supabaseUrl = getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = (
  getSecret('SUPABASE_SERVICE_ROLE_KEY') ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
const isSupabaseEnabled = !!(supabaseUrl && supabaseKey)
const ROW_KEY = 'singleton'

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase no está configurado para ConfigVisualDB')
  }
  return createClient(supabaseUrl, supabaseKey)
}

declare global { var __fibConfigVisual2: ConfigVisual | undefined }
if (!global.__fibConfigVisual2) global.__fibConfigVisual2 = { ...DEFAULT }

const CONFIG_VISUAL_DB_COLUMNS = [
  'id',
  'nombreDivision',
  'descripcionDivision',
  'logoUrl',
  'colorPrimario',
  'colorSidebar',
  'colorAcento',
  'fondoDashboardUrl',
  'fondoHeroUrl',
  'fondoOpacidad',
  'bannerActivo',
  'bannerTexto',
  'bannerColor',
  'modoOscuroDefault',
  'textoHero',
  'textoSubhero',
  'textoMision',
  'oposicionesInfo',
  'comunicadosInfo',
  'websiteSettings',
  'divisionesInfo',
  'faqInfo',
  'organigramaInfo',
  'indraRecoveryUsedAt',
  'actualizadoPor',
  'actualizadoEn',
] as const

function parseMissingColumn(message: string): string | null {
  const m = String(message || '').match(/Could not find the '([^']+)' column/i)
  return m?.[1] ? String(m[1]) : null
}

function buildConfigVisualPayload(cfg: ConfigVisual, omittedColumns: Set<string>) {
  const source = { id: ROW_KEY, ...cfg } as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of CONFIG_VISUAL_DB_COLUMNS) {
    if (omittedColumns.has(key)) continue
    if (source[key] !== undefined) out[key] = source[key]
  }
  return out
}

async function upsertConfigVisualResilient(cfg: ConfigVisual) {
  const omittedColumns = new Set<string>()
  for (let attempt = 0; attempt < 6; attempt++) {
    const payload = buildConfigVisualPayload(cfg, omittedColumns)
    const { error } = await getSupabase().from('config_visual').upsert(payload)
    if (!error) return
    const missing = parseMissingColumn(error.message || '')
    if (!missing || omittedColumns.has(missing)) {
      throw new Error(error.message)
    }
    omittedColumns.add(missing)
    console.warn(`[ConfigVisualDB] Missing column '${missing}' on config_visual. Saving without it until migration is applied.`)
  }
  throw new Error('No se pudo guardar config_visual: demasiados reintentos por columnas faltantes.')
}

async function loadFromSupabase(): Promise<ConfigVisual> {
  try {
    const { data, error } = await getSupabase()
      .from('config_visual')
      .select('*')
      .eq('id', ROW_KEY)
      .single()
    if (error || !data) {
      // Ensure row exists; retry with a resilient payload when schema lags behind code.
      await upsertConfigVisualResilient(DEFAULT)
      return { ...DEFAULT }
    }
    const { id: _id, ...rest } = data
    return { ...DEFAULT, ...rest } as ConfigVisual
  } catch {
    return { ...DEFAULT }
  }
}

async function saveToSupabase(cfg: ConfigVisual) {
  await upsertConfigVisualResilient(cfg)
}

// Init
declare global { var __fibConfigVisualInit: Promise<void> | undefined }
if (!global.__fibConfigVisualInit) {
  global.__fibConfigVisualInit = isSupabaseEnabled
    ? loadFromSupabase().then(cfg => { global.__fibConfigVisual2 = cfg })
    : Promise.resolve()
}

export const ConfigVisualDB = {
  get: () => global.__fibConfigVisual2 ?? { ...DEFAULT },
  ready: async () => {
    await global.__fibConfigVisualInit
    return global.__fibConfigVisual2 ?? { ...DEFAULT }
  },
  set: async (d: Partial<ConfigVisual>) => {
    await global.__fibConfigVisualInit
    const next = { ...global.__fibConfigVisual2!, ...d, actualizadoEn: new Date().toISOString() }
    if (!isSupabaseEnabled) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Persistencia deshabilitada: faltan variables de Supabase para guardar config_visual')
      }
      global.__fibConfigVisual2 = next
      return
    }
    await saveToSupabase(next)
    global.__fibConfigVisual2 = next
  },
  reset: async () => {
    await global.__fibConfigVisualInit
    const next = { ...DEFAULT }
    if (!isSupabaseEnabled) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Persistencia deshabilitada: faltan variables de Supabase para resetear config_visual')
      }
      global.__fibConfigVisual2 = next
      return
    }
    await saveToSupabase(next)
    global.__fibConfigVisual2 = next
  },
}
