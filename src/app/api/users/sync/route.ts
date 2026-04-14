import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden } from '@/lib/auth'
import { listUsersFresh, getDB, persistUser } from '@/lib/db'
import { getRows, COL, toAgent } from '@/lib/sheets'
import { CONFIG, seccionDeRango, ROLES_ORDEN } from '@/lib/config'
import { cacheMapSet } from '@/lib/supabase-map'

/**
 * Normaliza un nombre IC para comparación.
 * Reemplaza guiones bajos por espacios, elimina espacios extra y convierte a minúsculas.
 */
function normalizeName(name: string | null): string {
  if (!name) return ''
  return name.replace(/_/g, ' ').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Mapea la sección del spreadsheet al rol de la base de datos.
 */
function getRolFromSeccion(seccion: string): any {
  const s = seccion.toLowerCase()
  if (s.includes('command staff')) return 'command_staff'
  if (s.includes('supervisory')) return 'supervisory'
  if (s.includes('agentes federales') || s.includes('federal agent')) return 'federal_agent'
  return 'visitante'
}

export async function POST(req: NextRequest) {
  const u = getUser(req)
  if (!u) return unauthorized()
  // Solo Command Staff o Supervisory pueden forzar la sincronización manual
  if (!['command_staff', 'supervisory'].includes(u.rol)) return forbidden()

  try {
    // 1. Obtener datos frescos
    const [dbUsers, sheetRows] = await Promise.all([
      listUsersFresh(),
      getRows(CONFIG.sheets.personal)
    ])

    const agents = sheetRows.filter(r => r[COL.NOMBRE]).map(toAgent)
    const db = await getDB()
    
    let updatedCount = 0
    const results: any[] = []

    // 2. Mapear y actualizar cada usuario de la DB
    for (const user of dbUsers) {
      // El nombre IC es ahora el identificador único y obligatorio para la sincronización.
      // Ya no se utiliza la ID de Discord para vincular cuentas.
      let matchedAgent = null
      const userNormName = normalizeName(user.nombre)
      
      if (userNormName) {
        matchedAgent = agents.find(a => normalizeName(a.nombre) === userNormName)
      }

      if (matchedAgent) {
        let changed = false
        const nextUser = { ...user }

        // Sincronizar campos si hay cambios
        if (matchedAgent.nombre && nextUser.nombre !== matchedAgent.nombre) {
          nextUser.nombre = matchedAgent.nombre
          changed = true
        }
        if (matchedAgent.apodo && nextUser.callsign !== matchedAgent.apodo) {
          nextUser.callsign = matchedAgent.apodo
          changed = true
        }
        if (matchedAgent.numero && nextUser.agentNumber !== String(matchedAgent.numero)) {
          nextUser.agentNumber = String(matchedAgent.numero)
          changed = true
        }

        // Sincronización de ROL basada en la SECCIÓN del spreadsheet
        const sheetRol = getRolFromSeccion(matchedAgent.seccion)
        if (sheetRol && nextUser.rol !== sheetRol) {
          nextUser.rol = sheetRol
          changed = true
        }

        // Sincronización de ESTADO (Activo/Inactivo)
        const isSheetActivo = matchedAgent.estado.toLowerCase().includes('activo')
        if (nextUser.activo !== isSheetActivo) {
          nextUser.activo = isSheetActivo
          changed = true
        }

        if (changed) {
          await persistUser(nextUser)
          cacheMapSet(db.users, user.id, nextUser)
          updatedCount++
          results.push({
            username: user.username,
            nombre: nextUser.nombre,
            callsign: nextUser.callsign,
            agentNumber: nextUser.agentNumber,
            rol: nextUser.rol,
            activo: nextUser.activo
          })
        }
      }
    }

    return NextResponse.json({
      mensaje: `Sincronización completada. ${updatedCount} usuarios actualizados.`,
      actualizados: updatedCount,
      detalles: results
    })

  } catch (error: any) {
    console.error('[sync] Error:', error)
    return NextResponse.json({ error: 'Error durante la sincronización: ' + error.message }, { status: 500 })
  }
}
