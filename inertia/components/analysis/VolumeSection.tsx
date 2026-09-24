import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from '~/hooks/use_translation'
import { Section, SPORT_COLORS, type AnalysisData } from './shared'

type Metric = 'distanceKm' | 'durationMinutes' | 'sessions'

/** B2 · Volume par semaine et par mois, empilé par sport, comparé à l'an passé */
export default function VolumeSection({ volume }: { volume: AnalysisData['volume'] }) {
  const { t } = useTranslation()
  const [granularity, setGranularity] = useState<'weekly' | 'monthly'>('weekly')
  const [metric, setMetric] = useState<Metric>('distanceKm')

  const buckets = volume[granularity]
  const sports = useMemo(
    () => [...new Set(buckets.flatMap((b) => Object.keys(b.bySport)))],
    [buckets]
  )
  const data = useMemo(() => {
    const lastYear = new Map(
      volume.previousYearMonthly.map((b) => [
        b.period,
        Object.values(b.bySport).reduce((a, s) => a + s[metric], 0),
      ])
    )
    return buckets.map((b) => {
      const row: Record<string, string | number> = { period: b.period }
      for (const sport of sports) row[sport] = b.bySport[sport]?.[metric] ?? 0
      if (granularity === 'monthly') {
        const [y, m] = b.period.split('-')
        row.lastYear = lastYear.get(`${Number(y) - 1}-${m}`) ?? 0
      }
      return row
    })
  }, [buckets, sports, metric, granularity, volume.previousYearMonthly])

  const toggle = (active: boolean) =>
    `rounded-md px-2 py-1 text-xs ${active ? 'bg-primary text-primary-foreground' : 'bg-muted'}`

  return (
    <Section
      id="volume"
      title={t('analysis.volume.title')}
      empty={buckets.length === 0}
      emptyMessage={t('analysis.empty.noSessions')}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={toggle(granularity === 'weekly')}
          onClick={() => setGranularity('weekly')}
        >
          {t('analysis.volume.weekly')}
        </button>
        <button
          type="button"
          className={toggle(granularity === 'monthly')}
          onClick={() => setGranularity('monthly')}
        >
          {t('analysis.volume.monthly')}
        </button>
        <span className="mx-1 border-l" aria-hidden="true" />
        {(['distanceKm', 'durationMinutes', 'sessions'] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={toggle(metric === m)}
            onClick={() => setMetric(m)}
          >
            {t(`analysis.volume.metrics.${m}`)}
          </button>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" fontSize={11} minTickGap={24} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            {sports.map((sport) => (
              <Bar
                key={sport}
                dataKey={sport}
                stackId="volume"
                name={t(`analysis.sports.${sport}`)}
                fill={SPORT_COLORS[sport] ?? SPORT_COLORS.other}
              />
            ))}
            {granularity === 'monthly' && (
              <Bar dataKey="lastYear" name={t('analysis.volume.lastYear')} fill="#e2e8f0" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Section>
  )
}
