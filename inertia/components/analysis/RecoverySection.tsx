import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from '~/hooks/use_translation'
import Term from '~/components/shared/Term'
import ChartTooltip from './ChartTooltip'
import InsightItem from './InsightItem'
import {
  ChartBlock,
  Section,
  formatMinutes,
  formatNumber,
  shortDate,
  type AnalysisData,
  type Insight,
} from './shared'

/** Minutes par rapport à minuit → « 23:30 » (négatif = la veille) */
function clockTime(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Infobulle des horaires de sommeil : la barre porte [coucher, lever] */
function SleepScheduleTooltip({
  active,
  payload,
  label,
  labelFormat,
}: {
  active?: boolean
  payload?: readonly { payload?: { night?: [number, number] } }[]
  label?: string | number
  labelFormat: (d: string) => string
}) {
  const night = payload?.[0]?.payload?.night
  if (!active || !night) return null
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{labelFormat(String(label))}</div>
      <span className="tabular-nums">
        {clockTime(night[0])} → {clockTime(night[1])} ({formatMinutes(night[1] - night[0])})
      </span>
    </div>
  )
}

const READINESS_STYLES = {
  good: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  moderate: 'border-amber-300 bg-amber-50 text-amber-900',
  low: 'border-rose-300 bg-rose-50 text-rose-900',
  unknown: 'border-muted bg-muted/40',
} as const

