'use client'
import { useEffect, useState } from 'react'

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
}

const DEFAULT: ConfigVisual = {
  nombreDivision:     'Federal Investigation Bureau',
  descripcionDivision:'',
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
}

export function useConfigVisual() {
  const [config, setConfig] = useState<ConfigVisual>(DEFAULT)

  useEffect(() => {
    fetch('/api/config-visual')
      .then(r => r.json())
      .then(c => {
        setConfig(c)
        applyCSSVars(c)
      })
      .catch(() => {})
  }, [])

  return config
}

export function applyCSSVars(cfg: ConfigVisual) {
  if (typeof document === 'undefined') return
  const r = document.documentElement.style
  r.setProperty('--color-accent-blue',  cfg.colorPrimario || '#1B6FFF')
  r.setProperty('--color-accent-cyan',  cfg.colorAcento   || '#00C4FF')
  r.setProperty('--sidebar-bg',         cfg.colorSidebar  || '#101820')
}
