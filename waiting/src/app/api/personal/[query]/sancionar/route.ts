import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden, notFound, err } from '@/lib/auth'
import { getRows, setCell, addRow, findAgent, today, COL } from '@/lib/sheets'
import { CONFIG } from '@/lib/config'
import { logRegistroImportante, logSancion } from '@/lib/webhook'

export async function POST(req: NextRequest, { params }: { params: Promise<{query:string}> }) {
  const u = getUser(req); if (!u) return unauthorized()
  if (!['command_staff','supervisory'].includes(u.rol)) return forbidden()
  const { tipo, motivo } = await req.json().catch(()=>({}))
  if (!tipo || !motivo) return err('tipo y motivo son requeridos')
  if (!['Leve','Moderada','Grave'].includes(tipo)) return err('Tipo inválido')
  const { query } = await params
  const rows = await getRows(CONFIG.sheets.personal)
  const idx  = findAgent(rows, decodeURIComponent(query))
  if (idx === -1) return notFound()
  const row = rows[idx]
  if (['Expulsado','Vetado'].includes(row[COL.ESTADO])) return err('El agente ya está expulsado o vetado')
  let leves  = parseInt(row[COL.S_LEVE]  ||'0')
  let mods   = parseInt(row[COL.S_MOD]   ||'0')
  let graves = parseInt(row[COL.S_GRAVE] ||'0')
  if (tipo==='Leve')     leves++
  if (tipo==='Moderada') mods++
  if (tipo==='Grave')    graves++
  await addRow(CONFIG.sheets.sanciones, [today(), row[COL.NOMBRE], row[COL.DISCORD_ID], tipo, motivo, u.username, 'Activa'])
  const escalado: string[] = []
  if (leves >= CONFIG.sanciones.leves_para_moderada)  { leves -= CONFIG.sanciones.leves_para_moderada;  mods++;   escalado.push('3 leves → 1 Moderada') }
  if (mods  >= CONFIG.sanciones.moderadas_para_grave) { mods  -= CONFIG.sanciones.moderadas_para_grave; graves++; escalado.push('3 moderadas → 1 Grave') }
  const expulsado = graves >= CONFIG.sanciones.graves_para_expulsion
  await setCell(CONFIG.sheets.personal, idx, COL.S_LEVE,  leves)
  await setCell(CONFIG.sheets.personal, idx, COL.S_MOD,   mods)
  await setCell(CONFIG.sheets.personal, idx, COL.S_GRAVE, graves)
  await addRow(CONFIG.sheets.historial, [today(), row[COL.NOMBRE], `Sanción ${tipo}`, motivo, u.username, row[COL.DISCORD_ID]])
  if (expulsado) {
    await setCell(CONFIG.sheets.personal, idx, COL.ESTADO,    'Expulsado')
    await setCell(CONFIG.sheets.personal, idx, COL.FECHA_BAJA, today())
    await addRow(CONFIG.sheets.historial, [today(), row[COL.NOMBRE], 'Expulsión automática', '2 graves', u.username, row[COL.DISCORD_ID]])
    escalado.push('⚠️ EXPULSIÓN AUTOMÁTICA')
  }
  logSancion(row[COL.NOMBRE], tipo, motivo, u.username)
  logRegistroImportante('Sanción', row[COL.NOMBRE], u.username, `${tipo}: ${motivo}`)
  return NextResponse.json({ mensaje:'✅ Sanción aplicada', expulsado, escalado, contadores:{leves,mods,graves} })
}
