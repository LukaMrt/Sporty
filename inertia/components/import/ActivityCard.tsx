import React from 'react'
import { Card, CardContent } from '~/components/ui/card'
import ActivityStatusBadge from '~/components/import/ActivityStatusBadge'
import { useTranslation } from '~/hooks/use_translation'

interface StagingActivity {
  id: number
  externalId: string
  status: string
  date: string
  name: string
  sportType: string
  durationMinutes: number
  distanceKm: number | null
}

interface ActivityCardProps {
  activity: StagingActivity
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`
}

export default function ActivityCard({ activity }: ActivityCardProps) {
  const { t } = useTranslation()
  const date = new Date(activity.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{activity.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{date}</p>
          </div>
          <ActivityStatusBadge status={activity.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{activity.sportType}</span>
          <span>{formatDuration(activity.durationMinutes)}</span>
          {activity.distanceKm !== null && (
            <span>
              {activity.distanceKm.toFixed(2)} {t('import.table.distanceUnit')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
