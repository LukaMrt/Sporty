import React from 'react'

interface QuickStatCardProps {
  label: string
  value: string
  unit: string
  trend: number | null
  isEmpty: boolean
  lowerIsBetter?: boolean
}

export default function QuickStatCard({
  label,
  value,
  unit,
  trend,
  isEmpty,
  lowerIsBetter = false,
}: QuickStatCardProps) {
  const isFavorable = trend !== null && (lowerIsBetter ? trend < 0 : trend > 0)
  const trendSign = trend !== null && trend >= 0 ? '+' : ''

  return (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-card p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      {isEmpty ? (
        <span className="text-lg font-semibold">—</span>
      ) : (
        <>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold">{value}</span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
          {trend !== null && (
            <div className="flex items-center gap-1">
              <span
                className={`inline-flex items-center rounded px-1 py-0.5 text-xs font-medium ${
                  isFavorable
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {trendSign}
                {trend % 1 === 0 ? trend.toFixed(0) : trend.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">vs moy. 4 sem.</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
