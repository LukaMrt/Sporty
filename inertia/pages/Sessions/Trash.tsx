import React from 'react'
import { Head, router } from '@inertiajs/react'
import { Trash2, RotateCcw } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import EmptyState from '~/components/shared/EmptyState'
import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'

interface TrashedSession {
  id: number
  sportName: string
  date: string
  durationMinutes: number
  distanceKm: number | null
  deletedAt: string | null
}

interface TrashProps {
  sessions: TrashedSession[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

function restoreSession(id: number) {
  router.post(`/sessions/${id}/restore`)
}

export default function SessionsTrash({ sessions }: TrashProps) {
  const { t } = useTranslation()

  return (
    <>
      <Head title={t('sessions.trash.title')} />

      <div className="flex items-center gap-3 p-4 md:p-6">
        <Trash2 size={20} className="text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground md:text-2xl">{t('sessions.trash.title')}</h1>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title={t('sessions.trash.empty.title')}
          description={t('sessions.trash.empty.description')}
        />
      ) : (
        <div className="px-4 pb-6 md:px-6">
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{s.sportName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(s.date)} · {formatDuration(s.durationMinutes)}
                    {s.distanceKm !== null && ` · ${s.distanceKm} km`}
                  </p>
                  {s.deletedAt && (
                    <p className="text-xs text-muted-foreground">
                      {t('sessions.trash.deletedAt', { date: formatDate(s.deletedAt) })}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restoreSession(s.id)}
                  className="flex items-center gap-2 shrink-0"
                >
                  <RotateCcw size={14} />
                  {t('sessions.trash.restore')}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

SessionsTrash.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
