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
import ChartTooltip from './ChartTooltip'
import {
  ChartBlock,
  SPORT_COLORS,
  Section,
  Stat,
  formatMinutes,
  formatNumber,
  monthLabel,
  shortDate,
  toggleClass,
  type AnalysisData,
  type Insight,
} from './shared'

type Metric = 'distanceKm' | 'durationMinutes' | 'sessions'

/** Onglet « Volume et régularité » */
export default function VolumeTab({
  analysis,
  verdict,
}: {
  analysis: AnalysisData
  verdict?: Insight
}) {
  return (
    <div className="space-y-4">
      <VolumeSection
        volume={analysis.volume}
        showLastYear={analysis.filters.compare === 'year'}
        verdict={verdict}
      />
      <RegularitySection regularity={analysis.regularity} />
    </div>
  )
}

/**
 * B2 · Volume par semaine et par mois. Durée et nombre de séances s'empilent
 * entre sports ; la distance, elle, s'affiche pour un seul sport à la fois
 * (1 km de nage ne vaut pas 1 km de course).
 */
function VolumeSection({
  volume,
  showLastYear,
  verdict,
}: {
  volume: AnalysisData['volume']
  showLastYear: boolean
  verdict?: Insight
}) {
  const { t, locale } = useTranslation()
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
  const withLastYear = showLastYear && granularity === 'monthly'
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
      if (withLastYear) {
        const [y, m] = b.period.split('-')
        row.lastYear = lastYear.get(`${Number(y) - 1}-${m}`) ?? 0
      }
      return row
    })
  }, [buckets, sports, metric, scale, withLastYear, volume.previousYearMonthly])

  const periodLabel = (p: string) =>
    granularity === 'weekly' ? shortDate(p, locale) : monthLabel(p, locale)
  const valueFormat = (v: number) =>
    metric === 'durationMinutes'
      ? formatMinutes(v)
      : metric === 'sessions'
        ? formatNumber(v, locale, 0)
        : `${formatNumber(v, locale)} ${scale === 1000 ? 'm' : 'km'}`

  return (
    <Section
      id="volume"
      title={t('analysis.volume.title')}
      verdict={verdict}
      empty={buckets.length === 0}
      emptyMessage={t('analysis.empty.noSessions')}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={toggleClass(granularity === 'weekly')}
          onClick={() => setGranularity('weekly')}
        >
          {t('analysis.volume.weekly')}
        </button>
        <button
          type="button"
          className={toggleClass(granularity === 'monthly')}
          onClick={() => setGranularity('monthly')}
        >
          {t('analysis.volume.monthly')}
        </button>
        <span className="mx-1 border-l" aria-hidden="true" />
        {(['durationMinutes', 'distanceKm', 'sessions'] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={toggleClass(metric === m)}
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
                className={toggleClass(selectedDistanceSport === sport)}
                onClick={() => setDistanceSport(sport)}
              >
                {t(`analysis.sports.${sport}`)}
              </button>
            ))}
          </>
        )}
      </div>
      <ChartBlock
        title={t(`analysis.volume.chartTitle.${metric}`, { unit: scale === 1000 ? 'm' : 'km' })}
        help="volume"
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tickFormatter={periodLabel} fontSize={11} minTickGap={24} />
              <YAxis fontSize={11} width={40} />
              <Tooltip
                content={
                  <ChartTooltip
                    labelFormat={(p) =>
                      granularity === 'weekly'
                        ? t('analysis.weekOf', { date: shortDate(p, locale) })
                        : monthLabel(p, locale)
                    }
                    valueFormat={valueFormat}
                  />
                }
              />
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
              {withLastYear && (
                <Bar dataKey="lastYear" name={t('analysis.volume.lastYear')} fill="#e2e8f0" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>
      {showLastYear && granularity === 'weekly' && (
        <p className="mt-2 text-xs text-muted-foreground">{t('analysis.volume.lastYearHint')}</p>
      )}
    </Section>
  )
}

/** Régularité : semaines actives, séries et jours préférés */
function RegularitySection({ regularity }: { regularity: AnalysisData['regularity'] }) {
  const { t, locale } = useTranslation()
  const weekdays = regularity.byWeekday.map((count, i) => ({
    // 2024-01-01 est un lundi
    day: new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(locale, {
      weekday: 'short',
      timeZone: 'UTC',
    }),
    count,
  }))
  const activeShare =
    regularity.weeks > 0 ? Math.round((regularity.activeWeeks / regularity.weeks) * 100) : 0

  return (
    <Section
      id="regularity"
      title={t('analysis.regularity.title')}
      description={t('analysis.regularity.description')}
      empty={regularity.weeks === 0}
      emptyMessage={t('analysis.empty.noSessions')}
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label={t('analysis.regularity.activeWeeks')}
          value={`${regularity.activeWeeks}/${regularity.weeks}`}
          hint={`${activeShare} %`}
          tone={activeShare >= 80 ? 'good' : activeShare < 60 ? 'caution' : undefined}
        />
        <Stat
          label={t('analysis.regularity.currentStreak')}
          value={t('analysis.regularity.weeks', { count: regularity.currentStreak })}
        />
        <Stat
          label={t('analysis.regularity.longestStreak')}
          value={t('analysis.regularity.weeks', { count: regularity.longestStreak })}
        />
        <Stat
          label={t('analysis.regularity.perWeek')}
          value={formatNumber(regularity.sessionsPerWeek, locale)}
        />
      </div>
      <ChartBlock title={t('analysis.regularity.byWeekday')} help="regularity">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdays}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} width={30} />
              <Tooltip content={<ChartTooltip valueFormat={(v) => formatNumber(v, locale, 0)} />} />
              <Bar dataKey="count" name={t('analysis.regularity.sessions')} fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>
    </Section>
  )
}
