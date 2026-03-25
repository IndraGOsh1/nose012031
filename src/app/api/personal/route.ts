import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden, err, notFound } from '@/lib/auth'
import { getRows, setCell, addRow, findAgent, toAgent, nextNumber, today, COL } from '@/lib/sheets'
import { CONFIG, seccionDeRango } from '@/lib/config'

// GET /api/personal — lista con filtros
export async function GET(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  const { searchParams } = new URL(req.url)
  const estado  = searchParams.get('estado')
  const seccion = searchParams.get('seccion')
  const search  = searchParams.get('q')

  const rows = await getRows(CONFIG.sheets.personal)
  let list = rows.filter(r => r[COL.NOMBRE]).map(toAgent)
  if (estado)  list = list.filter(a => a.estado.toLowerCase()  === estado.toLowerCase())
  if (seccion) list = list.filter(a => a.seccion.toLowerCase() === seccion.toLowerCase())
  if (search)  list = list.filter(a =>
    a.nombre.toLowerCase().includes(search.toLowerCase()) ||
    a.apodo.toLowerCase().includes(search.toLowerCase()) ||
    a.numero.includes(search)
  )
  return NextResponse.json({ total: list.length, agentes: list })
}

// POST /api/personal — registrar nuevo agente
export async function POST(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  if (!['command_staff','supervisory'].includes(u.rol)) return forbidden()

  const { nombre, apodo='', rango, discordId='', numeroForzado } = await req.json().catch(() => ({}))
  if (!nombre?.trim() || !rango) return err('nombre y rango son requeridos')

  const rows = await getRows(CONFIG.sheets.personal)
  if (findAgent(rows, nombre) !== -1) return err('Ya existe un agente con ese nombre')

  let numero = numeroForzado
  if (numero) {
    const usados = rows.map(r => parseInt(r[COL.NUMERO])).filter(n => !isNaN(n))
    if (usados.includes(Number(numero))) return err(`El número ${numero} ya está en uso`)
  } else {
    numero = nextNumber(rows)
  }

  const seccion = seccionDeRango(rango)
  await addRow(CONFIG.sheets.personal, [
    nombre.trim(), apodo, discordId, today(),
    'Activo', seccion, rango, numero, '', 0, 0, 0, '', 0, '',
  ])
  await addRow(CONFIG.sheets.historial, [
    today(), nombre.trim(), 'Ingreso', `Rango: ${rango} | N°${numero}`, u.username, discordId,
  ])

  return NextResponse.json({ mensaje:'✅ Agente registrado', nombre: nombre.trim(), numero, rango, seccion }, { status:201 })
}
