import React from 'react'
import { Head, router } from '@inertiajs/react'
import { Plus } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import EmptyState from '~/components/shared/EmptyState'
import SessionCard from '~/components/sessions/SessionCard'
import { Button } from '~/components/ui/button'

interface SessionSummary {
  id: number
  sportType: number
  sportName: string
  date: string
  durationMinutes: number
  distanceKm: number | null
  perceivedEffort: number | null
}

interface PaginationMeta {
  total: number
  page: number
  perPage: number
  lastPage: number
}

interface SessionsIndexProps {
  sessions: {
    data: SessionSummary[]
    meta: PaginationMeta
  }
}

function goToCreate() {
  router.visit('/sessions/create')
}

export default function SessionsIndex({ sessions }: SessionsIndexProps) {
  const { data, meta } = sessions

  function goToPreviousPage() {
    router.get('/sessions', { page: meta.page - 1 }, { preserveState: true, preserveScroll: true })
  }

  function goToNextPage() {
    router.get('/sessions', { page: meta.page + 1 }, { preserveState: true, preserveScroll: true })
  }

  return (
    <>
      <Head title="Séances" />

      <div className="flex items-center justify-between p-4 md:p-6">
        <h1 className="text-xl font-bold text-foreground md:text-2xl">Séances</h1>
        <Button onClick={goToCreate} className="hidden sm:flex items-center gap-2">
          <Plus size={16} />
          Nouvelle séance
        </Button>
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="Aucune séance pour l'instant"
          description="Commence à saisir tes entraînements pour construire ton historique."
          ctaLabel="Saisir ma première séance"
          onCtaClick={goToCreate}
        />
      ) : (
        <div className="px-4 pb-6 md:px-6">
          <ul className="space-y-3">
            {data.map((s) => (
              <li key={s.id}>
                <SessionCard
                  id={s.id}
                  sportName={s.sportName}
                  date={s.date}
                  durationMinutes={s.durationMinutes}
                  distanceKm={s.distanceKm}
                  perceivedEffort={s.perceivedEffort}
                />
              </li>
            ))}
          </ul>

          {meta.lastPage > 1 && (
            <div className="flex items-center justify-between gap-4 mt-6">
              <Button
                variant="outline"
                onClick={goToPreviousPage}
                disabled={meta.page <= 1}
                className="min-h-[44px]"
              >
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {meta.page} / {meta.lastPage}
              </span>
              <Button
                variant="outline"
                onClick={goToNextPage}
                disabled={meta.page >= meta.lastPage}
                className="min-h-[44px]"
              >
                Suivant
              </Button>
            </div>
          )}
        </div>
      )}

      {/* FAB mobile */}
      <Button
        size="icon"
        onClick={goToCreate}
        className="sm:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        aria-label="Nouvelle séance"
      >
        <Plus size={24} />
      </Button>
    </>
  )
}

SessionsIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
