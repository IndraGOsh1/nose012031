import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden, err } from '@/lib/auth'
import {
  FORM_BRANCHES,
  FORM_VIEWER_KEYS,
  buildFormId,
  deleteFormDefinition,
  deleteFormSubmissionsByFormId,
  defaultConfig,
  getFormsDB,
  persistFormDefinition,
  persistFormsConfig,
  resetFormsStore,
  type FormDefinition,
  type FormField,
  type FormFieldType,
  type FormTheme,
  type FormViewerKey,
} from '@/lib/forms-db'
import { logExtra } from '@/lib/webhook'

const EDITOR_ROLES = ['command_staff', 'supervisory']
const FIELD_TYPES: FormFieldType[] = ['text', 'textarea', 'number', 'date', 'select', 'radio', 'checkbox', 'image']

function canManage(rol: string) {
  return EDITOR_ROLES.includes(rol)
}

function userViewerKeys(u: { rol: string; clases?: string[] }) {
  const classes = Array.isArray(u.clases) ? u.clases : []
  return new Set<string>([u.rol, ...classes])
}

function canViewResponsesFor(u: { rol: string; clases?: string[] }, form: FormDefinition) {
  const keys = userViewerKeys(u)
  return (Array.isArray(form.allowedViewerKeys) ? form.allowedViewerKeys : []).some(k => keys.has(k))
}

function sanitizeTheme(raw: any): FormTheme {
  const fallback: FormTheme = {
    mode: 'glass',
    accent: '#4f7cff',
    surface: '#121a33',
    background: '#090f1f',
  }
  if (!raw || typeof raw !== 'object') return fallback
  const mode = raw.mode === 'slate' ? 'slate' : 'glass'
  const accent = String(raw.accent || fallback.accent).slice(0, 20)
  const surface = String(raw.surface || fallback.surface).slice(0, 20)
  const background = String(raw.background || fallback.background).slice(0, 20)
  return { mode, accent, surface, background }
}

function sanitizeFields(fields: any[]): FormField[] {
  return (Array.isArray(fields) ? fields : [])
    .map((f: any, idx: number) => ({
      id: String(f?.id || `f_${idx + 1}`).trim(),
      label: String(f?.label || '').trim().slice(0, 180),
      placeholder: String(f?.placeholder || '').trim().slice(0, 200),
      helpText: String(f?.helpText || '').trim().slice(0, 500),
      maxLength: typeof f?.maxLength === 'number' && f.maxLength > 0 ? Math.min(f.maxLength, 15000) : undefined,
      type: FIELD_TYPES.includes(f?.type) ? f.type : 'text',
      required: !!f?.required,
      options: Array.isArray(f?.options)
        ? f.options.map((x: any) => String(x || '').trim().slice(0, 160)).filter(Boolean).slice(0, 40)
        : [],
      images: Array.isArray(f?.images)
        ? f.images.map((x: any) => String(x || '').trim().slice(0, 5000)).filter(Boolean).slice(0, 20)
        : [],
    }))
    .filter((f: FormField) => f.id && f.label)
    .slice(0, 100)
}

function sanitizeAllowedSubmitRoles(v: any): string[] {
  const raw = Array.isArray(v) ? v : []
  const keep = raw.map((x: any) => String(x || '').trim()).filter(Boolean)
  const unique = Array.from(new Set(keep))
  return unique.filter(r => ['command_staff', 'supervisory', 'federal_agent', 'visitante'].includes(r))
}

function sanitizeViewerKeys(v: any): FormViewerKey[] {
  const raw = Array.isArray(v) ? v : []
  const keep = raw.map((x: any) => String(x || '').trim()).filter(Boolean)
  const unique = Array.from(new Set(keep))
  return unique.filter(k => (FORM_VIEWER_KEYS as readonly string[]).includes(k)) as FormViewerKey[]
}

