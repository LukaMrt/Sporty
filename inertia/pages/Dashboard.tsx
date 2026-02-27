import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import EmptyState from '~/components/shared/EmptyState'
import HeroMetric, { HeroMetricEmpty } from '~/components/shared/HeroMetric'
import QuickStatCard from '~/components/shared/QuickStatCard'
import EvolutionChart from '~/components/shared/EvolutionChart'
import PeriodSelector from '~/components/shared/PeriodSelector'
import type { Period } from '~/components/shared/PeriodSelector'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import type {
  ChartData,
  HeroMetricData,
  QuickStatData,
} from '../../app/domain/entities/dashboard_metrics'
import { useUnitConversion } from '~/hooks/use_unit_conversion'
import { useTranslation } from '~/hooks/use_translation'

interface DashboardProps {
  sessionCount: number
  heroMetric: HeroMetricData | null
  quickStats: QuickStatData | null
  chartData: ChartData | null
}

export default function Dashboard({
  sessionCount,
  heroMetric,
  quickStats,
  chartData,
}: DashboardProps) {
  const [period, setPeriod] = useState<Period>('all')
  const isEmpty = quickStats === null
  const { formatDistanceParts } = useUnitConversion()
  const { t } = useTranslation()

  return (
    <>
      <Head title={t('dashboard.title')} />
      {sessionCount === 0 ? (
        <EmptyState
          title={t('dashboard.empty.title')}
          description={t('dashboard.empty.description')}
          ctaLabel={t('dashboard.empty.cta')}
          onCtaClick={() => router.visit('/sessions/create')}
        />
      ) : (
        <div className="mx-auto max-w-2xl space-y-4 p-4">
          {heroMetric === null ? (
            <HeroMetricEmpty />
          ) : (
            <HeroMetric
              pace={heroMetric.currentPace}
              trendSeconds={heroMetric.trendSeconds}
              previousPace={heroMetric.previousPace}
              sparklineData={heroMetric.sparklineData}
            />
          )}
          <div className="grid grid-cols-3 gap-2">
            <QuickStatCard
              label={t('dashboard.stats.weeklyVolume')}
              value={isEmpty ? '—' : formatDistanceParts(quickStats.weeklyVolumeKm).value}
              unit={isEmpty ? 'km' : formatDistanceParts(quickStats.weeklyVolumeKm).unit}
              trend={isEmpty ? null : quickStats.weeklyVolumeTrend}
              isEmpty={isEmpty}
            />
            <QuickStatCard
              label={t('dashboard.stats.avgHeartRate')}
              value={
                isEmpty || quickStats.avgHeartRate === null
                  ? '—'
                  : Math.round(quickStats.avgHeartRate).toString()
              }
              unit="bpm"
              trend={isEmpty ? null : quickStats.avgHeartRateTrend}
              isEmpty={isEmpty || quickStats.avgHeartRate === null}
              lowerIsBetter
            />
            <QuickStatCard
              label={t('dashboard.stats.sessions')}
              value={isEmpty ? '—' : quickStats.weeklySessionCount.toString()}
              unit={t('dashboard.stats.thisWeek')}
              trend={isEmpty ? null : quickStats.weeklySessionTrend}
              isEmpty={isEmpty}
            />
          </div>
          {chartData !== null && chartData.points.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t('dashboard.chart.evolution')}</CardTitle>
                  <PeriodSelector value={period} onChange={setPeriod} />
                </div>
              </CardHeader>
              <CardContent>
                <EvolutionChart data={chartData.points} period={period} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  )
}

Dashboard.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
