import { NextRequest, NextResponse } from 'next/server'
import { fetchAmionData } from '@/lib/amion'
import { sendWeeklyShortageReport } from '@/lib/email'
import { sendNtfyShortageAlert } from '@/lib/ntfy'

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

  if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const amionId = process.env.AMION_ID
  if (!amionId) {
    return NextResponse.json({ error: 'AMION_ID env var not set' }, { status: 500 })
  }

  const now = new Date()
  const month = request.nextUrl.searchParams.get('month') ?? String(now.getMonth() + 1).padStart(2, '0')
  const year  = request.nextUrl.searchParams.get('year')  ?? String(now.getFullYear())

  try {
    const data = await fetchAmionData(month, year, amionId)

    // Fire email and ntfy notification in parallel
    const [emailResult, ntfyResult] = await Promise.allSettled([
      sendWeeklyShortageReport(data.amShortage, data.pmShortage, month, year),
      sendNtfyShortageAlert(data.amShortage, data.pmShortage, month, year),
    ])

    const emailMsg = emailResult.status === 'fulfilled'
      ? emailResult.value.message
      : `Email error: ${(emailResult.reason as Error).message}`

    const ntfyMsg = ntfyResult.status === 'fulfilled'
      ? ntfyResult.value.message
      : `ntfy error: ${(ntfyResult.reason as Error).message}`

    return NextResponse.json({
      success: true,
      message: `${emailMsg} | ${ntfyMsg}`,
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
