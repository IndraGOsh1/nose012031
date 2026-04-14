export const CONFIG = {
  division:   'Federal Investigation Bureau',
  short_name: 'FIB',
  guild_id:   '1459032564844200117',

  rangos: {
    'Command Staff':     ['Director', 'Sub Director'],
    'In charge Agents':  ['Coordinador', 'Jefe de Personal'],
    'Supervisory':       ['Supervisor', 'Special Agent Senior'],
    'Agentes Federales': ['Special Agent III', 'Special Agent II', 'Special Agent I', 'Training Agent'],
  } as Record<string, string[]>,

  especialidades: {
    'CIRG': ['CIRG Commander','CIRG: Coordinator','CIRG Command','CIRG: Operator','CIRG: Undercover Operator','CIRG: VCTF'],
    'ERT':  ['ERT: Member','Forense - ERT Supply'],
    'RRHH': ['RRHH: Instructor'],
    'RMI':  ['RMI Captain'],
    'Certificaciones': ['Explosivo Plastico','SNIPER','M246'],
    'Conexion': ['Metropolitan: VCTF','Inter-divisional','Metropolitana'],
  } as Record<string, string[]>,

  sheets: { personal:'Personal', historial:'Historial', sanciones:'Sanciones' },

  sanciones: { leves_para_moderada:3, moderadas_para_grave:3, graves_para_expulsion:2 },

  permisos: {
    command_staff: ['*'],
    supervisory:   ['ver_personal','editar_personal','ver_casos','aprobar_allanamientos','ver_sanciones','crear_tickets'],
    federal_agent: ['ver_personal','ver_propios','crear_caso','subir_allanamiento','carpeta_propia','crear_tickets'],
    visitante:     ['pagina_publica'],
  } as Record<string, string[]>,
}

export const ROLES_ORDEN = ['command_staff','supervisory','federal_agent','visitante']

export function seccionDeRango(rango: string): string {
  for (const [sec, rangos] of Object.entries(CONFIG.rangos)) {
    if (rangos.includes(rango)) return sec
  }
  return 'Sin sección'
}

export function todosLosRangos(): string[] {
  return Object.values(CONFIG.rangos).flat()
}

export function todasLasEspecialidades(): string[] {
  return Object.values(CONFIG.especialidades).flat()
}
