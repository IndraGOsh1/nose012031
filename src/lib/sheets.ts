import { google } from 'googleapis'

// Soporta credentials.json local (dev) o variable de entorno GOOGLE_CREDENTIALS (Vercel)
function getAuth() {
  if (process.env.GOOGLE_CREDENTIALS) {
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS)
    return new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
  }
  return new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes:  ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

const auth = getAuth()
const api  = google.sheets({ version: 'v4', auth })
const SSID = process.env.SPREADSHEET_ID!

function sanitizeSheetValue(val: string | number): string | number {
  if (typeof val !== 'string') return val
  const trimmed = val.trimStart()
  // Prevent formula injection in USER_ENTERED mode.
  if (/^[=+\-@]/.test(trimmed)) return `'${val}`
  return val
}

export const COL = {
  NOMBRE:0, APODO:1, DISCORD_ID:2, FECHA_INGRESO:3,
  ESTADO:4, SECCION:5, RANGO:6, NUMERO:7,
  ESPECIAL:8, S_LEVE:9, S_MOD:10, S_GRAVE:11,
  FECHA_BAJA:12, REINGRESOS:13, NOTAS:14,
} as const

export async function getRows(sheet: string): Promise<string[][]> {
  const r = await api.spreadsheets.values.get({ spreadsheetId:SSID, range:`${sheet}!A:P` })
  return (r.data.values || []) as string[][]
}

export async function setCell(sheet: string, row: number, col: number, val: string|number) {
  await api.spreadsheets.values.update({
    spreadsheetId:SSID, range:`${sheet}!${String.fromCharCode(65+col)}${row+1}`,
    valueInputOption:'USER_ENTERED', requestBody:{ values:[[sanitizeSheetValue(val)]] },
  })
}

export async function addRow(sheet: string, data: (string|number)[]) {
  await api.spreadsheets.values.append({
    spreadsheetId:SSID, range:`${sheet}!A:P`,
    valueInputOption:'USER_ENTERED', requestBody:{ values:[data.map(sanitizeSheetValue)] },
  })
}

export function findAgent(rows: string[][], q: string): number {
  const query = q.toLowerCase().trim()
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if ((r[COL.NOMBRE]||'').toLowerCase().includes(query)) return i
    if ((r[COL.APODO]||'').toLowerCase() === query) return i
    if ((r[COL.DISCORD_ID]||'') === q) return i
    if ((r[COL.NUMERO]||'').toString() === q) return i
  }
  return -1
}

export function toAgent(r: string[]) {
  return {
    nombre:       r[COL.NOMBRE]        || '',
    apodo:        r[COL.APODO]         || '',
    discordId:    r[COL.DISCORD_ID]    || '',
    fechaIngreso: r[COL.FECHA_INGRESO] || '',
    estado:       r[COL.ESTADO]        || '',
    seccion:      r[COL.SECCION]       || '',
    rango:        r[COL.RANGO]         || '',
    numero:       r[COL.NUMERO]        || '',
    especial:     r[COL.ESPECIAL]      || '',
    sLeves:       r[COL.S_LEVE]        || '0',
    sModeradas:   r[COL.S_MOD]         || '0',
    sGraves:      r[COL.S_GRAVE]       || '0',
    fechaBaja:    r[COL.FECHA_BAJA]    || '',
    reingresos:   r[COL.REINGRESOS]    || '0',
    notas:        r[COL.NOTAS]         || '',
  }
}

export function nextNumber(rows: string[][]): number {
  const used = new Set(rows.map(r => parseInt(r[COL.NUMERO])).filter(n => !isNaN(n)))
  ;[2001,2005,2006].forEach(n => used.add(n))
  let n = 2010; while (used.has(n)) n++; return n
}

export function today(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
