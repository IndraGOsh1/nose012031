import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getUser, unauthorized, forbidden, err } from '@/lib/auth'
import { ConfigVisualDB } from '@/lib/config-visual-db'

function getAuth() {
  if (process.env.GOOGLE_CREDENTIALS) {
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS)
    return new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
  }
  return new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

function userKeys(u: { rol: string; clases?: string[] }) {
  return new Set<string>([u.rol, ...(Array.isArray(u.clases) ? u.clases : [])])
}

export async function GET(_req: NextRequest) {
  const u = getUser(_req)
  if (!u) return unauthorized()

  const keys = userKeys(u)
  const canView = keys.has('command_staff') || keys.has('supervisory') || keys.has('RRHH')
  if (!canView) return forbidden()

  await ConfigVisualDB.ready()
  const cfg = ConfigVisualDB.get()
  const opp = cfg.oposicionesInfo || ({} as any)
  const spreadsheetId = String(opp.googleResponsesSheetId || '').trim()
  const range = String(opp.googleResponsesRange || 'A:Z').trim()

  if (!spreadsheetId) {
    return err('Configura googleResponsesSheetId en Admin > Website/Oposiciones', 400)
  }

  try {
    const auth = getAuth()
    const api = google.sheets({ version: 'v4', auth })
    const result = await api.spreadsheets.values.get({ spreadsheetId, range })
    const values = (result.data.values || []) as string[][]
    if (values.length === 0) {
      return NextResponse.json({ headers: [], rows: [], count: 0 })
    }

    const headers = (values[0] || []).map((h) => String(h || '').trim())
    const rows = values.slice(1).map((row, idx) => {
      const record: Record<string, string> = {}
      headers.forEach((key, col) => {
        const fallback = `col_${col + 1}`
        const k = key || fallback
        record[k] = String(row[col] || '').trim()
      })
      return {
        id: `gfr-${idx + 1}`,
        values: record,
      }
    })

    return NextResponse.json({
      headers,
      rows,
      count: rows.length,
      spreadsheetId,
      range,
    })
  } catch (e: any) {
    return err(e?.message || 'No se pudieron leer respuestas de Google Sheets', 502)
  }
}
