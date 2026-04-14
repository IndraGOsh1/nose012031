# FIB Panel — Instrucciones para Copilot

## Contexto del proyecto

Este es el panel de gestión interna del servidor de roleplay **FIB (Federal Investigation Bureau)**. El panel permite a los agentes ver su propia carpeta personal, gestionar hilos de actividad, ver sus casos y registros, y — dependiendo de su rango — acceder a herramientas de supervisión y administración.

---

## Arquitectura general

### Archivo principal
`fib-panel.html` — Single-file application (HTML + CSS + JS). No frameworks externos. Vanilla JS puro.

### Secciones principales (tabs de navegación)

```
CARPETA PROPIA       → visible para TODOS los agentes
SUPERVISORY AREA     → visible para Supervisory + Command Staff
ADMINISTRACIÓN       → visible solo para Command Staff
```

La visibilidad de los tabs se controla con la función `applyRoleVisibility()` que lee `CURRENT_ROLE`.

---

## Fuente de datos: Google Sheets

### Config
```javascript
const CONFIG = {
  SPREADSHEET_ID: 'TU_SPREADSHEET_ID_AQUI',
  SHEET_NAME: 'Hoja1',
  API_KEY: 'TU_API_KEY_AQUI',
}
```

### Estructura del spreadsheet (columnas)

| Col | Campo          | Ejemplo              |
|-----|----------------|----------------------|
| A   | Nombre IC      | Indra Koval          |
| B   | Call Sign/Apodo| Hammer-1             |
| C   | ID Discord     | 100562373731760948   |
| D   | Fecha ingreso  | 22/03/2026           |
| E   | Estado         | Activo / Retirado    |
| F   | Sección        | Command Staff        |
| G   | Rango interno  | Director             |
| H   | Número de placa| 2006                 |
| I   | Especialidad   | ERT, CIRG            |
| J   | Leve (sanciones)| 0                   |
| K   | Moderada       | 1                    |
| L   | Grave          | 0                    |
| M   | Reintegros     | (fecha o vacío)      |

### Función de sync
```javascript
async function syncSheet()
```
- Llama a la Sheets API v4 (`values/{range}?key={API_KEY}`)
- Sobreescribe el array `AGENTS` en memoria
- Llama a `buildAll()` para re-renderizar toda la UI
- Muestra estado visual: dot verde (ok) / dot pulsante ámbar (syncing) / dot rojo (error)

### Para hacer el sync automático al cargar:
```javascript
// Agregar al final del script, después de buildAll():
syncSheet();
```

---

## Datos en memoria

### AGENTS (array)
Cargado desde el spreadsheet. Cada objeto tiene:
```javascript
{
  nombre, callsign, discord, ingreso, estado,
  seccion, rango, numplaca, especialidad,
  leve, moderada, grave
}
```

### CURRENT_AGENT
El agente actualmente seleccionado/visualizado. Por defecto es `AGENTS[0]`.

### CURRENT_ROLE
String que controla qué tabs ve el usuario:
- `'federal_agent'` — solo ve Carpeta Propia
- `'supervisory'` — ve Carpeta + Supervisory Area
- `'command_staff'` — ve todo

**Para implementar autenticación real:** leer el Discord ID del usuario logueado, buscarlo en `AGENTS`, y setear `CURRENT_ROLE` según su campo `seccion`.

---

## Sección: CARPETA PROPIA

### Agent Header Card
Muestra la ficha completa del agente seleccionado:
- Nombre completo, callsign, número de placa
- Rango interno, sección, especialidad
- Fecha de ingreso, estado (Activo/Retirado)
- Discord ID
- Estadísticas de sanciones (leve / moderada / grave) en cajas rojas

### Lista de agentes (panel izquierdo)
- Lista scrolleable de todos los agentes del spreadsheet
- Buscador que filtra por nombre en tiempo real (`filterAgentList()`)
- Al seleccionar un agente, `buildAgentHeader()` actualiza la ficha derecha

### Sub-tabs de Carpeta Propia

#### 1. HILOS
- Son registros de actividad categorizados por tipo:
  - `semanal` — resumen de actividad de la semana
  - `operativo` — registro de un operativo específico
  - `caso` — seguimiento de un caso activo
  - `allanamiento` — registro de allanamiento

- Cada hilo tiene un array de `entries` con fecha y texto
- Click en un hilo lo expande mostrando todas las entradas
- Botón "AGREGAR" permite añadir nuevas entradas al hilo
- Botón "+ NUEVO HILO" abre un prompt para crear uno nuevo

**Para persistir hilos:** guardarlos en localStorage, una base de datos, o una segunda hoja del spreadsheet.

#### 2. CASOS Y REGISTROS
- Tabla con todos los casos, allanamientos e informes operativos del agente
- Filtros por tipo: Todos / Casos / Allanamientos / Informes
- Campos: ID (ej. FIB-047), Tipo, Descripción, Fecha, Estado, Agente
- Estados: `activo` (verde), `cerrado` (gris), `pendiente` (ámbar)

**Para conectar con spreadsheet:** crear una segunda hoja "Registros" con estas columnas y leerla en el sync.

#### 3. CONDECORACIONES
- Organizadas en grupos (Medalla al Valor, Reconocimiento de Servicio, Distinción de Mando)
- Cada grupo es un dropdown expandible
- Medallas con estilos oro / plata / bronce
- Campos: nombre de la medalla, fecha, otorgado por

