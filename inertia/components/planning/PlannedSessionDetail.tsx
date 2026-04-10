import React from 'react'
import { useTranslation } from '~/hooks/use_translation'
import { useUnitConversion } from '~/hooks/use_unit_conversion'
import type { PlannedSession } from '~/types/planning'
import IntervalBreakdown from './IntervalBreakdown'
import ComparisonBlock from './ComparisonBlock'

function parsePaceString(pace: string): number {
  const [min, sec] = pace.split(':').map(Number)
  return min + (sec ?? 0) / 60
}

interface PlannedSessionDetailProps {
  session: PlannedSession
  borderClass?: string
  onEditClick?: () => void
}

export default function PlannedSessionDetail({
  session,
  borderClass = 'border-border',
  onEditClick,
}: PlannedSessionDetailProps) {
  const { t } = useTranslation()
  const { formatSpeed } = useUnitConversion()

  const isCompleted = session.status === 'completed'

  return (
    <div className={`border-x border-b ${borderClass} rounded-b-lg bg-card px-4 py-3 space-y-3`}>
      <div className="border-t border-border/50 -mx-4 -mt-3 mb-3" />
      <p className="text-sm text-muted-foreground">
        {t(`planning.sessions.types.${session.sessionType}`)} —{' '}
        {t('planning.overview.weekLabel', { n: session.weekNumber })}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">{t('planning.overview.target')} : </span>
          <span className="font-medium">{session.targetDurationMinutes} min</span>
        </div>
        {session.targetDistanceKm && (
          <div>
            <span className="font-medium">{session.targetDistanceKm} km</span>
          </div>
        )}
        {session.targetPacePerKm && (
          <div>
            <span className="font-medium">
              {formatSpeed(parsePaceString(session.targetPacePerKm))}
            </span>
          </div>
        )}
      </div>

      {session.intervals && session.intervals.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {t('planning.overview.intervals')}
          </div>
          <IntervalBreakdown intervals={session.intervals} />
        </div>
      )}

      {isCompleted && <ComparisonBlock session={session} />}

      {onEditClick && (
        <button
          onClick={onEditClick}
          className="cursor-pointer w-full text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg py-2 transition-colors mt-1"
        >
          {t('planning.overview.editSession')}
        </button>
      )}
    </div>
  )
}
