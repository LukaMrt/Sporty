import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'
import { useUnitConversion } from '~/hooks/use_unit_conversion'
import type { PlanOverview, PlannedSession, PlannedWeek } from '~/types/planning'
import PlannedSessionDetail from '~/components/planning/PlannedSessionDetail'

interface Props {
  overview: PlanOverview | null
}

// Mon=1 … Sat=6, Sun=0 — displayed Mon→Sun
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** Convertit "6:30" → 6.5 (min/km) */
function parsePaceString(pace: string): number {
  const [min, sec] = pace.split(':').map(Number)
  return min + (sec ?? 0) / 60
}

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

const ZONE_COLORS: Record<string, string> = {
  z1: 'bg-emerald-400',
  z2: 'bg-sky-400',
  z3: 'bg-amber-400',
  z4: 'bg-rose-400',
  z5: 'bg-violet-400',
}

function SessionCard({
  session,
  isToday,
  isOpen,
  onClick,
}: {
  session: PlannedSession
  isToday: boolean
  isOpen: boolean
  onClick: () => void
}) {
  const { t } = useTranslation()
  const { formatSpeed } = useUnitConversion()
  const isCompleted = session.status === 'completed'
  const isSkipped = session.status === 'skipped'

  return (
    <div>
      <button
        onClick={onClick}
        className={[
          'cursor-pointer w-full text-left rounded-lg border p-3 flex items-center gap-3 transition-colors',
          isOpen ? 'rounded-b-none border-b-0' : '',
          isToday ? 'border-primary' : 'border-border',
          'bg-card',
          isSkipped ? 'opacity-50' : '',
        ].join(' ')}
      >
        <span
          className={[
            'flex-shrink-0 w-2 h-2 rounded-full',
            isCompleted ? 'bg-emerald-400' : (ZONE_COLORS[session.intensityZone] ?? 'bg-border'),
          ].join(' ')}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground leading-tight">
            {t(`planning.sessions.types.${session.sessionType}`)}
            {isCompleted && <span className="ml-1 text-emerald-500">✓</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex gap-2">
            <span>{session.targetDurationMinutes} min</span>
            {session.targetDistanceKm && <span>· {session.targetDistanceKm} km</span>}
            {session.targetPacePerKm && (
              <span>· {formatSpeed(parsePaceString(session.targetPacePerKm))}</span>
            )}
          </div>
        </div>
        <span
          className={[
            'text-muted-foreground text-xs flex-shrink-0 transition-transform',
            isOpen ? 'rotate-90' : '',
          ].join(' ')}
        >
          ›
        </span>
      </button>

      {isOpen && (
        <PlannedSessionDetail
          session={session}
          borderClass={isToday ? 'border-primary' : 'border-border'}
        />
      )}
    </div>
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

export default function PlanningIndex({ overview }: Props) {
  const { t, locale } = useTranslation()
  const [selectedWeek, setSelectedWeek] = useState(overview?.currentWeekNumber ?? 1)
  const [openSessionId, setOpenSessionId] = useState<number | null>(null)
  const [view, setView] = useState<'week' | 'weeks'>('week')

  if (!overview) {
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

  const { goal, plan, weeks, currentWeekNumber, sessionsByWeek } = overview

  const selectedWeekData = weeks.find((w) => w.weekNumber === selectedWeek)
  const weekSessions = (sessionsByWeek[String(selectedWeek)] ?? []).sort(
    (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)
  )

  const allDays = DAY_ORDER.map((dow) => {
    const session = weekSessions.find((s) => s.dayOfWeek === dow) ?? null
    const date = sessionDate(plan.startDate, selectedWeek, dow)
    const isToday = isDateToday(date)
    return { dow, session, date, isToday }
  })

  const eventDaysLeft = goal.eventDate
    ? Math.ceil((new Date(goal.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })

  return (
    <>
      <Head title={t('planning.title')} />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Bandeau objectif */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-foreground">
              {goal.targetDistanceKm} km
              {goal.targetTimeMinutes && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  {Math.floor(goal.targetTimeMinutes / 60)}h
                  {String(goal.targetTimeMinutes % 60).padStart(2, '0')}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {eventDaysLeft !== null && eventDaysLeft > 0
                ? t('planning.overview.eventIn', { n: eventDaysLeft })
                : goal.eventDate
                  ? t('planning.overview.eventPassed')
                  : t('planning.overview.noEventDate')}
            </div>
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
              </div>
              <button
                onClick={() => setSelectedWeek((w) => Math.min(weeks.length, w + 1))}
                disabled={selectedWeek >= weeks.length}
                className="cursor-pointer px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground disabled:opacity-30 hover:bg-muted/50 transition-colors"
              >
                ›
              </button>
            </div>

            <div className="space-y-2">
              {allDays.map(({ dow, session, date, isToday }) => (
                <div key={dow}>
                  <div
                    className={[
                      'flex items-center gap-2 mb-1 px-1',
                      isToday ? 'text-primary' : 'text-muted-foreground',
                    ].join(' ')}
                  >
                    <span className="text-xs font-medium capitalize">{dayFmt.format(date)}</span>
                    <span className="text-xs">{dateFmt.format(date)}</span>
                    {isToday && (
                      <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium leading-none">
                        {t('planning.overview.today')}
                      </span>
                    )}
                  </div>

                  {!session || session.sessionType === 'rest' ? (
                    <div
                      className={[
                        'rounded-lg border px-3 py-2 text-sm text-muted-foreground',
                        isToday ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />
                        {t('planning.overview.rest')}
                      </span>
                    </div>
                  ) : (
                    <SessionCard
                      session={session}
                      isToday={isToday}
                      isOpen={openSessionId === session.id}
                      onClick={() =>
                        setOpenSessionId(openSessionId === session.id ? null : session.id)
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Vue toutes les semaines */}
        {view === 'weeks' && (
          <div className="space-y-2">
            {weeks.map((week) => (
              <WeekCard
                key={week.weekNumber}
                week={week}
                sessions={sessionsByWeek[String(week.weekNumber)] ?? []}
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
    </>
  )
}

PlanningIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
