import { NextRequest, NextResponse } from 'next/server'
import { fetchAmionData } from '@/lib/amion'
import { sendWeeklyShortageReport } from '@/lib/email'

/**
 * This route is called by Vercel Cron every Monday at 09:00 UTC.
 * It is also protected by a CRON_SECRET header to prevent unauthorized calls.
 *
 * Cron config in vercel.json:
 *   { "path": "/api/send-weekly-report", "schedule": "0 9 * * 1" }
 */
export async function GET(request: NextRequest) {
  // Protect endpoint: Vercel Cron sends the secret as Authorization header
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const amionId = process.env.AMION_ID
  if (!amionId) {
    return NextResponse.json({ error: 'AMION_ID env var not set' }, { status: 500 })
  }

  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year  = String(now.getFullYear())

  try {
    const data = await fetchAmionData(month, year, amionId)

    const result = await sendWeeklyShortageReport(
      data.amShortage,
      data.pmShortage,
      month,
      year
    )

    return NextResponse.json({
      success: true,
      ...result,
      amShortageCount: data.amShortage.length,
      pmShortageCount: data.pmShortage.length,
      month,
      year,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
