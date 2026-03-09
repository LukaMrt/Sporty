import { router } from '@inertiajs/react'
import { EFFORT_EMOJIS } from '~/lib/effort'
import { formatDate, formatDuration } from '~/lib/format'
import { useUnitConversion } from '~/hooks/use_unit_conversion'

interface SessionCardProps {
  id: number
  sportName: string
  date: string
  durationMinutes: number
  distanceKm: number | null
  perceivedEffort: number | null
  importedFrom?: string | null
}

export default function SessionCard({
  id,
  sportName,
  date,
  durationMinutes,
  distanceKm,
  perceivedEffort,
  importedFrom,
}: SessionCardProps) {
  const { formatDistance } = useUnitConversion()

  function handleClick() {
    router.visit(`/sessions/${id}`)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full rounded-xl border bg-card p-4 shadow-sm text-left transition-colors cursor-pointer hover:bg-accent/50 active:bg-accent min-h-[44px]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate">{sportName}</p>
            {importedFrom === 'strava' && (
              <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                Strava
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-sm text-muted-foreground">
          <span>{formatDuration(durationMinutes)}</span>
          {distanceKm !== null && distanceKm !== undefined && Number(distanceKm) > 0 && (
            <span>{formatDistance(Number(distanceKm))}</span>
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
