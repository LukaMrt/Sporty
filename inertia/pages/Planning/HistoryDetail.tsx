import React, { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'
import WeekSelector from '~/components/planning/WeekSelector'
import PlannedSessionCard from '~/components/planning/PlannedSessionCard'
import PlannedSessionDetail from '~/components/planning/PlannedSessionDetail'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import type { TrainingPlan, PlannedWeek, PlannedSession } from '~/types/planning'

interface Props {
  plan: TrainingPlan
  weeks: PlannedWeek[]
  sessionsByWeek: Record<string, PlannedSession[]>
  goalDistanceKm: number | null
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export default function HistoryDetail({ plan, weeks, sessionsByWeek, goalDistanceKm }: Props) {
  const { t } = useTranslation()
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [detailSession, setDetailSession] = useState<PlannedSession | null>(null)

  const isCompleted = plan.status === 'completed'
  const statusLabel = isCompleted
    ? t('planning.history.completed')
    : t('planning.history.abandoned')
  const statusColor = isCompleted ? 'text-green-600' : 'text-muted-foreground'
  const statusDot = isCompleted ? '✅' : '○'

  const goalLabel = goalDistanceKm
    ? t('planning.history.goal').replace('{distance}', String(goalDistanceKm))
    : t('planning.history.maintenancePlan')

  const vdotLabel = t('planning.history.vdotProgress')
    .replace('{start}', String(plan.vdotAtCreation))
    .replace('{end}', String(plan.currentVdot))

  const weekSessions = sessionsByWeek[String(selectedWeek)] ?? []
  const sessionsByDay: Record<number, PlannedSession | undefined> = {}
  for (const s of weekSessions) {
    sessionsByDay[s.dayOfWeek] = s
  }

  return (
    <MainLayout>
      <Head title={`${t('planning.history.title')} — ${goalLabel}`} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/planning/history"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {t('planning.history.detailBack')}
          </Link>
          <span className={`text-sm font-medium ${statusColor}`}>
            {statusDot} {statusLabel}
          </span>
        </div>

        {/* Plan summary */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="font-semibold text-lg text-foreground">{goalLabel}</div>
          <div className="text-sm text-muted-foreground">
            {plan.startDate} → {plan.endDate}
          </div>
          <div className="text-sm text-muted-foreground">{vdotLabel}</div>
          <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1 inline-block">
            {t('planning.history.readOnlyDetail')}
          </div>
        </div>

        {/* Week selector */}
        {weeks.length > 0 && (
          <WeekSelector
            weeks={weeks}
            currentWeekNumber={1}
            selectedWeekNumber={selectedWeek}
            onSelect={setSelectedWeek}
          />
        )}

        {/* Sessions grid */}
        <div className="space-y-2">
          {DAY_ORDER.map((dow) => {
            const session = sessionsByDay[dow]
            if (!session) return null
            return (
              <div key={dow} className="flex items-start gap-3">
                <div className="w-8 text-xs text-muted-foreground pt-3.5 shrink-0 text-right">
                  {DAY_NAMES[dow]}
                </div>
                <div className="flex-1">
                  <PlannedSessionCard
                    session={session}
                    isToday={false}
                    onClick={() => setDetailSession(session)}
                  />
                </div>
              </div>
            )
          })}
          {weekSessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('planning.overview.rest')}
            </p>
          )}
        </div>
      </div>

      {/* Session detail dialog (read-only) */}
      <Dialog open={!!detailSession} onOpenChange={() => setDetailSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {detailSession ? t(`planning.sessions.types.${detailSession.sessionType}`) : ''}
            </DialogTitle>
          </DialogHeader>
          {detailSession && <PlannedSessionDetail session={detailSession} />}
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
