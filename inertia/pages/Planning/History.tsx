import React from 'react'
import { Head, Link } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'
import PlanHistoryCard from '~/components/planning/PlanHistoryCard'
import type { TrainingPlan, PlannedWeek, PlannedSession } from '~/types/planning'

interface HistoryEntry {
  plan: TrainingPlan
  weeks: PlannedWeek[]
  sessions: PlannedSession[]
  goalDistanceKm: number | null
  completedSessionsCount: number
  totalSessionsCount: number
}

interface Props {
  history: HistoryEntry[]
}

export default function History({ history }: Props) {
  const { t } = useTranslation()

  return (
    <MainLayout>
      <Head title={t('planning.history.title')} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">{t('planning.history.title')}</h1>
          <Link
            href="/planning"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {t('planning.history.backToPlanning')}
          </Link>
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center space-y-2">
            <p className="text-lg font-medium text-foreground">{t('planning.history.empty')}</p>
            <p className="text-sm text-muted-foreground">
              {t('planning.history.emptyDescription')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <PlanHistoryCard
                key={entry.plan.id}
                plan={entry.plan}
                goalDistanceKm={entry.goalDistanceKm}
                completedSessionsCount={entry.completedSessionsCount}
                totalSessionsCount={entry.totalSessionsCount}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
