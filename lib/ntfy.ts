import type { CoverageEntry } from './amion'

const NTFY_TOPIC = process.env.NTFY_TOPIC ?? 'nwclinic'
const NTFY_BASE  = 'https://ntfy.sh'

export async function sendNtfyShortageAlert(
  amShortage: CoverageEntry[],
  pmShortage: CoverageEntry[],
  month: string,
  year: string
): Promise<{ sent: boolean; message: string }> {
  const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('en-US', {
    month: 'long',
  })
  const totalShortage = amShortage.length + pmShortage.length

  let body: string
  let priority: string
  let tags: string

  if (totalShortage === 0) {
    body = `✅ ${monthName} ${year}: No preceptor shortage dates found. All sessions are at or above 1:4 compliance.`
    priority = 'low'
    tags = 'white_check_mark'
  } else {
    const amLines = amShortage.map(
      e => `  • ${e.date} (${e.dayOfWeek}) — ${e.totalPreceptors} precept / ${e.totalResidents} res (${(e.ratio * 100).toFixed(1)}%)`
    )
    const pmLines = pmShortage.map(
      e => `  • ${e.date} (${e.dayOfWeek}) — ${e.totalPreceptors} precept / ${e.totalResidents} res (${(e.ratio * 100).toFixed(1)}%)`
    )

    const sections: string[] = [
      `⚠️ ${totalShortage} shortage date(s) detected for ${monthName} ${year}.`,
      `Compliance threshold: 1 preceptor per 4 residents (≥25%).`,
    ]

    if (amShortage.length > 0) {
      sections.push(`\n🌅 AM Shortages (${amShortage.length}):`)
      sections.push(...amLines)
    }
    if (pmShortage.length > 0) {
      sections.push(`\n🌆 PM Shortages (${pmShortage.length}):`)
      sections.push(...pmLines)
    }

    body = sections.join('\n')
    priority = totalShortage >= 3 ? 'urgent' : 'high'
    tags = 'warning,rotating_light'
  }

  const title = totalShortage === 0
    ? `SAMC FM: No Shortages - ${monthName} ${year}`
    : `SAMC FM: ${totalShortage} Shortage Date${totalShortage !== 1 ? 's' : ''} - ${monthName} ${year}`

  const response = await fetch(`${NTFY_BASE}/${NTFY_TOPIC}`, {
    method: 'POST',
    headers: {
      'Title':    title,
      'Priority': priority,
      'Tags':     tags,
      'Content-Type': 'text/plain',
    },
    body,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`ntfy.sh error ${response.status}: ${text}`)
  }

  return {
    sent: true,
    message: `ntfy.sh alert sent to topic "${NTFY_TOPIC}".`,
  }
}
