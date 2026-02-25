import { router } from '@inertiajs/react'
import { EFFORT_EMOJIS } from '~/lib/effort'
import { formatDate, formatDuration } from '~/lib/format'

interface SessionCardProps {
  id: number
  sportName: string
  date: string
  durationMinutes: number
  distanceKm: number | null
  perceivedEffort: number | null
}

export default function SessionCard({
  id,
  sportName,
  date,
  durationMinutes,
  distanceKm,
  perceivedEffort,
}: SessionCardProps) {
  function handleClick() {
    router.visit(`/sessions/${id}`)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full rounded-xl border bg-card p-4 shadow-sm text-left transition-colors hover:bg-accent/50 active:bg-accent min-h-[44px]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{sportName}</p>
          <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-sm text-muted-foreground">
          <span>{formatDuration(durationMinutes)}</span>
          {distanceKm !== null && distanceKm !== undefined && Number(distanceKm) > 0 && (
            <span>{Number(distanceKm).toFixed(1)} km</span>
          )}
          {perceivedEffort !== null && perceivedEffort !== undefined && (
            <span className="text-base" aria-label={`Ressenti ${perceivedEffort}`}>
              {EFFORT_EMOJIS[(perceivedEffort - 1) as 0 | 1 | 2 | 3 | 4]}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