/** E1 HRV / FC repos · E2 sommeil · E3 forme du jour · E4 corrélations · E5 signaux · G1 poids · B5 activité */
export default function RecoverySection({
  recovery,
  correlations,
  hasWellness,
  insights,
}: {
  recovery: AnalysisData['recovery']
  correlations: AnalysisData['correlations']
  hasWellness: boolean
  /** Constats de récupération (alertes comprises) */
  insights: Insight[]
}) {
  const { t, locale } = useTranslation()
  const dateLabel = (d: string) => shortDate(d, locale)
  const num = (v: number) => formatNumber(v, locale)
  const trend = recovery.trend.map((p) => ({
    ...p,
    band: p.hrvBand ? [Math.round(p.hrvBand.low), Math.round(p.hrvBand.high)] : null,
  }))
  const sleep = recovery.sleep.map((d) => ({
    date: d.date,
    deep: d.sleepDeepMinutes,
    rem: d.sleepRemMinutes,
    light: d.sleepLightMinutes,
    awake: d.sleepAwakeMinutes,
    total: d.sleepDeepMinutes === null ? d.sleepMinutes : null,
  }))
  const hasHrv = trend.some((p) => p.hrv !== null)
  const hasRestingHr = trend.some((p) => p.restingHr !== null)

  return (
    <Section
      id="recovery"
      title={t('analysis.recovery.title')}
      description={t('analysis.recovery.description')}
      empty={!hasWellness}
      emptyMessage={t('analysis.empty.noWellness')}
      emptyAction={{ href: '/connectors', label: t('analysis.empty.connect') }}
    >
      <div
        className={`mb-4 rounded-lg border p-3 text-sm ${READINESS_STYLES[recovery.readiness.level]}`}
      >
        <div className="font-medium">
          <Term id="readiness">{t('analysis.recovery.readiness')}</Term> :{' '}
          {t(`analysis.recovery.levels.${recovery.readiness.level}`)}
        </div>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {recovery.readiness.components.map((c) => (
            <li key={c.key}>
              {t(`analysis.recovery.components.${c.key}`)} : {c.value !== null ? num(c.value) : '—'}
              {c.reference !== null &&
                ` (${t('analysis.recovery.usual')} ${num(c.reference)})`}{' '}
              <span aria-hidden="true">{c.score >= 0.2 ? '▲' : c.score <= -0.3 ? '▼' : '●'}</span>
            </li>
          ))}
        </ul>
      </div>

      {recovery.latestScores.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium">{t('analysis.recovery.watchScores')}</h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {recovery.latestScores.map((score) => (
              <li key={score.field} className="rounded-lg border p-2">
                <div className="text-xs text-muted-foreground">
                  {score.field === 'bodyBattery' ? (
                    <Term id="bodyBattery">{t(`analysis.recovery.scores.${score.field}`)}</Term>
                  ) : (
                    t(`analysis.recovery.scores.${score.field}`)
                  )}
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {formatNumber(score.value, locale, 0)}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('analysis.recovery.watchScoresHint')}
          </p>
        </div>
      )}

      {insights.length > 0 && (
        <ul className="mb-4 space-y-2" role="status">
          {insights.map((insight, i) => (
            <li key={`${insight.id}-${i}`}>
              <InsightItem insight={insight} />
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {hasHrv && (
          <ChartBlock title={<Term id="hrv">{t('analysis.recovery.hrv')}</Term>} help="hrv">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} syncId="recovery">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} fontSize={11} minTickGap={32} />
                  <YAxis fontSize={11} width={36} />
                  <Tooltip
                    content={
                      <ChartTooltip labelFormat={dateLabel} valueFormat={(v) => `${num(v)} ms`} />
                    }
                  />
                  <Legend />
                  <Area
                    dataKey="band"
                    name={t('analysis.recovery.normalBand')}
                    fill="#dbeafe"
                    stroke="none"
                  />
                  <Line
                    dataKey="hrv"
                    name={t('analysis.recovery.daily')}
                    stroke="#93c5fd"
                    dot={false}
                  />
                  <Line
                    dataKey="hrv7"
                    name={t('analysis.recovery.avg7')}
                    stroke="#2563eb"
                    dot={false}
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}
        {hasRestingHr && (
          <ChartBlock
            title={
              <Term id="restingHr" align="left">
                {t('analysis.recovery.restingHr')}
              </Term>
            }
            help="restingHr"
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} syncId="recovery">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} fontSize={11} minTickGap={32} />
                  <YAxis domain={['auto', 'auto']} fontSize={11} width={36} />
                  <Tooltip
                    content={
                      <ChartTooltip labelFormat={dateLabel} valueFormat={(v) => `${num(v)} bpm`} />
                    }
                  />
                  <Legend />
                  <Line
                    dataKey="restingHr"
                    name={t('analysis.recovery.daily')}
                    stroke="#fda4af"
                    dot={false}
                  />
                  <Line
                    dataKey="restingHr7"
                    name={t('analysis.recovery.avg7')}
                    stroke="#db2777"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}

        {recovery.loadVsHrv.length >= 7 && (
          <ChartBlock title={t('analysis.recovery.loadVsHrv')} help="loadVsHrv">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={recovery.loadVsHrv}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} fontSize={11} minTickGap={32} />
                  <YAxis yAxisId="load" fontSize={11} width={36} />
                  <YAxis
                    yAxisId="hrv"
                    orientation="right"
                    domain={['auto', 'auto']}
                    fontSize={11}
                    width={36}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormat={dateLabel}
                        valueFormat={(v, e) =>
                          e.dataKey === 'hrv' ? `${num(v)} ms` : `${num(v)} TSS`
                        }
                      />
                    }
                  />
                  <Legend />
                  <Bar
                    yAxisId="load"
                    dataKey="previousLoad"
                    name={t('analysis.recovery.previousLoad')}
                    fill="#cbd5e1"
                  />
                  <Line
                    yAxisId="hrv"
                    dataKey="hrv"
                    name={t('analysis.recovery.morningHrv')}
                    stroke="#2563eb"
                    dot={false}
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}

        {sleep.length > 0 && (
          <ChartBlock title={t('analysis.recovery.sleep')} help="sleep">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sleep}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} fontSize={11} minTickGap={32} />
                  <YAxis fontSize={11} width={40} tickFormatter={(v: number) => formatMinutes(v)} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormat={dateLabel}
                        valueFormat={(v) => (v > 0 ? formatMinutes(v) : null)}
                      />
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="deep"
                    stackId="s"
                    name={t('analysis.recovery.stages.deep')}
                    fill="#1e3a8a"
                  />
                  <Bar
                    dataKey="rem"
                    stackId="s"
                    name={t('analysis.recovery.stages.rem')}
                    fill="#7c3aed"
                  />
                  <Bar
                    dataKey="light"
                    stackId="s"
                    name={t('analysis.recovery.stages.light')}
                    fill="#93c5fd"
                  />
                  <Bar
                    dataKey="awake"
                    stackId="s"
                    name={t('analysis.recovery.stages.awake')}
                    fill="#fda4af"
                  />
                  <Bar
                    dataKey="total"
                    stackId="s"
                    name={t('analysis.recovery.stages.total')}
                    fill="#94a3b8"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}

        {recovery.weight.length > 0 && (
          <ChartBlock title={t('analysis.recovery.weight')}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recovery.weight}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} fontSize={11} minTickGap={32} />
                  <YAxis domain={['auto', 'auto']} fontSize={11} unit=" kg" width={52} />
                  <Tooltip
                    content={
                      <ChartTooltip labelFormat={dateLabel} valueFormat={(v) => `${num(v)} kg`} />
                    }
                  />
                  <Legend />
                  <Line
                    dataKey="weight"
                    name={t('analysis.recovery.weighIn')}
                    stroke="#cbd5e1"
                    dot={{ r: 2 }}
                  />
                  <Line
                    dataKey="trend"
                    name={t('analysis.recovery.weightTrend')}
                    stroke="#0f172a"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}

        {recovery.watchScores.length >= 2 && (
          <ChartBlock title={t('analysis.recovery.watchScoresTrend')} help="watchScores">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recovery.watchScores}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} fontSize={11} minTickGap={32} />
                  <YAxis domain={[0, 100]} fontSize={11} width={36} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormat={dateLabel}
                        valueFormat={(v) => formatNumber(v, locale, 0)}
                      />
                    }
                  />
                  <Legend />
                  {(
                    [
                      ['readiness', 'readinessScore', '#2563eb'],
                      ['recovery', 'recoveryScore', '#16a34a'],
                      ['bodyBattery', 'bodyBattery', '#f59e0b'],
                      ['sleep', 'sleepScore', '#7c3aed'],
                      ['stress', 'stressScore', '#e11d48'],
                    ] as const
                  )
                    .filter(([key]) => recovery.watchScores.some((d) => d[key] !== null))
                    .map(([key, field, color]) => (
                      <Line
                        key={key}
                        dataKey={key}
                        name={t(`analysis.recovery.scores.${field}`)}
                        stroke={color}
                        dot={false}
                        strokeWidth={2}
                        connectNulls
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}

        {recovery.sleepSchedule.length >= 3 && (
          <ChartBlock title={t('analysis.recovery.sleepSchedule')} help="sleepSchedule">
            {recovery.sleepRegularity.avgBedtime !== null && (
              <p className="mb-2 text-xs text-muted-foreground">
                {t('analysis.recovery.sleepScheduleSummary', {
                  bedtime: clockTime(recovery.sleepRegularity.avgBedtime),
                  sd:
                    recovery.sleepRegularity.bedtimeSd !== null
                      ? formatMinutes(recovery.sleepRegularity.bedtimeSd)
                      : '—',
                })}
              </p>
            )}
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={recovery.sleepSchedule.map((d) => ({
                    date: d.date,
                    night: [d.bedtime, d.wake],
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} fontSize={11} minTickGap={32} />
                  <YAxis
                    reversed
                    domain={['dataMin - 30', 'dataMax + 30']}
                    tickFormatter={(v: number) => clockTime(v)}
                    fontSize={11}
                    width={44}
                  />
                  <Tooltip content={<SleepScheduleTooltip labelFormat={dateLabel} />} />
                  <Bar
                    dataKey="night"
                    name={t('analysis.recovery.sleep')}
                    fill="#6366f1"
                    radius={3}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}

        {recovery.heartRateRecovery.length >= 2 && (
          <ChartBlock title={<Term id="hrr">{t('analysis.recovery.hrr')}</Term>} help="hrr">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recovery.heartRateRecovery}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} fontSize={11} minTickGap={32} />
                  <YAxis domain={['auto', 'auto']} fontSize={11} width={36} />
                  <Tooltip
                    content={
                      <ChartTooltip labelFormat={dateLabel} valueFormat={(v) => `−${num(v)} bpm`} />
                    }
                  />
                  <Line
                    dataKey="hrr"
                    name={t('analysis.recovery.hrr')}
                    stroke="#db2777"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}

        {recovery.activity.length > 0 && (
          <ChartBlock title={t('analysis.recovery.activity')}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={recovery.activity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} fontSize={11} minTickGap={32} />
                  <YAxis yAxisId="min" fontSize={11} width={36} />
                  <YAxis yAxisId="kcal" orientation="right" fontSize={11} width={44} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormat={dateLabel}
                        valueFormat={(v, e) =>
                          e.dataKey === 'activeCalories' ? `${num(v)} kcal` : `${num(v)} min`
                        }
                      />
                    }
                  />
                  <Legend />
                  <Bar
                    yAxisId="min"
                    dataKey="activeMinutes"
                    name={t('analysis.recovery.activeMinutes')}
                    fill="#65a30d"
                  />
                  {recovery.activity.some((d) => d.activeCalories !== null) && (
                    <Line
                      yAxisId="kcal"
                      dataKey="activeCalories"
                      name={t('analysis.recovery.activeCalories')}
                      stroke="#ea580c"
                      dot={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}

        {correlations.sleepVsEfficiency.length >= 5 && (
          <ChartBlock
            title={t('analysis.recovery.correlation', {
              r:
                correlations.coefficient !== null
                  ? formatNumber(correlations.coefficient, locale, 2)
                  : '—',
            })}
            help="correlation"
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="sleepMinutes"
                    name={t('analysis.recovery.sleep')}
                    fontSize={11}
                    tickFormatter={(v: number) => formatMinutes(v)}
                    type="number"
                    domain={['auto', 'auto']}
                  />
                  <YAxis
                    dataKey="ef"
                    name="EF"
                    domain={['auto', 'auto']}
                    fontSize={11}
                    width={44}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormat={(v, e) =>
                          e.dataKey === 'sleepMinutes'
                            ? formatMinutes(v)
                            : formatNumber(v, locale, 3)
                        }
                      />
                    }
                  />
                  <Scatter data={correlations.sleepVsEfficiency} fill="#0f766e" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}
      </div>
    </Section>
  )
}
