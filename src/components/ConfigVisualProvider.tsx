'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const BANNER_COLOR: Record<string,string> = {
  blue:  'bg-blue-900/40 border-blue-700 text-blue-200',
  red:   'bg-red-900/40 border-red-700 text-red-200',
  gold:  'bg-yellow-900/40 border-yellow-700 text-yellow-200',
  green: 'bg-green-900/40 border-green-700 text-green-200',
}

export default function ConfigVisualProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig]         = useState<any>(null)
  const [bannerDismissed, setBanner]= useState(false)

  useEffect(() => {
    fetch('/api/config-visual')
      .then(r => r.json())
      .then(c => {
        setConfig(c)
        // Apply CSS variables
        const r = document.documentElement.style
        if (c.colorPrimario) r.setProperty('--tw-accent-blue',  c.colorPrimario)
        if (c.colorAcento)   r.setProperty('--tw-accent-cyan',  c.colorAcento)
        if (c.colorSidebar)  {
          // Update sidebar color via CSS variable
          r.setProperty('--sidebar-color', c.colorSidebar)
          document.querySelectorAll<HTMLElement>('[data-sidebar]').forEach(el => {
            el.style.background = c.colorSidebar
          })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <>
      {/* Banner global */}
      {config?.bannerActivo && config?.bannerTexto && !bannerDismissed && (
        <div className={`fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-4 py-2 border-b font-mono text-xs ${BANNER_COLOR[config.bannerColor] || BANNER_COLOR.blue}`}>
          <span>📢 {config.bannerTexto}</span>
          <button onClick={() => setBanner(true)} className="opacity-60 hover:opacity-100 transition-opacity ml-4 shrink-0">
            <X size={12}/>
          </button>
        </div>
      )}

      {/* Push content down if banner is visible */}
      {config?.bannerActivo && config?.bannerTexto && !bannerDismissed && (
        <div className="h-8" />
      )}

      {children}
    </>
  )
}
