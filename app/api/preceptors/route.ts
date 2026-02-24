import { NextRequest, NextResponse } from 'next/server'
import { fetchAmionData } from '@/lib/amion'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const month     = searchParams.get('month')     ?? String(new Date().getMonth() + 1).padStart(2, '0')
  const year      = searchParams.get('year')      ?? String(new Date().getFullYear())
  const startDate = searchParams.get('startDate') ?? undefined
  const endDate   = searchParams.get('endDate')   ?? undefined

  const amionId = process.env.AMION_ID
  if (!amionId) {
    return NextResponse.json({ error: 'AMION_ID env var not set' }, { status: 500 })
  }

  try {
    const data = await fetchAmionData(month, year, amionId, startDate, endDate)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
