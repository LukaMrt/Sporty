import SparklineChart from '~/components/shared/SparklineChart'
import { useUnitConversion } from '~/hooks/use_unit_conversion'
import { useTranslation } from '~/hooks/use_translation'
import { paceToKmh } from '~/lib/format'

interface HeroMetricProps {
  pace: number
  trendSeconds: number | null
  previousPace: number | null
  sparklineData: { date: string; pace: number }[]
}

function formatHeroTrend(
  trendSeconds: number,
  pace: number,
  previousPace: number,
  speedUnit: string,
  trendPrevLabel: string
): string {
  if (speedUnit === 'km_h') {
    const delta = paceToKmh(pace) - paceToKmh(previousPace)
    const sign = delta >= 0 ? '+' : '-'
    return `${sign}${Math.abs(delta).toFixed(1)}km/h vs ${trendPrevLabel}`
  }
  const sign = trendSeconds < 0 ? '-' : '+'
  return `${sign}${Math.abs(trendSeconds)}s/km vs ${trendPrevLabel}`
}

export default function HeroMetric({
  pace,
  trendSeconds,
  previousPace,
  sparklineData,
}: HeroMetricProps) {
  const { formatSpeed, speedUnit } = useUnitConversion()
  const { t } = useTranslation()
  const isImprovement = trendSeconds !== null && trendSeconds < 0
  const chartData = sparklineData.map((d) => ({ date: d.date, value: d.pace }))

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{t('dashboard.hero.avgPaceLabel')}</p>
        <p className="text-4xl font-bold tabular-nums">{formatSpeed(pace)}</p>
        {trendSeconds !== null && previousPace !== null && (
          <span
            className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
              isImprovement
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {formatHeroTrend(
              trendSeconds,
              pace,
              previousPace,
              speedUnit,
              t('dashboard.hero.trendPrev')
            )}
          </span>
        )}
      </div>
      {chartData.length > 0 && (
        <div className="shrink-0 text-muted-foreground">
          <div className="flex items-stretch gap-1">
            <SparklineChart data={chartData} width={150} height={60} />
            <div className="flex flex-col justify-between text-xs text-muted-foreground">
              <span>{formatSpeed(Math.max(...chartData.map((d) => d.value)))}</span>
              <span>{formatSpeed(Math.min(...chartData.map((d) => d.value)))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function HeroMetricEmpty() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-6">
      <p className="text-sm text-muted-foreground">{t('dashboard.hero.avgPaceLabel')}</p>
      <p className="text-4xl font-bold text-muted-foreground">—</p>
      <p className="text-sm text-muted-foreground">{t('dashboard.hero.noData')}</p>
    </div>
  )
}
