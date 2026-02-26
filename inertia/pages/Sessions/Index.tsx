import React from 'react'
import { Head, router } from '@inertiajs/react'
import { Plus } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import EmptyState from '~/components/shared/EmptyState'
import SessionCard from '~/components/sessions/SessionCard'
import SessionFilters from '~/components/sessions/SessionFilters'
import SessionPagination from '~/components/sessions/SessionPagination'
import { Button } from '~/components/ui/button'
import type { Filters } from '~/components/sessions/SessionFilters'

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

interface Sport {
  id: number
  name: string
}

interface SessionsIndexProps {
  sessions: { data: SessionSummary[]; meta: PaginationMeta }
  sports: Sport[]
  filters: Filters
}

function navigateWithFilters(
  filters: Filters,
  overrides: Partial<Filters & { page: number }> = {}
) {
  const params: Record<string, string | number> = {}
  const merged = { ...filters, ...overrides }

  if (merged.sportId) params.sportId = merged.sportId
  if (merged.sortBy) params.sortBy = merged.sortBy
  if (merged.sortOrder) params.sortOrder = merged.sortOrder
  if ('page' in overrides && overrides.page) params.page = overrides.page

  router.get('/sessions', params, { preserveState: true, preserveScroll: true })
}

export default function SessionsIndex({ sessions, sports, filters }: SessionsIndexProps) {
  const { data, meta } = sessions

  return (
    <>
      <Head title="Séances" />

      <div className="flex items-center justify-between p-4 md:p-6">
        <h1 className="text-xl font-bold text-foreground md:text-2xl">Séances</h1>
        <Button
          onClick={() => router.visit('/sessions/create')}
          className="hidden sm:flex items-center gap-2"
        >
          <Plus size={16} />
          Nouvelle séance
        </Button>
      </div>

      <SessionFilters
        sports={sports}
        filters={filters}
        onSportChange={(value) =>
          navigateWithFilters(filters, { sportId: value === 'all' ? null : Number(value), page: 1 })
        }
        onSortByChange={(value) =>
          navigateWithFilters(filters, {
            sortBy: value,
            sortOrder: filters.sortOrder ?? 'desc',
            page: 1,
          })
        }
        onSortOrderChange={(value) => navigateWithFilters(filters, { sortOrder: value, page: 1 })}
        onReset={() => router.get('/sessions', {}, { preserveState: true, preserveScroll: true })}
      />

      {data.length === 0 ? (
        <EmptyState
          title="Aucune séance pour l'instant"
          description="Commence à saisir tes entraînements pour construire ton historique."
          ctaLabel="Saisir ma première séance"
          onCtaClick={() => router.visit('/sessions/create')}
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

          <SessionPagination
            page={meta.page}
            lastPage={meta.lastPage}
            onPrevious={() => navigateWithFilters(filters, { page: meta.page - 1 })}
            onNext={() => navigateWithFilters(filters, { page: meta.page + 1 })}
          />
        </div>
      )}

      <Button
        size="icon"
        onClick={() => router.visit('/sessions/create')}
        className="sm:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        aria-label="Nouvelle séance"
      >
        <Plus size={24} />
      </Button>
    </>
  )
}

SessionsIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
