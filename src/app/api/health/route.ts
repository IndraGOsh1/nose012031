import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({ status:'ok', service:'FIB HQ', ts: new Date().toISOString() })
}
