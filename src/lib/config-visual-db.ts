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
  indraRecoveryUsedAt: null,
  actualizadoPor:'SYSTEM', actualizadoEn:new Date().toISOString(),
}

// ── Supabase persistence ──────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
import { getSecret } from './secrets'

const isSupabaseEnabled = !!(getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
const ROW_KEY = 'singleton'

function getSupabase() {
  const url = (getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!
  const key = (
    getSecret('SUPABASE_SERVICE_ROLE_KEY') ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )!
  return createClient(url, key)
}

declare global { var __fibConfigVisual2: ConfigVisual | undefined }
if (!global.__fibConfigVisual2) global.__fibConfigVisual2 = { ...DEFAULT }

async function loadFromSupabase(): Promise<ConfigVisual> {
  try {
    const { data, error } = await getSupabase()
      .from('config_visual')
      .select('*')
      .eq('id', ROW_KEY)
      .single()
    if (error || !data) {
      // Insert default row
      await getSupabase().from('config_visual').upsert({ id: ROW_KEY, ...DEFAULT })
      return { ...DEFAULT }
    }
    const { id: _id, ...rest } = data
    return { ...DEFAULT, ...rest } as ConfigVisual
  } catch {
    return { ...DEFAULT }
  }
}

async function saveToSupabase(cfg: ConfigVisual) {
  const { error } = await getSupabase().from('config_visual').upsert({ id: ROW_KEY, ...cfg })
  if (error) {
    throw new Error(error.message)
  }
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
    global.__fibConfigVisual2 = { ...global.__fibConfigVisual2!, ...d, actualizadoEn: new Date().toISOString() }
    if (isSupabaseEnabled) await saveToSupabase(global.__fibConfigVisual2)
  },
  reset: async () => {
    await global.__fibConfigVisualInit
    global.__fibConfigVisual2 = { ...DEFAULT }
    if (isSupabaseEnabled) await saveToSupabase(global.__fibConfigVisual2)
  },
}
