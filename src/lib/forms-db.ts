import { v4 as uuid } from 'uuid'
import { SupabaseMap, persistentMapClear, persistentMapDelete, persistentMapSet } from './supabase-map'
import { createClient } from '@supabase/supabase-js'
import { getSecret } from './secrets'

export const FORM_BRANCHES = [
  'Undercover Operation',
  'Critical Response Incident Group',
  'Task Force',
  'RRHH',
  'General',
] as const

export const FORM_CLASSES = ['RRHH', 'CIRG', 'Task Force', 'UO', 'General'] as const

export const FORM_VIEWER_KEYS = ['command_staff', 'supervisory', 'federal_agent', 'visitante', 'RRHH', 'CIRG', 'Task Force', 'UO'] as const

export type FormBranch = (typeof FORM_BRANCHES)[number]
export type FormClass = (typeof FORM_CLASSES)[number]
export type FormViewerKey = (typeof FORM_VIEWER_KEYS)[number]

export type FormFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'image'

export type FormThemeMode = 'glass' | 'slate'

export interface FormTheme {
  mode: FormThemeMode
  accent: string
  surface: string
  background: string
}

export interface FormField {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  placeholder?: string
  helpText?: string
  maxLength?: number
  options?: string[]
  images?: string[]
}

export interface FormDefinition {
  id: string
  title: string
  description: string
  active: boolean
  kind: 'general' | 'oposicion'
  branch: FormBranch
  icon: string
  acceptsResponses: boolean
  deadlineAt: string | null
  timeLimitMinutes: number | null
  maxResponses: number | null
  allowedSubmitRoles: string[]
  allowedViewerKeys: FormViewerKey[]
  theme: FormTheme
  createdBy: string
  createdAt: string
  updatedAt: string
  fields: FormField[]
}

export interface FormsConfig {
  id: 'global'
  responsesOpen: boolean
  allowedEditorRoles: Array<'command_staff' | 'supervisory'>
  updatedAt: string
  updatedBy: string
}

export interface FormSubmission {
  id: string
  formId: string
  byUser: string
  byRole: string
  byClasses?: string[]
  createdAt: string
  answers: Record<string, string | string[]>
  state: 'active' | 'removed'
  ip: string
  userAgent: string
}

type FormsStore = {
  forms: Map<string, FormDefinition>
  submissions: Map<string, FormSubmission>
  config: Map<string, FormsConfig>
}

declare global {
  // eslint-disable-next-line no-var
  var __fibFormsDB: FormsStore | undefined
  var __fibFormsInit: Promise<FormsStore> | undefined
}

const isSupabaseEnabled = !!(getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)

let _formsClient: ReturnType<typeof createClient> | null = null

function getFormsClient() {
  if (_formsClient) return _formsClient
  const url = getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key =
    getSecret('SUPABASE_SERVICE_ROLE_KEY') ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  if (!url || !key) return null
  _formsClient = createClient(url, key)
  return _formsClient
}

async function initFormsDB(): Promise<FormsStore> {
  if (isSupabaseEnabled) {
    const [forms, submissions, config] = await Promise.all([
      SupabaseMap.create<'id', FormDefinition>('forms', 'id', defaultForms()),
      SupabaseMap.create<'id', FormSubmission>('form_submissions', 'id'),
      SupabaseMap.create<'id', FormsConfig>('forms_config', 'id', [defaultConfig()]),
    ])
    return { forms, submissions, config }
  }

  if (!global.__fibFormsDB) {
    const forms = new Map<string, FormDefinition>()
    defaultForms().forEach(f => forms.set(f.id, f))
    const config = new Map<string, FormsConfig>()
    config.set('global', defaultConfig())
    global.__fibFormsDB = { forms, submissions: new Map<string, FormSubmission>(), config }
  }
  return global.__fibFormsDB
}

if (!global.__fibFormsInit) {
  global.__fibFormsInit = initFormsDB().then(db => {
    global.__fibFormsDB = db
    return db
  })
}

export async function getFormsDB(): Promise<FormsStore> {
  return global.__fibFormsInit as Promise<FormsStore>
}

export async function persistFormDefinition(form: FormDefinition) {
  const db = await getFormsDB()
  await persistentMapSet(db.forms, form.id, form)
}

export async function deleteFormDefinition(id: string) {
  const db = await getFormsDB()
  await persistentMapDelete(db.forms, id)
}

export async function persistFormsConfig(config: FormsConfig) {
  const db = await getFormsDB()
  await persistentMapSet(db.config, config.id, config)
}

export async function persistFormSubmission(submission: FormSubmission) {
  const db = await getFormsDB()
  await persistentMapSet(db.submissions, submission.id, submission)
}

export async function deleteFormSubmissionsByFormId(formId: string) {
  const db = await getFormsDB()
  const ids = Array.from(db.submissions.entries())
    .filter(([, submission]) => submission.formId === formId)
    .map(([submissionId]) => submissionId)

  for (const submissionId of ids) {
    await persistentMapDelete(db.submissions, submissionId)
  }
}

export async function resetFormsStore(config: FormsConfig) {
  const db = await getFormsDB()
  await persistentMapClear(db.forms)
  await persistentMapClear(db.submissions)
  await persistentMapSet(db.config, config.id, config)
}

export function buildFormId() {
  return `frm-${uuid().slice(0, 8)}`
}

export function buildSubmissionId() {
  return `fs-${uuid().slice(0, 10)}`
}

export function defaultConfig(): FormsConfig {
  return {
    id: 'global',
    responsesOpen: true,
    allowedEditorRoles: ['command_staff', 'supervisory'],
    updatedAt: new Date().toISOString(),
    updatedBy: 'SYSTEM',
  }
}

function defaultTheme(): FormTheme {
  return {
    mode: 'glass',
    accent: '#4f7cff',
    surface: '#121a33',
    background: '#090f1f',
  }
}

function defaultForms(): FormDefinition[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'frm-reporte-interno',
      title: 'Reporte Interno',
      description: 'Formulario para reportes operativos y administrativos.',
      active: true,
      kind: 'general',
      branch: 'General',
      icon: 'ClipboardList',
      acceptsResponses: true,
      deadlineAt: null,
      timeLimitMinutes: null,
      maxResponses: null,
      allowedSubmitRoles: ['command_staff', 'supervisory', 'federal_agent'],
      allowedViewerKeys: ['command_staff', 'supervisory'],
      theme: defaultTheme(),
      createdBy: 'SYSTEM',
      createdAt: now,
      updatedAt: now,
      fields: [
        { id: 'asunto', label: 'Asunto', type: 'text', required: true, maxLength: 180 },
        { id: 'detalle', label: 'Detalle', type: 'textarea', required: true, maxLength: 5000 },
        { id: 'fecha_evento', label: 'Fecha del evento', type: 'date', required: false },
      ],
    },
  ]
}
