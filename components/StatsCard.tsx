'use client'
import clsx from 'clsx'
import type { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  variant?: 'default' | 'danger' | 'success' | 'warning' | 'purple'
}

const variantStyles = {
  default: 'from-blue-600 to-blue-700',
  danger:  'from-red-500 to-red-700',
  success: 'from-green-500 to-green-700',
  warning: 'from-amber-500 to-orange-600',
  purple:  'from-purple-500 to-purple-700',
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
}: StatsCardProps) {
  return (
    <div className={clsx(
      'relative rounded-2xl p-5 text-white bg-gradient-to-br shadow-lg overflow-hidden',
      variantStyles[variant]
    )}>
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">
            {title}
          </p>
          <p className="text-3xl font-extrabold leading-none">{value}</p>
          {subtitle && (
            <p className="text-xs text-white/60 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20 text-white text-lg">
          {icon}
        </div>
      </div>
    </div>
  )
}
