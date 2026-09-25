import { useTranslation } from '~/hooks/use_translation'
import Term from '~/components/shared/Term'
import type { GlossaryTermId } from '~/lib/glossary'
import type { SessionContext } from '../../../app/use_cases/sessions/get_session_context'
import type { SessionAnalysis } from '../../../app/domain/value_objects/session_analysis'

type DynamicsKey =
  'power' | 'cadence' | 'strideLength' | 'groundContactTime' | 'verticalOscillation'

export type RunningDynamicsSummary = {
  averages: Partial<Record<DynamicsKey, number>>
}

const DYNAMICS_UNITS: Record<DynamicsKey, string> = {
  power: 'W',
  cadence: 'spm',
  strideLength: 'm',
  groundContactTime: 'ms',
  verticalOscillation: 'cm',
}

function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60)
  const s = Math.round(secondsPerKm % 60)
  return `${m}'${String(s).padStart(2, '0')}/km`
}

const isSet = <T,>(value: T | null | undefined): value is T => value !== null && value !== undefined

/**
 * F5 · Séance enrichie : allure ajustée à la pente (C5), efficacité et
 * découplage (D1/D2), dynamique de course (D4), contexte du jour (sommeil,
 * HRV, fraîcheur avant la séance).
 */
export default function SessionInsights({
  analysis,
  dynamics,
  context,
}: {
  analysis: SessionAnalysis | null
  dynamics: RunningDynamicsSummary | null
  context: SessionContext | null
}) {
  const { t } = useTranslation()
  const items: { label: string; value: string; hint?: string; term?: GlossaryTermId }[] = []

  if (isSet(analysis?.gradeAdjustedPace)) {
    items.push({
      label: t('sessions.insights.gap'),
      term: 'gap',
      value: formatPace(analysis.gradeAdjustedPace),
      hint: t('sessions.insights.gapHint'),
    })
  }
  if (isSet(analysis?.efficiencyFactor)) {
    items.push({
      label: t('sessions.insights.ef'),
      value: analysis.efficiencyFactor.toFixed(2),
      term: 'ef',
    })
  }
  if (isSet(analysis?.decoupling)) {
    items.push({
      label: t('sessions.insights.decoupling'),
      term: 'decoupling',
      value: `${analysis.decoupling} %`,
      hint:
        analysis.decoupling < 5
          ? t('sessions.insights.decouplingGood')
          : t('sessions.insights.decouplingHigh'),
    })
  }
  for (const [key, value] of Object.entries(dynamics?.averages ?? {})) {
    items.push({
      label: t(`sessions.insights.dynamics.${key}`),
      value: `${value} ${DYNAMICS_UNITS[key as DynamicsKey]}`,
    })
  }

  const wellness = context?.wellness ?? null
  const fitness = context?.fitnessBefore ?? null
  if (items.length === 0 && !wellness && !fitness) return null

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {t('sessions.insights.title')}
      </h2>
      {items.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.label}>
              <dt className="text-xs text-muted-foreground">
                {item.term ? <Term id={item.term}>{item.label}</Term> : item.label}
              </dt>
              <dd className="font-semibold tabular-nums">{item.value}</dd>
              {item.hint && <dd className="text-xs text-muted-foreground">{item.hint}</dd>}
            </div>
          ))}
        </dl>
      )}
      {(wellness || fitness) && (
        <div className="mt-4 border-t pt-3">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            {t('sessions.insights.context')}
          </h3>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {isSet(wellness?.sleepMinutes) && (
              <li>
                {t('sessions.insights.sleep')} : {Math.floor(wellness.sleepMinutes / 60)} h{' '}
                {wellness.sleepMinutes % 60} min
              </li>
            )}
            {isSet(wellness?.hrvRmssd) && <li>HRV : {wellness.hrvRmssd} ms</li>}
            {isSet(wellness?.restingHeartRate) && (
              <li>
                {t('sessions.insights.restingHr')} : {wellness.restingHeartRate} bpm
              </li>
            )}
            {fitness && (
              <li>
                {t('sessions.insights.tsbBefore')} : {fitness.tsb} (CTL {fitness.ctl})
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
