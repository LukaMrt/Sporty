import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from '~/hooks/use_translation'
import Term from '~/components/shared/Term'
import ChartTooltip from './ChartTooltip'
import LoadCalendar from './LoadCalendar'
import {
  BAND_COLORS,
  ChartBlock,
  SERIES_COLORS,
  SPORT_COLORS,
  Section,
  Stat,
  formatMinutes,
  formatNumber,
  formatSigned,
  shortDate,
  useExpert,
  useMetricLabel,
  type AnalysisData,
  type Insight,
} from './shared'

type Props = {
  analysis: AnalysisData
  verdicts: Partial<Record<Insight['section'], Insight>>
}

/** Onglet « Charge et forme » */
export default function LoadTab({ analysis, verdicts }: Props) {
  return (
    <div className="space-y-4">
      <FitnessSection fitness={analysis.fitness} verdict={verdicts.load} />
      <LoadBySportSection fitness={analysis.fitness} />
      <PlanSection analysis={analysis} verdict={verdicts.goal} />
      <LoadCalendar calendar={analysis.calendar} />
    </div>
  )
}

function tsbTone(tsb: number): 'good' | 'caution' | 'risk' | undefined {
  if (tsb < -30) return 'risk'
  if (tsb <= -10) return 'good'
  return undefined
}

function acwrTone(acwr: number): 'good' | 'caution' | 'risk' | undefined {
  if (acwr > 1.5) return 'risk'
  if (acwr > 1.3 || acwr < 0.8) return 'caution'
  return 'good'
}

