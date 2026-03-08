import React from 'react'
import { Head } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import type { ImportActivityStatus } from '#models/import_activity'

interface ActivityRecord {
  id: number
  externalId: string
  status: ImportActivityStatus
  rawData: Record<string, unknown> | null
}

interface ImportIndexProps {
  activities: ActivityRecord[] | null
  connectorError?: boolean
}

export default function ImportIndex({ activities, connectorError }: ImportIndexProps) {
  return (
    <MainLayout>
      <Head title="Import" />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Import Strava</h1>
        {connectorError && (
          <p className="text-red-600">
            Connecteur Strava non connecté. Veuillez connecter votre compte Strava.
          </p>
        )}
        {activities !== null && (
          <p className="text-sm text-muted-foreground">
            {activities.length} activité(s) trouvée(s)
          </p>
        )}
      </div>
    </MainLayout>
  )
}
