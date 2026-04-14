import { NextRequest, NextResponse } from 'next/server'
import { getUser, forbidden, unauthorized, notFound } from '@/lib/auth'
import { getCarpeta, addAgentAccessCarpeta, removeAgentAccessCarpeta } from '@/lib/carpeta-db'

/**
 * POST /api/carpeta/[username]/access?action=add&agent=username
 * DELETE /api/carpeta/[username]/access?agent=username
 * 
 * Solo admin/supervisory puede gestionar acceso
 */

export async function POST(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const user = getUser(req)
  if (!user) return unauthorized()
  if (!['command_staff', 'supervisory'].includes(user.rol)) return forbidden()

  const url = new URL(req.url)
  const agent = url.searchParams.get('agent')
  
  if (!agent) {
    return NextResponse.json({ error: 'Parámetro agent requerido' }, { status: 400 })
  }

  try {
    const carpeta = await getCarpeta(username)
    
    await addAgentAccessCarpeta(username, agent)

    return NextResponse.json({ 
      success: true, 
      message: `Acceso otorgado a ${agent}`,
      acceso: carpeta.acceso
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const user = getUser(req)
  if (!user) return unauthorized()
  if (!['command_staff', 'supervisory'].includes(user.rol)) return forbidden()

  const url = new URL(req.url)
  const agent = url.searchParams.get('agent')
  
  if (!agent) {
    return NextResponse.json({ error: 'Parámetro agent requerido' }, { status: 400 })
  }

  try {
    const carpeta = await getCarpeta(username)
    
    await removeAgentAccessCarpeta(username, agent)

    return NextResponse.json({ 
      success: true, 
      message: `Acceso revocado a ${agent}`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
