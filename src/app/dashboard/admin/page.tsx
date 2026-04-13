'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Key,
  X as XIcon,
  Users,
  CheckCircle,
  Shield,
  ClipboardList,
  Clock3,
  ImagePlus,
  Settings2,
  Globe,
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
} from 'lucide-react'
import {
  getStoredUser,
  getInvites,
  crearInvite,
  borrarInvite,
  getUsers,
  getCarpetaByUsername,
  crearHiloCarpeta,
  editarUser,
  borrarUser,
  resetUserPassword,
  getForms,
  saveForm,
  submitForm,
  getGoogleFormResponses,
  getFormResponses,
  deleteFormResponse,
  getConfigVisual,
  setConfigVisual,
  setStoredUser,
  subscribeStoredUser,
} from '@/lib/client'
import { uiConfirm } from '@/lib/ui-dialog'
import { FORM_BRANCHES, FORM_CLASSES } from '@/lib/forms-db'
import { buildGoogleFormUrls } from '@/lib/google-forms'

type Tab = 'invites' | 'users' | 'callsigns' | 'carpetas' | 'forms' | 'website'
type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'image'

type BuilderField = {
  id: string
  label: string
  type: FieldType
  required: boolean
  placeholder?: string
  helpText?: string
  maxLength?: number
  options?: string[]
  images?: string[]
}

const ROL_TAG: Record<string, string> = {
  command_staff: 'tag border-red-800 bg-red-900/20 text-red-400',
  supervisory: 'tag border-blue-700 bg-blue-900/20 text-blue-400',
  federal_agent: 'tag border-green-700 bg-green-900/20 text-green-400',
  visitante: 'tag border-gray-700 text-gray-400',
}

const FIELD_TYPES: FieldType[] = ['text', 'textarea', 'number', 'date', 'select', 'radio', 'checkbox', 'image']
const VIEWER_KEYS = ['command_staff', 'supervisory', 'federal_agent', 'visitante', 'RRHH', 'CIRG', 'Task Force', 'UO']
const ROLE_KEYS = ['command_staff', 'supervisory', 'federal_agent', 'visitante']

