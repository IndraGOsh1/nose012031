import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, err, isUserFrozen, frozen } from '@/lib/auth'
import { buildSubmissionId, defaultConfig, getFormsDB, persistFormSubmission } from '@/lib/forms-db'
import { getRequestIp, rateLimit } from '@/lib/security'
import { logWebhook } from '@/lib/webhook'

type P = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: P) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()

  const ip = getRequestIp(req)
  const limit = rateLimit({ key: `forms:submit:${u.username}:${ip}`, max: 8, windowMs: 60_000 })
  if (!limit.ok) return err(`Demasiados envíos. Reintenta en ${limit.retryAfterSec}s`, 429)

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  // Simple anti-bot checks: hidden honeypot + minimal fill time.
  if (String(body?.hp || '').trim()) return err('Validación antibot fallida', 400)
  const startedAt = Number(body?.startedAt || 0)
  if (!startedAt || Date.now() - startedAt < 2000) return err('Validación antibot fallida', 400)

  const answers = body?.answers || {}
  const db = await getFormsDB()
  const form = db.forms.get(id)
  const cfg = db.config.get('global') || defaultConfig()
  if (!cfg.responsesOpen) return err('Recepción de respuestas desactivada temporalmente', 403)
  if (!form || !form.active || !form.acceptsResponses) return err('Formulario no disponible', 404)

  const classes = Array.isArray(u.clases) ? u.clases : []
  const roleAllowed = Array.isArray(form.allowedSubmitRoles) && form.allowedSubmitRoles.includes(u.rol)
  if (!roleAllowed) return err('Sin permisos para responder este formulario', 403)

  if (form.kind === 'oposicion') {
    const active = Array.from(db.submissions.values()).filter((s) => s.formId === id && s.state !== 'removed')
    const existsByUser = active.some((s) => s.byUser === u.username)
    if (existsByUser) return err('Ya enviaste una respuesta para esta oposicion', 409)
    const normalizedIp = String(ip || '').trim()
    if (normalizedIp) {
      const existsByIp = active.some((s) => String(s.ip || '').trim() === normalizedIp)
      if (existsByIp) return err('Ya existe un envio para esta oposicion desde esta IP', 409)
    }
  }

  if (form.deadlineAt) {
    const deadline = new Date(form.deadlineAt).getTime()
    if (Number.isFinite(deadline) && Date.now() > deadline) {
      return err('Este formulario ya cerró por fecha límite', 403)
    }
  }

  if (typeof form.maxResponses === 'number' && form.maxResponses > 0) {
    const current = Array.from(db.submissions.values()).filter((s) => s.formId === id && s.state !== 'removed').length
    if (current >= form.maxResponses) return err('Este formulario alcanzó el máximo de respuestas', 403)
  }

  if (typeof form.timeLimitMinutes === 'number' && form.timeLimitMinutes > 0 && startedAt) {
    const elapsedMs = Date.now() - startedAt
    if (elapsedMs > form.timeLimitMinutes * 60 * 1000) {
      return err('Tiempo límite superado para este formulario', 403)
    }
  }

  const cleaned: Record<string, string | string[]> = {}
  for (const field of form.fields) {
    const raw = answers[field.id]
    if (field.type === 'checkbox') {
      const list = Array.isArray(raw)
        ? raw.map((x: any) => String(x || '').trim()).filter(Boolean).slice(0, 50)
        : []
      if (field.required && list.length === 0) return err(`Campo requerido: ${field.label}`)
      cleaned[field.id] = list
      continue
    }

    if (field.type === 'image') {
      const list = Array.isArray(raw)
        ? raw.map((x: any) => String(x || '').trim().slice(0, 15000)).filter(Boolean).slice(0, 10)
        : []
      if (field.required && list.length === 0) return err(`Campo requerido: ${field.label}`)
      cleaned[field.id] = list
      continue
    }

    const value = String(raw ?? '').trim()
    if (field.required && !value) return err(`Campo requerido: ${field.label}`)
    const maxLen = typeof field.maxLength === 'number' && field.maxLength > 0 ? Math.min(field.maxLength, 15000) : 5000
    if (value.length > maxLen) return err(`Campo demasiado largo: ${field.label}`)
    cleaned[field.id] = value
  }

  const submission = {
    id: buildSubmissionId(),
    formId: form.id,
    byUser: u.username,
    byRole: u.rol,
    byClasses: classes,
    createdAt: new Date().toISOString(),
    answers: cleaned,
    state: 'active' as const,
    ip,
    userAgent: req.headers.get('user-agent') || 'unknown',
  }

  await persistFormSubmission(submission)
  await logWebhook({
    type: 'extras',
    title: '🧾 Nueva respuesta de formulario',
    fields: [
      { name: 'Formulario', value: `${form.title} (${form.id})`, inline: false },
      { name: 'Usuario', value: u.username, inline: true },
      { name: 'Rol', value: u.rol, inline: true },
      { name: 'Rama', value: form.branch, inline: true },
    ],
  })
  return NextResponse.json({ mensaje: '✅ Formulario enviado' }, { status: 201 })
}
