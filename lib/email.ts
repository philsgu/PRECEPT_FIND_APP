import { Resend } from 'resend'
import type { CoverageEntry } from './amion'

export const RECIPIENT_EMAILS = [
  'phillip.kim@samc.com',
  'katarina.soewono@samc.com',
  'esmeralda.pimentel@samc.com',
]

function statusBadge(ratio: number): string {
  const pct = (ratio * 100).toFixed(1)
  const color = ratio < 0.25 ? '#dc2626' : '#16a34a'
  return `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:600;">${pct}%</span>`
}

function buildTable(entries: CoverageEntry[]): string {
  if (entries.length === 0) {
    return '<p style="color:#6b7280;font-style:italic;">No shortage dates found.</p>'
  }
  const rows = entries
    .map(
      (e, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#fef2f2'};">
        <td style="padding:10px 14px;border:1px solid #e5e7eb;">${e.date}</td>
        <td style="padding:10px 14px;border:1px solid #e5e7eb;">${e.dayOfWeek}</td>
        <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">${statusBadge(e.ratio)}</td>
        <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">${e.totalPreceptors}</td>
        <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">${e.totalResidents}</td>
        <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;color:#dc2626;font-weight:700;">
          Need ${Math.max(0, Math.ceil(e.totalResidents * 0.25) - e.totalPreceptors)} more
        </td>
      </tr>`
    )
    .join('')

  return `
    <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
      <thead>
        <tr style="background:#1e3a8a;color:#ffffff;">
          <th style="padding:10px 14px;text-align:left;border:1px solid #1e40af;">Date</th>
          <th style="padding:10px 14px;text-align:left;border:1px solid #1e40af;">Day</th>
          <th style="padding:10px 14px;text-align:center;border:1px solid #1e40af;">Ratio</th>
          <th style="padding:10px 14px;text-align:center;border:1px solid #1e40af;">Preceptors</th>
          <th style="padding:10px 14px;text-align:center;border:1px solid #1e40af;">Residents</th>
          <th style="padding:10px 14px;text-align:center;border:1px solid #1e40af;">Action Needed</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

export async function sendWeeklyShortageReport(
  amShortage: CoverageEntry[],
  pmShortage: CoverageEntry[],
  month: string,
  year: string
): Promise<{ sent: boolean; message: string }> {
  if (amShortage.length === 0 && pmShortage.length === 0) {
    return { sent: false, message: 'No shortages found — email skipped.' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('en-US', {
    month: 'long',
  })
  const reportDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const totalIssues = amShortage.length + pmShortage.length

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:20px;">
  <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 32px;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">
        ⚠️ Weekly Preceptor Shortage Report
      </h1>
      <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">
        SAMC FM Outpatient — ${monthName} ${year}
      </p>
    </div>

    <!-- Summary bar -->
    <div style="background:#fef2f2;border-left:5px solid #dc2626;padding:16px 32px;display:flex;gap:32px;">
      <div>
        <div style="font-size:28px;font-weight:800;color:#dc2626;">${totalIssues}</div>
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Total Shortage Days</div>
      </div>
      <div>
        <div style="font-size:28px;font-weight:800;color:#1e40af;">${amShortage.length}</div>
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">AM Shortages</div>
      </div>
      <div>
        <div style="font-size:28px;font-weight:800;color:#7c3aed;">${pmShortage.length}</div>
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">PM Shortages</div>
      </div>
    </div>

    <div style="padding:24px 32px;">
      <p style="color:#374151;margin-top:0;">
        Hello, the AMION schedule has <strong>${totalIssues} date(s)</strong> where the
        preceptor-to-resident ratio falls below the required <strong>1:4 (25%)</strong> threshold.
        Please take action to resolve these shortages.
      </p>

      ${
        amShortage.length > 0
          ? `<h2 style="color:#1e40af;font-size:16px;margin-top:20px;border-bottom:2px solid #bfdbfe;padding-bottom:6px;">
              🌅 AM Session Shortage Dates
             </h2>
             ${buildTable(amShortage)}`
          : '<p style="color:#16a34a;font-weight:600;">✅ AM Session: No shortages this period.</p>'
      }

      ${
        pmShortage.length > 0
          ? `<h2 style="color:#7c3aed;font-size:16px;margin-top:20px;border-bottom:2px solid #ddd6fe;padding-bottom:6px;">
              🌆 PM Session Shortage Dates
             </h2>
             ${buildTable(pmShortage)}`
          : '<p style="color:#16a34a;font-weight:600;">✅ PM Session: No shortages this period.</p>'
      }

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 18px;margin-top:20px;">
        <p style="margin:0;font-size:13px;color:#0369a1;">
          <strong>Compliance threshold:</strong> 1 preceptor per 4 residents (≥25% ratio required).<br/>
          <strong>Report generated:</strong> ${reportDate}
        </p>
      </div>
    </div>

    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        Automated weekly report from the SAMC FM Preceptor Coverage Dashboard.
        This email was sent to the scheduling team automatically.
      </p>
    </div>
  </div>
</body>
</html>`

  const result = await resend.emails.send({
    from: 'SAMC FM Dashboard <onboarding@resend.dev>',
    to: RECIPIENT_EMAILS,
    subject: `⚠️ Preceptor Shortage Alert — ${monthName} ${year} (${totalIssues} dates)`,
    html,
  })

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`)
  }

  return { sent: true, message: `Report sent to ${RECIPIENT_EMAILS.length} recipients. ID: ${result.data?.id}` }
}
