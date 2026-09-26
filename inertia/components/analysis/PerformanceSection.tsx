import { Link } from '@inertiajs/react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from '~/hooks/use_translation'
import Term from '~/components/shared/Term'
import ChartTooltip from './ChartTooltip'
import {
  ChartBlock,
  DISTANCE_KEYS,
  SERIES_COLORS,
  Section,
  Stat,
  formatNumber,
  formatPace,
  formatSeconds,
  longDate,
  monthLabel,
  useMetricLabel,
  type AnalysisData,
  type Insight,
} from './shared'

/** C1 records · courbe allure/distance · C3 VDOT · C4 prédictions · D6 suggestions FCmax/LTHR */
export default function PerformanceSection({
  performance,
  physiology,
  verdict,
}: {
  performance: AnalysisData['performance']
  physiology: AnalysisData['physiology']
  verdict?: Insight
}) {
  const { t, locale } = useTranslation()
  const label = useMetricLabel()
  const periodByDistance = new Map(performance.periodRecords.map((r) => [r.distance, r]))
  const suggestMaxHr =
    physiology.observedMaxHr !== null &&
    (physiology.currentMaxHr === null || physiology.observedMaxHr > physiology.currentMaxHr)
  const distanceLabel = (d: number) => t(`analysis.distances.${DISTANCE_KEYS[d]}`)

  // Allure moyenne (s/km) de chaque record : plus bas = plus rapide
  const paceCurve = performance.records.map((r) => ({
    distance: distanceLabel(r.distance),
    allTime: Math.round(r.seconds / (r.distance / 1000)),
    period: periodByDistance.has(r.distance)
      ? Math.round(periodByDistance.get(r.distance)!.seconds / (r.distance / 1000))
      : null,
  }))

  return (
    <Section
      id="performance"
      title={t('analysis.performance.title')}
      description={t('analysis.performance.description')}
      verdict={verdict}
      empty={performance.records.length === 0}
      emptyMessage={t('analysis.empty.noGps')}
      emptyAction={{ href: '/connectors', label: t('analysis.empty.connect') }}
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat
          label={<Term id="vdot">{t('analysis.performance.vdot')}</Term>}
          value={performance.vdot !== null ? formatNumber(performance.vdot, locale) : '—'}
          hint={t('analysis.performance.vdotHint')}
        />
        <Stat
          label={t('analysis.performance.profileVdot')}
          value={
            performance.profileVdot !== null ? formatNumber(performance.profileVdot, locale) : '—'
          }
          hint={t('analysis.performance.profileVdotHint')}
        />
        <Stat
          label={
            <Term id="vo2max" align="left">
              {t('analysis.performance.watchVo2Max')}
            </Term>
          }
          value={
            performance.watchVo2Max !== null ? formatNumber(performance.watchVo2Max, locale) : '—'
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartBlock
          title={t('analysis.performance.records')}
          help="records"
          className="overflow-x-auto"
        >
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">{t('analysis.performance.distance')}</th>
                <th>{t('analysis.performance.allTime')}</th>
                <th>{t('analysis.performance.inPeriod')}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {performance.records.map((r) => {
                const inPeriod = periodByDistance.get(r.distance)
                return (
                  <tr key={r.distance} className="border-t">
                    <td className="py-1.5">{distanceLabel(r.distance)}</td>
                    <td>
                      <Link
                        href={`/sessions/${r.sessionId}`}
                        className="font-medium hover:underline"
                      >
                        {formatSeconds(r.seconds)}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {longDate(r.date, locale)}
                      </span>
                    </td>
                    <td>
                      {inPeriod ? (
                        <Link href={`/sessions/${inPeriod.sessionId}`} className="hover:underline">
                          {formatSeconds(inPeriod.seconds)}
                          {inPeriod.seconds <= r.seconds && ' 🏅'}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </ChartBlock>

        {paceCurve.length >= 2 && (
          <ChartBlock title={t('analysis.performance.paceCurve')} help="paceCurve">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={paceCurve}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="distance" fontSize={11} />
                  {/* Axe inversé : plus haut = plus rapide */}
                  <YAxis
                    reversed
                    domain={['auto', 'auto']}
                    fontSize={11}
                    width={44}
                    tickFormatter={(v: number) => formatSeconds(v)}
                  />
                  <Tooltip content={<ChartTooltip valueFormat={(v) => formatPace(v)} />} />
                  <Legend />
                  <Line
                    dataKey="allTime"
                    name={t('analysis.performance.allTime')}
                    stroke="#94a3b8"
                    strokeWidth={2}
                  />
                  <Line
                    dataKey="period"
                    name={t('analysis.performance.inPeriod')}
                    stroke={SERIES_COLORS.primary}
                    strokeWidth={2}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}

        <ChartBlock title={t('analysis.performance.predictions')} help="predictions">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">{t('analysis.performance.distance')}</th>
                <th>{label('vdot')}</th>
                <th>Riegel</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {performance.predictions.map((p) => (
                <tr key={p.distance} className="border-t">
                  <td className="py-1.5">{distanceLabel(p.distance)}</td>
                  <td>{p.vdotSeconds ? formatSeconds(p.vdotSeconds) : '—'}</td>
                  <td>{p.riegelSeconds ? formatSeconds(p.riegelSeconds) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartBlock>

        {performance.vdotHistory.length > 1 && (
          <ChartBlock title={t('analysis.performance.vdotHistory')} help="vdotHistory">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performance.vdotHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m: string) => monthLabel(m, locale)}
                    fontSize={11}
                  />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} fontSize={11} width={36} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormat={(m) => monthLabel(m, locale)}
                        valueFormat={(v) => formatNumber(v, locale)}
                      />
                    }
                  />
                  <Line
                    dataKey="vdot"
                    name={label('vdot')}
                    stroke={SERIES_COLORS.primary}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}
      </div>

      {(suggestMaxHr || physiology.estimatedLthr) && (
        <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <h3 className="font-medium">{t('analysis.physiology.title')}</h3>
          {suggestMaxHr && (
            <p className="mt-1">
              {t('analysis.physiology.maxHr', {
                observed: physiology.observedMaxHr!,
                current: physiology.currentMaxHr ?? '—',
              })}
            </p>
          )}
          {physiology.estimatedLthr && (
            <p className="mt-1">
              {t('analysis.physiology.lthr', { lthr: physiology.estimatedLthr })}
            </p>
          )}
          <Link href="/profile" className="mt-2 inline-block text-primary hover:underline">
            {t('analysis.physiology.update')}
          </Link>
        </div>
      )}
    </Section>
  )
}
