'use client'

import { useState, useEffect, useCallback } from 'react'
import StatsCard from '@/components/StatsCard'
import CoverageTable from '@/components/CoverageTable'
import CoverageChart from '@/components/CoverageChart'
import DateRangePicker from '@/components/DateRangePicker'
import type { CoverageResult } from '@/lib/amion'

// ── helpers ─────────────────────────────────────────────────────────────────
const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]
const YEARS = ['2024', '2025', '2026']

type Session = 'am' | 'pm' | 'both'
type ViewMode = 'shortage' | 'overage' | 'all'

// ── sub-components ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      <p className="text-sm text-gray-500">Fetching AMION schedule…</p>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mx-6 mt-6 rounded-xl bg-red-50 border border-red-200 px-5 py-4 flex gap-3 items-start">
      <span className="text-red-500 text-xl mt-0.5">⚠</span>
      <div>
        <p className="font-semibold text-red-700">Failed to load data</p>
        <p className="text-sm text-red-600 mt-1">{message}</p>
      </div>
    </div>
  )
}

function SessionTab({
  label,
  active,
  onClick,
  color,
}: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
        active
          ? `${color} text-white shadow-md`
          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  )
}

// ── main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear]   = useState(String(now.getFullYear()))
  const [startDate, setStartDate] = useState('')
  const [endDate,   setEndDate]   = useState('')

  const [data,    setData]    = useState<CoverageResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [activeSession, setActiveSession] = useState<Session>('both')
  const [viewMode,      setViewMode]      = useState<ViewMode>('all')

  const [notifyStatus, setNotifyStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [notifyMsg,    setNotifyMsg]    = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ month, year })
      if (startDate) params.set('startDate', startDate)
      if (endDate)   params.set('endDate',   endDate)
      const res = await fetch(`/api/preceptors?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const json: CoverageResult = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [month, year, startDate, endDate])

  useEffect(() => { fetchData() }, [fetchData])

  async function sendTestNotification() {
    setNotifyStatus('sending')
    setNotifyMsg('')
    try {
      const params = new URLSearchParams({ month, year })
      const res = await fetch(`/api/send-weekly-report?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Email failed')
      setNotifyStatus('sent')
      setNotifyMsg(json.message ?? 'Email sent!')
    } catch (e) {
      setNotifyStatus('error')
      setNotifyMsg(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  // ── derived display data ──────────────────────────────────────────────────
  const monthLabel = MONTHS.find(m => m.value === month)?.label ?? month
  const dateRangeLabel = startDate || endDate
    ? ` · ${startDate || '…'} → ${endDate || '…'}`
    : ''

  const amEntries = !data ? [] :
    viewMode === 'shortage' ? data.amShortage :
    viewMode === 'overage'  ? data.amOverage  :
    data.amAll

  const pmEntries = !data ? [] :
    viewMode === 'shortage' ? data.pmShortage :
    viewMode === 'overage'  ? data.pmOverage  :
    data.pmAll

  const totalShortage = data ? data.stats.totalAmShortage + data.stats.totalPmShortage : 0
  const totalOverage  = data ? data.stats.totalAmOverage  + data.stats.totalPmOverage  : 0

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top header bar ─────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-2xl">📋</span>
              SAMC FM Preceptor Coverage Dashboard
            </h1>
            <p className="text-blue-200 text-sm mt-0.5">
              2025-26 AMION Outpatient Preceptor Shortage & Overage Tracker
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-300 uppercase tracking-widest">Compliance threshold</p>
            <p className="text-white font-bold text-lg">1 preceptor : 4 residents</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Filter panel ───────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Filters
          </h2>
          <div className="flex flex-wrap gap-4 items-end">
            {/* Month */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Month</label>
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-800
                           shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Year</label>
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-800
                           shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-10 bg-gray-200 self-end" />

            {/* Date range */}
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
              onClear={() => { setStartDate(''); setEndDate('') }}
            />

            {/* Refresh */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold
                         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors shadow-sm flex items-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              )}
              Refresh
            </button>
          </div>
        </section>

        {/* ── Error ──────────────────────────────────────────────────────────── */}
        {error && !loading && <ErrorBanner message={error} />}

        {/* ── Loading ────────────────────────────────────────────────────────── */}
        {loading && <Spinner />}

        {/* ── Dashboard content ──────────────────────────────────────────────── */}
        {!loading && data && (
          <>
            {/* Stats cards */}
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                {monthLabel} {year}{dateRangeLabel} — Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatsCard
                  title="AM Shortages"
                  value={data.stats.totalAmShortage}
                  subtitle="Days below 1:4"
                  icon={<span>🌅</span>}
                  variant={data.stats.totalAmShortage > 0 ? 'danger' : 'success'}
                />
                <StatsCard
                  title="PM Shortages"
                  value={data.stats.totalPmShortage}
                  subtitle="Days below 1:4"
                  icon={<span>🌆</span>}
                  variant={data.stats.totalPmShortage > 0 ? 'danger' : 'success'}
                />
                <StatsCard
                  title="AM Overages"
                  value={data.stats.totalAmOverage}
                  subtitle="Days above 1:4"
                  icon={<span>📈</span>}
                  variant="success"
                />
                <StatsCard
                  title="PM Overages"
                  value={data.stats.totalPmOverage}
                  subtitle="Days above 1:4"
                  icon={<span>📊</span>}
                  variant="success"
                />
                <StatsCard
                  title="Avg AM Ratio"
                  value={data.stats.avgAmRatio !== null ? `${(data.stats.avgAmRatio * 100).toFixed(1)}%` : '—'}
                  subtitle={data.stats.worstAmDate ? `Worst: ${data.stats.worstAmDate}` : 'No AM data'}
                  icon={<span>🔢</span>}
                  variant={
                    data.stats.avgAmRatio !== null && data.stats.avgAmRatio < 0.25
                      ? 'warning' : 'default'
                  }
                />
                <StatsCard
                  title="Days Analyzed"
                  value={data.stats.totalDaysAnalyzed}
                  subtitle="Unique dates"
                  icon={<span>📅</span>}
                  variant="purple"
                />
              </div>

              {/* Alert banner when shortages exist */}
              {totalShortage > 0 && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-5 py-3 flex items-center justify-between gap-3">
                  <p className="text-red-700 text-sm font-semibold">
                    ⚠️ {totalShortage} shortage date{totalShortage !== 1 ? 's' : ''} detected this period —
                    preceptor-to-resident ratio falls below 1:4 compliance.
                  </p>
                  <button
                    onClick={sendTestNotification}
                    disabled={notifyStatus === 'sending'}
                    className="shrink-0 px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold
                               hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {notifyStatus === 'sending' ? (
                      <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>📧</span>
                    )}
                    Send Alert Now
                  </button>
                </div>
              )}
              {notifyMsg && (
                <p className={`mt-2 text-sm font-medium ${notifyStatus === 'sent' ? 'text-green-600' : 'text-red-600'}`}>
                  {notifyStatus === 'sent' ? '✅ ' : '❌ '}{notifyMsg}
                </p>
              )}
            </section>

            {/* Chart */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-1">
                Preceptor Coverage Ratio — {monthLabel} {year}
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Red dashed line = 1:4 compliance floor (25%). Hover points for details.
              </p>
              <CoverageChart amData={data.amAll} pmData={data.pmAll} />
            </section>

            {/* Session / view tabs */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-sm font-bold text-gray-800">Coverage Detail</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Showing {viewMode} dates · {activeSession === 'both' ? 'AM & PM' : activeSession.toUpperCase()} sessions
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Session tabs */}
                  <div className="flex gap-1.5">
                    <SessionTab label="Both"  active={activeSession === 'both'} onClick={() => setActiveSession('both')} color="bg-gray-700" />
                    <SessionTab label="AM"    active={activeSession === 'am'}   onClick={() => setActiveSession('am')}   color="bg-blue-600" />
                    <SessionTab label="PM"    active={activeSession === 'pm'}   onClick={() => setActiveSession('pm')}   color="bg-purple-600" />
                  </div>
                  {/* View mode */}
                  <div className="flex gap-1.5">
                    <SessionTab label="⚠️ Shortage" active={viewMode === 'shortage'} onClick={() => setViewMode('shortage')} color="bg-red-600" />
                    <SessionTab label="✅ Overage"  active={viewMode === 'overage'}  onClick={() => setViewMode('overage')}  color="bg-green-600" />
                    <SessionTab label="All"         active={viewMode === 'all'}      onClick={() => setViewMode('all')}      color="bg-gray-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {(activeSession === 'am' || activeSession === 'both') && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <h3 className="text-sm font-semibold text-gray-700">
                        🌅 AM Session — {viewMode === 'shortage' ? 'Shortage' : viewMode === 'overage' ? 'Overage' : 'All'} Dates
                      </h3>
                      <span className="ml-auto text-xs text-gray-400">{amEntries.length} record{amEntries.length !== 1 ? 's' : ''}</span>
                    </div>
                    <CoverageTable
                      entries={amEntries}
                      title="AM Coverage"
                      emptyMessage={`No AM ${viewMode} dates for this period.`}
                    />
                  </div>
                )}

                {(activeSession === 'pm' || activeSession === 'both') && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <h3 className="text-sm font-semibold text-gray-700">
                        🌆 PM Session — {viewMode === 'shortage' ? 'Shortage' : viewMode === 'overage' ? 'Overage' : 'All'} Dates
                      </h3>
                      <span className="ml-auto text-xs text-gray-400">{pmEntries.length} record{pmEntries.length !== 1 ? 's' : ''}</span>
                    </div>
                    <CoverageTable
                      entries={pmEntries}
                      title="PM Coverage"
                      emptyMessage={`No PM ${viewMode} dates for this period.`}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Info footer */}
            <section className="bg-blue-50 rounded-2xl border border-blue-100 px-5 py-4">
              <div className="flex flex-col sm:flex-row gap-4 text-xs text-blue-700">
                <div className="flex items-start gap-2">
                  <span className="text-base">ℹ️</span>
                  <div>
                    <strong>Compliance Rule:</strong> A minimum ratio of 1 preceptor per 4 residents (≥25%) is required
                    for each half-day session. Dates below this threshold are flagged as shortages.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-base">🔄</span>
                  <div>
                    <strong>Weekly Alerts:</strong> Automated shortage notifications are sent every Monday at 9:00 AM UTC
                    via Resend to the scheduling team.
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
