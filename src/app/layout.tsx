import type { Metadata } from 'next'
import './globals.css'
import ConfigVisualProvider from '@/components/ConfigVisualProvider'

export const metadata: Metadata = {
  title: 'Federal Investigation Bureau | HQ',
  description: 'Sistema interno de gestión — FIB',
  icons: { icon: 'https://i.imgur.com/EAimMhx.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ConfigVisualProvider>
          {children}
        </ConfigVisualProvider>
      </body>
    </html>
  )
}
