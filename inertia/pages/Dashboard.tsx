import React from 'react'
import { Head, router } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import EmptyState from '~/components/shared/EmptyState'

interface DashboardProps {
  sessionCount: number
}

export default function Dashboard({ sessionCount }: DashboardProps) {
  return (
    <>
      <Head title="Accueil" />
      {sessionCount === 0 ? (
        <EmptyState
          title="Saisis ta première séance pour commencer"
          description="Suis tes entraînements et vois ta progression au fil du temps."
          ctaLabel="Saisir ma première séance"
          onCtaClick={() => router.visit('/sessions/create')}
        />
      ) : (
        <p className="text-muted-foreground">Tableau de bord — à venir</p>
      )}
    </>
  )
}

Dashboard.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
