import { NextRequest, NextResponse } from 'next/server'
import { getUser, forbidden, unauthorized, notFound } from '@/lib/auth'
import { getCasosDB, addAgentAccessCaso, removeAgentAccessCaso } from '@/lib/casos-db'

/**
 * POST /api/casos/[id]/access?action=add&agent=username
 * DELETE /api/casos/[id]/access?agent=username
 * 
 * Solo admin/supervisory puede gestionar acceso
 */

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req)
  if (!user) return unauthorized()
  if (!['command_staff', 'supervisory'].includes(user.rol)) return forbidden()

  const url = new URL(req.url)
  const agent = url.searchParams.get('agent')
  
  if (!agent) {
    return NextResponse.json({ error: 'Parámetro agent requerido' }, { status: 400 })
  }

  try {
    const db = await getCasosDB()
    const caso = db.get(params.id)
    
    if (!caso) {
      return notFound('Caso no encontrado')
    }

    await addAgentAccessCaso(params.id, agent)

    return NextResponse.json({ 
      success: true, 
      message: `Acceso otorgado a ${agent}`,
      agentesAcceso: caso.agentesAcceso
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req)
  if (!user) return unauthorized()
  if (!['command_staff', 'supervisory'].includes(user.rol)) return forbidden()

  const url = new URL(req.url)
  const agent = url.searchParams.get('agent')
  
  if (!agent) {
    return NextResponse.json({ error: 'Parámetro agent requerido' }, { status: 400 })
  }

  try {
    const db = await getCasosDB()
    const caso = db.get(params.id)
    
    if (!caso) {
      return notFound('Caso no encontrado')
    }

    await removeAgentAccessCaso(params.id, agent)

    return NextResponse.json({ 
      success: true, 
      message: `Acceso revocado a ${agent}`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
