import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden, err } from '@/lib/auth'
import { getFormsDB, persistFormSubmission } from '@/lib/forms-db'
import { logExtra } from '@/lib/webhook'

type P = { params: Promise<{ id: string }> }

function userKeys(u: { rol: string; clases?: string[] }) {
  return new Set<string>([u.rol, ...(Array.isArray(u.clases) ? u.clases : [])])
}

function canView(u: { rol: string; clases?: string[] }, form: any) {
  const keys = userKeys(u)
  const viewers = Array.isArray(form.allowedViewerKeys) ? form.allowedViewerKeys : []
  if (form.kind === 'oposicion' && !keys.has('RRHH') && !keys.has('command_staff')) return false
  return viewers.some((k: string) => keys.has(k))
}

export async function GET(req: NextRequest, { params }: P) {
  const u = getUser(req); if (!u) return unauthorized()

  const { id } = await params
  const db = await getFormsDB()
  const form = db.forms.get(id)
  if (!form) return err('Formulario no encontrado', 404)
  if (!canView(u, form)) return forbidden()

  const responses = Array.from(db.submissions.values())
    .filter(s => s.formId === id && s.state !== 'removed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json({ form, responses })
}

export async function PATCH(req: NextRequest, { params }: P) {
  const u = getUser(req); if (!u) return unauthorized()
  if (!['command_staff', 'supervisory'].includes(u.rol)) return forbidden()

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const submissionId = String(body?.submissionId || '').trim()
  if (!submissionId) return err('submissionId requerido')

  const db = await getFormsDB()
  const form = db.forms.get(id)
  if (!form) return err('Formulario no encontrado', 404)
  if (!canView(u, form)) return forbidden()

  const current = db.submissions.get(submissionId)
  if (!current || current.formId !== id) return err('Respuesta no encontrada', 404)
  const rawAnswers = body?.answers
  if (!rawAnswers || typeof rawAnswers !== 'object') return err('answers inválido')

  const nextAnswers: Record<string, string | string[]> = {}
  for (const field of form.fields || []) {
    const value = rawAnswers[field.id]
    if (field.type === 'checkbox' || field.type === 'image') {
      nextAnswers[field.id] = Array.isArray(value)
        ? value.map((x: any) => String(x || '').trim().slice(0, 15000)).filter(Boolean).slice(0, 50)
        : []
    } else {
      nextAnswers[field.id] = String(value ?? '').trim().slice(0, 15000)
    }
  }

  const next = { ...current, answers: nextAnswers }
  await persistFormSubmission(next)
  logExtra('🧰 Respuesta editada', `${u.username} editó respuesta ${submissionId} del formulario ${id}`)
  return NextResponse.json({ mensaje: '✅ Respuesta actualizada', submission: next })
}

export async function DELETE(req: NextRequest, { params }: P) {
  const u = getUser(req); if (!u) return unauthorized()
  if (!['command_staff', 'supervisory'].includes(u.rol)) return forbidden()

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const submissionId = String(body?.submissionId || '').trim()
  if (!submissionId) return err('submissionId requerido')

  const db = await getFormsDB()
  const form = db.forms.get(id)
  if (!form) return err('Formulario no encontrado', 404)
  if (!canView(u, form)) return forbidden()

  const current = db.submissions.get(submissionId)
  if (!current || current.formId !== id) return err('Respuesta no encontrada', 404)

  const next = { ...current, state: 'removed' as const }
  await persistFormSubmission(next)
  logExtra('🧹 Respuesta eliminada', `${u.username} retiró respuesta ${submissionId} del formulario ${id}`)
  return NextResponse.json({ mensaje: '✅ Respuesta eliminada' })
}
