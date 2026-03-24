import React from 'react'
import { useTranslation } from '~/hooks/use_translation'
import type { PlannedSession } from '~/types/planning'

interface ComparisonBlockProps {
  session: PlannedSession
}

export default function ComparisonBlock({ session }: ComparisonBlockProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg bg-muted p-3">
        <div className="text-xs text-muted-foreground mb-2">
          {t('planning.overview.comparisonPlanned')}
        </div>
        <div className="space-y-1 text-sm">
          <div>{session.targetDurationMinutes} min</div>
          {session.targetDistanceKm && <div>{session.targetDistanceKm} km</div>}
          {session.targetPacePerKm && <div>{session.targetPacePerKm} /km</div>}
        </div>
      </div>
      <div className="rounded-lg bg-emerald-50 p-3">
        <div className="text-xs text-muted-foreground mb-2">
          {t('planning.overview.comparisonActual')}
        </div>
        <div className="text-sm text-muted-foreground italic">—</div>
      </div>
    </div>
  )
}
