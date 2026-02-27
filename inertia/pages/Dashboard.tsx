import React from 'react'
import { Head, router } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import EmptyState from '~/components/shared/EmptyState'
import HeroMetric, { HeroMetricEmpty } from '~/components/shared/HeroMetric'
import type { HeroMetricData } from '../../app/domain/entities/dashboard_metrics'

interface DashboardProps {
  sessionCount: number
  heroMetric: HeroMetricData | null
  speedUnit: string
}

export default function Dashboard({ sessionCount, heroMetric }: DashboardProps) {
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
      ) : heroMetric === null ? (
        <div className="mx-auto max-w-2xl p-4">
          <HeroMetricEmpty />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl p-4">
          <HeroMetric
            pace={heroMetric.currentPace}
            trendSeconds={heroMetric.trendSeconds}
            previousPace={heroMetric.previousPace}
            sparklineData={heroMetric.sparklineData}
          />
        </div>
      )}
    </>
  )
}

Dashboard.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
