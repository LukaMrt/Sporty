import React from 'react'
import { Head } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'

export default function SessionsIndex() {
  return (
    <>
      <Head title="Séances" />
      <div className="p-4">
        <h1 className="text-2xl font-bold text-foreground">Séances</h1>
        <p className="mt-2 text-muted-foreground">Vos séances d'entraînement apparaîtront ici.</p>
      </div>
    </>
  )
}

SessionsIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
