'use client'
import { createContext, useContext, useEffect, useState } from 'react'

export interface Theme {
  sidebarColor:    string
  sidebarTextColor:string
  accentColor:     string
  logoUrl:         string
  divisionName:    string
  dashboardBgUrl:  string
  welcomeEnabled:  boolean
  welcomeBanner:   string
}

const DEFAULT_THEME: Theme = {
  sidebarColor:    '#101820',
  sidebarTextColor:'#ffffff',
  accentColor:     '#1B6FFF',
  logoUrl:         'https://i.imgur.com/EAimMhx.png',
  divisionName:    'Federal Investigation Bureau',
  dashboardBgUrl:  '',
  welcomeEnabled:  false,
  welcomeBanner:   '',
}

const ThemeContext = createContext<{ theme: Theme }>({ theme: DEFAULT_THEME })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME)

  useEffect(() => {
    fetch('/api/config-visual')
      .then(r => r.json())
      .then(c => {
        setTheme({
          sidebarColor:    c.colorSidebar    || DEFAULT_THEME.sidebarColor,
          sidebarTextColor:'#ffffff',
          accentColor:     c.colorAcento     || c.colorPrimario || DEFAULT_THEME.accentColor,
          logoUrl:         c.logoUrl         || DEFAULT_THEME.logoUrl,
          divisionName:    c.nombreDivision  || DEFAULT_THEME.divisionName,
          dashboardBgUrl:  c.fondoDashboardUrl || '',
          welcomeEnabled:  c.bannerActivo    || false,
          welcomeBanner:   c.bannerTexto     || '',
        })
      })
      .catch(() => {})
  }, [])

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
