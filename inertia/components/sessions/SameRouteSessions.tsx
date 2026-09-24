import { Link } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'

export type SameRouteSession = {
  id: number
  date: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
}

/** F4 · Séances sur le même parcours, avec lien de comparaison (F3) */
export default function SameRouteSessions({
  sessionId,
  sessions,
}: {
  sessionId: number
  sessions: SameRouteSession[]
}) {
  const { t, locale } = useTranslation()
  if (sessions.length === 0) return null
  const compareIds = [sessionId, ...sessions.slice(0, 3).map((s) => s.id)]
  const compareHref = `/analysis/compare?${compareIds.map((id) => `ids[]=${id}`).join('&')}`

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t('sessions.sameRoute.title', { count: sessions.length })}
        </h2>
        <Link href={compareHref} className="text-sm text-primary hover:underline">
          {t('sessions.sameRoute.compare')}
        </Link>
      </div>
      <ul className="divide-y text-sm">
        {sessions.slice(0, 8).map((s) => (
          <li key={s.id} className="flex items-center justify-between py-1.5 tabular-nums">
            <Link href={`/sessions/${s.id}`} className="hover:underline">
              {new Date(`${s.date}T00:00:00`).toLocaleDateString(locale)}
            </Link>
            <span className="text-muted-foreground">
              {Math.floor(s.durationMinutes / 60) > 0 && `${Math.floor(s.durationMinutes / 60)} h `}
              {s.durationMinutes % 60} min
              {s.avgHeartRate ? ` · ${s.avgHeartRate} bpm` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
