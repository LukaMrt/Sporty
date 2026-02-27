import React from 'react'
import { Head, router } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import EmptyState from '~/components/shared/EmptyState'
import HeroMetric, { HeroMetricEmpty } from '~/components/shared/HeroMetric'
import QuickStatCard from '~/components/shared/QuickStatCard'
import EvolutionChart from '~/components/shared/EvolutionChart'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import type {
  ChartData,
  HeroMetricData,
  QuickStatData,
} from '../../app/domain/entities/dashboard_metrics'

interface DashboardProps {
  sessionCount: number
  heroMetric: HeroMetricData | null
  quickStats: QuickStatData | null
  chartData: ChartData | null
  speedUnit: string
}

export default function Dashboard({
  sessionCount,
  heroMetric,
  quickStats,
  chartData,
}: DashboardProps) {
  const isEmpty = quickStats === null

  return (
    <>
      <Head title="Accueil" />
      {sessionCount === 0 ? (
        <EmptyState
          title="Saisis ta première séance pour commencer"
          description="Suis tes entraînements et vois ta progression au fil du temps."
          ctaLabel="Saisir ma première séance"
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
              label="Volume semaine"
              value={isEmpty ? '—' : quickStats.weeklyVolumeKm.toFixed(1)}
              unit="km"
              trend={isEmpty ? null : quickStats.weeklyVolumeTrend}
              isEmpty={isEmpty}
            />
            <QuickStatCard
              label="FC moyenne"
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
              label="Séances"
              value={isEmpty ? '—' : quickStats.weeklySessionCount.toString()}
              unit="cette sem."
              trend={isEmpty ? null : quickStats.weeklySessionTrend}
              isEmpty={isEmpty}
            />
          </div>
          {chartData !== null && chartData.points.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Évolution</CardTitle>
              </CardHeader>
              <CardContent>
                <EvolutionChart data={chartData.points} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  )
}

Dashboard.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
