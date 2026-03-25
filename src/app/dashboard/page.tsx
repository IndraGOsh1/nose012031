'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Users, FolderOpen, FileSearch, Ticket, TrendingUp, Shield, ChevronRight, ClipboardList, Plus, Trash2 } from 'lucide-react'
import { getStats, getForms, saveForm, submitForm, getFormResponses } from '@/lib/client'

type FieldType = 'text' | 'textarea' | 'number' | 'date'

type BuilderField = {
  id: string
  label: string
  type: FieldType
  required: boolean
}

const EMPTY_BUILDER = {
  id: '',
  title: '',
  description: '',
  active: true,
  fields: [
    { id: 'campo_1', label: 'Campo 1', type: 'text' as FieldType, required: true },
  ] as BuilderField[],
}

export default function DashboardHome() {
  const [user,  setUser]  = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [formsData, setFormsData] = useState<{ forms: any[]; canManage: boolean }>({ forms: [], canManage: false })
  const [builder, setBuilder] = useState(EMPTY_BUILDER)
  const [formAnswers, setFormAnswers] = useState<Record<string, Record<string, string>>>({})
  const [formStartedAt, setFormStartedAt] = useState<Record<string, number>>({})
  const [responses, setResponses] = useState<any[]>([])
  const [selectedFormForResponses, setSelectedFormForResponses] = useState<string>('')
  const [formsBusy, setFormsBusy] = useState(false)
  const [formsMsg, setFormsMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    const u = localStorage.getItem('fib_user')
    if (u) setUser(JSON.parse(u))
    getStats().then(setStats).catch(() => {}).finally(() => setLoading(false))
    loadForms()

    const refresh = setInterval(() => {
      getStats().then(setStats).catch(() => {})
      loadForms()
    }, 45_000)

    return () => clearInterval(refresh)
  }, [])

  async function loadForms() {
    try {
      const data = await getForms()
      setFormsData(data)
      const startedAt: Record<string, number> = {}
      for (const f of data.forms || []) startedAt[f.id] = Date.now()
      setFormStartedAt(startedAt)
    } catch {
      setFormsData({ forms: [], canManage: false })
    }
  }

  function notifyForms(ok: boolean, text: string) {
    setFormsMsg({ ok, text })
    setTimeout(() => setFormsMsg(null), 3000)
  }

  function addField() {
    setBuilder(prev => ({
      ...prev,
      fields: [
        ...prev.fields,
        { id: `campo_${prev.fields.length + 1}`, label: `Campo ${prev.fields.length + 1}`, type: 'text', required: false },
      ],
    }))
  }

  function removeField(index: number) {
    setBuilder(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }))
  }

  async function saveBuilderForm() {
    if (!formsData.canManage) return
    setFormsBusy(true)
    try {
      const action = builder.id ? 'update' : 'create'
      await saveForm({ action, form: builder })
      notifyForms(true, builder.id ? 'Formulario actualizado' : 'Formulario creado')
      setBuilder(EMPTY_BUILDER)
      await loadForms()
    } catch (e: any) {
      notifyForms(false, e.message || 'No se pudo guardar el formulario')
    } finally {
      setFormsBusy(false)
    }
  }

  async function toggleForm(id: string) {
    if (!formsData.canManage) return
    setFormsBusy(true)
    try {
      await saveForm({ action: 'toggle', id })
      await loadForms()
    } catch (e: any) {
      notifyForms(false, e.message || 'No se pudo cambiar estado')
    } finally {
      setFormsBusy(false)
    }
  }

  async function deleteForm(id: string) {
    if (!formsData.canManage) return
    if (!confirm('¿Eliminar formulario?')) return
    setFormsBusy(true)
    try {
      await saveForm({ action: 'delete', id })
      await loadForms()
    } catch (e: any) {
      notifyForms(false, e.message || 'No se pudo eliminar')
    } finally {
      setFormsBusy(false)
    }
  }

  async function loadResponses(id: string) {
    if (!formsData.canManage) return
    try {
      const data = await getFormResponses(id)
      setSelectedFormForResponses(id)
      setResponses(data.responses || [])
    } catch (e: any) {
      notifyForms(false, e.message || 'No se pudieron cargar respuestas')
    }
  }

  async function submitOneForm(form: any) {
    const answers = formAnswers[form.id] || {}
    setFormsBusy(true)
    try {
      await submitForm(form.id, {
        hp: '',
        startedAt: formStartedAt[form.id] || Date.now(),
        answers,
      })
      notifyForms(true, 'Formulario enviado')
      setFormAnswers(prev => ({ ...prev, [form.id]: {} }))
      setFormStartedAt(prev => ({ ...prev, [form.id]: Date.now() }))
    } catch (e: any) {
      notifyForms(false, e.message || 'No se pudo enviar')
    } finally {
      setFormsBusy(false)
    }
  }

  const STAT_CARDS = [
    { icon: Users,       label:'Agentes Activos',   value: stats?.activos    ?? '—', color:'text-accent-green', href:'/dashboard/personal?estado=Activo' },
    { icon: TrendingUp,  label:'Total Personal',     value: stats?.total      ?? '—', color:'text-accent-blue',  href:'/dashboard/personal' },
    { icon: FolderOpen,  label:'Casos Abiertos',     value:'—',                       color:'text-accent-cyan',  href:'/dashboard/casos' },
    { icon: FileSearch,  label:'Allanamientos',      value:'—',                       color:'text-accent-gold',  href:'/dashboard/allanamientos' },
  ].filter(card => {
    if (user?.rol === 'visitante') return card.href === '/dashboard/personal?estado=Activo'
    return true
  })

  const QUICK = [
    { icon: Users,       label:'Personal',       href:'/dashboard/personal',     desc:'Gestión de agentes' },
    { icon: FolderOpen,  label:'Casos',          href:'/dashboard/casos',         desc:'Investigaciones' },
    { icon: FileSearch,  label:'Allanamientos',  href:'/dashboard/allanamientos', desc:'Solicitudes y PDFs' },
    { icon: Ticket,      label:'Tickets',        href:'/dashboard/tickets',       desc:'Solicitudes internas' },
  ].filter(item => {
    if (user?.rol === 'federal_agent') return true
    if (user?.rol === 'supervisory') return true
    if (user?.rol === 'command_staff') return true
    if (user?.rol === 'visitante') return item.href === '/dashboard/tickets'
    return true
  })

  const canManageForms = formsData.canManage

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <span className="section-tag">// Panel de Control</span>
        <h1 className="font-display text-2xl font-semibold tracking-wider uppercase text-tx-primary mt-1">
          Bienvenido{user?.nombre ? `, ${user.nombre}` : user?.username ? `, ${user.username}` : ''}
        </h1>
        <p className="text-tx-secondary text-sm mt-0.5">Federal Investigation Bureau — Sistema HQ</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-bg-border mb-5">
        {STAT_CARDS.map(c => (
          <Link key={c.label} href={c.href}>
            <div className="bg-bg-card hover:bg-bg-hover transition-all p-5 group cursor-pointer">
              <c.icon size={16} className={`${c.color} mb-3 group-hover:scale-110 transition-transform`} />
              <p className="font-display text-2xl font-semibold text-tx-primary">{loading ? '—' : c.value}</p>
              <p className="font-mono text-[8px] text-tx-muted tracking-widest uppercase mt-1">{c.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Por sección */}
      {stats?.porSeccion && Object.keys(stats.porSeccion).length > 0 && (
        <div className="card p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="section-tag">// Distribución de Personal Activo</span>
            <div className="flex-1 h-px bg-bg-border" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats.porSeccion).map(([sec, count]) => (
              <div key={sec} className="bg-bg-surface border border-bg-border p-3">
                <p className="font-display text-xl font-semibold text-accent-blue">{count as number}</p>
                <p className="font-mono text-[8px] text-tx-muted tracking-widest uppercase mt-0.5">{sec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick access */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="section-tag">// Acceso Rápido</span>
          <div className="flex-1 h-px bg-bg-border" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-bg-border">
          {QUICK.map(q => (
            <Link key={q.label} href={q.href}>
              <div className="bg-bg-surface hover:bg-bg-hover transition-all p-5 group cursor-pointer">
                <q.icon size={15} className="text-tx-muted group-hover:text-accent-blue transition-colors mb-2.5" />
                <p className="font-display text-xs font-semibold tracking-wider uppercase text-tx-primary">{q.label}</p>
                <p className="font-mono text-[8px] text-tx-muted mt-1">{q.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="card p-5 mt-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="section-tag">// Formularios</span>
          <div className="flex-1 h-px bg-bg-border" />
        </div>

        {formsMsg && (
          <div className={`mb-3 px-3 py-2 text-xs border ${formsMsg.ok ? 'border-green-700 bg-green-900/20 text-green-300' : 'border-red-700 bg-red-900/20 text-red-300'}`}>
            {formsMsg.text}
          </div>
        )}

        {canManageForms && (
          <div className="mb-5 p-4 border border-bg-border bg-bg-surface">
            <p className="font-mono text-[9px] text-tx-muted uppercase tracking-widest mb-3">Builder (Command Staff)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">Título</label>
                <input className="input" value={builder.title} onChange={e => setBuilder(p => ({ ...p, title: e.target.value }))} placeholder="Nuevo formulario" />
              </div>
              <div>
                <label className="label">Activo</label>
                <select className="input" value={builder.active ? '1' : '0'} onChange={e => setBuilder(p => ({ ...p, active: e.target.value === '1' }))}>
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="label">Descripción</label>
              <textarea className="input min-h-16 text-sm" value={builder.description} onChange={e => setBuilder(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="flex flex-col gap-2 mb-3">
              {builder.fields.map((f, i) => (
                <div key={`${f.id}-${i}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 border border-bg-border">
                  <input className="input text-xs" placeholder="id_campo" value={f.id} onChange={e => setBuilder(p => ({ ...p, fields: p.fields.map((x, idx) => idx === i ? { ...x, id: e.target.value } : x) }))} />
                  <input className="input text-xs" placeholder="Etiqueta" value={f.label} onChange={e => setBuilder(p => ({ ...p, fields: p.fields.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x) }))} />
                  <select className="input text-xs" value={f.type} onChange={e => setBuilder(p => ({ ...p, fields: p.fields.map((x, idx) => idx === i ? { ...x, type: e.target.value as FieldType } : x) }))}>
                    <option value="text">text</option>
                    <option value="textarea">textarea</option>
                    <option value="number">number</option>
                    <option value="date">date</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <label className="font-mono text-[9px] text-tx-muted uppercase">
                      <input type="checkbox" className="mr-1" checked={f.required} onChange={e => setBuilder(p => ({ ...p, fields: p.fields.map((x, idx) => idx === i ? { ...x, required: e.target.checked } : x) }))} />
                      Req.
                    </label>
                    <button className="text-red-400" onClick={() => removeField(i)} type="button"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="btn-ghost py-2" onClick={addField} type="button"><Plus size={12} />Campo</button>
              <button className="btn-primary py-2" onClick={saveBuilderForm} type="button" disabled={formsBusy}>Guardar Formulario</button>
              <button className="btn-ghost py-2" onClick={() => setBuilder(EMPTY_BUILDER)} type="button">Limpiar</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(formsData.forms || []).map((form: any) => (
            <div key={form.id} className="border border-bg-border p-4 bg-bg-surface">
              <div className="flex items-center justify-between mb-2">
                <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary flex items-center gap-2">
                  <ClipboardList size={14} />{form.title}
                </p>
                {canManageForms && <span className={`tag ${form.active ? 'border-green-700 text-green-400' : 'border-gray-700 text-gray-500'}`}>{form.active ? 'Activo' : 'Inactivo'}</span>}
              </div>
              <p className="text-xs text-tx-secondary mb-3">{form.description || 'Sin descripción'}</p>

              <div className="flex flex-col gap-2 mb-3">
                {(form.fields || []).map((field: any) => (
                  <div key={field.id}>
                    <label className="label">{field.label}{field.required ? ' *' : ''}</label>
                    {field.type === 'textarea' ? (
                      <textarea className="input min-h-16 text-sm" value={(formAnswers[form.id] || {})[field.id] || ''} onChange={e => setFormAnswers(p => ({ ...p, [form.id]: { ...(p[form.id] || {}), [field.id]: e.target.value } }))} />
                    ) : (
                      <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} className="input text-sm" value={(formAnswers[form.id] || {})[field.id] || ''} onChange={e => setFormAnswers(p => ({ ...p, [form.id]: { ...(p[form.id] || {}), [field.id]: e.target.value } }))} />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button className="btn-primary py-2" onClick={() => submitOneForm(form)} disabled={formsBusy || !form.active}>Enviar</button>
                {canManageForms && <button className="btn-ghost py-2" onClick={() => setBuilder(form)}>Editar</button>}
                {canManageForms && <button className="btn-ghost py-2" onClick={() => toggleForm(form.id)}>{form.active ? 'Desactivar' : 'Activar'}</button>}
                {canManageForms && <button className="btn-ghost py-2" onClick={() => loadResponses(form.id)}>Respuestas</button>}
                {canManageForms && <button className="btn-ghost py-2 text-red-400" onClick={() => deleteForm(form.id)}>Eliminar</button>}
              </div>
            </div>
          ))}
        </div>

        {canManageForms && selectedFormForResponses && (
          <div className="mt-5 border border-bg-border p-4 bg-bg-surface overflow-x-auto">
            <p className="font-mono text-[9px] text-tx-muted uppercase tracking-widest mb-2">Respuestas ({responses.length})</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-bg-border">
                  <th className="table-head">Usuario</th>
                  <th className="table-head">Rol</th>
                  <th className="table-head">Fecha</th>
                  <th className="table-head">Respuestas</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r: any) => (
                  <tr key={r.id} className="table-row">
                    <td className="table-cell">{r.byUser}</td>
                    <td className="table-cell">{r.byRole}</td>
                    <td className="table-cell">{new Date(r.createdAt).toLocaleString('es')}</td>
                    <td className="table-cell font-mono text-[10px]">{Object.entries(r.answers || {}).map(([k, v]) => `${k}: ${v}`).join(' | ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
