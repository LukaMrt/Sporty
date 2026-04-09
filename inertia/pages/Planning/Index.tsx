import React, { useEffect, useRef, useState } from 'react'
import { Head, router } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'
import { useTechMode } from '~/hooks/use_tech_mode'
import type { PlanOverview, PlannedSession, PlannedWeek, PostPlanState } from '~/types/planning'
import WeekDndView from '~/components/planning/WeekDndView'
import AcwrWarningBanner from '~/components/planning/AcwrWarningBanner'
import InactivityBanner from '~/components/planning/InactivityBanner'
import RecalibrationDialog from '~/components/planning/RecalibrationDialog'
import PostPlanProposal from '~/components/planning/PostPlanProposal'

interface Props {
  overview: PlanOverview | null
  postPlanState: PostPlanState | null
}

// Mon=1 … Sat=6, Sun=0 — displayed Mon→Sun
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** Calcule la date réelle d'un jour dans une semaine du plan */
function sessionDate(planStartDate: string, weekNumber: number, dayOfWeek: number): Date {
  const start = new Date(planStartDate)
  const weekStart = new Date(start)
  weekStart.setDate(start.getDate() + (weekNumber - 1) * 7)
  const startDow = weekStart.getDay()
  const offset = (dayOfWeek - startDow + 7) % 7
  const date = new Date(weekStart)
  date.setDate(weekStart.getDate() + offset)
  return date
}

