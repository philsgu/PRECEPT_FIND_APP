'use client'
import type { CoverageEntry } from '@/lib/amion'
import clsx from 'clsx'

interface CoverageTableProps {
  entries: CoverageEntry[]
  title: string
  emptyMessage?: string
  highlightShortage?: boolean
}

function RatioBadge({ ratio }: { ratio: number }) {
  const pct = (ratio * 100).toFixed(1)
  const isShortage = ratio < 0.25
  const isOk       = ratio >= 0.25 && ratio <= 0.35
  return (
    <span className={clsx(
      'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold',
      isShortage ? 'bg-red-100 text-red-700'
      : isOk     ? 'bg-green-100 text-green-700'
      :            'bg-blue-100 text-blue-700'
    )}>
      {pct}%
    </span>
  )
}

function NeedBadge({ entry }: { entry: CoverageEntry }) {
  if (entry.status !== 'shortage') return null
  const need = Math.max(0, Math.ceil(entry.totalResidents * 0.25) - entry.totalPreceptors)
  if (need === 0) return null
  return (
    <span className="inline-block ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
      +{need} needed
    </span>
  )
}

export default function CoverageTable({
  entries,
  title,
  emptyMessage = 'No data for this period.',
}: CoverageTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
        <p className="text-gray-400 text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Day</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Ratio</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Preceptors</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Residents</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={`${entry.date}-${i}`}
              className={clsx(
                'border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50',
                entry.status === 'shortage' && 'bg-red-50/50'
              )}
            >
              <td className="px-4 py-3 font-medium text-gray-800">{entry.date}</td>
              <td className="px-4 py-3 text-gray-600">{entry.dayOfWeek}</td>
              <td className="px-4 py-3 text-center">
                <RatioBadge ratio={entry.ratio} />
              </td>
              <td className="px-4 py-3 text-center font-semibold text-blue-700">{entry.totalPreceptors}</td>
              <td className="px-4 py-3 text-center font-semibold text-gray-700">{entry.totalResidents}</td>
              <td className="px-4 py-3">
                {entry.status === 'shortage' ? (
                  <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs">
                    ⚠️ Shortage
                    <NeedBadge entry={entry} />
                  </span>
                ) : entry.status === 'overage' ? (
                  <span className="text-green-600 font-semibold text-xs">✅ Overage</span>
                ) : (
                  <span className="text-gray-500 text-xs">— OK</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
