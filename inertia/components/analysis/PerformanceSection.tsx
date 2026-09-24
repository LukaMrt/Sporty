import { Link } from '@inertiajs/react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from '~/hooks/use_translation'
import { Section, Stat, formatSeconds, type AnalysisData } from './shared'

const DISTANCE_KEYS: Record<number, string> = {
  400: '400m',
  1000: '1k',
  1609: 'mile',
  5000: '5k',
  10000: '10k',
  21097: 'half',
  42195: 'marathon',
}

/** C1 meilleurs efforts · C3 VDOT dérivé · C4 prédictions · D6 suggestions FCmax/LTHR */
export default function PerformanceSection({
  performance,
  physiology,
}: {
  performance: AnalysisData['performance']
  physiology: AnalysisData['physiology']
}) {
  const { t, locale } = useTranslation()
  const recentByDistance = new Map(performance.recentRecords.map((r) => [r.distance, r]))
  const suggestMaxHr =
    physiology.observedMaxHr !== null &&
    (physiology.currentMaxHr === null || physiology.observedMaxHr > physiology.currentMaxHr)

  return (
    <Section
      id="performance"
      title={t('analysis.performance.title')}
      description={t('analysis.performance.description')}
      empty={performance.records.length === 0}
      emptyMessage={t('analysis.empty.noGps')}
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat
          label={t('analysis.performance.vdot')}
          value={performance.vdot ?? '—'}
          hint={t('analysis.performance.vdotHint')}
        />
        <Stat
          label={t('analysis.performance.profileVdot')}
          value={performance.profileVdot ?? '—'}
        />
        <Stat
          label={t('analysis.performance.watchVo2Max')}
          value={performance.watchVo2Max ?? '—'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto">
          <h3 className="mb-2 text-sm font-medium">{t('analysis.performance.records')}</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">{t('analysis.performance.distance')}</th>
                <th>{t('analysis.performance.allTime')}</th>
                <th>{t('analysis.performance.last90')}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {performance.records.map((r) => (
                <tr key={r.distance} className="border-t">
                  <td className="py-1">{t(`analysis.distances.${DISTANCE_KEYS[r.distance]}`)}</td>
                  <td>
                    <Link href={`/sessions/${r.sessionId}`} className="hover:underline">
                      {formatSeconds(r.seconds)}
                    </Link>{' '}
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleDateString(locale)}
                    </span>
                  </td>
                  <td>
                    {recentByDistance.has(r.distance)
                      ? formatSeconds(recentByDistance.get(r.distance)!.seconds)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">{t('analysis.performance.predictions')}</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">{t('analysis.performance.distance')}</th>
                <th>VDOT</th>
                <th>Riegel</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {performance.predictions.map((p) => (
                <tr key={p.distance} className="border-t">
                  <td className="py-1">{t(`analysis.distances.${DISTANCE_KEYS[p.distance]}`)}</td>
                  <td>{p.vdotSeconds ? formatSeconds(p.vdotSeconds) : '—'}</td>
                  <td>{p.riegelSeconds ? formatSeconds(p.riegelSeconds) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {performance.vdotHistory.length > 1 && (
        <div className="mt-4 h-48">
          <h3 className="mb-2 text-sm font-medium">{t('analysis.performance.vdotHistory')}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performance.vdotHistory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} fontSize={11} />
              <Tooltip />
              <Line dataKey="vdot" stroke="#0f766e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

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
