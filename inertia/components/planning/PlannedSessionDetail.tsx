import { router } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'
import { useUnitConversion } from '~/hooks/use_unit_conversion'
import type { PlannedSession } from '~/types/planning'
import IntervalBreakdown from './IntervalBreakdown'
import ComparisonBlock from './ComparisonBlock'

function parsePaceString(pace: string): number {
  const [min, sec] = pace.split(':').map(Number)
  return min + (sec ?? 0) / 60
}

type PlannedSessionDetailProps = {
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

  function remove() {
    if (!window.confirm(t('planning.editor.session.confirmDelete'))) return
    router.delete(`/planning/sessions/${session.id}`, { preserveScroll: true })
  }

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
          <span className="font-medium">{session.targetDistanceKm} km</span>
        )}
        {session.targetPacePerKm && (
          <span className="font-medium">
            {formatSpeed(parsePaceString(session.targetPacePerKm))}
          </span>
        )}
        {session.targetPacePer100m && (
          <span className="font-medium">{session.targetPacePer100m}/100 m</span>
        )}
        {session.targetPowerWatts && (
          <span className="font-medium">{session.targetPowerWatts} W</span>
        )}
        {session.targetRpe && (
          <span className="font-medium">
            {t('planning.editor.rpeValue', { rpe: session.targetRpe })}
          </span>
        )}
      </div>

      {session.description && (
        <p className="whitespace-pre-line text-sm text-foreground/80">{session.description}</p>
      )}

      {session.intervals && session.intervals.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {t('planning.overview.intervals')}
          </div>
          <IntervalBreakdown intervals={session.intervals} />
        </div>
      )}

      {session.exercises && session.exercises.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('planning.editor.exercises.title')}
          </div>
          <ul className="divide-y text-sm">
            {session.exercises.map((x, i) => (
              <li key={i} className="py-1.5">
                <span className="font-medium">{x.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {[
                    x.sets && x.reps ? `${x.sets} × ${x.reps}` : (x.sets ?? x.reps),
                    x.load,
                    x.restSeconds !== null
                      ? t('planning.editor.exercises.restValue', { s: x.restSeconds })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {x.notes && <p className="text-xs text-muted-foreground">{x.notes}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isCompleted && <ComparisonBlock session={session} />}

      {onEditClick && (
        <div className="flex gap-2">
          <button
            onClick={onEditClick}
            className="cursor-pointer flex-1 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg py-2 transition-colors"
          >
            {t('planning.overview.editSession')}
          </button>
          <button
            onClick={remove}
            className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            {t('planning.editor.session.delete')}
          </button>
        </div>
      )}
    </div>
  )
}
