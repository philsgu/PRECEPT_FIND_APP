import { parse } from 'csv-parse/sync'

const AMION_BASE = 'http://www.amion.com/cgi-bin/ocs'

export interface CoverageEntry {
  date: string
  dayOfWeek: string
  ratio: number
  totalResidents: number
  totalPreceptors: number
  status: 'shortage' | 'overage' | 'ok'
}

export interface CoverageStats {
  totalAmShortage: number
  totalAmOverage: number
  totalPmShortage: number
  totalPmOverage: number
  worstAmDate: string | null
  worstAmRatio: number | null
  worstPmDate: string | null
  worstPmRatio: number | null
  avgAmRatio: number | null
  avgPmRatio: number | null
  totalDaysAnalyzed: number
}

export interface CoverageResult {
  amShortage: CoverageEntry[]
  amOverage: CoverageEntry[]
  amAll: CoverageEntry[]
  pmShortage: CoverageEntry[]
  pmOverage: CoverageEntry[]
  pmAll: CoverageEntry[]
  stats: CoverageStats
}

function getDayOfWeek(dateStr: string): string {
  try {
    const d = parseDateSafe(dateStr)
    if (!d) return ''
    return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  } catch {
    return ''
  }
}

function parseDateSafe(dateStr: string): Date | null {
  try {
    const s = dateStr.trim()
    // Amion format: M-D-YY (e.g. 5-1-26)
    const dashParts = s.split('-')
    if (dashParts.length === 3 && dashParts[2].length <= 2) {
      const year = parseInt(dashParts[2], 10) + 2000
      const month = dashParts[0].padStart(2, '0')
      const day   = dashParts[1].padStart(2, '0')
      return new Date(`${year}-${month}-${day}`)
    }
    // Slash format: MM/DD/YYYY
    const slashParts = s.split('/')
    if (slashParts.length === 3) {
      return new Date(`${slashParts[2]}-${slashParts[0].padStart(2,'0')}-${slashParts[1].padStart(2,'0')}`)
    }
    return new Date(s)
  } catch {
    return null
  }
}

function processSession(
  rows: Record<string, string>[],
  session: 'am' | 'pm'
): { shortage: CoverageEntry[]; overage: CoverageEntry[]; all: CoverageEntry[] } {
  const preceptKey = `PRECEPT, ${session}`
  const nwKey      = `NW, ${session}`
  const ucKey      = `UC, ${session}`
  const nwAddKey   = `NW-ADD, ${session}`

  const preceptRows = rows.filter(r => r['Col_4']?.trim() === preceptKey)
  const nwRows      = rows.filter(r => r['Col_4']?.trim() === nwKey)
  const ucRows      = rows.filter(r => r['Col_4']?.trim() === ucKey)
  const nwAddRows   = rows.filter(r => r['Col_4']?.trim() === nwAddKey)

  const dates = [...new Set(preceptRows.map(r => r['Col_7']?.trim()).filter(Boolean))]
  const ratios: CoverageEntry[] = []

  for (const date of dates) {
    const preceptCount = preceptRows.filter(r => r['Col_7']?.trim() === date).length
    const nwCount      = nwRows.filter(r => r['Col_7']?.trim() === date).length
    const ucCount      = ucRows.filter(r => r['Col_7']?.trim() === date).length
    const nwAddCount   = nwAddRows.filter(r => r['Col_7']?.trim() === date).length
    const totalResidents = nwCount + ucCount + nwAddCount

    if (totalResidents > 0) {
      const ratio = preceptCount / totalResidents
      let status: 'shortage' | 'overage' | 'ok' = 'ok'
      if (ratio < 0.25)      status = 'shortage'
      else if (ratio > 0.25) status = 'overage'

      ratios.push({
        date,
        dayOfWeek: getDayOfWeek(date),
        ratio,
        totalResidents,
        totalPreceptors: preceptCount,
        status,
      })
    }
  }

  ratios.sort((a, b) => {
    const da = parseDateSafe(a.date)
    const db = parseDateSafe(b.date)
    if (!da || !db) return 0
    return da.getTime() - db.getTime()
  })

  return {
    shortage: ratios.filter(r => r.status === 'shortage'),
    overage:  ratios.filter(r => r.status === 'overage'),
    all:      ratios,
  }
}

