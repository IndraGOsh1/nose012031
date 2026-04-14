import { NextRequest } from 'next/server'
import { getAllanamientosDB } from '@/lib/allanamientos-db'
import { renderAllanamientoPDF } from '@/lib/allanamientos-preview'
import { recordAuditEvent } from '@/lib/audit-log'

type P = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: P) {
  const { id } = await params
  const db = await getAllanamientosDB()
  const item = db.get(id)

  if (!item) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const pdfBuffer = await renderAllanamientoPDF(item)
    const filename = `allanamiento-${item.numeroSolicitud.replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[allanamientos] Error generating PDF:', error)
    void recordAuditEvent({
      level: 'error',
      source: 'allanamientos',
      event: 'download_pdf_failed',
      message: 'Error generating allanamiento PDF',
      meta: { id, error: error instanceof Error ? error.message : String(error) },
    }).catch(() => {})
    return new Response('Error generating PDF', { status: 500 })
  }
}