/** B1 · Forme (PMC) découpée en trois lectures : forme/fatigue, fraîcheur, équilibre */
function FitnessSection({
  fitness,
  verdict,
}: {
  fitness: AnalysisData['fitness']
  verdict?: Insight
}) {
  const { t, locale } = useTranslation()
  const label = useMetricLabel()
  const expert = useExpert()
  const current = fitness.current
  const lastMonotony = fitness.monotony.at(-1)
  const methodTotal =
    fitness.methods.trimp_exp + fitness.methods.rtss + fitness.methods.stss + fitness.methods.rpe
  const estimated = methodTotal > 0 && fitness.methods.rpe / methodTotal > 0.5
  const dateLabel = (d: string) => shortDate(d, locale)
  const num = (v: number) => formatNumber(v, locale)

  // Domaine de la fraîcheur : toujours de quoi voir les bandes de lecture
  const tsbValues = fitness.series.map((d) => d.tsb)
  const tsbMin = Math.min(-35, ...tsbValues)
  const tsbMax = Math.max(20, ...tsbValues)

  return (
    <Section
      id="fitness"
      title={t('analysis.fitness.title')}
      description={t('analysis.fitness.description')}
      verdict={verdict}
      empty={fitness.series.length === 0}
      emptyMessage={t('analysis.empty.noSessions')}
    >
      {current && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label={<Term id="ctl">{label('ctl')}</Term>}
            value={Math.round(current.chronicTrainingLoad)}
            delta={
              fitness.delta28 !== null
                ? {
                    text: t('analysis.fitness.delta28', {
                      delta: formatSigned(fitness.delta28, locale),
                    }),
                    favorable: fitness.delta28 > 0 ? true : fitness.delta28 < 0 ? false : null,
                  }
                : undefined
            }
          />
          <Stat
            label={<Term id="atl">{label('atl')}</Term>}
            value={Math.round(current.acuteTrainingLoad)}
          />
          <Stat
            label={<Term id="tsb">{label('tsb')}</Term>}
            value={formatSigned(Math.round(current.trainingStressBalance), locale, 0)}
            tone={tsbTone(current.trainingStressBalance)}
            hint={t(
              `analysis.fitness.tsbZone.${
                current.trainingStressBalance < -30
                  ? 'risk'
                  : current.trainingStressBalance <= -10
                    ? 'productive'
                    : current.trainingStressBalance > 5
                      ? 'fresh'
                      : 'balanced'
              }`
            )}
          />
          <Stat
            label={
              <Term id="acwr" align="left">
                {label('acwr')}
              </Term>
            }
            value={formatNumber(current.acuteChronicWorkloadRatio, locale, 2)}
            tone={acwrTone(current.acuteChronicWorkloadRatio)}
            hint={t(
              `analysis.fitness.acwrZone.${
                current.acuteChronicWorkloadRatio > 1.5
                  ? 'risk'
                  : current.acuteChronicWorkloadRatio > 1.3
                    ? 'high'
                    : current.acuteChronicWorkloadRatio < 0.8
                      ? 'low'
                      : 'optimal'
              }`
            )}
          />
          {expert && fitness.ramp7 !== null && (
            <Stat
              label={label('ramp')}
              value={formatSigned(fitness.ramp7, locale)}
              tone={fitness.ramp7 > 8 ? 'caution' : undefined}
              hint={t('analysis.fitness.rampHint')}
            />
          )}
          {expert && lastMonotony?.monotony !== null && lastMonotony?.monotony !== undefined && (
            <Stat
              label={<Term id="monotony">{label('monotony')}</Term>}
              value={formatNumber(lastMonotony.monotony, locale, 2)}
              tone={lastMonotony.monotony > 2 ? 'caution' : undefined}
              hint={
                lastMonotony.strain !== null
                  ? `${label('strain')} ${formatNumber(lastMonotony.strain, locale, 0)}`
                  : undefined
              }
            />
          )}
        </div>
      )}

      <div className="space-y-6">
        <ChartBlock title={t('analysis.fitness.chartFitness')} help="fitness">
          <div className="h-64" role="img" aria-label={t('analysis.fitness.chartLabel')}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={fitness.series} syncId="load">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={32} fontSize={11} />
                <YAxis yAxisId="load" fontSize={11} width={36} />
                <YAxis
                  yAxisId="tss"
                  orientation="right"
                  fontSize={11}
                  width={36}
                  stroke="#94a3b8"
                  label={{ value: 'TSS', angle: 90, position: 'insideRight', fontSize: 10 }}
                />
                <Tooltip
                  content={<ChartTooltip labelFormat={dateLabel} valueFormat={(v) => num(v)} />}
                />
                <Legend />
                <Bar
                  yAxisId="tss"
                  dataKey="tss"
                  name={t('analysis.fitness.dailyLoad')}
                  fill={SERIES_COLORS.tss}
                />
                <Line
                  yAxisId="load"
                  dataKey="ctl"
                  name={label('ctl')}
                  stroke={SERIES_COLORS.ctl}
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="load"
                  dataKey="atl"
                  name={label('atl')}
                  stroke={SERIES_COLORS.atl}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartBlock>

        <ChartBlock title={t('analysis.fitness.chartTsb')} help="tsb">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fitness.series} syncId="load">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={32} fontSize={11} />
                <YAxis domain={[Math.floor(tsbMin), Math.ceil(tsbMax)]} fontSize={11} width={36} />
                <ReferenceArea y1={tsbMin} y2={-30} fill={BAND_COLORS.risk} fillOpacity={0.8} />
                <ReferenceArea y1={-30} y2={-10} fill={BAND_COLORS.good} fillOpacity={0.8} />
                <ReferenceArea y1={5} y2={tsbMax} fill={BAND_COLORS.neutral} fillOpacity={0.8} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Tooltip
                  content={
                    <ChartTooltip
                      labelFormat={dateLabel}
                      valueFormat={(v) => formatSigned(v, locale)}
                    />
                  }
                />
                <Line
                  dataKey="tsb"
                  name={label('tsb')}
                  stroke={SERIES_COLORS.tsb}
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <BandLegend
            items={[
              { color: BAND_COLORS.neutral, label: t('analysis.fitness.tsbZone.fresh') },
              { color: BAND_COLORS.good, label: t('analysis.fitness.tsbZone.productive') },
              { color: BAND_COLORS.risk, label: t('analysis.fitness.tsbZone.risk') },
            ]}
          />
        </ChartBlock>

        {fitness.acwr.length > 0 && (
          <ChartBlock title={t('analysis.fitness.chartAcwr')} help="acwr">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fitness.acwr} syncId="load">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={32} fontSize={11} />
                  <YAxis
                    domain={[0, (max: number) => Math.max(2, Math.ceil(max * 10) / 10)]}
                    fontSize={11}
                    width={36}
                  />
                  <ReferenceArea y1={0.8} y2={1.3} fill={BAND_COLORS.good} fillOpacity={0.8} />
                  <ReferenceArea y1={1.5} y2={3} fill={BAND_COLORS.risk} fillOpacity={0.8} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormat={dateLabel}
                        valueFormat={(v) => formatNumber(v, locale, 2)}
                      />
                    }
                  />
                  <Line
                    dataKey="acwr"
                    name={label('acwr')}
                    stroke="#7c3aed"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <BandLegend
              items={[
                { color: BAND_COLORS.good, label: t('analysis.fitness.acwrZone.optimal') },
                { color: BAND_COLORS.risk, label: t('analysis.fitness.acwrZone.risk') },
              ]}
            />
          </ChartBlock>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        {methodTotal > 0 && (
          <span>
            {t('analysis.fitness.methods', {
              hr: fitness.methods.trimp_exp,
              pace: fitness.methods.rtss + fitness.methods.stss,
              rpe: fitness.methods.rpe,
            })}
          </span>
        )}
        {estimated && <span className="text-amber-700">{t('analysis.fitness.estimated')}</span>}
      </div>
    </Section>
  )
}

