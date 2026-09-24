import { useTranslation } from '~/hooks/use_translation'
import type { PlannedSession, PlannedWeek } from '~/types/planning'
import { sessionDate } from '~/lib/planning_dates'

export default function WeekCard({
  week,
  sessions,
  planStartDate,
  isCurrentWeek,
  isSelected,
  locale,
  onClick,
}: {
  week: PlannedWeek
  sessions: PlannedSession[]
  planStartDate: string
  isCurrentWeek: boolean
  isSelected: boolean
  locale: string
  onClick: () => void
}) {
  const { t } = useTranslation()

  const start = sessionDate(planStartDate, week.weekNumber, 1)
  const end = sessionDate(planStartDate, week.weekNumber, 0)
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })

  const runningSessions = sessions.filter((s) => s.sessionType !== 'rest')
  const phaseLabel = t(`planning.phases.${week.phaseName}`) ?? week.phaseLabel

  return (
    <button
      onClick={onClick}
      className={[
        'cursor-pointer w-full text-left rounded-xl border p-3 transition-colors',
        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/40',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {t('planning.overview.weekLabel', { n: week.weekNumber })}
          </span>
          {isCurrentWeek && (
            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
              {t('planning.overview.inProgress')}
            </span>
          )}
          {week.isRecoveryWeek && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
              {t('planning.overview.recoveryWeek')}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {fmt.format(start)} – {fmt.format(end)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{phaseLabel}</span>
        <span>·</span>
        <span>{week.targetVolumeMinutes} min</span>
        <span>·</span>
        <span>{t('planning.overview.sessionCount', { n: runningSessions.length })}</span>
      </div>
    </button>
  )
}
