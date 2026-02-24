'use client'
import { useState } from 'react'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  onClear: () => void
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onClear,
}: DateRangePickerProps) {
  const hasFilter = startDate || endDate

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          From
        </label>
        <input
          type="date"
          value={startDate}
          onChange={e => onStartChange(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     hover:border-gray-400 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          To
        </label>
        <input
          type="date"
          value={endDate}
          onChange={e => onEndChange(e.target.value)}
          min={startDate || undefined}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     hover:border-gray-400 transition-colors"
        />
      </div>

      {hasFilter && (
        <button
          onClick={onClear}
          className="h-10 px-4 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium
                     hover:bg-gray-200 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
          Clear dates
        </button>
      )}
    </div>
  )
}
