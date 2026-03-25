import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden, notFound } from '@/lib/auth'
import { getRows, setCell, addRow, findAgent, toAgent, today, COL } from '@/lib/sheets'
import { CONFIG, seccionDeRango, todosLosRangos } from '@/lib/config'
import { logRegistroImportante } from '@/lib/webhook'

export async function GET(req: NextRequest, { params }: { params: Promise<{ query: string }> }) {
  const u = getUser(req); if (!u) return unauthorized()
  const { query } = await params
  const rows = await getRows(CONFIG.sheets.personal)
  const idx  = findAgent(rows, decodeURIComponent(query))
  if (idx === -1) return notFound('Agente no encontrado')
  const rowsH = await getRows(CONFIG.sheets.historial)
  const rowsS = await getRows(CONFIG.sheets.sanciones)
  const nombre = rows[idx][COL.NOMBRE]
  const did    = rows[idx][COL.DISCORD_ID]
  const historial = rowsH.filter(r=>r[1]===nombre||r[5]===did).map(r=>({fecha:r[0],accion:r[2],detalle:r[3],responsable:r[4]})).reverse()
  const sanciones = rowsS.filter(r=>r[1]===nombre||r[2]===did).map(r=>({fecha:r[0],tipo:r[3],motivo:r[4],responsable:r[5],estado:r[6]})).reverse()
  return NextResponse.json({ ...toAgent(rows[idx]), historial, sanciones })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ query: string }> }) {
  const u = getUser(req); if (!u) return unauthorized()
  if (!['command_staff','supervisory'].includes(u.rol)) return forbidden()
  const { query } = await params
  const rows = await getRows(CONFIG.sheets.personal)
  const idx  = findAgent(rows, decodeURIComponent(query))
  if (idx === -1) return notFound()
  const body = await req.json().catch(()=>({}))
  const nombre = rows[idx][COL.NOMBRE]
  const did    = rows[idx][COL.DISCORD_ID]
  const changes: string[] = []
  if (body.rango !== undefined) {
    const oldRango = rows[idx][COL.RANGO]
    const sec = seccionDeRango(body.rango)
    await setCell(CONFIG.sheets.personal, idx, COL.RANGO,   body.rango)
    await setCell(CONFIG.sheets.personal, idx, COL.SECCION, sec)
    await addRow(CONFIG.sheets.historial, [today(), nombre, 'Cambio de Rango', `${oldRango} → ${body.rango}`, u.username, did])
    const orden = todosLosRangos()
    const oldIdx = orden.indexOf(oldRango)
    const newIdx = orden.indexOf(body.rango)
    if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
      const accion = newIdx < oldIdx ? 'Ascenso' : 'Descenso'
      logRegistroImportante(accion, nombre, u.username, `${oldRango} → ${body.rango}`)
    }
    changes.push(`Rango: ${body.rango}`)
  }
  if (body.estado !== undefined) {
    await setCell(CONFIG.sheets.personal, idx, COL.ESTADO, body.estado)
    if (['Retirado','Expulsado','Vetado'].includes(body.estado)) await setCell(CONFIG.sheets.personal, idx, COL.FECHA_BAJA, today())
    await addRow(CONFIG.sheets.historial, [today(), nombre, `Estado: ${body.estado}`, body.motivo||'', u.username, did])
    changes.push(`Estado: ${body.estado}`)
  }
  if (body.apodo     !== undefined) { await setCell(CONFIG.sheets.personal, idx, COL.APODO,    body.apodo);   changes.push(`Apodo: ${body.apodo}`) }
  if (body.especial  !== undefined) { await setCell(CONFIG.sheets.personal, idx, COL.ESPECIAL, body.especial); changes.push('Especialidades actualizadas') }
  if (body.discordId !== undefined)   await setCell(CONFIG.sheets.personal, idx, COL.DISCORD_ID, body.discordId)
  if (body.notas !== undefined) {
    const prev = rows[idx][COL.NOTAS] || ''
    const nueva = prev ? `${prev}\n[${today()}] ${body.notas}` : `[${today()}] ${body.notas}`
    await setCell(CONFIG.sheets.personal, idx, COL.NOTAS, nueva)
    changes.push('Nota agregada')
  }
  if (body.reingreso) {
    const reingresos = (parseInt(rows[idx][COL.REINGRESOS])||0) + 1
    await setCell(CONFIG.sheets.personal, idx, COL.ESTADO,        'Activo')
    await setCell(CONFIG.sheets.personal, idx, COL.FECHA_INGRESO, today())
    await setCell(CONFIG.sheets.personal, idx, COL.FECHA_BAJA,    '')
    await setCell(CONFIG.sheets.personal, idx, COL.REINGRESOS,    reingresos)
    if (body.rango) {
      await setCell(CONFIG.sheets.personal, idx, COL.RANGO,   body.rango)
      await setCell(CONFIG.sheets.personal, idx, COL.SECCION, seccionDeRango(body.rango))
    }
    await addRow(CONFIG.sheets.historial, [today(), nombre, 'Reingreso', `Reingreso #${reingresos}`, u.username, did])
    changes.push('Reingreso procesado')
  }
  return NextResponse.json({ mensaje:'✅ Agente actualizado', cambios: changes })
}
