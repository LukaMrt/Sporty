import React from 'react'
import { Head } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import SessionForm from '~/components/sessions/SessionForm'

interface Sport {
  id: number
  name: string
  slug: string
}

interface CreateProps {
  sports: Sport[]
  defaultSportId?: number
  speedUnit: 'min_km' | 'km_h'
}

export default function SessionsCreate({ sports, defaultSportId, speedUnit }: CreateProps) {
  return (
    <>
      <Head title="Nouvelle séance" />
      <div className="mx-auto max-w-lg px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold text-foreground">Nouvelle séance</h1>
        <SessionForm
          sports={sports}
          defaultSportId={defaultSportId}
          speedUnit={speedUnit}
          mode="create"
        />
      </div>
    </>
  )
}

SessionsCreate.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
