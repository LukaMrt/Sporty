import React from 'react'
import { useTranslation } from '~/hooks/use_translation'

export type Period = 'week' | 'month' | 'all'

interface PeriodSelectorProps {
  value: Period
  onChange: (period: Period) => void
}

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const { t } = useTranslation()

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'all', label: t('dashboard.chart.periods.all') },
    { key: 'week', label: t('dashboard.chart.periods.week') },
    { key: 'month', label: t('dashboard.chart.periods.month') },
  ]

  return (
    <div className="overflow-x-auto whitespace-nowrap">
      <div className="flex gap-1">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              value === key
                ? 'bg-primary text-primary-foreground'
                : 'border border-input bg-background text-muted-foreground hover:bg-accent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
