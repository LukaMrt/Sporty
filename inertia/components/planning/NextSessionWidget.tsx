import React from 'react'
import { router } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'
import { ZONE_COLORS } from '~/lib/planning_colors'
import type { PlannedSession } from '~/types/planning'

export type NextSessionResult =
  | null
  | { state: 'plan_completed' }
  | { state: 'upcoming'; session: PlannedSession; date: string; isToday: boolean }
  | { state: 'rest_today'; nextSession: PlannedSession; nextDate: string }

interface Props {
  result: NextSessionResult
}

function formatDayLabel(dateIso: string, t: (key: string) => string): string {
  const d = new Date(dateIso)
  return t(`dashboard.nextSession.days.${d.getDay()}`)
}

export default function NextSessionWidget({ result }: Props) {
  const { t } = useTranslation()

  if (result === null) return null

  function handleClick() {
    router.visit('/planning')
  }

  if (result.state === 'plan_completed') {
    return (
      <button
        onClick={handleClick}
        className="w-full text-left rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm text-muted-foreground">
          {t('dashboard.nextSession.planCompleted')}
        </span>
      </button>
    )
  }

  if (result.state === 'rest_today') {
    const { nextSession, nextDate } = result
    const zoneColor = ZONE_COLORS[nextSession.intensityZone] ?? 'bg-muted-foreground'
    return (
      <button
        onClick={handleClick}
        className="w-full text-left rounded-xl border border-border bg-card p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <p className="text-xs text-muted-foreground mb-2">
          {t('dashboard.nextSession.restToday')}{' '}
          <span className="font-medium text-foreground">{formatDayLabel(nextDate, t)}</span>
        </p>
        <SessionSummary session={nextSession} zoneColor={zoneColor} isToday={false} t={t} />
      </button>
    )
  }

  // state === 'upcoming'
  const { session, isToday } = result
  const zoneColor = ZONE_COLORS[session.intensityZone] ?? 'bg-muted-foreground'
  return (
    <button
      onClick={handleClick}
      className={[
        'w-full text-left rounded-xl border p-4 cursor-pointer hover:bg-muted/50 transition-colors',
        isToday ? 'border-primary bg-primary/5' : 'border-border bg-card',
      ].join(' ')}
    >
      {isToday && (
        <p className="text-xs text-primary font-semibold mb-1">
          {t('dashboard.nextSession.today')}
        </p>
      )}
      <SessionSummary session={session} zoneColor={zoneColor} isToday={isToday} t={t} />
    </button>
  )
}

interface SessionSummaryProps {
  session: PlannedSession
  zoneColor: string
  isToday: boolean
  t: (key: string, params?: Record<string, string | number>) => string
}

function SessionSummary({ session, zoneColor, t }: SessionSummaryProps) {
  return (
    <div className="flex items-center gap-3">
      <span className={`block w-2.5 h-2.5 rounded-full flex-shrink-0 ${zoneColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {t(`planning.sessions.types.${session.sessionType}`)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {session.targetDurationMinutes} min
          {session.targetDistanceKm ? ` · ${session.targetDistanceKm} km` : ''}
          {session.targetPacePerKm ? ` · ${session.targetPacePerKm} /km` : ''}
        </p>
      </div>
    </div>
  )
}
