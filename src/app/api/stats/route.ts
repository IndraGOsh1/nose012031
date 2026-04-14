import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized } from '@/lib/auth'
import { getRows, COL } from '@/lib/sheets'
import { CONFIG } from '@/lib/config'

export async function GET(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  const rows    = await getRows(CONFIG.sheets.personal)
  const agentes = rows.filter(r => r[COL.NOMBRE])
  const porSeccion: Record<string,number> = {}
  agentes.filter(r => r[COL.ESTADO]==='Activo').forEach(r => {
    const s = r[COL.SECCION]||'Sin sección'
    porSeccion[s] = (porSeccion[s]||0) + 1
  })
  return NextResponse.json({
    total: agentes.length,
    activos:    agentes.filter(r => r[COL.ESTADO]==='Activo').length,
    retirados:  agentes.filter(r => r[COL.ESTADO]==='Retirado').length,
    expulsados: agentes.filter(r => r[COL.ESTADO]==='Expulsado').length,
    vetados:    agentes.filter(r => r[COL.ESTADO]==='Vetado').length,
    porSeccion,
  })
}