const EMPTY_FORM = {
  id: '',
  title: '',
  description: '',
  active: true,
  kind: 'general',
  branch: 'General',
  icon: 'ClipboardList',
  acceptsResponses: true,
  deadlineAt: '',
  timeLimitMinutes: '',
  maxResponses: '',
  allowedSubmitRoles: ['federal_agent'],
  allowedViewerKeys: ['command_staff', 'supervisory'],
  theme: { mode: 'glass', accent: '#4f7cff', surface: '#121a33', background: '#090f1f' },
  fields: [
    { id: 'campo_1', label: 'Campo 1', type: 'text' as FieldType, required: true, options: [], images: [] },
  ] as BuilderField[],
}

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 border font-mono text-xs ${ok ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
      {ok ? <CheckCircle size={13} /> : '✗'} {msg}
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('invites')
  const [invites, setInvites] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [copied, setCopied] = useState('')
  const [form, setForm] = useState({ rol: 'federal_agent', maxUsos: 1, discordId: '', agentNumber: '', nombre: '' })
  const [creating, setCreating] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'agotados'>('todos')
  const [callsignEdit, setCallsignEdit] = useState<Record<string, string>>({})
  const [userEdit, setUserEdit] = useState<Record<string, any>>({})
  const [vetoReason, setVetoReason] = useState<Record<string, string>>({})
  const [freezeReason, setFreezeReason] = useState<Record<string, string>>({})
  // Password reset state
  const [pwdResetTarget, setPwdResetTarget] = useState<{ id: string; username: string; rol: string } | null>(null)
  const [pwdResetValue, setPwdResetValue] = useState('')
  const [pwdResetConfirm, setPwdResetConfirm] = useState('')
  const [pwdResetShow, setPwdResetShow] = useState(false)
  const [pwdResetBusy, setPwdResetBusy] = useState(false)
  const [formsData, setFormsData] = useState<{ forms: any[]; canManage: boolean; config?: any }>({ forms: [], canManage: false })
  const [builder, setBuilder] = useState<any>(EMPTY_FORM)
  const [formsBusy, setFormsBusy] = useState(false)
  const [responses, setResponses] = useState<any[]>([])
  const [selectedFormForResponses, setSelectedFormForResponses] = useState<string>('')
  const [googleRows, setGoogleRows] = useState<any[]>([])
  const [googleHeaders, setGoogleHeaders] = useState<string[]>([])
  const [googleBusy, setGoogleBusy] = useState(false)
  const [formAnswers, setFormAnswers] = useState<Record<string, Record<string, any>>>({})
  const [formStartedAt, setFormStartedAt] = useState<Record<string, number>>({})
  const [websiteConfig, setWebsiteConfig] = useState<any>(null)
  const [websiteSaving, setWebsiteSaving] = useState(false)
  const [usersSearch, setUsersSearch] = useState('')
  const [carpetaTargetUsername, setCarpetaTargetUsername] = useState('')
  const [carpetaTargetName, setCarpetaTargetName] = useState('')
  const [carpetaThreadTitle, setCarpetaThreadTitle] = useState('')
  const [carpetaThreadDesc, setCarpetaThreadDesc] = useState('')
  const [carpetaThreadParticipants, setCarpetaThreadParticipants] = useState('')
  const [carpetaPreview, setCarpetaPreview] = useState<any>(null)

  const isCS = user?.rol === 'command_staff'
  const isSuperv = user?.rol === 'supervisory'
  const canManageForms = ['command_staff', 'supervisory'].includes(user?.rol)
  /** command_staff can reset any account; supervisory can reset federal_agent / visitante */
  const canResetPasswords = isCS || isSuperv

  useEffect(() => {
    setUser(getStoredUser())
    return subscribeStoredUser(setUser)
  }, [])

  useEffect(() => {
    const savedTab = localStorage.getItem('fib_admin_tab')
    if (!savedTab) return
    const allowed: Tab[] = ['invites', 'users', 'callsigns', 'carpetas', 'forms', 'website']
    if (allowed.includes(savedTab as Tab)) {
      setTab(savedTab as Tab)
    }
  }, [])

  useEffect(() => {
    if (!isCS && (tab === 'invites' || tab === 'website')) setTab('users')
  }, [isCS, tab])

  useEffect(() => {
    localStorage.setItem('fib_admin_tab', tab)
  }, [tab])

  useEffect(() => {
    if (tab === 'invites') loadInvites()
    if (tab === 'users' || tab === 'callsigns' || tab === 'carpetas') loadUsers()
    if (tab === 'forms') loadForms()
    if (tab === 'website') loadWebsiteConfig()
  }, [tab])

  async function loadInvites() {
    setLoading(true)
    try {
      setInvites(await getInvites())
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function loadUsers() {
    setLoading(true)
    try {
      const q = usersSearch.trim()
      setUsers(await getUsers(q ? { q } : undefined))
    } catch {
    } finally {
      setLoading(false)
    }
  }

  function resolveTargetUsername() {
    const direct = carpetaTargetUsername.trim().toLowerCase()
    if (direct) return direct
    const byName = carpetaTargetName.trim().toLowerCase()
    if (!byName) return ''
    const found = users.find((u) => String(u?.nombre || '').toLowerCase().includes(byName) || String(u?.username || '').toLowerCase().includes(byName))
    return String(found?.username || '').toLowerCase()
  }

  async function ensureCarpetaForTarget() {
    const target = resolveTargetUsername()
    if (!target) {
      setToast({ msg: 'Indica username o nombre para ubicar el usuario', ok: false })
      return
    }
    try {
      const data = await getCarpetaByUsername(target)
      setCarpetaPreview({ username: target, ...data })
      setToast({ msg: `Carpeta lista para ${target}`, ok: true })
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudo abrir/crear carpeta', ok: false })
    }
  }

  async function createCarpetaThreadForTarget() {
    const target = resolveTargetUsername()
    if (!target) {
      setToast({ msg: 'Indica username o nombre para ubicar el usuario', ok: false })
      return
    }
    if (!carpetaThreadTitle.trim()) {
      setToast({ msg: 'El título del hilo es requerido', ok: false })
      return
    }
    const participantes = carpetaThreadParticipants
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
    try {
      await crearHiloCarpeta({ titulo: carpetaThreadTitle.trim(), descripcion: carpetaThreadDesc.trim(), participantes }, target)
      setToast({ msg: `Hilo creado en carpeta de ${target}`, ok: true })
      setCarpetaThreadTitle('')
      setCarpetaThreadDesc('')
      setCarpetaThreadParticipants('')
      const data = await getCarpetaByUsername(target)
      setCarpetaPreview({ username: target, ...data })
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudo crear el hilo', ok: false })
    }
  }

  async function loadForms() {
    setLoading(true)
    try {
      const [data, cfg] = await Promise.all([getForms(), getConfigVisual()])
      setFormsData(data)
      setWebsiteConfig(cfg)
      const started: Record<string, number> = {}
      for (const f of data.forms || []) started[f.id] = Date.now()
      setFormStartedAt(started)
    } catch {
      setFormsData({ forms: [], canManage: false })
    } finally {
      setLoading(false)
    }
  }

  async function loadWebsiteConfig() {
    setLoading(true)
    try {
      const data = await getConfigVisual()
      setWebsiteConfig(data)
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudo cargar configuración pública', ok: false })
    } finally {
      setLoading(false)
    }
  }

  async function createInviteCode() {
    setCreating(true)
    try {
      const roleToCreate = isCS ? form.rol : 'federal_agent'
      await crearInvite({
        rol: roleToCreate,
        maxUsos: Number(form.maxUsos),
        discordId: form.discordId || undefined,
        agentNumber: form.agentNumber || undefined,
        nombre: form.nombre || undefined,
      })
      setToast({ msg: '✅ Código creado', ok: true })
      await loadInvites()
      setForm({ rol: 'federal_agent', maxUsos: 1, discordId: '', agentNumber: '', nombre: '' })
    } catch (e: any) {
      setToast({ msg: e.message, ok: false })
    } finally {
      setCreating(false)
    }
  }

  function copy(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(''), 2000)
  }

  async function toggleUser(id: string, activo: boolean) {
    try {
      const res = await editarUser(id, { activo })
      const nextUser = res?.usuario
      if (nextUser) {
        setUsers((prev) => prev.map((entry) => entry.id === id ? nextUser : entry))
        if (user?.id === id) setStoredUser(nextUser)
      }
      setToast({ msg: `Usuario ${activo ? 'activado' : 'desactivado'}`, ok: true })
    } catch (e: any) {
      setToast({ msg: e.message, ok: false })
    }
  }

  async function toggleVeto(id: string, username: string, vetado: boolean) {
    const reason = vetoReason[id] || ''
    if (!vetado && !reason.trim()) {
      setToast({ msg: 'Indica motivo del veto', ok: false })
      return
    }
    try {
      const res = await editarUser(id, { vetado: !vetado, vetoReason: reason.trim() || undefined })
      const nextUser = res?.usuario
      if (nextUser) {
        setUsers((prev) => prev.map((entry) => entry.id === id ? nextUser : entry))
        if (user?.id === id) setStoredUser(nextUser)
      }
      setToast({ msg: !vetado ? `Usuario vetado: ${username}` : `Veto retirado: ${username}`, ok: true })
      setVetoReason((p) => ({ ...p, [id]: '' }))
    } catch (e: any) {
      setToast({ msg: e.message, ok: false })
    }
  }

  async function toggleFreeze(id: string, username: string, congelado: boolean) {
    const reason = freezeReason[id] || ''
    if (!congelado && !reason.trim()) {
      setToast({ msg: 'Indica motivo de la congelación', ok: false })
      return
    }
    try {
      const res = await editarUser(id, { congelado: !congelado, congeladoReason: reason.trim() || undefined })
      const nextUser = res?.usuario
      if (nextUser) {
        setUsers((prev) => prev.map((entry) => entry.id === id ? nextUser : entry))
        if (user?.id === id) setStoredUser(nextUser)
      }
      setToast({ msg: !congelado ? `Usuario congelado: ${username}` : `Congelación retirada: ${username}`, ok: true })
      setFreezeReason((p) => ({ ...p, [id]: '' }))
    } catch (e: any) {
      setToast({ msg: e.message, ok: false })
    }
  }

  function startEditUser(u: any) {
    setUserEdit((p) => ({
      ...p,
      [u.id]: {
        nombre: u.nombre || '',
        rol: u.rol,
        callsign: u.callsign || '',
        agentNumber: u.agentNumber || '',
        discordId: u.discordId || '',
        clases: Array.isArray(u.clases) ? u.clases : [],
      },
    }))
  }

  async function saveUser(id: string) {
    try {
      const patch = userEdit[id]
      if (!patch) return
      const res = await editarUser(id, patch)
      const nextUser = res?.usuario
      if (nextUser) {
        setUsers((prev) => prev.map((entry) => entry.id === id ? nextUser : entry))
        if (user?.id === id) setStoredUser(nextUser)
      }
      setToast({ msg: 'Usuario actualizado', ok: true })
      setUserEdit((p) => ({ ...p, [id]: undefined }))
    } catch (e: any) {
      setToast({ msg: e.message, ok: false })
    }
  }

  async function removeUser(id: string, username: string) {
    if (!await uiConfirm(`¿Eliminar usuario ${username}? Esta acción no se puede deshacer.`, { tone: 'danger', title: 'Eliminar usuario' })) return
    try {
      await borrarUser(id)
      setUsers((prev) => prev.filter((entry) => entry.id !== id))
      setUserEdit((prev) => ({ ...prev, [id]: undefined }))
      setVetoReason((prev) => ({ ...prev, [id]: '' }))
      setFreezeReason((prev) => ({ ...prev, [id]: '' }))
      setToast({ msg: 'Usuario eliminado', ok: true })
    } catch (e: any) {
      setToast({ msg: e.message, ok: false })
    }
  }

  async function handlePwdReset(e: React.FormEvent) {
    e.preventDefault()
    if (!pwdResetTarget || !pwdResetValue.trim() || pwdResetBusy) return
    if (pwdResetValue.trim() !== pwdResetConfirm.trim()) {
      setToast({ msg: 'Las contraseñas no coinciden', ok: false })
      return
    }
    setPwdResetBusy(true)
    try {
      await resetUserPassword(pwdResetTarget.id, pwdResetValue.trim())
      setToast({ msg: `✅ Contraseña restablecida para @${pwdResetTarget.username}`, ok: true })
      setPwdResetTarget(null)
      setPwdResetValue('')
      setPwdResetConfirm('')
      setPwdResetShow(false)
    } catch (e: any) {
      setToast({ msg: e.message || 'Error al restablecer contraseña', ok: false })
    } finally {
      setPwdResetBusy(false)
    }
  }

  async function saveCallsign(id: string, username: string) {
    const cs = callsignEdit[id]
    if (!cs?.trim()) return
    try {
      const res = await editarUser(id, { callsign: cs.trim() })
      const nextUser = res?.usuario
      if (nextUser) {
        setUsers((prev) => prev.map((entry) => entry.id === id ? nextUser : entry))
        if (user?.id === id) setStoredUser(nextUser)
      }
      setToast({ msg: `Callsign asignado a ${username}`, ok: true })
      setCallsignEdit((p) => ({ ...p, [id]: '' }))
    } catch (e: any) {
      setToast({ msg: e.message, ok: false })
    }
  }

  function setField(index: number, patch: Partial<BuilderField>) {
    setBuilder((prev: any) => ({
      ...prev,
      fields: prev.fields.map((f: BuilderField, i: number) => (i === index ? { ...f, ...patch } : f)),
    }))
  }

  function addField() {
    setBuilder((prev: any) => ({
      ...prev,
      fields: [...prev.fields, { id: `campo_${prev.fields.length + 1}`, label: `Campo ${prev.fields.length + 1}`, type: 'text', required: false, options: [], images: [] }],
    }))
  }

  function moveField(index: number, direction: -1 | 1) {
    setBuilder((prev: any) => {
      const next = [...prev.fields]
      const to = index + direction
      if (to < 0 || to >= next.length) return prev
      const tmp = next[index]
      next[index] = next[to]
      next[to] = tmp
      return { ...prev, fields: next }
    })
  }

  function removeField(index: number) {
    setBuilder((prev: any) => ({ ...prev, fields: prev.fields.filter((_: any, i: number) => i !== index) }))
  }

  async function addImageToField(index: number, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList).slice(0, 3)
    const encoded = await Promise.all(files.map((f) => readFileAsDataUrl(f)))
    setBuilder((prev: any) => ({
      ...prev,
      fields: prev.fields.map((f: BuilderField, i: number) => {
        if (i !== index) return f
        const imgs = [...(f.images || []), ...encoded].slice(0, 10)
        return { ...f, images: imgs }
      }),
    }))
  }

  async function saveBuilderForm() {
    if (!canManageForms) return
    setFormsBusy(true)
    try {
      const payload = {
        ...builder,
        timeLimitMinutes: builder.timeLimitMinutes ? Number(builder.timeLimitMinutes) : null,
        maxResponses: builder.maxResponses ? Number(builder.maxResponses) : null,
        deadlineAt: builder.deadlineAt || null,
      }
      const action = builder.id ? 'update' : 'create'
      await saveForm({ action, form: payload })
      setToast({ msg: builder.id ? '✅ Formulario actualizado' : '✅ Formulario creado', ok: true })
      setBuilder(EMPTY_FORM)
      await loadForms()
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudo guardar', ok: false })
    } finally {
      setFormsBusy(false)
    }
  }

  async function toggleGlobalResponses(nextOpen: boolean) {
    try {
      await saveForm({ action: 'update_global', responsesOpen: nextOpen })
      setToast({ msg: nextOpen ? 'Recepción de respuestas activada' : 'Recepción de respuestas desactivada', ok: true })
      await loadForms()
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudo actualizar configuración', ok: false })
    }
  }

  async function toggleForm(id: string) {
    try {
      await saveForm({ action: 'toggle', id })
      await loadForms()
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudo cambiar estado', ok: false })
    }
  }

  async function deleteFormById(id: string) {
    if (!await uiConfirm('¿Eliminar formulario y respuestas asociadas?', { tone: 'danger', title: 'Eliminar formulario' })) return
    try {
      await saveForm({ action: 'delete', id })
      setToast({ msg: 'Formulario eliminado', ok: true })
      await loadForms()
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudo eliminar', ok: false })
    }
  }

  async function resetAllForms() {
    if (!isCS) return
    if (!await uiConfirm('Se reiniciarán TODOS los formularios y respuestas. ¿Continuar?', { tone: 'danger', title: 'Reset global' })) return
    try {
      await saveForm({ action: 'reset_all' })
      setToast({ msg: 'Reset completo de formularios aplicado', ok: true })
      setBuilder(EMPTY_FORM)
      setSelectedFormForResponses('')
      setResponses([])
      await loadForms()
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudo reiniciar', ok: false })
    }
  }

  async function loadResponses(id: string) {
    try {
      const data = await getFormResponses(id)
      setSelectedFormForResponses(id)
      setResponses(data.responses || [])
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudieron cargar respuestas', ok: false })
    }
  }

  async function removeResponse(formId: string, submissionId: string) {
    if (!await uiConfirm('¿Quitar esta respuesta?', { tone: 'danger', title: 'Eliminar respuesta' })) return
    try {
      await deleteFormResponse(formId, submissionId)
      await loadResponses(formId)
      setToast({ msg: 'Respuesta eliminada', ok: true })
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudo eliminar respuesta', ok: false })
    }
  }

  async function submitPreview(formObj: any) {
    try {
      await submitForm(formObj.id, {
        hp: '',
        startedAt: formStartedAt[formObj.id] || Date.now(),
        answers: formAnswers[formObj.id] || {},
      })
      setToast({ msg: 'Respuesta de prueba enviada', ok: true })
      setFormAnswers((p) => ({ ...p, [formObj.id]: {} }))
      setFormStartedAt((p) => ({ ...p, [formObj.id]: Date.now() }))
      await loadResponses(formObj.id)
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudo enviar', ok: false })
    }
  }

  async function saveWebsiteConfig() {
    if (!isCS || !websiteConfig) return
    setWebsiteSaving(true)
    try {
      await setConfigVisual(websiteConfig)
      setToast({ msg: 'Configuración pública guardada', ok: true })
      await loadWebsiteConfig()
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudo guardar configuración pública', ok: false })
    } finally {
      setWebsiteSaving(false)
    }
  }

  async function saveGoogleFormSettings(nextPatch: any) {
    if (!isCS || !websiteConfig) return
    setGoogleBusy(true)
    try {
      const opos = {
        ...(websiteConfig.oposicionesInfo || {}),
        ...nextPatch,
      }
      await setConfigVisual({ oposicionesInfo: opos })
      setWebsiteConfig((prev: any) => ({ ...prev, oposicionesInfo: opos }))
      await loadWebsiteConfig()
      setToast({ msg: 'Configuración Google Forms guardada', ok: true })
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudo guardar configuración Google Forms', ok: false })
    } finally {
      setGoogleBusy(false)
    }
  }

  async function loadGoogleResponses() {
    setGoogleBusy(true)
    try {
      const data = await getGoogleFormResponses()
      setGoogleHeaders(Array.isArray(data.headers) ? data.headers : [])
      setGoogleRows(Array.isArray(data.rows) ? data.rows : [])
      setToast({ msg: `Respuestas Google cargadas (${Number(data.count || 0)})`, ok: true })
    } catch (e: any) {
      setToast({ msg: e.message || 'No se pudieron cargar respuestas de Google', ok: false })
      setGoogleHeaders([])
      setGoogleRows([])
    } finally {
      setGoogleBusy(false)
    }
  }

  const filtrados = useMemo(() => invites.filter((i) => {
    if (filtro === 'activos') return !i.agotado
    if (filtro === 'agotados') return i.agotado
    return true
  }), [invites, filtro])

  const filteredUsers = useMemo(() => {
    const q = usersSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const fields = [
        u.username,
        u.nombre,
        u.callsign,
        u.discordId,
        u.agentNumber,
        u.rol,
        ...(Array.isArray(u.clases) ? u.clases : []),
      ].map((v) => String(v || '').toLowerCase())
      return fields.some((v) => v.includes(q))
    })
  }, [users, usersSearch])

  const TABS = [
    { id: 'invites' as Tab, icon: Key, label: 'Invitaciones' },
    { id: 'users' as Tab, icon: Users, label: 'Usuarios' },
    { id: 'callsigns' as Tab, icon: Shield, label: 'Callsigns' },
    { id: 'carpetas' as Tab, icon: ClipboardList, label: 'Carpetas' },
    { id: 'forms' as Tab, icon: ClipboardList, label: 'Formularios' },
    { id: 'website' as Tab, icon: Globe, label: 'Website' },
  ]

  const visibleTabs = isCS ? TABS : TABS.filter((t) => t.id !== 'invites' && t.id !== 'website')

  function openExport(format: 'csv' | 'html' | 'pdf') {
    window.open(`/api/export?format=${format}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="max-w-6xl mx-auto">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}

      {/* ── Password reset modal ──────────────────────────────────────────── */}
      {pwdResetTarget && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && (setPwdResetTarget(null), setPwdResetValue(''), setPwdResetConfirm(''), setPwdResetShow(false))}>
          <div className="bg-bg-card border border-bg-border w-full max-w-sm shadow-2xl animate-fade-up">
            {/* header accent */}
            <div className="h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
            <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-yellow-500/10 border border-yellow-700/40 flex items-center justify-center">
                  <Lock size={13} className="text-yellow-400" />
                </div>
                <div>
                  <span className="section-tag text-yellow-400/80">// Restablecer Contraseña</span>
                  <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary mt-0.5">
                    Reset de acceso
                  </p>
                </div>
              </div>
              <button onClick={() => (setPwdResetTarget(null), setPwdResetValue(''), setPwdResetConfirm(''), setPwdResetShow(false))} className="text-tx-muted hover:text-tx-primary transition-colors">
                <XIcon size={15} />
              </button>
            </div>
            <form onSubmit={handlePwdReset} className="p-5 flex flex-col gap-4">
              {/* target user info */}
              <div className="flex items-center gap-3 bg-bg-surface border border-bg-border px-3 py-2.5">
                <div className="w-8 h-8 bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center font-display text-sm font-bold text-accent-blue">
                  {pwdResetTarget.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-tx-primary font-medium leading-tight">@{pwdResetTarget.username}</p>
                  <p className="font-mono text-[8px] text-tx-muted uppercase tracking-widest">{pwdResetTarget.rol.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {/* new password */}
              <div>
                <label className="label">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={pwdResetShow ? 'text' : 'password'}
                    className="input pr-9"
                    value={pwdResetValue}
                    onChange={e => setPwdResetValue(e.target.value)}
                    placeholder="Mínimo 8 caracteres, letras y números"
                    autoFocus
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setPwdResetShow(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tx-muted hover:text-tx-secondary transition-colors">
                    {pwdResetShow ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                {pwdResetValue.length > 0 && pwdResetValue.length < 8 && (
                  <p className="font-mono text-[8px] text-yellow-500 mt-1">Mínimo 8 caracteres con letras y números</p>
                )}
              </div>

              {/* confirm password */}
              <div>
                <label className="label">Confirmar contraseña</label>
                <div className="relative">
                  <input
                    type={pwdResetShow ? 'text' : 'password'}
                    className={`input pr-9 ${pwdResetConfirm.length > 0 && pwdResetConfirm !== pwdResetValue ? 'border-red-700 focus:border-red-500' : ''}`}
                    value={pwdResetConfirm}
                    onChange={e => setPwdResetConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  {pwdResetConfirm.length > 0 && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {pwdResetConfirm === pwdResetValue
                        ? <CheckCircle size={13} className="text-green-400" />
                        : <AlertCircle size={13} className="text-red-400" />}
                    </span>
                  )}
                </div>
              </div>

              <p className="font-mono text-[8px] text-tx-dim">
                El usuario deberá usar esta contraseña en su próximo inicio de sesión.
              </p>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => (setPwdResetTarget(null), setPwdResetValue(''), setPwdResetConfirm(''), setPwdResetShow(false))}
                  className="btn-ghost py-1.5 px-4 text-[9px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pwdResetBusy || pwdResetValue.trim().length < 8 || pwdResetValue !== pwdResetConfirm}
                  className="btn-primary py-1.5 px-4 text-[9px]"
                >
                  {pwdResetBusy ? 'Restableciendo...' : 'Restablecer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page-header">
        <span className="section-tag">// Administración</span>
        <h1 className="font-display text-2xl font-semibold tracking-wider uppercase text-tx-primary mt-0.5">Panel Admin</h1>
        <p className="text-tx-muted text-xs mt-0.5">Gestión de cuentas, permisos, clases, formularios y configuración global</p>
        {isCS && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-ghost py-1.5 px-3 text-[9px]" onClick={() => openExport('csv')}>Exportar CSV</button>
            <button className="btn-ghost py-1.5 px-3 text-[9px]" onClick={() => openExport('html')}>Exportar HTML</button>
            <button className="btn-primary py-1.5 px-3 text-[9px]" onClick={() => openExport('pdf')}>Exportar PDF</button>
          </div>
        )}
      </div>

      <div className="flex border-b border-bg-border mb-5 flex-wrap gap-0 overflow-x-auto">
        {visibleTabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2.5 font-mono text-[9px] tracking-widest uppercase transition-all border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? 'border-accent-blue text-accent-blue bg-accent-blue/5' : 'border-transparent text-tx-muted hover:text-tx-secondary hover:bg-bg-hover'}`}>
            <t.icon size={11} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'invites' && (
        <>
          <div className="card p-4 mb-4">
            <span className="section-tag mb-3 block">// Crear Código</span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div><label className="label">Nombre IC</label><input className="input text-xs py-2" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Juan García" /></div>
              <div><label className="label">Rol</label>
                <select className="input text-xs py-2" value={form.rol} onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))}>
                  {isCS && <option value="command_staff">Command Staff</option>}
                  {isCS && <option value="supervisory">Supervisory</option>}
                  <option value="federal_agent">Federal Agent</option>
                  {isCS && <option value="visitante">Visitante</option>}
                </select>
              </div>
              <div><label className="label">Usos</label><input className="input text-xs py-2" type="number" min={1} max={50} value={form.maxUsos} onChange={(e) => setForm((p) => ({ ...p, maxUsos: Number(e.target.value) }))} /></div>
              <div><label className="label">Discord ID</label><input className="input text-xs py-2" value={form.discordId} onChange={(e) => setForm((p) => ({ ...p, discordId: e.target.value }))} /></div>
              <div><label className="label">N° Agente</label><input className="input text-xs py-2" value={form.agentNumber} onChange={(e) => setForm((p) => ({ ...p, agentNumber: e.target.value }))} /></div>
            </div>
            <button onClick={createInviteCode} disabled={creating} className="btn-primary"><Plus size={12} />{creating ? 'Creando...' : 'Generar Código'}</button>
          </div>

          <div className="card overflow-x-auto">
            <div className="flex justify-between px-4 py-3 border-b border-bg-border">
              <div className="flex border border-bg-border overflow-hidden">
                {(['todos', 'activos', 'agotados'] as const).map((f) => (
                  <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1.5 font-mono text-[9px] tracking-widest uppercase ${filtro === f ? 'bg-accent-blue/10 text-accent-blue' : 'text-tx-muted hover:text-tx-secondary'}`}>{f}</button>
                ))}
              </div>
              <button onClick={loadInvites} className="text-tx-muted hover:text-tx-primary"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /></button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-bg-border">{['Código', 'Rol', 'Nombre', 'Usos', 'Creado por', 'Fecha', 'Estado', ''].map((h) => <th key={h} className="table-head">{h}</th>)}</tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8} className="text-center py-8 font-mono text-xs text-tx-muted">Cargando...</td></tr> : filtrados.map((inv) => (
                  <tr key={inv.codigo} className={`table-row ${inv.agotado ? 'opacity-40' : ''}`}>
                    <td className="table-cell"><div className="flex items-center gap-1.5"><code className="font-mono text-xs text-accent-blue bg-accent-blue/10 px-1.5 py-0.5">{inv.codigo}</code><button onClick={() => copy(inv.codigo)} className="text-tx-muted hover:text-tx-primary">{copied === inv.codigo ? <CheckCircle size={10} className="text-green-400" /> : <Copy size={10} />}</button></div></td>
                    <td className="table-cell"><span className={ROL_TAG[inv.rol] || ''}>{inv.rol?.replace('_', ' ')}</span></td>
                    <td className="table-cell text-xs text-tx-secondary">{inv.nombre || '—'}</td>
                    <td className="table-cell font-mono text-xs text-tx-muted">{inv.usos}/{inv.maxUsos}</td>
                    <td className="table-cell text-xs text-tx-secondary">{inv.creadoPor}</td>
                    <td className="table-cell font-mono text-[9px] text-tx-muted whitespace-nowrap">{new Date(inv.creadoEn).toLocaleDateString('es')}</td>
                    <td className="table-cell"><span className={`tag border ${inv.agotado ? 'border-gray-700 text-gray-500' : 'border-green-700 text-green-400'}`}>{inv.agotado ? 'Agotado' : 'Activo'}</span></td>
                    <td className="table-cell">{isCS && <button onClick={() => borrarInvite(inv.codigo).then(loadInvites)} className="text-tx-muted hover:text-red-400"><Trash2 size={12} /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'users' && (
        <div className="card overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
            <span className="section-tag">// Cuentas de la Plataforma</span>
            <div className="flex items-center gap-2">
              <input className="input text-xs py-1.5 w-52" placeholder="Buscar registrados..." value={usersSearch} onChange={(e) => setUsersSearch(e.target.value)} />
              <button onClick={loadUsers} className="text-tx-muted hover:text-tx-primary"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /></button>
            </div>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-bg-border">{(isCS ? ['Usuario', 'Nombre IC', 'Rol', 'Clases', 'Callsign', 'N° Agente', 'Discord', 'Estado', ''] : canResetPasswords ? ['Usuario', 'Rol', 'Clases', 'Estado', ''] : ['Usuario', 'Rol', 'Clases', 'Estado']).map((h) => <th key={h} className="table-head">{h}</th>)}</tr></thead>
            <tbody>
              {filteredUsers.map((u) => {
                const editing = !!userEdit[u.id]
                const draft = userEdit[u.id] || {}
                const canResetThisUser = canResetPasswords && u.id !== user?.id && (isCS || ['federal_agent', 'visitante'].includes(u.rol))
                return (
                  <tr key={u.id} className={`table-row ${!u.activo ? 'opacity-40' : ''}`}>
                    <td className="table-cell font-medium text-tx-primary">{u.username}</td>
                    {isCS && <td className="table-cell">{editing ? <input className="input text-xs py-1.5" value={draft.nombre} onChange={(e) => setUserEdit((p) => ({ ...p, [u.id]: { ...p[u.id], nombre: e.target.value } }))} /> : (u.nombre || '—')}</td>}
                    <td className="table-cell">{isCS && editing ? <select className="input text-xs py-1.5" value={draft.rol} onChange={(e) => setUserEdit((p) => ({ ...p, [u.id]: { ...p[u.id], rol: e.target.value } }))}><option value="command_staff">command_staff</option><option value="supervisory">supervisory</option><option value="federal_agent">federal_agent</option><option value="visitante">visitante</option></select> : <span className={ROL_TAG[u.rol] || ''}>{u.rol?.replace('_', ' ')}</span>}</td>
                    <td className="table-cell text-xs text-tx-secondary">
                      {isCS && editing ? (
                        <div className="flex flex-wrap gap-1">
                          {FORM_CLASSES.map((c) => {
                            const active = (draft.clases || []).includes(c)
                            return <button key={c} className={`px-2 py-1 border text-[9px] font-mono ${active ? 'border-accent-blue text-accent-blue' : 'border-bg-border text-tx-muted'}`} onClick={() => setUserEdit((p) => ({ ...p, [u.id]: { ...p[u.id], clases: active ? (p[u.id].clases || []).filter((x: string) => x !== c) : [...(p[u.id].clases || []), c] } }))}>{c}</button>
                          })}
                        </div>
                      ) : ((u.clases || []).join(', ') || '—')}
                    </td>
                    {isCS && <td className="table-cell">{editing ? <input className="input text-xs py-1.5" value={draft.callsign} onChange={(e) => setUserEdit((p) => ({ ...p, [u.id]: { ...p[u.id], callsign: e.target.value } }))} /> : (u.callsign || '—')}</td>}
                    {isCS && <td className="table-cell">{editing ? <input className="input text-xs py-1.5" value={draft.agentNumber} onChange={(e) => setUserEdit((p) => ({ ...p, [u.id]: { ...p[u.id], agentNumber: e.target.value } }))} /> : (u.agentNumber || '—')}</td>}
                    {isCS && <td className="table-cell">{editing ? <input className="input text-xs py-1.5" value={draft.discordId} onChange={(e) => setUserEdit((p) => ({ ...p, [u.id]: { ...p[u.id], discordId: e.target.value } }))} /> : (u.discordId || '—')}</td>}
                    <td className="table-cell"><span className={`tag border ${u.activo ? 'border-green-700 text-green-400' : 'border-gray-700 text-gray-500'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>{u.congelado && <span className="tag border border-cyan-700 text-cyan-400 ml-1" title={u.congeladoReason || ''}>Congelado</span>}</td>
                    {isCS && <td className="table-cell"><div className="flex gap-1.5 flex-wrap">
                      {!editing && <button onClick={() => startEditUser(u)} className="font-mono text-[8px] tracking-widest uppercase px-2 py-1 border border-accent-blue/40 text-accent-blue">Editar</button>}
                      {editing && <button onClick={() => saveUser(u.id)} className="font-mono text-[8px] tracking-widest uppercase px-2 py-1 border border-green-800 text-green-400">Guardar</button>}
                      {editing && <button onClick={() => setUserEdit((p) => ({ ...p, [u.id]: undefined }))} className="font-mono text-[8px] tracking-widest uppercase px-2 py-1 border border-bg-border text-tx-muted">Cancelar</button>}
                      <button onClick={() => toggleUser(u.id, !u.activo)} className="font-mono text-[8px] tracking-widest uppercase px-2 py-1 border border-bg-border text-tx-secondary">{u.activo ? 'Desact.' : 'Activar'}</button>
                      <input className="input text-xs py-1 px-2 w-32" placeholder="Motivo veto" value={vetoReason[u.id] || ''} onChange={(e) => setVetoReason((p) => ({ ...p, [u.id]: e.target.value }))} />
                      <button onClick={() => toggleVeto(u.id, u.username, !!u.vetado)} className={`font-mono text-[8px] tracking-widest uppercase px-2 py-1 border ${u.vetado ? 'border-green-800 text-green-400' : 'border-red-800 text-red-400'}`}>{u.vetado ? 'Quitar veto' : 'Vetar'}</button>
                      <input className="input text-xs py-1 px-2 w-36" placeholder="Motivo freeze" value={freezeReason[u.id] || ''} onChange={(e) => setFreezeReason((p) => ({ ...p, [u.id]: e.target.value }))} />
                      <button onClick={() => toggleFreeze(u.id, u.username, !!u.congelado)} className={`font-mono text-[8px] tracking-widest uppercase px-2 py-1 border ${u.congelado ? 'border-green-800 text-green-400' : 'border-cyan-800 text-cyan-400'}`} title={u.congelado ? `Motivo: ${u.congeladoReason || '—'}` : 'Solo lectura: puede ver todo pero no escribir'}>{u.congelado ? 'Descongelar' : 'Congelar'}</button>
                      {canResetThisUser && (
                        <button
                          onClick={() => { setPwdResetTarget({ id: u.id, username: u.username, rol: u.rol }); setPwdResetValue(''); setPwdResetConfirm(''); setPwdResetShow(false) }}
                          className="font-mono text-[8px] tracking-widest uppercase px-2 py-1 border border-yellow-800 text-yellow-400 hover:bg-yellow-900/20 transition-colors"
                          title="Restablecer contraseña"
                        >Reset PSW</button>
                      )}
                       <button onClick={() => removeUser(u.id, u.username)} className="font-mono text-[8px] tracking-widest uppercase px-2 py-1 border border-red-800 text-red-400">Borrar</button>
                    </div></td>}
                    {!isCS && canResetPasswords && <td className="table-cell">
                      {canResetThisUser && (
                        <button
                          onClick={() => { setPwdResetTarget({ id: u.id, username: u.username, rol: u.rol }); setPwdResetValue(''); setPwdResetConfirm(''); setPwdResetShow(false) }}
                          className="font-mono text-[8px] tracking-widest uppercase px-2 py-1 border border-yellow-800 text-yellow-400 hover:bg-yellow-900/20 transition-colors"
                          title="Restablecer contraseña"
                        >Reset PSW</button>
                      )}
                    </td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'carpetas' && (
        <div className="space-y-4">
          <div className="card p-4">
            <span className="section-tag mb-3 block">// Crear / Gestionar carpeta por usuario</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="label">Username</label>
                <input className="input text-xs py-2" value={carpetaTargetUsername} onChange={(e) => setCarpetaTargetUsername(e.target.value)} placeholder="usuario" />
              </div>
              <div>
                <label className="label">Nombre (búsqueda)</label>
                <input className="input text-xs py-2" value={carpetaTargetName} onChange={(e) => setCarpetaTargetName(e.target.value)} placeholder="Juan García" />
              </div>
              <div className="flex items-end">
                <button className="btn-primary w-full" onClick={ensureCarpetaForTarget}>Crear / Abrir carpeta</button>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <span className="section-tag mb-3 block">// Crear hilo en carpeta</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label">Título</label>
                <input className="input text-xs py-2" value={carpetaThreadTitle} onChange={(e) => setCarpetaThreadTitle(e.target.value)} placeholder="Incidencia RRHH" />
              </div>
              <div>
                <label className="label">Participantes (comma-separated usernames)</label>
                <input className="input text-xs py-2" value={carpetaThreadParticipants} onChange={(e) => setCarpetaThreadParticipants(e.target.value)} placeholder="indra,agente1" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Descripción</label>
                <textarea className="input text-xs py-2 min-h-[90px]" value={carpetaThreadDesc} onChange={(e) => setCarpetaThreadDesc(e.target.value)} placeholder="Detalle del hilo..." />
              </div>
            </div>
            <div className="mt-3">
              <button className="btn-primary" onClick={createCarpetaThreadForTarget}>Crear hilo</button>
            </div>
          </div>

          <div className="card p-4">
            <span className="section-tag mb-2 block">// Vista rápida de carpeta</span>
            {carpetaPreview ? (
              <div className="text-xs text-tx-secondary space-y-1">
                <p><strong className="text-tx-primary">Usuario:</strong> {carpetaPreview.username || '—'}</p>
                <p><strong className="text-tx-primary">Anotaciones:</strong> {Array.isArray(carpetaPreview.anotaciones) ? carpetaPreview.anotaciones.length : 0}</p>
                <p><strong className="text-tx-primary">Documentos:</strong> {Array.isArray(carpetaPreview.documentos) ? carpetaPreview.documentos.length : 0}</p>
                <p><strong className="text-tx-primary">Hilos:</strong> {Array.isArray(carpetaPreview.hilos) ? carpetaPreview.hilos.length : 0}</p>
              </div>
            ) : (
              <p className="text-xs text-tx-muted">No hay carpeta cargada aún.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'callsigns' && (
        <div className="card overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
            <span className="section-tag">// Asignar Callsigns</span>
            <button onClick={loadUsers} className="text-tx-muted hover:text-tx-primary"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /></button>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-bg-border">{['Usuario', 'Nombre IC', 'Rol', 'Callsign Actual', 'Nuevo Callsign', ''].map((h) => <th key={h} className="table-head">{h}</th>)}</tr></thead>
            <tbody>
              {users.filter((u) => u.rol !== 'visitante').map((u) => (
                <tr key={u.id} className="table-row">
                  <td className="table-cell font-medium text-tx-primary">{u.username}</td>
                  <td className="table-cell text-xs text-tx-secondary">{u.nombre || '—'}</td>
                  <td className="table-cell"><span className={ROL_TAG[u.rol] || ''}>{u.rol?.replace('_', ' ')}</span></td>
                  <td className="table-cell"><span className={`font-mono text-xs ${u.callsign ? 'text-accent-gold' : 'text-tx-muted'}`}>{u.callsign || 'Sin asignar'}</span></td>
                  <td className="table-cell"><input className="input text-xs py-1.5 w-32 font-mono" placeholder="ALPHA-1" value={callsignEdit[u.id] || ''} onChange={(e) => setCallsignEdit((p) => ({ ...p, [u.id]: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && saveCallsign(u.id, u.username)} /></td>
                  <td className="table-cell"><button onClick={() => saveCallsign(u.id, u.username)} disabled={!callsignEdit[u.id]?.trim()} className="btn-primary text-[8px] py-1 px-2 disabled:opacity-30">Guardar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'forms' && (
        <div className="space-y-4">
          <div className="border border-cyan-500/30 bg-slate-950/60 backdrop-blur-xl rounded-xl p-4">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Settings2 size={14} className="text-cyan-300" />
                <span className="section-tag">// Google Forms (Oposiciones)</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => saveGoogleFormSettings({ googleFormOpen: !((websiteConfig?.oposicionesInfo?.googleFormOpen ?? true)) })}
                  disabled={!isCS || googleBusy}
                  className={`px-3 py-1.5 border font-mono text-[9px] uppercase tracking-widest ${websiteConfig?.oposicionesInfo?.googleFormOpen ?? true ? 'border-green-700 text-green-300' : 'border-red-700 text-red-300'} disabled:opacity-50`}
                >
                  {websiteConfig?.oposicionesInfo?.googleFormOpen ?? true ? 'Recepción Google: Abierta' : 'Recepción Google: Cerrada'}
                </button>
                <button onClick={loadGoogleResponses} disabled={googleBusy} className="btn-ghost py-1.5">
                  {googleBusy ? 'Cargando...' : 'Ver respuestas Google'}
                </button>
              </div>
            </div>

            <div className="border border-bg-border bg-bg-surface p-3 mb-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-cyan-300 mb-2">Referencia del formulario (persistente)</p>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                <input
                  className="input text-xs py-2"
                  value={websiteConfig?.oposicionesInfo?.googleFormId || ''}
                  onChange={(e) => setWebsiteConfig((p: any) => ({
                    ...p,
                    oposicionesInfo: {
                      ...(p?.oposicionesInfo || {}),
                      googleFormId: e.target.value,
                    },
                  }))}
                  placeholder="Pega URL completa o ID del Google Form"
                />
                <button
                  onClick={() => saveGoogleFormSettings({ googleFormId: websiteConfig?.oposicionesInfo?.googleFormId || '' })}
                  disabled={!isCS || googleBusy}
                  className="btn-primary py-2 disabled:opacity-50"
                >
                  Guardar link/ID
                </button>
              </div>
              {(() => {
                const google = buildGoogleFormUrls(websiteConfig?.oposicionesInfo?.googleFormId || '')
                if (!google.openUrl) {
                  return <p className="text-[11px] text-tx-muted mt-2">Sin referencia válida todavía.</p>
                }
                return (
                  <div className="mt-2">
                    <a href={google.openUrl} target="_blank" rel="noreferrer" className="font-mono text-[9px] text-accent-blue hover:underline">Abrir formulario actual en nueva pestaña</a>
                    {google.embedUrl ? (
                      <iframe title="Google Form Preview (admin)" src={google.embedUrl} className="w-full h-[260px] border border-bg-border bg-black mt-2" loading="lazy" />
                    ) : (
                      <p className="font-mono text-[9px] text-tx-muted mt-2">El enlace guardado abre correctamente, pero no provee vista embebida. Usa URL de docs.google.com/forms/... para preview interna.</p>
                    )}
                  </div>
                )
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label">Sheet ID de respuestas</label>
                <input
                  className="input text-xs py-2"
                  value={websiteConfig?.oposicionesInfo?.googleResponsesSheetId || ''}
                  onChange={(e) => setWebsiteConfig((p: any) => ({
                    ...p,
                    oposicionesInfo: {
                      ...(p?.oposicionesInfo || {}),
                      googleResponsesSheetId: e.target.value,
                    },
                  }))}
                  placeholder="ID o URL de Google Sheet"
                />
              </div>
              <div>
                <label className="label">Rango de lectura</label>
                <input
                  className="input text-xs py-2"
                  value={websiteConfig?.oposicionesInfo?.googleResponsesRange || 'A:Z'}
                  onChange={(e) => setWebsiteConfig((p: any) => ({
                    ...p,
                    oposicionesInfo: {
                      ...(p?.oposicionesInfo || {}),
                      googleResponsesRange: e.target.value,
                    },
                  }))}
                  placeholder="Respuestas de formulario 1!A:Z"
                />
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => saveGoogleFormSettings({
                  googleResponsesSheetId: websiteConfig?.oposicionesInfo?.googleResponsesSheetId || '',
                  googleResponsesRange: websiteConfig?.oposicionesInfo?.googleResponsesRange || 'A:Z',
                })}
                disabled={!isCS || googleBusy}
                className="btn-primary py-2 disabled:opacity-50"
              >
                Guardar origen de respuestas
              </button>
            </div>

            {googleRows.length > 0 && (
              <div className="mt-4 border border-bg-border rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-bg-border">
                      {googleHeaders.map((h) => (
                        <th key={h} className="table-head whitespace-nowrap">{h || 'Columna'}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {googleRows.map((row: any) => (
                      <tr key={row.id} className="table-row">
                        {googleHeaders.map((h) => (
                          <td key={`${row.id}-${h}`} className="table-cell text-xs text-tx-secondary align-top">{row?.values?.[h] || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border border-indigo-500/30 bg-slate-950/60 backdrop-blur-xl rounded-xl p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2"><Settings2 size={14} className="text-indigo-300" /><span className="section-tag">// Módulo Global de Formularios</span></div>
              <div className="flex gap-2">
                <button onClick={() => toggleGlobalResponses(!(formsData.config?.responsesOpen !== false))} className={`px-3 py-1.5 border font-mono text-[9px] uppercase tracking-widest ${formsData.config?.responsesOpen !== false ? 'border-green-700 text-green-300' : 'border-red-700 text-red-300'}`}>{formsData.config?.responsesOpen !== false ? 'Recepción: Abierta' : 'Recepción: Cerrada'}</button>
                {isCS && <button onClick={resetAllForms} className="px-3 py-1.5 border border-red-700 text-red-300 font-mono text-[9px] uppercase tracking-widest">Reset Total</button>}
              </div>
            </div>
            <p className="text-xs text-tx-secondary">Edición permitida para Supervisory y Command Staff. Oposiciones visibles para RRHH/Command Staff según clases.</p>
          </div>

          {canManageForms && (
            <div className="border border-indigo-500/30 bg-slate-900/40 backdrop-blur-xl rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="section-tag">// Builder Dinámico (CRUD completo)</span>
                <button className="btn-ghost py-1.5" onClick={() => setBuilder(EMPTY_FORM)}>Limpiar</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="md:col-span-2"><label className="label">Título</label><input className="input" value={builder.title} onChange={(e) => setBuilder((p: any) => ({ ...p, title: e.target.value }))} /></div>
                <div><label className="label">Rama</label><select className="input" value={builder.branch} onChange={(e) => setBuilder((p: any) => ({ ...p, branch: e.target.value }))}>{FORM_BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
                <div><label className="label">Tipo</label><select className="input" value={builder.kind} onChange={(e) => setBuilder((p: any) => ({ ...p, kind: e.target.value }))}><option value="general">General</option><option value="oposicion">Oposición/Reclutamiento</option></select></div>
                <div><label className="label">Icono (FA/Lucide string)</label><input className="input" value={builder.icon} onChange={(e) => setBuilder((p: any) => ({ ...p, icon: e.target.value }))} /></div>
                <div><label className="label">Activo</label><select className="input" value={builder.active ? '1' : '0'} onChange={(e) => setBuilder((p: any) => ({ ...p, active: e.target.value === '1' }))}><option value="1">Sí</option><option value="0">No</option></select></div>
                <div className="md:col-span-3"><label className="label">Descripción</label><textarea className="input min-h-20" value={builder.description} onChange={(e) => setBuilder((p: any) => ({ ...p, description: e.target.value }))} /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div><label className="label">Deadline</label><input className="input" type="datetime-local" value={builder.deadlineAt || ''} onChange={(e) => setBuilder((p: any) => ({ ...p, deadlineAt: e.target.value }))} /></div>
                <div><label className="label">Timer (min)</label><input className="input" type="number" min={1} value={builder.timeLimitMinutes || ''} onChange={(e) => setBuilder((p: any) => ({ ...p, timeLimitMinutes: e.target.value }))} /></div>
                <div><label className="label">Máx respuestas</label><input className="input" type="number" min={1} value={builder.maxResponses || ''} onChange={(e) => setBuilder((p: any) => ({ ...p, maxResponses: e.target.value }))} /></div>
                <div><label className="label">Acepta respuestas</label><select className="input" value={builder.acceptsResponses ? '1' : '0'} onChange={(e) => setBuilder((p: any) => ({ ...p, acceptsResponses: e.target.value === '1' }))}><option value="1">Sí</option><option value="0">No</option></select></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="label">Roles que pueden responder</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_KEYS.map((rk) => {
                      const active = (builder.allowedSubmitRoles || []).includes(rk)
                      return <button key={rk} className={`px-2 py-1 border text-[10px] font-mono ${active ? 'border-indigo-500 text-indigo-300' : 'border-bg-border text-tx-muted'}`} onClick={() => setBuilder((p: any) => ({ ...p, allowedSubmitRoles: active ? (p.allowedSubmitRoles || []).filter((x: string) => x !== rk) : [...(p.allowedSubmitRoles || []), rk] }))}>{rk}</button>
                    })}
                  </div>
                </div>
                <div>
                  <label className="label">Permisos para ver respuestas</label>
                  <div className="flex flex-wrap gap-1.5">
                    {VIEWER_KEYS.map((vk) => {
                      const active = (builder.allowedViewerKeys || []).includes(vk)
                      return <button key={vk} className={`px-2 py-1 border text-[10px] font-mono ${active ? 'border-cyan-500 text-cyan-300' : 'border-bg-border text-tx-muted'}`} onClick={() => setBuilder((p: any) => ({ ...p, allowedViewerKeys: active ? (p.allowedViewerKeys || []).filter((x: string) => x !== vk) : [...(p.allowedViewerKeys || []), vk] }))}>{vk}</button>
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div><label className="label">Tema</label><select className="input" value={builder.theme?.mode || 'glass'} onChange={(e) => setBuilder((p: any) => ({ ...p, theme: { ...(p.theme || {}), mode: e.target.value } }))}><option value="glass">Glassmorphism</option><option value="slate">Slate Clean</option></select></div>
                <div><label className="label">Acento</label><input type="color" className="input h-10" value={builder.theme?.accent || '#4f7cff'} onChange={(e) => setBuilder((p: any) => ({ ...p, theme: { ...(p.theme || {}), accent: e.target.value } }))} /></div>
                <div><label className="label">Superficie</label><input type="color" className="input h-10" value={builder.theme?.surface || '#121a33'} onChange={(e) => setBuilder((p: any) => ({ ...p, theme: { ...(p.theme || {}), surface: e.target.value } }))} /></div>
                <div><label className="label">Fondo</label><input type="color" className="input h-10" value={builder.theme?.background || '#090f1f'} onChange={(e) => setBuilder((p: any) => ({ ...p, theme: { ...(p.theme || {}), background: e.target.value } }))} /></div>
              </div>

              <div className="space-y-2 mb-3">
                {builder.fields.map((f: BuilderField, i: number) => (
                  <div key={`${f.id}-${i}`} className="border border-bg-border rounded-lg p-3 bg-bg-surface/50">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2">
                      <input className="input text-xs" placeholder="id" value={f.id} onChange={(e) => setField(i, { id: e.target.value })} />
                      <input className="input text-xs md:col-span-2" placeholder="Etiqueta" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
                      <select className="input text-xs" value={f.type} onChange={(e) => setField(i, { type: e.target.value as FieldType })}>{FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                      <input className="input text-xs" placeholder="Placeholder" value={f.placeholder || ''} onChange={(e) => setField(i, { placeholder: e.target.value })} />
                      <input className="input text-xs" type="number" min={0} placeholder="MaxLen" value={f.maxLength || ''} onChange={(e) => setField(i, { maxLength: Number(e.target.value) || undefined })} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                      <input className="input text-xs md:col-span-3" placeholder="Ayuda del campo" value={f.helpText || ''} onChange={(e) => setField(i, { helpText: e.target.value })} />
                      <label className="flex items-center gap-2 text-xs text-tx-muted"><input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} />Obligatorio</label>
                    </div>

                    {['select', 'radio', 'checkbox'].includes(f.type) && (
                      <div className="mb-2">
                        <label className="label">Opciones (separadas por coma)</label>
                        <input className="input text-xs" value={(f.options || []).join(', ')} onChange={(e) => setField(i, { options: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
                      </div>
                    )}

                    {f.type === 'image' && (
                      <div className="mb-2">
                        <label className="label">Imágenes del campo (editor integrado)</label>
                        <div className="flex gap-2 items-center flex-wrap">
                          <label className="btn-ghost py-1.5 cursor-pointer inline-flex items-center gap-2"><ImagePlus size={12} />Subir<input type="file" className="hidden" accept="image/*" multiple onChange={(e) => addImageToField(i, e.target.files)} /></label>
                          {(f.images || []).map((img, idx) => (
                            <div key={idx} className="relative">
                              <img src={img} alt="preview" className="w-14 h-14 object-cover border border-bg-border" />
                              <button className="absolute -top-1 -right-1 w-4 h-4 text-[9px] bg-red-700 text-white" onClick={() => setField(i, { images: (f.images || []).filter((_, ix) => ix !== idx) })}>x</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button className="btn-ghost py-1.5" onClick={() => moveField(i, -1)}>↑</button>
                      <button className="btn-ghost py-1.5" onClick={() => moveField(i, 1)}>↓</button>
                      <button className="btn-ghost py-1.5 text-red-400" onClick={() => removeField(i)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button className="btn-ghost py-2" onClick={addField}><Plus size={12} />Campo</button>
                <button className="btn-primary py-2" onClick={saveBuilderForm} disabled={formsBusy}>Guardar Formulario</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(formsData.forms || []).map((formObj: any) => (
              <div key={formObj.id} className="border border-indigo-500/20 rounded-xl p-4 bg-gradient-to-br from-slate-950/80 to-slate-900/60 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-display text-sm font-semibold tracking-wider uppercase text-indigo-200">{formObj.title}</p>
                  <span className={`tag ${formObj.active ? 'border-green-700 text-green-400' : 'border-gray-700 text-gray-500'}`}>{formObj.active ? 'Activo' : 'Inactivo'}</span>
                </div>
                <p className="text-xs text-tx-secondary mb-2">{formObj.description || 'Sin descripción'}</p>
                <div className="text-[10px] font-mono text-tx-muted mb-3 space-y-1">
                  <div>Rama: {formObj.branch} | Tipo: {formObj.kind}</div>
                  <div className="flex items-center gap-1"><Clock3 size={11} />{formObj.deadlineAt ? new Date(formObj.deadlineAt).toLocaleString('es') : 'Sin deadline'}</div>
                </div>

                <div className="space-y-2 mb-3 max-h-56 overflow-auto">
                  {(formObj.fields || []).map((field: any) => (
                    <div key={field.id}>
                      <label className="label">{field.label}{field.required ? ' *' : ''}</label>
                      {(field.type === 'textarea') && <textarea className="input min-h-16 text-sm" value={(formAnswers[formObj.id] || {})[field.id] || ''} onChange={(e) => setFormAnswers((p) => ({ ...p, [formObj.id]: { ...(p[formObj.id] || {}), [field.id]: e.target.value } }))} />}
                      {(field.type === 'text' || field.type === 'date' || field.type === 'number') && <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} className="input text-sm" value={(formAnswers[formObj.id] || {})[field.id] || ''} onChange={(e) => setFormAnswers((p) => ({ ...p, [formObj.id]: { ...(p[formObj.id] || {}), [field.id]: e.target.value } }))} />}
                      {['select', 'radio'].includes(field.type) && <select className="input text-sm" value={(formAnswers[formObj.id] || {})[field.id] || ''} onChange={(e) => setFormAnswers((p) => ({ ...p, [formObj.id]: { ...(p[formObj.id] || {}), [field.id]: e.target.value } }))}><option value="">Selecciona...</option>{(field.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}</select>}
                      {field.type === 'checkbox' && <div className="flex flex-wrap gap-2 text-xs">{(field.options || []).map((opt: string) => { const cur = (formAnswers[formObj.id] || {})[field.id] || []; const active = Array.isArray(cur) && cur.includes(opt); return <button key={opt} className={`px-2 py-1 border ${active ? 'border-indigo-500 text-indigo-300' : 'border-bg-border text-tx-muted'}`} onClick={() => setFormAnswers((p) => ({ ...p, [formObj.id]: { ...(p[formObj.id] || {}), [field.id]: active ? cur.filter((x: string) => x !== opt) : [...(Array.isArray(cur) ? cur : []), opt] } }))}>{opt}</button> })}</div>}
                      {field.type === 'image' && <div className="space-y-2"><label className="btn-ghost py-1.5 cursor-pointer inline-flex items-center gap-2"><ImagePlus size={12} />Cargar imagen<input type="file" className="hidden" accept="image/*" multiple onChange={async (e) => { const files = Array.from(e.target.files || []).slice(0, 3); const encoded = await Promise.all(files.map((f) => readFileAsDataUrl(f))); setFormAnswers((p) => ({ ...p, [formObj.id]: { ...(p[formObj.id] || {}), [field.id]: [...(((p[formObj.id] || {})[field.id] || []) as string[]), ...encoded].slice(0, 10) } })) }} /></label><div className="flex gap-2 flex-wrap">{(((formAnswers[formObj.id] || {})[field.id] || []) as string[]).map((img: string, idx: number) => <img key={idx} src={img} alt="answer" className="w-12 h-12 object-cover border border-bg-border" />)}</div></div>}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button className="btn-primary py-2" onClick={() => submitPreview(formObj)}>Enviar prueba</button>
                  {canManageForms && <button className="btn-ghost py-2" onClick={() => setBuilder({ ...EMPTY_FORM, ...formObj, deadlineAt: formObj.deadlineAt ? String(formObj.deadlineAt).slice(0, 16) : '' })}>Editar</button>}
                  {canManageForms && <button className="btn-ghost py-2" onClick={() => toggleForm(formObj.id)}>{formObj.active ? 'Desactivar' : 'Activar'}</button>}
                  {canManageForms && <button className="btn-ghost py-2" onClick={() => loadResponses(formObj.id)}>Respuestas</button>}
                  {canManageForms && <button className="btn-ghost py-2 text-red-400" onClick={() => deleteFormById(formObj.id)}>Eliminar</button>}
                </div>
              </div>
            ))}
          </div>

          {selectedFormForResponses && (
            <div className="border border-bg-border rounded-xl p-4 bg-bg-surface overflow-x-auto">
              <p className="section-tag mb-3">// Respuestas ({responses.length})</p>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-bg-border"><th className="table-head">Usuario</th><th className="table-head">Rol</th><th className="table-head">Fecha</th><th className="table-head">Respuestas</th><th className="table-head"></th></tr></thead>
                <tbody>
                  {responses.map((r: any) => (
                    <tr key={r.id} className="table-row">
                      <td className="table-cell">{r.byUser}</td>
                      <td className="table-cell">{r.byRole}</td>
                      <td className="table-cell">{new Date(r.createdAt).toLocaleString('es')}</td>
                      <td className="table-cell font-mono text-[10px]">{Object.entries(r.answers || {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(',') : v}`).join(' | ')}</td>
                      <td className="table-cell"><button className="text-red-400" onClick={() => removeResponse(selectedFormForResponses, r.id)}><Trash2 size={12} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'website' && isCS && (
        <div className="space-y-4">
          {!websiteConfig ? (
            <div className="card p-6"><p className="font-mono text-xs text-tx-muted">Cargando configuración pública...</p></div>
          ) : (
            <>
              <div className="card p-5 flex flex-col gap-4 border-cyan-700/30">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="section-tag">// Website Pública</span>
                    <p className="text-xs text-tx-secondary mt-1">Este bloque reemplaza el antiguo panel de indra.</p>
                  </div>
                  <button onClick={saveWebsiteConfig} disabled={websiteSaving} className="btn-primary py-2">{websiteSaving ? 'Guardando...' : 'Guardar website'}</button>
                </div>

                <div className="border border-bg-border bg-bg-surface p-4">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-cyan-300 mb-3">Preview rápida</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="border border-bg-border bg-bg-card p-3">
                      <p className="font-display text-xs tracking-wider uppercase text-tx-primary">Misión</p>
                      <p className="text-xs text-tx-secondary mt-1 line-clamp-3">{websiteConfig.textoMision || 'Sin texto de misión'}</p>
                    </div>
                    <div className="border border-bg-border bg-bg-card p-3">
                      <p className="font-display text-xs tracking-wider uppercase text-tx-primary">Oposiciones</p>
                      <p className="text-xs text-tx-secondary mt-1">{websiteConfig.oposicionesInfo?.titulo || 'Sin título'}</p>
                      <p className="font-mono text-[10px] text-tx-muted mt-2">Pasos: {Array.isArray(websiteConfig.oposicionesInfo?.formularioPasos) ? websiteConfig.oposicionesInfo.formularioPasos.filter(Boolean).length : 0}</p>
                      <p className="font-mono text-[10px] text-tx-muted">Datos: {Array.isArray(websiteConfig.oposicionesInfo?.datos) ? websiteConfig.oposicionesInfo.datos.filter(Boolean).length : 0}</p>
                    </div>
                    <div className="border border-bg-border bg-bg-card p-3">
                      <p className="font-display text-xs tracking-wider uppercase text-tx-primary">FAQ</p>
                      <p className="font-mono text-[10px] text-tx-muted mt-1">Preguntas: {Array.isArray(websiteConfig.faqInfo?.items) ? websiteConfig.faqInfo.items.filter((x: any) => x?.pregunta).length : 0}</p>
                    </div>
                    <div className="border border-bg-border bg-bg-card p-3">
                      <p className="font-display text-xs tracking-wider uppercase text-tx-primary">Organigrama</p>
                      <p className="font-mono text-[10px] text-tx-muted mt-1">{websiteConfig.organigramaInfo?.imageUrl ? 'Imagen cargada' : 'Sin imagen'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Texto de Misión</label>
                  <textarea className="input min-h-24" value={websiteConfig.textoMision || ''} onChange={(e) => setWebsiteConfig((p: any) => ({ ...p, textoMision: e.target.value }))} />
                </div>

                <div>
                  <label className="label">Título Oposiciones</label>
                  <input className="input" value={websiteConfig.oposicionesInfo?.titulo || ''} onChange={(e) => setWebsiteConfig((p: any) => ({ ...p, oposicionesInfo: { ...(p.oposicionesInfo || {}), titulo: e.target.value } }))} />
                </div>

                <div>
                  <label className="label">Descripción Oposiciones</label>
                  <textarea className="input min-h-24" value={websiteConfig.oposicionesInfo?.descripcion || ''} onChange={(e) => setWebsiteConfig((p: any) => ({ ...p, oposicionesInfo: { ...(p.oposicionesInfo || {}), descripcion: e.target.value } }))} />
                </div>

                <div>
                  <label className="label">Referencia Google Forms</label>
                  <input className="input" value={websiteConfig.oposicionesInfo?.googleFormId || ''} onChange={(e) => setWebsiteConfig((p: any) => ({ ...p, oposicionesInfo: { ...(p.oposicionesInfo || {}), googleFormId: e.target.value } }))} placeholder="URL completa o ID del formulario" />
                  <p className="font-mono text-[8px] text-tx-dim mt-1">Acepta URL completa, ID de /d/e/ o ID de /d/.</p>
                </div>

                {(() => {
                  const google = buildGoogleFormUrls(websiteConfig.oposicionesInfo?.googleFormId || '')
                  if (!google.openUrl) return null
                  return (
                    <div className="border border-bg-border bg-bg-surface p-3">
                      <p className="font-mono text-[8px] text-tx-muted uppercase mb-2">Preview del formulario</p>
                      <iframe title="Google Form Preview" src={google.embedUrl} className="w-full h-[360px] border border-bg-border bg-black" loading="lazy" />
                      <a href={google.openUrl} target="_blank" rel="noreferrer" className="font-mono text-[9px] text-accent-blue hover:underline mt-2 inline-block">Abrir formulario</a>
                    </div>
                  )
                })()}

                <div>
                  <label className="label">Intro del formulario</label>
                  <textarea className="input min-h-20" value={websiteConfig.oposicionesInfo?.formularioIntro || ''} onChange={(e) => setWebsiteConfig((p: any) => ({ ...p, oposicionesInfo: { ...(p.oposicionesInfo || {}), formularioIntro: e.target.value } }))} />
                </div>

                <div>
                  <label className="label">Pasos (uno por línea)</label>
                  <div className="space-y-2">
                    {(Array.isArray(websiteConfig.oposicionesInfo?.formularioPasos) ? websiteConfig.oposicionesInfo.formularioPasos : []).map((step: string, idx: number) => (
                      <div key={`step-${idx}`} className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-tx-muted w-5">{idx + 1}.</span>
                        <input
                          className="input text-xs py-2 flex-1"
                          value={step || ''}
                          placeholder="Paso del formulario"
                          onChange={(e) => setWebsiteConfig((p: any) => {
                            const steps = Array.isArray(p.oposicionesInfo?.formularioPasos) ? [...p.oposicionesInfo.formularioPasos] : []
                            steps[idx] = e.target.value
                            return { ...p, oposicionesInfo: { ...(p.oposicionesInfo || {}), formularioPasos: steps } }
                          })}
                        />
                        <button
                          className="font-mono text-[9px] text-red-400 hover:text-red-300"
                          onClick={() => setWebsiteConfig((p: any) => {
                            const steps = Array.isArray(p.oposicionesInfo?.formularioPasos) ? [...p.oposicionesInfo.formularioPasos] : []
                            steps.splice(idx, 1)
                            return { ...p, oposicionesInfo: { ...(p.oposicionesInfo || {}), formularioPasos: steps } }
                          })}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      className="btn-ghost py-1.5 text-[9px]"
                      onClick={() => setWebsiteConfig((p: any) => ({
                        ...p,
                        oposicionesInfo: {
                          ...(p.oposicionesInfo || {}),
                          formularioPasos: [...(Array.isArray(p.oposicionesInfo?.formularioPasos) ? p.oposicionesInfo.formularioPasos : []), ''],
                        },
                      }))}
                    >
                      + Agregar paso
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Datos clave (uno por línea)</label>
                  <div className="space-y-2">
                    {(Array.isArray(websiteConfig.oposicionesInfo?.datos) ? websiteConfig.oposicionesInfo.datos : []).map((dato: string, idx: number) => (
                      <div key={`dato-${idx}`} className="flex items-center gap-2">
                        <input
                          className="input text-xs py-2 flex-1"
                          value={dato || ''}
                          placeholder="Dato clave"
                          onChange={(e) => setWebsiteConfig((p: any) => {
                            const datos = Array.isArray(p.oposicionesInfo?.datos) ? [...p.oposicionesInfo.datos] : []
                            datos[idx] = e.target.value
                            return { ...p, oposicionesInfo: { ...(p.oposicionesInfo || {}), datos } }
                          })}
                        />
                        <button
                          className="font-mono text-[9px] text-red-400 hover:text-red-300"
                          onClick={() => setWebsiteConfig((p: any) => {
                            const datos = Array.isArray(p.oposicionesInfo?.datos) ? [...p.oposicionesInfo.datos] : []
                            datos.splice(idx, 1)
                            return { ...p, oposicionesInfo: { ...(p.oposicionesInfo || {}), datos } }
                          })}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      className="btn-ghost py-1.5 text-[9px]"
                      onClick={() => setWebsiteConfig((p: any) => ({
                        ...p,
                        oposicionesInfo: {
                          ...(p.oposicionesInfo || {}),
                          datos: [...(Array.isArray(p.oposicionesInfo?.datos) ? p.oposicionesInfo.datos : []), ''],
                        },
                      }))}
                    >
                      + Agregar dato
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Imágenes de oposiciones</label>
                  <div className="space-y-2">
                    {(Array.isArray(websiteConfig.oposicionesInfo?.imagenes) ? websiteConfig.oposicionesInfo.imagenes : []).map((img: string, idx: number) => (
                      <div key={`img-${idx}`} className="border border-bg-border bg-bg-surface p-2">
                        <div className="flex items-center gap-2">
                          <input
                            className="input text-xs py-2 flex-1"
                            value={img || ''}
                            placeholder="https://..."
                            onChange={(e) => setWebsiteConfig((p: any) => {
                              const imagenes = Array.isArray(p.oposicionesInfo?.imagenes) ? [...p.oposicionesInfo.imagenes] : []
                              imagenes[idx] = e.target.value
                              return { ...p, oposicionesInfo: { ...(p.oposicionesInfo || {}), imagenes } }
                            })}
                          />
                          <button
                            className="font-mono text-[9px] text-red-400 hover:text-red-300"
                            onClick={() => setWebsiteConfig((p: any) => {
                              const imagenes = Array.isArray(p.oposicionesInfo?.imagenes) ? [...p.oposicionesInfo.imagenes] : []
                              imagenes.splice(idx, 1)
                              return { ...p, oposicionesInfo: { ...(p.oposicionesInfo || {}), imagenes } }
                            })}
                          >
                            ✕
                          </button>
                        </div>
                        {img && (
                          <div className="mt-2 border border-bg-border overflow-hidden">
                            <img src={img} alt={`Oposicion ${idx + 1}`} className="w-full object-cover" style={{ maxHeight: '140px' }} />
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      className="btn-ghost py-1.5 text-[9px]"
                      onClick={() => setWebsiteConfig((p: any) => ({
                        ...p,
                        oposicionesInfo: {
                          ...(p.oposicionesInfo || {}),
                          imagenes: [...(Array.isArray(p.oposicionesInfo?.imagenes) ? p.oposicionesInfo.imagenes : []), ''],
                        },
                      }))}
                    >
                      + Agregar imagen
                    </button>
                  </div>
                </div>
              </div>

              <div className="card p-5 flex flex-col gap-4 border-cyan-700/30">
                <span className="section-tag">// Comunicados</span>
                <div>
                  <label className="label">Título</label>
                  <input className="input" value={websiteConfig.comunicadosInfo?.titulo || ''} onChange={(e) => setWebsiteConfig((p: any) => ({ ...p, comunicadosInfo: { ...(p.comunicadosInfo || {}), titulo: e.target.value } }))} />
                </div>
                <div>
                  <label className="label">Descripción</label>
                  <textarea className="input min-h-16" value={websiteConfig.comunicadosInfo?.descripcion || ''} onChange={(e) => setWebsiteConfig((p: any) => ({ ...p, comunicadosInfo: { ...(p.comunicadosInfo || {}), descripcion: e.target.value } }))} />
                </div>
                <div>
                  <label className="label">Items (estado|titulo|detalle|enlace)</label>
                  <textarea className="input min-h-28" value={Array.isArray(websiteConfig.comunicadosInfo?.items) ? websiteConfig.comunicadosInfo.items.map((it: any) => `${it.estado || 'activo'}|${it.titulo || ''}|${it.detalle || ''}|${it.enlace || ''}`).join('\n') : ''} onChange={(e) => setWebsiteConfig((p: any) => ({ ...p, comunicadosInfo: { ...(p.comunicadosInfo || {}), items: e.target.value.split('\n').map((line, idx) => { const [estado = 'activo', titulo = '', detalle = '', enlace = ''] = line.split('|'); return { id: `com-${idx + 1}`, estado: estado.trim(), titulo: titulo.trim(), detalle: detalle.trim(), enlace: enlace.trim(), fecha: new Date().toISOString() } }).filter((x) => x.titulo) } }))} />
                </div>
              </div>

              {/* FAQ */}
              <div className="card p-5 flex flex-col gap-4 border-cyan-700/30">
                <div className="flex items-center justify-between gap-3">
                  <span className="section-tag">// FAQ — Preguntas Frecuentes</span>
                  <button
                    className="btn-ghost text-[9px] py-1.5"
                    onClick={() => setWebsiteConfig((p: any) => ({
                      ...p,
                      faqInfo: {
                        ...(p.faqInfo || {}),
                        items: [
                          ...(Array.isArray(p.faqInfo?.items) ? p.faqInfo.items : []),
                          { id: `faq-${Date.now()}`, pregunta: '', respuesta: '' },
                        ],
                      },
                    }))}
                  >
                    + Agregar pregunta
                  </button>
                </div>
                <div>
                  <label className="label">Título de la sección</label>
                  <input
                    className="input"
                    value={websiteConfig.faqInfo?.titulo || ''}
                    placeholder="Preguntas Frecuentes"
                    onChange={(e) => setWebsiteConfig((p: any) => ({ ...p, faqInfo: { ...(p.faqInfo || {}), titulo: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="label">Descripción (opcional)</label>
                  <input
                    className="input"
                    value={websiteConfig.faqInfo?.descripcion || ''}
                    onChange={(e) => setWebsiteConfig((p: any) => ({ ...p, faqInfo: { ...(p.faqInfo || {}), descripcion: e.target.value } }))}
                  />
                </div>
                {Array.isArray(websiteConfig.faqInfo?.items) && websiteConfig.faqInfo.items.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="border border-bg-border bg-bg-surface p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-[9px] text-tx-muted uppercase tracking-widest">Pregunta {idx + 1}</span>
                      <button
                        className="font-mono text-[9px] text-red-400 hover:text-red-300"
                        onClick={() => setWebsiteConfig((p: any) => ({
                          ...p,
                          faqInfo: {
                            ...(p.faqInfo || {}),
                            items: p.faqInfo.items.filter((_: any, i: number) => i !== idx),
                          },
                        }))}
                      >
                        ✕ Quitar
                      </button>
                    </div>
                    <input
                      className="input text-xs py-2"
                      placeholder="Pregunta (ej. ¿Cómo me uno a la FIB?)"
                      value={item.pregunta || ''}
                      onChange={(e) => setWebsiteConfig((p: any) => {
                        const items = [...(p.faqInfo?.items || [])]
                        items[idx] = { ...items[idx], pregunta: e.target.value }
                        return { ...p, faqInfo: { ...(p.faqInfo || {}), items } }
                      })}
                    />
                    <textarea
                      className="input text-xs min-h-16"
                      placeholder="Respuesta..."
                      value={item.respuesta || ''}
                      onChange={(e) => setWebsiteConfig((p: any) => {
                        const items = [...(p.faqInfo?.items || [])]
                        items[idx] = { ...items[idx], respuesta: e.target.value }
                        return { ...p, faqInfo: { ...(p.faqInfo || {}), items } }
                      })}
                    />
                  </div>
                ))}
                {(!Array.isArray(websiteConfig.faqInfo?.items) || websiteConfig.faqInfo.items.length === 0) && (
                  <p className="font-mono text-[9px] text-tx-muted">Sin preguntas. Haz clic en "+ Agregar pregunta".</p>
                )}
              </div>

              {/* Organigrama */}
              <div className="card p-5 flex flex-col gap-4 border-cyan-700/30">
                <span className="section-tag">// Organigrama</span>
                <div>
                  <label className="label">Título de la sección</label>
                  <input
                    className="input"
                    placeholder="Organigrama"
                    value={websiteConfig.organigramaInfo?.titulo || ''}
                    onChange={(e) => setWebsiteConfig((p: any) => ({ ...p, organigramaInfo: { ...(p.organigramaInfo || {}), titulo: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="label">Descripción (opcional)</label>
                  <input
                    className="input"
                    value={websiteConfig.organigramaInfo?.descripcion || ''}
                    onChange={(e) => setWebsiteConfig((p: any) => ({ ...p, organigramaInfo: { ...(p.organigramaInfo || {}), descripcion: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="label">URL de la imagen del organigrama</label>
                  <input
                    className="input text-xs py-2"
                    placeholder="https://i.imgur.com/... (recomendado: PNG o JPG en alta resolución)"
                    value={websiteConfig.organigramaInfo?.imageUrl || ''}
                    onChange={(e) => setWebsiteConfig((p: any) => ({ ...p, organigramaInfo: { ...(p.organigramaInfo || {}), imageUrl: e.target.value } }))}
                  />
                  <p className="font-mono text-[8px] text-tx-dim mt-1">Para máxima calidad usa Imgur (Direct Link), Google Drive (acceso público) o cualquier CDN de imágenes.</p>
                </div>
                {websiteConfig.organigramaInfo?.imageUrl && (
                  <div className="border border-bg-border bg-bg-surface overflow-hidden">
                    <p className="font-mono text-[9px] text-tx-muted tracking-widest uppercase px-3 py-2 border-b border-bg-border">Vista previa</p>
                    <img
                      src={websiteConfig.organigramaInfo.imageUrl}
                      alt="Organigrama preview"
                      className="w-full object-contain"
                      style={{ maxHeight: '360px' }}
                    />
                    <a
                      href={websiteConfig.organigramaInfo.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-center font-mono text-[9px] text-accent-blue py-2 hover:underline border-t border-bg-border"
                    >
                      ↗ Ver imagen completa en nueva pestaña
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
