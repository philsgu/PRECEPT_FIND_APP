'use client'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
  type TooltipProps,
} from 'recharts'
import type { CoverageEntry } from '@/lib/amion'

interface ChartDataPoint {
  date: string
  day: string
  amRatio: number | null
  pmRatio: number | null
}

interface CoverageChartProps {
  amData: CoverageEntry[]
  pmData: CoverageEntry[]
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-sm">
      <p className="font-bold text-gray-800 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span
            className="w-3 h-3 rounded-full inline-block"
            style={{ background: p.color }}
          />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold" style={{ color: p.color }}>
            {p.value !== null && p.value !== undefined
              ? `${(p.value * 100).toFixed(1)}%`
              : '—'}
          </span>
          {p.value !== null && p.value !== undefined && (p.value as number) < 0.25 && (
            <span className="text-red-500 text-xs font-bold">⚠ SHORT</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function CoverageChart({ amData, pmData }: CoverageChartProps) {
  // Merge AM and PM by date
  const dateMap = new Map<string, ChartDataPoint>()

  for (const entry of amData) {
    dateMap.set(entry.date, {
      date: entry.date,
      day: entry.dayOfWeek,
      amRatio: entry.ratio,
      pmRatio: null,
    })
  }
  for (const entry of pmData) {
    const existing = dateMap.get(entry.date)
    if (existing) {
      existing.pmRatio = entry.ratio
    } else {
      dateMap.set(entry.date, {
        date: entry.date,
        day: entry.dayOfWeek,
        amRatio: null,
        pmRatio: entry.ratio,
      })
    }
  }

  const chartData = Array.from(dateMap.values()).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        No chart data available for this period.
      </div>
    )
  }

  // Format x-axis labels to show short date
  const formatXAxis = (value: string) => {
    const parts = value.split('/')
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`
    return value
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tickFormatter={formatXAxis}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tickFormatter={v => `${(v * 100).toFixed(0)}%`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          domain={[0, 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
        />
        {/* 1:4 threshold line */}
        <ReferenceLine
          y={0.25}
          stroke="#dc2626"
          strokeDasharray="6 3"
          strokeWidth={2}
          label={{
            value: '1:4 minimum (25%)',
            position: 'insideTopRight',
            fontSize: 11,
            fill: '#dc2626',
            fontWeight: 600,
          }}
        />
        <Line
          type="monotone"
          dataKey="amRatio"
          name="AM Ratio"
          stroke="#2563eb"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="pmRatio"
          name="PM Ratio"
          stroke="#7c3aed"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
