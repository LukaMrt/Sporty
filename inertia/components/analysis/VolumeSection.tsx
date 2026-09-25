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

/**
 * B2 · Volume par semaine et par mois, comparé à l'an passé. Durée et nombre de
 * séances s'empilent entre sports ; la distance, elle, s'affiche pour un seul
 * sport à la fois (1 km de nage ne vaut pas 1 km de course).
 */
export default function VolumeSection({ volume }: { volume: AnalysisData['volume'] }) {
  const { t } = useTranslation()
  const [granularity, setGranularity] = useState<'weekly' | 'monthly'>('weekly')
  const [metric, setMetric] = useState<Metric>('durationMinutes')

  const buckets = volume[granularity]
  const allSports = useMemo(
    () => [...new Set(buckets.flatMap((b) => Object.keys(b.bySport)))],
    [buckets]
  )
  const [distanceSport, setDistanceSport] = useState<string | null>(null)
  const selectedDistanceSport =
    distanceSport && allSports.includes(distanceSport)
      ? distanceSport
      : allSports.includes('running')
        ? 'running'
        : (allSports[0] ?? null)
  const sports = useMemo(
    () =>
      metric === 'distanceKm' ? (selectedDistanceSport ? [selectedDistanceSport] : []) : allSports,
    [metric, selectedDistanceSport, allSports]
  )
  // Natation affichée en mètres
  const scale = metric === 'distanceKm' && selectedDistanceSport === 'swimming' ? 1000 : 1
  const data = useMemo(() => {
    const lastYear = new Map(
      volume.previousYearMonthly.map((b) => [
        b.period,
        sports.reduce((a, sport) => a + (b.bySport[sport]?.[metric] ?? 0) * scale, 0),
      ])
    )
    return buckets.map((b) => {
      const row: Record<string, string | number> = { period: b.period }
      for (const sport of sports) {
        row[sport] = Math.round((b.bySport[sport]?.[metric] ?? 0) * scale * 10) / 10
      }
      if (granularity === 'monthly') {
        const [y, m] = b.period.split('-')
        row.lastYear = lastYear.get(`${Number(y) - 1}-${m}`) ?? 0
      }
      return row
    })
  }, [buckets, sports, metric, scale, granularity, volume.previousYearMonthly])

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
        {metric === 'distanceKm' && allSports.length > 1 && (
          <>
            <span className="mx-1 border-l" aria-hidden="true" />
            {allSports.map((sport) => (
              <button
                key={sport}
                type="button"
                className={toggle(selectedDistanceSport === sport)}
                onClick={() => setDistanceSport(sport)}
              >
                {t(`analysis.sports.${sport}`)}
              </button>
            ))}
          </>
        )}
      </div>
      {metric === 'distanceKm' && (
        <p className="mb-2 text-xs text-muted-foreground">
          {t(scale === 1000 ? 'analysis.volume.unitMeters' : 'analysis.volume.unitKm')}
        </p>
      )}
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
