import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
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
  Section,
  ZONE_COLORS,
  formatMinutes,
  shortDate,
  type AnalysisData,
  type Insight,
} from './shared'

/** B3 · Temps par zone et repère 80/20 */
export default function IntensitySection({
  intensity,
  hasHeartRate,
  verdict,
}: {
  intensity: AnalysisData['intensity']
  hasHeartRate: boolean
  verdict?: Insight
}) {
  const { t, locale } = useTranslation()
  const data = intensity.map((w) => ({
    week: w.week,
    z1: w.zoneMinutes[0],
    z2: w.zoneMinutes[1],
    z3: w.zoneMinutes[2],
    z4: w.zoneMinutes[3],
    z5: w.zoneMinutes[4],
    low: w.lowShare !== null ? Math.round(w.lowShare * 100) : null,
  }))

  return (
    <Section
      id="intensity"
      title={t('analysis.intensity.title')}
      description={t('analysis.intensity.description')}
      verdict={verdict}
      empty={!hasHeartRate || intensity.length === 0}
      emptyMessage={t('analysis.empty.noHeartRate')}
      emptyAction={{ href: '/profile', label: t('analysis.empty.setMaxHr') }}
    >
      <ChartBlock
        title={
          <>
            {t('analysis.intensity.chart')} (<Term id="hrZones">Z1–Z5</Term>)
          </>
        }
        help="intensity"
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="week"
                tickFormatter={(d: string) => shortDate(d, locale)}
                fontSize={11}
                minTickGap={24}
              />
              <YAxis yAxisId="min" fontSize={11} width={36} />
              <YAxis
                yAxisId="pct"
                orientation="right"
                domain={[0, 100]}
                fontSize={11}
                unit=" %"
                width={44}
              />
              <ReferenceLine
                yAxisId="pct"
                y={80}
                stroke="#0f172a"
                strokeDasharray="4 2"
                label={{ value: '80 %', fontSize: 10, position: 'insideTopRight' }}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    labelFormat={(w) => t('analysis.weekOf', { date: shortDate(w, locale) })}
                    valueFormat={(v, entry) =>
                      entry.dataKey === 'low' ? `${v} %` : v > 0 ? formatMinutes(v) : null
                    }
                  />
                }
              />
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
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>
    </Section>
  )
}
