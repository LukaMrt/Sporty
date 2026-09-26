import { router } from '@inertiajs/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
  SERIES_COLORS,
  Section,
  formatNumber,
  formatPace,
  monthLabel,
  shortDate,
  useMetricLabel,
  type AnalysisData,
  type Insight,
} from './shared'

/** D1 efficacité aérobie · D2 découplage · D3 FC à allure de référence */
export default function EfficiencySection({
  efficiency,
  verdict,
  onPaceChange,
}: {
  efficiency: AnalysisData['efficiency']
  verdict?: Insight
  /** Recharge la page avec une autre allure de référence (s/km) */
  onPaceChange: (pace: number) => void
}) {
  const { t, locale } = useTranslation()
  const label = useMetricLabel()
  const trend = efficiency.trend
  const dateLabel = (d: string) => shortDate(d, locale)

  return (
    <Section
      id="efficiency"
      title={t('analysis.efficiency.title')}
      description={t('analysis.efficiency.description')}
      verdict={verdict}
      empty={trend.length === 0 && efficiency.decoupling.length === 0}
      emptyMessage={t('analysis.empty.noHeartRate')}
      emptyAction={{ href: '/profile', label: t('analysis.empty.setMaxHr') }}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartBlock title={<Term id="ef">{t('analysis.efficiency.ef')}</Term>} help="ef">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tickFormatter={dateLabel} fontSize={11} minTickGap={24} />
                <YAxis domain={['auto', 'auto']} fontSize={11} width={44} />
                <Tooltip
                  content={
                    <ChartTooltip
                      labelFormat={(w) => t('analysis.weekOf', { date: dateLabel(w) })}
                      valueFormat={(v) => formatNumber(v, locale, 3)}
                    />
                  }
                />
                <Line
                  dataKey="ef"
                  name={label('ef')}
                  stroke={SERIES_COLORS.primary}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartBlock>
        <ChartBlock
          title={
            <Term id="decoupling" align="left">
              {t('analysis.efficiency.decoupling')}
            </Term>
          }
          help="decoupling"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={efficiency.decoupling.map((d) => ({
                  date: d.date,
                  good: d.decoupling < 5 ? d.decoupling : null,
                  high: d.decoupling >= 5 ? d.decoupling : null,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dateLabel} fontSize={11} minTickGap={24} />
                <YAxis fontSize={11} unit=" %" width={44} />
                <Tooltip
                  content={
                    <ChartTooltip
                      labelFormat={dateLabel}
                      valueFormat={(v) => `${formatNumber(v, locale)} %`}
                    />
                  }
                />
                <ReferenceLine
                  y={5}
                  stroke="#f59e0b"
                  strokeDasharray="4 2"
                  label={{ value: '5 %', fontSize: 10, position: 'insideTopRight' }}
                />
                {/* Deux séries plutôt qu'une couleur par barre : vert sous 5 %, jaune au-delà */}
                <Bar
                  dataKey="good"
                  stackId="d"
                  name={t('analysis.efficiency.decouplingGood')}
                  fill="#34d399"
                />
                <Bar
                  dataKey="high"
                  stackId="d"
                  name={t('analysis.efficiency.decouplingHigh')}
                  fill="#fbbf24"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartBlock>
      </div>

      {efficiency.referencePace !== null && (
        <ChartBlock
          className="mt-8"
          title={t('analysis.efficiency.hrAtPace', { pace: formatPace(efficiency.referencePace) })}
          help="hrAtPace"
        >
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t('analysis.efficiency.changePace')}</span>
            <button
              type="button"
              className="rounded bg-muted px-2 py-0.5"
              onClick={() => onPaceChange(efficiency.referencePace! - 10)}
              aria-label={t('analysis.efficiency.faster')}
            >
              −10 s
            </button>
            <button
              type="button"
              className="rounded bg-muted px-2 py-0.5"
              onClick={() => onPaceChange(efficiency.referencePace! + 10)}
              aria-label={t('analysis.efficiency.slower')}
            >
              +10 s
            </button>
          </div>
          {efficiency.heartRateAtPace.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('analysis.efficiency.noRunsAtPace')}</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={efficiency.heartRateAtPace}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m: string) => monthLabel(m, locale)}
                    fontSize={11}
                  />
                  <YAxis domain={['auto', 'auto']} fontSize={11} unit=" bpm" width={60} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormat={(m) => monthLabel(m, locale)}
                        valueFormat={(v) => `${formatNumber(v, locale, 0)} bpm`}
                      />
                    }
                  />
                  <Line
                    dataKey="heartRate"
                    name={t('analysis.efficiency.heartRate')}
                    stroke="#db2777"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartBlock>
      )}
    </Section>
  )
}

/** Recharge seulement les données d'analyse avec une nouvelle allure de référence */
export function reloadWithPace(params: Record<string, string | undefined>, pace: number) {
  router.get(
    '/analysis',
    { ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)), pace },
    { preserveScroll: true, preserveState: true, only: ['analysis'] }
  )
}
