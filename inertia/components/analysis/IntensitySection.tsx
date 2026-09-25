import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from '~/hooks/use_translation'
import { Section, ZONE_COLORS, type AnalysisData } from './shared'

/** B3 · Temps par zone et indicateur 80/20 */
export default function IntensitySection({
  intensity,
  hasHeartRate,
}: {
  intensity: AnalysisData['intensity']
  hasHeartRate: boolean
}) {
  const { t } = useTranslation()
  const data = intensity.map((w) => ({
    week: w.week,
    z1: w.zoneMinutes[0],
    z2: w.zoneMinutes[1],
    z3: w.zoneMinutes[2],
    z4: w.zoneMinutes[3],
    z5: w.zoneMinutes[4],
    low: w.lowShare !== null ? Math.round(w.lowShare * 100) : null,
    grey: w.tooMuchZ3,
  }))
  const recent = intensity.slice(-4).filter((w) => w.lowShare !== null)
  const avgLow = recent.length
    ? Math.round((recent.reduce((a, w) => a + w.lowShare!, 0) / recent.length) * 100)
    : null

  return (
    <Section
      id="intensity"
      terms={['hrZones']}
      title={t('analysis.intensity.title')}
      description={t('analysis.intensity.description')}
      empty={!hasHeartRate || intensity.length === 0}
      emptyMessage={t('analysis.empty.noHeartRate')}
    >
      {avgLow !== null && (
        <p className="mb-3 text-sm">
          {t('analysis.intensity.recentLowShare', { percent: avgLow })}{' '}
          <span className={avgLow >= 75 ? 'text-emerald-600' : 'text-amber-600'}>
            {avgLow >= 75 ? t('analysis.intensity.polarized') : t('analysis.intensity.tooGrey')}
          </span>
        </p>
      )}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" fontSize={11} minTickGap={24} />
            <YAxis yAxisId="min" fontSize={11} />
            <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} fontSize={11} unit="%" />
            <Tooltip />
            <Legend />
            {(['z1', 'z2', 'z3', 'z4', 'z5'] as const).map((z, i) => (
              <Bar
                key={z}
                yAxisId="min"
                dataKey={z}
                name={z.toUpperCase()}
                stackId="zones"
                fill={ZONE_COLORS[i]}
              />
            ))}
            <Line
              yAxisId="pct"
              dataKey="low"
              name={t('analysis.intensity.lowShare')}
              stroke="#0f172a"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Section>
  )
}
