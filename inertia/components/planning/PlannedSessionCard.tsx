import React from 'react'
import { useTranslation } from '~/hooks/use_translation'
import { ZONE_COLORS } from '~/lib/planning_colors'
import type { PlannedSession } from '~/types/planning'

interface PlannedSessionCardProps {
  session: PlannedSession
  isToday: boolean
  onClick: () => void
}

export default function PlannedSessionCard({ session, isToday, onClick }: PlannedSessionCardProps) {
  const { t } = useTranslation()

  const isCompleted = session.status === 'completed'
  const isSkipped = session.status === 'skipped'
  const isRest = session.sessionType === 'rest'

  const zoneColor = ZONE_COLORS[session.intensityZone] ?? 'bg-muted-foreground'

  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left rounded-xl border p-3 flex items-start gap-3 transition-colors',
        isToday ? 'border-primary bg-primary/5' : 'border-border bg-card',
        isSkipped ? 'opacity-50' : '',
        'hover:bg-muted/50',
      ].join(' ')}
    >
      {/* Zone dot */}
      <div className="mt-1 flex-shrink-0">
        {isCompleted ? (
          <span className="text-emerald-500 text-base leading-none">✅</span>
        ) : isSkipped ? (
          <span className="text-muted-foreground text-base leading-none line-through">○</span>
        ) : (
          <span className={`block w-2.5 h-2.5 rounded-full mt-0.5 ${zoneColor}`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={[
              'text-sm font-medium',
              isSkipped ? 'text-muted-foreground line-through' : 'text-foreground',
            ].join(' ')}
          >
            {isRest
              ? t('planning.overview.rest')
              : t(`planning.sessions.types.${session.sessionType}`)}
          </span>
          {isToday && (
            <span className="text-xs text-primary font-semibold flex-shrink-0">
              {t('planning.overview.today')}
            </span>
          )}
        </div>

        {!isRest && (
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            <span>{session.targetDurationMinutes} min</span>
            {session.targetDistanceKm && <span>{session.targetDistanceKm} km</span>}
            {session.targetPacePerKm && <span>{session.targetPacePerKm} /km</span>}
          </div>
        )}

        {isSkipped && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {t('planning.overview.notDone')}
          </div>
        )}
      </div>
    </button>
  )
}