/**
 * Amion uses academic years: Year=2025 covers Jul 2025 – Jun 2026.
 * Months Jan–Jun belong to the academic year that started the prior July.
 * So we subtract 1 from the year for months 1–6.
 */
function toAmionYear(month: string, year: string): string {
  const m = parseInt(month, 10)
  const y = parseInt(year, 10)
  return String(m >= 1 && m <= 6 ? y - 1 : y)
}

export async function fetchAmionData(
  month: string,
  year: string,
  amionId: string,
  startDate?: string,
  endDate?: string
): Promise<CoverageResult> {
  const amionYear = toAmionYear(month, year)
  const url = `${AMION_BASE}?Lo=${encodeURIComponent(amionId)}&Rpt=625c&Month=${month}&Year=${amionYear}`

  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`AMION fetch failed: ${response.status} ${response.statusText}`)
  }

  // Use latin-1 decoding to match the Python implementation
  const buffer = await response.arrayBuffer()
  const text = new TextDecoder('latin1').decode(buffer)

  // Amion returns a plain-text error when no schedule file exists
  if (/no.*schedule file|NOFI=No file/i.test(text.slice(0, 200))) {
    throw new Error(`No Amion schedule found for ${month}/${year} (academic year ${amionYear}). Check your year selection.`)
  }

  const lines = text.split('\n')
  // Skip first 8 lines: 7 metadata rows + 1 column-header row
  const csvContent = lines.slice(8).join('\n')

  const rawRows = parse(csvContent, {
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: false,
  }) as string[][]

  const maxCols = rawRows.reduce((max, row) => Math.max(max, row.length), 0)

  // Map each row to named columns (Col_1 … Col_N)
  let allRows: Record<string, string>[] = rawRows.map(row => {
    const obj: Record<string, string> = {}
    for (let i = 0; i < maxCols; i++) {
      obj[`Col_${i + 1}`] = row[i] ?? ''
    }
    return obj
  })

  // Filter only rows that contain ", am" or ", pm" patterns
  allRows = allRows.filter(r =>
    /,\s*(am|pm)$/i.test(r['Col_4']?.trim() ?? '')
  )

  // Apply optional date range filter
  if (startDate || endDate) {
    allRows = allRows.filter(row => {
      const dateStr = row['Col_7']?.trim()
      if (!dateStr) return true
      const d = parseDateSafe(dateStr)
      if (!d) return true
      const start = startDate ? new Date(startDate) : null
      const end   = endDate   ? new Date(endDate)   : null
      if (start) start.setHours(0, 0, 0, 0)
      if (end)   end.setHours(23, 59, 59, 999)
      if (start && d < start) return false
      if (end   && d > end)   return false
      return true
    })
  }

  const am = processSession(allRows, 'am')
  const pm = processSession(allRows, 'pm')

  // Worst shortage = lowest ratio among shortage days
  const worstAmEntry = [...am.shortage].sort((a, b) => a.ratio - b.ratio)[0] ?? null
  const worstPmEntry = [...pm.shortage].sort((a, b) => a.ratio - b.ratio)[0] ?? null

  const avgAmRatio = am.all.length > 0
    ? am.all.reduce((s, r) => s + r.ratio, 0) / am.all.length
    : null
  const avgPmRatio = pm.all.length > 0
    ? pm.all.reduce((s, r) => s + r.ratio, 0) / pm.all.length
    : null

  const uniqueDates = new Set([
    ...am.all.map(r => r.date),
    ...pm.all.map(r => r.date),
  ])

  return {
    amShortage: am.shortage,
    amOverage:  am.overage,
    amAll:      am.all,
    pmShortage: pm.shortage,
    pmOverage:  pm.overage,
    pmAll:      pm.all,
    stats: {
      totalAmShortage:  am.shortage.length,
      totalAmOverage:   am.overage.length,
      totalPmShortage:  pm.shortage.length,
      totalPmOverage:   pm.overage.length,
      worstAmDate:  worstAmEntry?.date  ?? null,
      worstAmRatio: worstAmEntry?.ratio ?? null,
      worstPmDate:  worstPmEntry?.date  ?? null,
      worstPmRatio: worstPmEntry?.ratio ?? null,
      avgAmRatio,
      avgPmRatio,
      totalDaysAnalyzed: uniqueDates.size,
    },
  }
}