function isDateToday(d: Date) {
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

function WeekCard({
  week,
  sessions,
  planStartDate,
  isCurrentWeek,
  isSelected,
  locale,
  onClick,
}: {
  week: PlannedWeek
  sessions: PlannedSession[]
  planStartDate: string
  isCurrentWeek: boolean
  isSelected: boolean
  locale: string
  onClick: () => void
}) {
  const { t } = useTranslation()

  const start = sessionDate(planStartDate, week.weekNumber, 1)
  const end = sessionDate(planStartDate, week.weekNumber, 0)
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })

  const runningSessions = sessions.filter((s) => s.sessionType !== 'rest')
  const phaseLabel = t(`planning.phases.${week.phaseName}`) ?? week.phaseLabel

  return (
    <button
      onClick={onClick}
      className={[
        'cursor-pointer w-full text-left rounded-xl border p-3 transition-colors',
        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/40',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {t('planning.overview.weekLabel', { n: week.weekNumber })}
          </span>
          {isCurrentWeek && (
            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
              {t('planning.overview.inProgress')}
            </span>
          )}
          {week.isRecoveryWeek && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
              {t('planning.overview.recoveryWeek')}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {fmt.format(start)} – {fmt.format(end)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{phaseLabel}</span>
        <span>·</span>
        <span>{week.targetVolumeMinutes} min</span>
        <span>·</span>
        <span>{t('planning.overview.sessionCount', { n: runningSessions.length })}</span>
      </div>
    </button>
  )
}

export default function PlanningIndex({ overview, postPlanState }: Props) {
  const { t, locale } = useTranslation()
  const { techMode } = useTechMode()
  const [selectedWeek, setSelectedWeek] = useState(overview?.currentWeekNumber ?? 1)
  const [view, setView] = useState<'week' | 'weeks'>('week')
  const [acwrDismissed, setAcwrDismissed] = useState(false)
  const inactivityStorageKey = overview?.plan ? `inactivity_dismissed_${overview.plan.id}` : null
  const [inactivityDismissed, setInactivityDismissed] = useState(() => {
    if (!inactivityStorageKey || overview?.daysSinceLastSession === null) return false
    const stored = localStorage.getItem(inactivityStorageKey)
    if (!stored) return false
    // Le dismiss est valide uniquement si la dernière séance n'a pas changé depuis.
    // On stocke le daysSinceLastSession au moment du dismiss ; si la valeur actuelle
    // est inférieure, c'est qu'une nouvelle séance a eu lieu entre-temps → on réinitialise.
    const dismissedAtDays = Number(stored)
    return overview.daysSinceLastSession >= dismissedAtDays
  })

  function dismissInactivity() {
    if (inactivityStorageKey && overview?.daysSinceLastSession !== null) {
      localStorage.setItem(inactivityStorageKey, String(overview.daysSinceLastSession))
    }
    setInactivityDismissed(true)
  }
  const [vdotToastVisible, setVdotToastVisible] = useState(false)
  const [recalibDialogOpen, setRecalibDialogOpen] = useState(false)
  const vdotToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // sessionsByWeek local — mis à jour de façon optimiste lors des ajustements
  const [localSessionsByWeek, setLocalSessionsByWeek] = useState(overview?.sessionsByWeek ?? {})

  // Synchronise le state local quand Inertia recharge les props (post-redirect)
  useEffect(() => {
    if (overview?.sessionsByWeek) setLocalSessionsByWeek(overview.sessionsByWeek)
  }, [overview?.sessionsByWeek])

  // Afficher le toast VDOT hausse une seule fois par palier de VDOT (clé localStorage)
  useEffect(() => {
    if (!overview?.plan) return
    const { currentVdot, vdotAtCreation, id } = overview.plan
    if (currentVdot <= vdotAtCreation) return
    const key = `vdot_toast_shown_${id}_${currentVdot}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    setVdotToastVisible(true)
    vdotToastTimer.current = setTimeout(() => setVdotToastVisible(false), 5000)
    return () => {
      if (vdotToastTimer.current) clearTimeout(vdotToastTimer.current)
    }
  }, [overview?.plan])

  // Ouvrir le dialog si une proposition VDOT baisse est pendante
  useEffect(() => {
    if (overview?.plan?.pendingVdotDown) setRecalibDialogOpen(true)
  }, [overview?.plan?.pendingVdotDown])

  function handleToggleAutoRecalibrate() {
    router.post('/planning/toggle-auto-recalibrate', {}, { preserveScroll: true })
  }

  function handleSessionUpdated(updated: PlannedSession) {
    setLocalSessionsByWeek((prev) => {
      const weekKey = String(updated.weekNumber)
      const weekSessions = prev[weekKey] ?? []
      // Retirer l'ancienne version, insérer la nouvelle
      const without = weekSessions.filter((s) => s.id !== updated.id)
      // Si la séance a changé de semaine (peu probable ici), gérer proprement
      return { ...prev, [weekKey]: [...without, updated] }
    })
  }

  if (!overview) {
    if (postPlanState) {
      return (
        <>
          <Head title={t('planning.title')} />
          <PostPlanProposal
            trainingState={postPlanState.trainingState}
            goalDistanceKm={postPlanState.goalDistanceKm}
          />
        </>
      )
    }
    return (
      <>
        <Head title={t('planning.title')} />
        <div className="max-w-sm mx-auto px-4 py-10 space-y-4">
          <h1 className="text-xl font-bold text-foreground">{t('planning.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('planning.noActivePlan')}</p>
          <Button onClick={() => router.visit('/planning/goal')}>
            {t('planning.defineGoalCta')}
          </Button>
        </div>
      </>
    )
  }

  const {
    goal,
    plan,
    weeks,
    currentWeekNumber,
    fitnessProfile,
    inactivityLevel,
    daysSinceLastSession,
  } = overview

  const showAcwrWarning = !acwrDismissed && fitnessProfile !== null && fitnessProfile.acwr > 1.3
  const showInactivityBanner =
    !inactivityDismissed && inactivityLevel !== 'none' && daysSinceLastSession !== null

  const selectedWeekData = weeks.find((w) => w.weekNumber === selectedWeek)
  const weekSessions = (localSessionsByWeek[String(selectedWeek)] ?? []).sort(
    (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)
  )

  const allDays = DAY_ORDER.map((dow) => {
    const session = weekSessions.find((s) => s.dayOfWeek === dow) ?? null
    const date = sessionDate(plan.startDate, selectedWeek, dow)
    const isToday = isDateToday(date)
    return { dow, session, date, isToday }
  })

  const eventDaysLeft = goal?.eventDate
    ? Math.ceil((new Date(goal.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  // Badge ⚡ sur les séances de la semaine courante si ACWR > 1.3
  const showAcwrBadgeOnCurrentWeek =
    fitnessProfile !== null && fitnessProfile.acwr > 1.3 && selectedWeek === currentWeekNumber

  return (
    <>
      <Head title={t('planning.title')} />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Bannière inactivité */}
        {showInactivityBanner && (
          <InactivityBanner
            level={inactivityLevel}
            daysSince={daysSinceLastSession ?? 0}
            onDismiss={dismissInactivity}
            onResume={dismissInactivity}
          />
        )}

        {/* Bannière ACWR warning */}
        {showAcwrWarning && (
          <AcwrWarningBanner
            acwr={fitnessProfile.acwr}
            techMode={techMode}
            onDismiss={() => setAcwrDismissed(true)}
          />
        )}

        {/* Bandeau objectif */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
          <div>
            {goal ? (
              <div className="text-base font-semibold text-foreground">
                {goal.targetDistanceKm} km
                {goal.targetTimeMinutes && (
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    {Math.floor(goal.targetTimeMinutes / 60)}h
                    {String(goal.targetTimeMinutes % 60).padStart(2, '0')}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-base font-semibold text-foreground">
                {t('planning.postPlan.maintenance.title')}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-0.5">
              {goal
                ? eventDaysLeft !== null && eventDaysLeft > 0
                  ? t('planning.overview.eventIn', { n: eventDaysLeft })
                  : goal.eventDate
                    ? t('planning.overview.eventPassed')
                    : t('planning.overview.noEventDate')
                : t('planning.athlete.trainingState.maintenance')}
            </div>
            {/* Données techniques : phase code + VDOT */}
            {techMode && selectedWeekData && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  {selectedWeekData.phaseName}
                </span>
                <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  VDOT {plan.currentVdot}
                </span>
              </div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-muted-foreground">
              {t('planning.overview.weekProgress', {
                current: currentWeekNumber,
                total: weeks.length,
              })}
            </div>
            <div className="h-1 w-16 rounded-full bg-muted mt-1 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${Math.round((currentWeekNumber / weeks.length) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Toggle recalibration auto */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-foreground">
              {t('planning.recalibration.autoToggleLabel')}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t('planning.recalibration.autoToggleDesc')}
            </div>
          </div>
          <button
            onClick={handleToggleAutoRecalibrate}
            className={[
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              plan.autoRecalibrate ? 'bg-primary' : 'bg-muted',
            ].join(' ')}
            role="switch"
            aria-checked={plan.autoRecalibrate}
          >
            <span
              className={[
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
                plan.autoRecalibrate ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </div>

        {/* Toggle vue */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setView('week')}
            className={[
              'flex-1 text-sm py-1.5 rounded-md transition-colors font-medium',
              view === 'week'
                ? 'bg-background text-foreground shadow-sm'
                : 'cursor-pointer text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t('planning.overview.weekLabel', { n: selectedWeek })}
          </button>
          <button
            onClick={() => setView('weeks')}
            className={[
              'flex-1 text-sm py-1.5 rounded-md transition-colors font-medium',
              view === 'weeks'
                ? 'bg-background text-foreground shadow-sm'
                : 'cursor-pointer text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t('planning.overview.allWeeks')}
          </button>
        </div>

        {/* Vue semaine */}
        {view === 'week' && (
          <>
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
                disabled={selectedWeek <= 1}
                className="cursor-pointer px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground disabled:opacity-30 hover:bg-muted/50 transition-colors"
              >
                ‹
              </button>
              <div className="text-center flex-1">
                <div className="text-sm font-medium text-foreground">
                  {t('planning.overview.weekLabel', { n: selectedWeek })}
                  {selectedWeek === currentWeekNumber && (
                    <span className="ml-2 text-xs text-primary font-normal">
                      {t('planning.overview.inProgress')}
                    </span>
                  )}
                </div>
                {selectedWeekData && (
                  <div className="text-xs text-muted-foreground">
                    {t(`planning.phases.${selectedWeekData.phaseName}`) ??
                      selectedWeekData.phaseLabel}{' '}
                    · {selectedWeekData.targetVolumeMinutes} min
                    {selectedWeekData.isRecoveryWeek && ` · ${t('planning.overview.recoveryWeek')}`}
                  </div>
                )}
                {/* Données techniques semaine : TSB + ACWR */}
                {techMode && fitnessProfile && selectedWeek === currentWeekNumber && (
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      TSB {fitnessProfile.tsb > 0 ? '+' : ''}
                      {fitnessProfile.tsb}
                    </span>
                    <span
                      className={[
                        'text-xs font-mono px-1.5 py-0.5 rounded',
                        fitnessProfile.acwr > 1.3
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-muted text-muted-foreground',
                      ].join(' ')}
                    >
                      ACWR {fitnessProfile.acwr.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedWeek((w) => Math.min(weeks.length, w + 1))}
                disabled={selectedWeek >= weeks.length}
                className="cursor-pointer px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground disabled:opacity-30 hover:bg-muted/50 transition-colors"
              >
                ›
              </button>
            </div>

            <WeekDndView
              days={allDays}
              planStartDate={plan.startDate}
              selectedWeek={selectedWeek}
              locale={locale}
              onSessionUpdated={handleSessionUpdated}
              showAcwrBadge={showAcwrBadgeOnCurrentWeek}
            />
          </>
        )}

        {/* Vue toutes les semaines */}
        {view === 'weeks' && (
          <div className="space-y-2">
            {weeks.map((week) => (
              <WeekCard
                key={week.weekNumber}
                week={week}
                sessions={localSessionsByWeek[String(week.weekNumber)] ?? []}
                planStartDate={plan.startDate}
                isCurrentWeek={week.weekNumber === currentWeekNumber}
                isSelected={week.weekNumber === selectedWeek}
                locale={locale}
                onClick={() => {
                  setSelectedWeek(week.weekNumber)
                  setView('week')
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast VDOT hausse */}
      {vdotToastVisible && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-full shadow-lg">
            {t('planning.recalibration.vdotUpToast', { vdot: plan.currentVdot })}
          </div>
        </div>
      )}

      {/* Dialog proposition baisse VDOT */}
      {plan.pendingVdotDown && (
        <RecalibrationDialog
          open={recalibDialogOpen}
          currentVdot={plan.currentVdot}
          proposedVdot={plan.pendingVdotDown}
          onClose={() => setRecalibDialogOpen(false)}
        />
      )}
    </>
  )
}

PlanningIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
