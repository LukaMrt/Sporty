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
import { Section, Stat, SERIES_COLORS, shortDate, type AnalysisData } from './shared'

/** B1 · Graphique de forme (Performance Management Chart) + B4 monotonie */
export default function FitnessSection({ fitness }: { fitness: AnalysisData['fitness'] }) {
  const { t, locale } = useTranslation()
  const current = fitness.current
  const lastMonotony = fitness.monotony.at(-1)
  const estimated =
    fitness.methods.rpe >
    fitness.methods.trimp_exp + fitness.methods.rtss + (fitness.methods.stss ?? 0)

  return (
    <Section
      id="fitness"
      title={t('analysis.fitness.title')}
      description={t('analysis.fitness.description')}
      empty={fitness.series.length === 0}
      emptyMessage={t('analysis.empty.noSessions')}
    >
      {current && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label={t('analysis.fitness.ctl')} value={Math.round(current.chronicTrainingLoad)} />
          <Stat label={t('analysis.fitness.atl')} value={Math.round(current.acuteTrainingLoad)} />
          <Stat
            label={t('analysis.fitness.tsb')}
            value={Math.round(current.trainingStressBalance)}
            hint={
              current.trainingStressBalance > 5
                ? t('analysis.fitness.fresh')
                : current.trainingStressBalance < -20
                  ? t('analysis.fitness.tired')
                  : t('analysis.fitness.balanced')
            }
          />
          <Stat
            label="ACWR"
            value={current.acuteChronicWorkloadRatio.toFixed(2)}
            hint={
              current.acuteChronicWorkloadRatio > 1.5 ? t('analysis.fitness.acwrRisk') : undefined
            }
          />
        </div>
      )}
      <div className="h-72" role="img" aria-label={t('analysis.fitness.chartLabel')}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={fitness.series}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => shortDate(d, locale)}
              minTickGap={32}
              fontSize={11}
            />
            <YAxis yAxisId="load" fontSize={11} />
            <YAxis yAxisId="tss" orientation="right" fontSize={11} hide />
            <Tooltip labelFormatter={(d) => shortDate(typeof d === 'string' ? d : '', locale)} />
            <Legend />
            <Bar yAxisId="tss" dataKey="tss" name="TSS" fill={SERIES_COLORS.tss} />
            <Line
              yAxisId="load"
              dataKey="ctl"
              name="CTL"
              stroke={SERIES_COLORS.ctl}
              dot={false}
              strokeWidth={2}
            />
            <Line yAxisId="load" dataKey="atl" name="ATL" stroke={SERIES_COLORS.atl} dot={false} />
            <Line
              yAxisId="load"
              dataKey="tsb"
              name="TSB"
              stroke={SERIES_COLORS.tsb}
              dot={false}
              strokeDasharray="4 2"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>
          {t('analysis.fitness.methods', {
            hr: fitness.methods.trimp_exp,
            pace: fitness.methods.rtss,
            rpe: fitness.methods.rpe,
          })}
        </span>
        {estimated && <span className="text-amber-600">{t('analysis.fitness.estimated')}</span>}
        {lastMonotony?.monotony !== null && lastMonotony?.monotony !== undefined && (
          <span className={lastMonotony.monotony > 2 ? 'text-amber-600' : undefined}>
            {t('analysis.fitness.monotony', {
              monotony: lastMonotony.monotony,
              strain: lastMonotony.strain ?? 0,
            })}
          </span>
        )}
      </div>
    </Section>
  )
}
