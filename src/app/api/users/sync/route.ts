import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden } from '@/lib/auth'
import { listUsersFresh, getDB, persistUser, type User } from '@/lib/db'
import { getRows, COL, toAgent } from '@/lib/sheets'
import { CONFIG } from '@/lib/config'
import { cacheMapSet } from '@/lib/supabase-map'

/**
 * Normaliza un nombre IC para comparación.
 * Reemplaza guiones bajos por espacios, elimina espacios extra y convierte a minúsculas.
 */
function normalizeName(name: string | null): string {
  if (!name) return ''
  return name.replace(/_/g, ' ').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export async function POST(req: NextRequest) {
  const u = getUser(req)
  if (!u) return unauthorized()
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
      // Intentar encontrar coincidencia en el spreadsheet
      // Prioridad 1: Discord ID
      // Prioridad 2: Nombre normalizado
      let matchedAgent = agents.find(a => 
        (a.discordId && user.discordId && a.discordId === user.discordId)
      )

      if (!matchedAgent) {
        const userNormName = normalizeName(user.nombre)
        if (userNormName) {
          matchedAgent = agents.find(a => normalizeName(a.nombre) === userNormName)
        }
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

        if (changed) {
          await persistUser(nextUser)
          cacheMapSet(db.users, user.id, nextUser)
          updatedCount++
          results.push({
            username: user.username,
            nombre: nextUser.nombre,
            callsign: nextUser.callsign,
            agentNumber: nextUser.agentNumber
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
