import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden } from '@/lib/auth'
import { getCasosDB } from '@/lib/casos-db'
import { getTicketsDB } from '@/lib/tickets-db'
import { getAllanamientosDB } from '@/lib/allanamientos-db'
import { getOpsDB } from '@/lib/operativos-db'
import { getCarpetasDB } from '@/lib/carpeta-db'
import { getDB } from '@/lib/db'

type ExportFormat = 'csv' | 'html' | 'pdf'

function esc(value: any) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim()
}

function csvCell(value: any) {
  const text = esc(value).replace(/"/g, '""')
  return `"${text}"`
}

function htmlEsc(value: any) {
  return esc(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function userMeta(users: Map<string, any>, username: string) {
  const u = Array.from(users.values()).find((it: any) => it.username === username)
  if (!u) return '— | — | —'
  return `${u.nombre || u.username || '—'} | ${u.agentNumber || '—'} | ${u.callsign || '—'}`
}

export async function GET(req: NextRequest) {
  const u = getUser(req)
  if (!u) return unauthorized()
  if (!['command_staff', 'supervisory'].includes(u.rol)) return forbidden()

  const { searchParams } = new URL(req.url)
  const format = String(searchParams.get('format') || 'csv').toLowerCase() as ExportFormat
  const now = new Date().toISOString()

  const [casosDB, ticketsDB, allanDB, opsDB, carpetasDB, baseDB] = await Promise.all([
    getCasosDB(),
    getTicketsDB(),
    getAllanamientosDB(),
    getOpsDB(),
    getCarpetasDB(),
    getDB(),
  ])

  const rows: Array<Record<string, string>> = []

  for (const c of Array.from(casosDB.values())) {
    rows.push({
      modulo: 'casos',
      id: c.id,
      numero: c.numeroCaso,
      titulo: c.titulo,
      estado: c.estado,
      unidad: c.unidad,
      autor: c.creadoPor,
      agente: userMeta(baseDB.users, c.creadoPor),
      fecha: c.creadoEn,
    })
  }

  for (const t of Array.from(ticketsDB.values())) {
    rows.push({
      modulo: 'tickets',
      id: t.id,
      numero: t.numeroTicket,
      titulo: t.titulo,
      estado: t.estado,
      unidad: t.tipo,
      autor: t.creadoPor,
      agente: userMeta(baseDB.users, t.creadoPor),
      fecha: t.creadoEn,
    })
  }

  for (const a of Array.from(allanDB.values())) {
    rows.push({
      modulo: 'allanamientos',
      id: a.id,
      numero: a.numeroSolicitud,
      titulo: a.direccion,
      estado: a.estado,
      unidad: a.unidad,
      autor: a.solicitadoPor,
      agente: userMeta(baseDB.users, a.solicitadoPor),
      fecha: a.fechaSolicitud,
    })
  }

  for (const o of Array.from(opsDB.values())) {
    rows.push({
      modulo: 'operativos',
      id: o.id,
      numero: o.id,
      titulo: o.titulo,
      estado: o.estado,
      unidad: o.unidad,
      autor: o.creadoPor,
      agente: userMeta(baseDB.users, o.creadoPor),
      fecha: o.creadoEn,
    })
  }

  for (const c of Array.from(carpetasDB.values())) {
    rows.push({
      modulo: 'carpetas',
      id: c.username,
      numero: c.username,
      titulo: `Anotaciones ${c.anotaciones?.length || 0} / Hilos ${c.hilos?.length || 0}`,
      estado: 'activo',
      unidad: 'carpeta_personal',
      autor: c.username,
      agente: userMeta(baseDB.users, c.username),
      fecha: new Date().toISOString(),
    })
  }

  rows.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  if (format === 'csv') {
    const headers = ['modulo', 'id', 'numero', 'titulo', 'estado', 'unidad', 'autor', 'agente', 'fecha']
    const csv = [
      headers.map(csvCell).join(','),
      ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(',')),
    ].join('\n')

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="fib-export-${now.slice(0, 10)}.csv"`,
      },
    })
  }

  const tableRows = rows
    .map((r) => `<tr>${['modulo', 'numero', 'titulo', 'estado', 'unidad', 'autor', 'agente', 'fecha'].map((k) => `<td>${htmlEsc(r[k])}</td>`).join('')}</tr>`)
    .join('')

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>FIB Export ${htmlEsc(now)}</title>
  <style>
    body{font-family:Arial,sans-serif;background:#0b1020;color:#e5e7eb;padding:24px}
    h1{margin:0 0 6px 0;font-size:24px}
    p{margin:0 0 16px 0;color:#9ca3af}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #1f2937;padding:8px;text-align:left;vertical-align:top}
    th{background:#111827;position:sticky;top:0}
    tr:nth-child(even){background:#0f172a}
    .muted{color:#6b7280}
  </style>
</head>
<body>
  <h1>Exportación Global FIB</h1>
  <p>Generado: ${htmlEsc(now)} · Registros: ${rows.length}</p>
  <table>
    <thead>
      <tr><th>Módulo</th><th>Número</th><th>Título</th><th>Estado</th><th>Unidad</th><th>Autor</th><th>Nombre | N° agente | Callsign</th><th>Fecha</th></tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  ${format === 'pdf' ? '<script>window.onload=()=>setTimeout(()=>window.print(),200)</script>' : ''}
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="fib-export-${now.slice(0, 10)}.${format === 'pdf' ? 'html' : 'html'}"`,
    },
  })
}