export function BandLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-4 rounded-sm border border-black/5"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/** Charge hebdomadaire par sport (charge effective, comme dans le modèle de forme) */
function LoadBySportSection({ fitness }: { fitness: AnalysisData['fitness'] }) {
  const { t, locale } = useTranslation()
  const sports = useMemo(
    () => [...new Set(fitness.loadBySport.flatMap((w) => Object.keys(w.bySport)))],
    [fitness.loadBySport]
  )
  const data = fitness.loadBySport.map((w) => ({ week: w.week, ...w.bySport }))
  if (sports.length < 2) return null

  return (
    <Section
      id="load-by-sport"
      title={t('analysis.loadBySport.title')}
      description={t('analysis.loadBySport.description')}
    >
      <ChartBlock title={t('analysis.loadBySport.chart')} help="loadBySport">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="week"
                tickFormatter={(d: string) => shortDate(d, locale)}
                minTickGap={24}
                fontSize={11}
              />
              <YAxis fontSize={11} width={36} />
              <Tooltip
                content={
                  <ChartTooltip
                    labelFormat={(w) => t('analysis.weekOf', { date: shortDate(w, locale) })}
                    valueFormat={(v) => `${formatNumber(v, locale, 0)} TSS`}
                  />
                }
              />
              <Legend />
              {sports.map((sport) => (
                <Bar
                  key={sport}
                  dataKey={sport}
                  stackId="load"
                  name={t(`analysis.sports.${sport}`)}
                  fill={SPORT_COLORS[sport] ?? SPORT_COLORS.other}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>
    </Section>
  )
}

/** Objectif et plan : forme projetée jusqu'au jour J, réalisé vs prévu */
function PlanSection({ analysis, verdict }: { analysis: AnalysisData; verdict?: Insight }) {
  const { t, locale } = useTranslation()
  const label = useMetricLabel()
  const { projection, adherence, series } = analysis.fitness
  if (projection.length === 0 && adherence.length === 0) return null

  const dateLabel = (d: string) => shortDate(d, locale)
  // 6 dernières semaines réelles puis la projection, sur le même axe
  const recent = series.slice(-42).map((d) => ({ date: d.date, ctl: d.ctl, tsb: d.tsb }))
  const lastReal = recent.at(-1)
  const joined: Record<string, string | number>[] = [
    // Raccord visuel : la projection (pointillés) part du dernier point réel
    ...recent.map((d) =>
      d === lastReal ? { ...d, projectedCtl: d.ctl, projectedTsb: d.tsb } : { ...d }
    ),
    ...projection.map((d) => ({ date: d.date, projectedCtl: d.ctl, projectedTsb: d.tsb })),
  ]
  const eventDate = analysis.goal?.eventDate

  const adherenceData = adherence.map((w) => ({
    week: w.week,
    planned: w.plannedMinutes,
    done: w.doneMinutes,
  }))
  const totalPlanned = adherence.reduce((a, w) => a + w.plannedMinutes, 0)
  const totalDone = adherence.reduce((a, w) => a + Math.min(w.doneMinutes, w.plannedMinutes), 0)

  return (
    <Section
      id="plan"
      title={t('analysis.plan.title')}
      description={t('analysis.plan.description')}
      verdict={verdict}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {projection.length > 0 && (
          <ChartBlock title={t('analysis.plan.projection')} help="projection">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={joined}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={32} fontSize={11} />
                  <YAxis fontSize={11} width={36} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormat={dateLabel}
                        valueFormat={(v) => formatNumber(v, locale)}
                      />
                    }
                  />
                  <Legend />
                  {eventDate && (
                    <ReferenceLine
                      x={eventDate}
                      stroke="#0f172a"
                      strokeDasharray="4 2"
                      label={{
                        value: t('analysis.plan.raceDay'),
                        fontSize: 10,
                        position: 'insideTopLeft',
                      }}
                    />
                  )}
                  <Line
                    dataKey="ctl"
                    name={label('ctl')}
                    stroke={SERIES_COLORS.ctl}
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line dataKey="tsb" name={label('tsb')} stroke={SERIES_COLORS.tsb} dot={false} />
                  <Line
                    dataKey="projectedCtl"
                    name={t('analysis.plan.projectedCtl', { label: label('ctl') })}
                    stroke={SERIES_COLORS.ctl}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                  <Line
                    dataKey="projectedTsb"
                    name={t('analysis.plan.projectedTsb', { label: label('tsb') })}
                    stroke={SERIES_COLORS.tsb}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}
        {adherence.length > 0 && (
          <ChartBlock title={t('analysis.plan.adherence')} help="adherence">
            <p className="mb-2 text-xs text-muted-foreground">
              {t('analysis.plan.adherenceSummary', {
                percent: totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0,
              })}
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adherenceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" tickFormatter={dateLabel} minTickGap={24} fontSize={11} />
                  <YAxis fontSize={11} width={36} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormat={(w) => t('analysis.weekOf', { date: shortDate(w, locale) })}
                        valueFormat={(v) => formatMinutes(v)}
                      />
                    }
                  />
                  <Legend />
                  <Bar dataKey="planned" name={t('analysis.plan.planned')} fill="#cbd5e1" />
                  <Bar dataKey="done" name={t('analysis.plan.done')} fill={SERIES_COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        )}
      </div>
    </Section>
  )
}
