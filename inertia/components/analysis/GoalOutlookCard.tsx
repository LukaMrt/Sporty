import { Link } from '@inertiajs/react'
import { Flag } from 'lucide-react'
import { useTranslation } from '~/hooks/use_translation'
import type { GoalOutlook } from '../../../app/domain/services/analysis/overview'
import { formatNumber, formatSeconds, longDate } from './format'

/** Objectif : compte à rebours, temps prédit vs visé, forme projetée le jour J */
export default function GoalOutlookCard({ goal }: { goal: GoalOutlook }) {
  const { t, locale } = useTranslation()
  const ahead = goal.gapSeconds !== null && goal.gapSeconds <= 0

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Flag className="h-4 w-4 text-primary" aria-hidden="true" />
        {t('analysis.goal.title', { distance: formatNumber(goal.distanceKm, locale, 2) })}
      </div>
      {goal.eventDate && (
        <p className="mt-1 text-xs text-muted-foreground">
          {longDate(goal.eventDate, locale)}
          {goal.daysLeft !== null && ` · ${t('analysis.goal.daysLeft', { days: goal.daysLeft })}`}
        </p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{t('analysis.goal.target')}</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {goal.targetSeconds !== null ? formatSeconds(goal.targetSeconds) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('analysis.goal.predicted')}</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {goal.predictedSeconds !== null ? formatSeconds(goal.predictedSeconds) : '—'}
          </dd>
        </div>
      </dl>
      {goal.gapSeconds !== null && (
        <p className={`mt-2 text-sm ${ahead ? 'text-emerald-700' : 'text-amber-700'}`}>
          {ahead
            ? t('analysis.goal.ahead', { gap: formatSeconds(-goal.gapSeconds) })
            : t('analysis.goal.behind', { gap: formatSeconds(goal.gapSeconds) })}
        </p>
      )}
      {goal.predictedSeconds === null && (
        <p className="mt-2 text-xs text-muted-foreground">{t('analysis.goal.noPrediction')}</p>
      )}
      {goal.raceDay && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t('analysis.goal.raceDay', {
            ctl: Math.round(goal.raceDay.ctl),
            tsb: Math.round(goal.raceDay.tsb),
          })}
        </p>
      )}
      <Link href="/planning" className="mt-3 inline-block text-xs text-primary hover:underline">
        {t('analysis.goal.seePlan')} →
      </Link>
    </div>
  )
}
