import React from 'react'
import { useTranslation } from '~/hooks/use_translation'
import type { PlannedWeek, PlannedSession } from '~/types/planning'

interface WeekSummaryProps {
  week: PlannedWeek
  sessions: PlannedSession[]
}

function loadIndicator(tss: number): { label: string; color: string } {
  if (tss < 150) return { label: 'low', color: 'text-emerald-600 bg-emerald-50' }
  if (tss < 300) return { label: 'moderate', color: 'text-blue-600 bg-blue-50' }
  return { label: 'high', color: 'text-orange-600 bg-orange-50' }
}

export default function WeekSummary({ week, sessions }: WeekSummaryProps) {
  const { t } = useTranslation()

  const runningSessions = sessions.filter((s) => s.sessionType !== 'rest')
  const totalVolume = week.targetVolumeMinutes
  const sessionCount = runningSessions.length
  const totalTss = sessions.reduce((sum, s) => sum + (s.targetLoadTss ?? 0), 0)
  const { label, color } = loadIndicator(totalTss)

  return (
    <div className="flex items-center gap-4 text-sm">
      <div>
        <span className="text-muted-foreground">{t('planning.overview.totalVolume')} </span>
        <span className="font-medium text-foreground">{totalVolume} min</span>
      </div>
      <div>
        <span className="font-medium text-foreground">{sessionCount}</span>
        <span className="text-muted-foreground"> {t('planning.overview.sessions')}</span>
      </div>
      {totalTss > 0 && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
          {t(`planning.overview.load.${label}`)}
        </span>
      )}
    </div>
  )
}