export async function GET(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  const db = await getFormsDB()
  const cfg = db.config.get('global') || defaultConfig()
  const forms = Array.from(db.forms.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  const keys = userViewerKeys(u)
  const visible = forms.filter((f) => {
    if (!f.active) return canManage(u.rol)
    if (!f.acceptsResponses && !canManage(u.rol)) return false
    if (f.kind === 'oposicion') {
      const roleAllowed = Array.isArray(f.allowedSubmitRoles) && f.allowedSubmitRoles.includes(u.rol)
      return roleAllowed || keys.has('RRHH') || keys.has('command_staff')
    }
    return true
  })

  return NextResponse.json({
    forms: visible,
    config: cfg,
    canManage: canManage(u.rol),
  })
}

export async function POST(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  if (!canManage(u.rol)) return forbidden()

  const body = await req.json().catch(() => ({}))
  const action = String(body?.action || '').trim()
  const db = await getFormsDB()

  if (action === 'update_global') {
    const current = db.config.get('global') || defaultConfig()
    const next = {
      ...current,
      responsesOpen: typeof body?.responsesOpen === 'boolean' ? body.responsesOpen : current.responsesOpen,
      allowedEditorRoles: ['command_staff', 'supervisory'] as Array<'command_staff' | 'supervisory'>,
      updatedAt: new Date().toISOString(),
      updatedBy: u.username,
    }
    await persistFormsConfig(next)
    logExtra('🧩 Configuración formularios', `${u.username} actualizó ajustes globales de formularios`)
    return NextResponse.json({ mensaje: '✅ Configuración global actualizada', config: next })
  }

  if (action === 'create') {
    const title = String(body?.form?.title || '').trim()
    if (!title) return err('Título requerido')

    const now = new Date().toISOString()
    const form: FormDefinition = {
      id: buildFormId(),
      title: title.slice(0, 180),
      description: String(body?.form?.description || '').trim().slice(0, 3000),
      active: body?.form?.active !== false,
      kind: body?.form?.kind === 'oposicion' ? 'oposicion' : 'general',
      branch: (FORM_BRANCHES as readonly string[]).includes(body?.form?.branch) ? body.form.branch : 'General',
      icon: String(body?.form?.icon || 'ClipboardList').trim().slice(0, 40),
      acceptsResponses: body?.form?.acceptsResponses !== false,
      deadlineAt: body?.form?.deadlineAt ? new Date(body.form.deadlineAt).toISOString() : null,
      timeLimitMinutes: typeof body?.form?.timeLimitMinutes === 'number' && body.form.timeLimitMinutes > 0 ? Math.min(body.form.timeLimitMinutes, 10080) : null,
      maxResponses: typeof body?.form?.maxResponses === 'number' && body.form.maxResponses > 0 ? Math.min(body.form.maxResponses, 100000) : null,
      allowedSubmitRoles: sanitizeAllowedSubmitRoles(body?.form?.allowedSubmitRoles),
      allowedViewerKeys: sanitizeViewerKeys(body?.form?.allowedViewerKeys),
      theme: sanitizeTheme(body?.form?.theme),
      createdBy: u.username,
      createdAt: now,
      updatedAt: now,
      fields: sanitizeFields(body?.form?.fields || []),
    }

    if (form.allowedSubmitRoles.length === 0) return err('Define al menos un rol que pueda responder')
    if (form.allowedViewerKeys.length === 0) return err('Define al menos un permiso para ver respuestas')
    if (form.fields.length === 0) return err('Debes agregar al menos un campo')
    await persistFormDefinition(form)
    logExtra('🧾 Formulario creado', `${u.username} creó ${form.title} (${form.branch})`)
    return NextResponse.json({ mensaje: '✅ Formulario creado', form })
  }

  if (action === 'update') {
    const id = String(body?.form?.id || '').trim()
    if (!id) return err('ID de formulario requerido')
    const current = db.forms.get(id)
    if (!current) return err('Formulario no encontrado', 404)

    const next: FormDefinition = {
      ...current,
      title: String(body?.form?.title || current.title).trim().slice(0, 180),
      description: String(body?.form?.description || current.description).trim().slice(0, 3000),
      active: body?.form?.active !== false,
      kind: body?.form?.kind === 'oposicion' ? 'oposicion' : 'general',
      branch: (FORM_BRANCHES as readonly string[]).includes(body?.form?.branch) ? body.form.branch : current.branch,
      icon: String(body?.form?.icon || current.icon || 'ClipboardList').trim().slice(0, 40),
      acceptsResponses: body?.form?.acceptsResponses !== false,
      deadlineAt: body?.form?.deadlineAt ? new Date(body.form.deadlineAt).toISOString() : null,
      timeLimitMinutes: typeof body?.form?.timeLimitMinutes === 'number' && body.form.timeLimitMinutes > 0 ? Math.min(body.form.timeLimitMinutes, 10080) : null,
      maxResponses: typeof body?.form?.maxResponses === 'number' && body.form.maxResponses > 0 ? Math.min(body.form.maxResponses, 100000) : null,
      allowedSubmitRoles: sanitizeAllowedSubmitRoles(body?.form?.allowedSubmitRoles ?? current.allowedSubmitRoles),
      allowedViewerKeys: sanitizeViewerKeys(body?.form?.allowedViewerKeys ?? current.allowedViewerKeys),
      theme: sanitizeTheme(body?.form?.theme || current.theme),
      updatedAt: new Date().toISOString(),
      fields: sanitizeFields(body?.form?.fields || current.fields),
    }
    if (!next.title) return err('Título requerido')
    if (next.allowedSubmitRoles.length === 0) return err('Define al menos un rol que pueda responder')
    if (next.allowedViewerKeys.length === 0) return err('Define al menos un permiso para ver respuestas')
    if (next.fields.length === 0) return err('Debes agregar al menos un campo')

    await persistFormDefinition(next)
    logExtra('🛠️ Formulario actualizado', `${u.username} actualizó ${next.title}`)
    return NextResponse.json({ mensaje: '✅ Formulario actualizado', form: next })
  }

  if (action === 'toggle') {
    const id = String(body?.id || '').trim()
    const current = db.forms.get(id)
    if (!current) return err('Formulario no encontrado', 404)
    const next = { ...current, active: !current.active, updatedAt: new Date().toISOString() }
    await persistFormDefinition(next)
    logExtra('🔀 Formulario alternado', `${u.username} cambió estado de ${next.title} a ${next.active ? 'activo' : 'inactivo'}`)
    return NextResponse.json({ mensaje: '✅ Estado actualizado', form: next })
  }

  if (action === 'delete') {
    const id = String(body?.id || '').trim()
    if (!db.forms.has(id)) return err('Formulario no encontrado', 404)
    await deleteFormSubmissionsByFormId(id)
    await deleteFormDefinition(id)
    logExtra('🗑️ Formulario eliminado', `${u.username} eliminó formulario ${id}`)
    return NextResponse.json({ mensaje: '✅ Formulario eliminado' })
  }

  if (action === 'reset_all') {
    if (u.rol !== 'command_staff') return forbidden()
    const nextConfig = {
      ...defaultConfig(),
      updatedBy: u.username,
      updatedAt: new Date().toISOString(),
    }
    await resetFormsStore(nextConfig)
    logExtra('♻️ Reset formularios', `${u.username} reinició formularios y respuestas`)
    return NextResponse.json({ mensaje: '✅ Formularios reiniciados' })
  }

  if (action === 'responses_for_form') {
    const id = String(body?.id || '').trim()
    const form = db.forms.get(id)
    if (!form) return err('Formulario no encontrado', 404)
    if (!canViewResponsesFor(u, form)) return forbidden()
    const responses = Array.from(db.submissions.values())
      .filter((s) => s.formId === id && s.state !== 'removed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return NextResponse.json({ form, responses })
  }

  return err('Acción inválida')
}
