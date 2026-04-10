import React from 'react'
import { Link } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'
import type { TrainingPlan } from '~/types/planning'

interface PlanHistoryCardProps {
  plan: TrainingPlan
  goalDistanceKm: number | null
  completedSessionsCount: number
  totalSessionsCount: number
}

export default function PlanHistoryCard({
  plan,
  goalDistanceKm,
  completedSessionsCount,
  totalSessionsCount,
}: PlanHistoryCardProps) {
  const { t } = useTranslation()

  const isCompleted = plan.status === 'completed'

  const statusLabel = isCompleted
    ? t('planning.history.completed')
    : t('planning.history.abandoned')

  const statusColor = isCompleted ? 'text-green-600' : 'text-muted-foreground'
  const statusDot = isCompleted ? '✅' : '○'

  const goalLabel = goalDistanceKm
    ? t('planning.history.goal').replace('{distance}', String(goalDistanceKm))
    : t('planning.history.maintenancePlan')

  const vdotLabel = t('planning.history.vdotProgress')
    .replace('{start}', String(plan.vdotAtCreation))
    .replace('{end}', String(plan.currentVdot))

  const sessionsLabel = t('planning.history.sessions')
    .replace('{done}', String(completedSessionsCount))
    .replace('{total}', String(totalSessionsCount))

  const dateRange = `${plan.startDate} → ${plan.endDate}`

  return (
    <Link
      href={`/planning/history/${plan.id}`}
      className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="font-semibold text-foreground truncate">{goalLabel}</div>
          <div className="text-sm text-muted-foreground">{dateRange}</div>
        </div>
        <div className={`text-sm font-medium shrink-0 ${statusColor}`}>
          {statusDot} {statusLabel}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span>{vdotLabel}</span>
        <span>·</span>
        <span>{sessionsLabel}</span>
      </div>
    </Link>
  )
}
