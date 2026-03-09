import { Card, CardContent } from '~/components/ui/card'
import SessionStatusBadge from '~/components/import/SessionStatusBadge'
import { useTranslation } from '~/hooks/use_translation'
import type { StagingSession } from '~/types/staging_session'
import { formatDuration } from '~/lib/format'

interface StagingSessionCardProps {
  session: StagingSession
}

export default function StagingSessionCard({ session }: StagingSessionCardProps) {
  const { t } = useTranslation()
  const date = new Date(session.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{session.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{date}</p>
          </div>
          <SessionStatusBadge status={session.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{session.sportType}</span>
          <span>{formatDuration(session.durationMinutes)}</span>
          {session.distanceKm !== null && (
            <span>
              {session.distanceKm.toFixed(2)} {t('import.table.distanceUnit')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
