import React from 'react'
import { useTranslation } from '~/hooks/use_translation'
import type { TrainingGoal, PlannedWeek } from '~/types/planning'

interface GoalBannerProps {
  goal: TrainingGoal
  weeks: PlannedWeek[]
  currentWeek: PlannedWeek | undefined
  currentWeekNumber: number
}

export default function GoalBanner({
  goal,
  weeks,
  currentWeek,
  currentWeekNumber,
}: GoalBannerProps) {
  const { t } = useTranslation()

  const eventDaysLeft = goal.eventDate
    ? Math.ceil((new Date(goal.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const eventLabel = goal.eventDate
    ? eventDaysLeft !== null && eventDaysLeft > 0
      ? t('planning.overview.eventIn').replace('{{n}}', String(eventDaysLeft))
      : t('planning.overview.eventPassed')
    : t('planning.overview.noEventDate')

  const phaseName = currentWeek
    ? (t(`planning.phases.${currentWeek.phaseName}`) ?? currentWeek.phaseLabel)
    : null

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-lg font-semibold text-foreground">
            {goal.targetDistanceKm} km
            {goal.targetTimeMinutes && (
              <span className="text-muted-foreground font-normal text-sm ml-2">
                — {Math.floor(goal.targetTimeMinutes / 60)}h
                {String(goal.targetTimeMinutes % 60).padStart(2, '0')}
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">{eventLabel}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-foreground">
            {t('planning.overview.week')} {currentWeekNumber} {t('planning.overview.of')}{' '}
            {weeks.length}
          </div>
          {phaseName && (
            <div className="text-xs text-muted-foreground">
              {t('planning.overview.phase')} · {phaseName}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.round((currentWeekNumber / weeks.length) * 100)}%` }}
        />
      </div>
    </div>
  )
}
