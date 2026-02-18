import React from 'react'
import { Head } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'

export default function PlanningIndex() {
  return (
    <>
      <Head title="Planning" />
      <div className="p-4">
        <h1 className="text-2xl font-bold text-foreground">Planning</h1>
        <p className="mt-2 text-muted-foreground">Votre planning apparaîtra ici.</p>
      </div>
    </>
  )
}

PlanningIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
