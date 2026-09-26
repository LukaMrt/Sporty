import React from 'react'
import { Head, router } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import EmptyState from '~/components/shared/EmptyState'
import NextSessionWidget from '~/components/planning/NextSessionWidget'
import type { NextSessionResult } from '~/components/planning/NextSessionWidget'
import GoalOutlookCard from '~/components/analysis/GoalOutlookCard'
import {
  FormTrendCard,
  InsightsCard,
  LastSessionCard,
  TodayFormCard,
  WeekCard,
} from '~/components/dashboard/TodayCards'
import { useTranslation } from '~/hooks/use_translation'
import type { TodayOverview } from '../../app/use_cases/dashboard/get_today_overview'

type DashboardProps = {
  overview: TodayOverview
  nextSession: NextSessionResult
}

/**
 * Accueil « Aujourd'hui » : comment je vais, que faire aujourd'hui, suis-je
 * sur la bonne voie. Le détail et les explications vivent dans Analyse.
 */
export default function Dashboard({ overview, nextSession }: DashboardProps) {
  const { t } = useTranslation()

  if (overview.sessionCount === 0) {
    return (
      <>
        <Head title={t('dashboard.title')} />
        <EmptyState
          title={t('dashboard.empty.title')}
          description={t('dashboard.empty.description')}
          ctaLabel={t('dashboard.empty.cta')}
          onCtaClick={() => router.visit('/sessions/create')}
        />
      </>
    )
  }

  return (
    <>
      <Head title={t('dashboard.title')} />
      <div className="mx-auto grid max-w-5xl gap-4 p-4 sm:p-6 lg:grid-cols-2">
        <TodayFormCard form={overview.form}>
          {nextSession && <NextSessionWidget result={nextSession} />}
        </TodayFormCard>
        <WeekCard week={overview.week} today={overview.today} />
        <InsightsCard insights={overview.insights} records={overview.recentRecords} />
        {overview.goal && <GoalOutlookCard goal={overview.goal} />}
        <FormTrendCard form={overview.form} />
        {overview.lastSession && <LastSessionCard session={overview.lastSession} />}
      </div>
    </>
  )
}

Dashboard.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
