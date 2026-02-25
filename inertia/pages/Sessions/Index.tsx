import React from 'react'
import { Head, router } from '@inertiajs/react'
import { Plus } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import EmptyState from '~/components/shared/EmptyState'
import { Button } from '~/components/ui/button'

interface TrainingSession {
  id: number
  sportName: string
  date: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
  perceivedEffort: number | null
  notes: string | null
  createdAt: string
}

interface SessionsIndexProps {
  sessions: TrainingSession[]
}

function goToCreate() {
  router.visit('/sessions/create')
}

export default function SessionsIndex({ sessions }: SessionsIndexProps) {
  return (
    <>
      <Head title="Séances" />

      <div className="flex items-center justify-between p-4 md:p-6">
        <h1 className="text-xl font-bold text-foreground md:text-2xl">Séances</h1>
        <Button onClick={goToCreate} className="flex items-center gap-2">
          <Plus size={16} />
          <span className="hidden sm:inline">Nouvelle séance</span>
          <span className="sm:hidden">+</span>
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="Aucune séance pour l'instant"
          description="Commence à saisir tes entraînements pour construire ton historique."
          ctaLabel="Saisir ma première séance"
          onCtaClick={goToCreate}
        />
      ) : (
        <div className="px-4 pb-6 md:px-6">
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{s.sportName}</p>
                    <p className="text-sm text-muted-foreground">{s.date}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{s.durationMinutes} min</p>
                    {s.distanceKm !== null && s.distanceKm !== undefined && (
                      <p>{s.distanceKm} km</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

SessionsIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
