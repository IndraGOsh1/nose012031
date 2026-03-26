import { getAllanamientosDB } from '@/lib/allanamientos-db'
import { renderAllanamientoPNG } from '@/lib/allanamientos-preview'

export const runtime = 'nodejs'

type P = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: P) {
  const { id } = await params
  const db = await getAllanamientosDB()
  const item = db.get(id)

  if (!item) {
    return new Response('Not found', { status: 404 })
  }

  const png = await renderAllanamientoPNG(item)
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
  })
}

