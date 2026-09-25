import { useTranslation } from '~/hooks/use_translation'
import Term from '~/components/shared/Term'
import { formatSwimPace, toSwimPace } from '~/lib/format'
import { estimatedSwolf, swimLaps, type SwimMetrics } from '~/lib/swim'

type SwimDetailsProps = {
  metrics: SwimMetrics
  durationMinutes: number
  distanceKm: number | null
}

export default function SwimDetails({ metrics, durationMinutes, distanceKm }: SwimDetailsProps) {
  const { t } = useTranslation()
  const laps = swimLaps(metrics, distanceKm)
  const strokesPerLap = metrics.strokes && laps ? Math.round(metrics.strokes / laps) : null
  const pace =
    distanceKm && distanceKm > 0 ? formatSwimPace(toSwimPace(durationMinutes / distanceKm)) : null

  const rows: { label: React.ReactNode; value: string }[] = []
  if (pace) rows.push({ label: <Term id="swimPace">{t('sessions.swim.pace')}</Term>, value: pace })
  if (metrics.subType)
    rows.push({
      label: t('sessions.form.subType'),
      value: t(`sessions.subTypes.${metrics.subType}`),
    })
  if (metrics.poolLengthM)
    rows.push({ label: t('sessions.swim.poolLength'), value: `${metrics.poolLengthM} m` })
  if (laps) rows.push({ label: t('sessions.swim.laps'), value: String(laps) })
  const swolfEstimate = metrics.swolf ? null : estimatedSwolf(metrics, durationMinutes, laps)
  if (metrics.swolf)
    rows.push({ label: <Term id="swolf">SWOLF</Term>, value: String(Math.round(metrics.swolf)) })
  else if (swolfEstimate)
    rows.push({
      label: <Term id="swolf">{t('sessions.swim.swolfEstimated')}</Term>,
      value: String(swolfEstimate),
    })
  if (metrics.strokes && !laps)
    rows.push({ label: t('sessions.swim.strokes'), value: String(metrics.strokes) })
  if (strokesPerLap)
    rows.push({ label: t('sessions.swim.strokesPerLap'), value: String(strokesPerLap) })

  if (rows.length === 0 && !metrics.heartRateCurveDiscarded) return null

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {t('sessions.swim.title')}
      </h2>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
      {metrics.strokes && !laps && metrics.subType !== 'open_water' && (
        <p className="mt-3 text-xs text-muted-foreground">{t('sessions.swim.poolHint')}</p>
      )}
      {metrics.heartRateCurveDiscarded && (
        <p className="mt-3 text-xs text-muted-foreground">{t('sessions.swim.hrDiscarded')}</p>
      )}
    </div>
  )
}
