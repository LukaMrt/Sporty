import React from 'react'

export type Period = 'week' | 'month' | 'all'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
]

interface PeriodSelectorProps {
  value: Period
  onChange: (period: Period) => void
}

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
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