#### 4. MENSAJES
- Chat interno entre agentes
- Panel izquierdo: lista de contactos (todos los agentes del spreadsheet)
- Panel derecho: conversación con el contacto seleccionado
- Historial en memoria por sesión (no persistido)

---

## Sección: SUPERVISORY AREA

Accesible para `supervisory` y `command_staff`.

### Sub-tabs:
1. **AGENTES** — lista de agentes federales bajo supervisión con botones Ficha / Hilo / Sancionar
2. **REPORTES** — lista de reportes pendientes de revisión
3. **SANCIONES** — formulario para emitir sanción con tipo y motivo
4. **CONDECORAR** — formulario para otorgar medalla a un agente

---

## Sección: ADMINISTRACIÓN

Solo accesible para `command_staff`.

### Sub-tabs:
1. **GESTIÓN PERSONAL** — tabla de todos los agentes con botones Editar / Expedir
2. **ASCENSOS** — formulario para cambiar rango, sección y especialidad de un agente
3. **DATOS SPREADSHEET** — tabla completa con todos los campos del sheet incluyendo sanciones
4. **LOG SISTEMA** — registro cronológico de acciones realizadas en el panel

---

## Funciones clave

| Función | Descripción |
|---------|-------------|
| `syncSheet()` | Sincroniza datos desde Google Sheets API |
| `buildAll()` | Reconstruye toda la UI con los datos actuales |
| `buildAgentHeader(ag)` | Actualiza la ficha del agente visible |
| `buildAgentList()` | Renderiza la lista lateral de agentes |
| `buildHilos()` | Renderiza los hilos de actividad |
| `toggleHilo(id)` | Expande/colapsa un hilo |
| `addEntry(id)` | Agrega una nueva entrada a un hilo |
| `buildRecords(filter)` | Renderiza la tabla de registros/casos |
| `buildCondecoraciones()` | Renderiza los dropdowns de condecoraciones |
| `buildChatList()` | Renderiza los contactos del chat |
| `sendChatMsg()` | Envía un mensaje en el chat |
| `applyRoleVisibility()` | Muestra/oculta tabs según el rol |
| `switchTab(t)` | Cambia el tab principal activo |
| `switchSub(t)` | Cambia el sub-tab de Carpeta Propia |
| `switchSvSub(t)` | Cambia el sub-tab de Supervisory |
| `switchAdSub(t)` | Cambia el sub-tab de Admin |
| `addLog(msg)` | Agrega una línea al log del sistema |
| `getInitials(name)` | Devuelve las iniciales de un nombre |
| `getRankClass(seccion)` | Devuelve la clase CSS del badge de rango |

---

## Paleta de colores (tema oscuro FIB)

```css
--bg: #0d0d0d          /* fondo principal */
--bg2: #111             /* topbar, nav */
--bg3: #1a1a1a          /* cards, panels */
--bg4: #222             /* hover, filas */
--red: #8b0000          /* rojo oscuro — bordes, badges */
--red2: #cc0000         /* rojo medio — destacado, activos */
--red3: #ff4444         /* rojo claro — alertas graves */
--text: #e0e0e0         /* texto principal */
--text2: #aaa           /* texto secundario */
--text3: #666           /* texto muted */
--text4: #444           /* texto muy muted */
--green: #2a9d2a        /* activo / online */
--amber: #b07800        /* advertencia / syncing */
--border: #2a2a2a       /* bordes por defecto */
--border2: #333         /* bordes hover */
```

### Badges de rango
- `badge-cs` → Command Staff (fondo rojo oscuro, texto rosa)
- `badge-sv` → Supervisory (fondo azul oscuro, texto azul claro)
- `badge-fa` → Federal Agent (fondo verde oscuro, texto verde claro)

### Tipos de hilos
- `ht-semanal` → verde oscuro
- `ht-operativo` → ámbar oscuro
- `ht-caso` → azul oscuro
- `ht-allanamiento` → rojo oscuro

---

## Extensiones sugeridas

### Persistencia de hilos y registros
Crear una hoja "Hilos" en el spreadsheet:
```
Cols: ID | AgenteName | Tipo | Titulo | Fecha | Entradas (JSON)
```
Usar la Sheets API con `append` y `update` para escribir.

### Autenticación con Discord OAuth
1. El usuario se autentica con Discord
2. Se obtiene su Discord ID
3. Se busca en `AGENTS` por campo `discord`
4. Se setea `CURRENT_AGENT` y `CURRENT_ROLE` automáticamente

### Notificaciones de nuevos hilos
- Usar un campo de timestamp en el sheet para detectar cambios
- Poll cada 60 segundos con `setInterval(() => syncSheet(), 60000)`

### Modo edición inline
- Doble click en cualquier campo del Agent Header para editarlo
- Botón "GUARDAR" que escribe de vuelta al spreadsheet via Sheets API con `PUT values/...`

---

## Para integrar en el servidor web existente

1. Copiar `fib-panel.html` al directorio público del servidor
2. Completar `CONFIG.SPREADSHEET_ID` y `CONFIG.API_KEY`
3. Asegurarse de que la Sheets API esté habilitada en Google Cloud Console
4. La API key debe tener permiso de lectura sobre el spreadsheet
5. El spreadsheet debe ser público o la API key debe tener acceso autorizado
