import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import { EFFORT_EMOJIS } from '~/lib/effort'
import { formatDate, formatDuration, formatMetricKey } from '~/lib/format'
import { useUnitConversion } from '~/hooks/use_unit_conversion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'

interface TrainingSessionProps {
  id: number
  userId: number
  sportId: number
  sportName: string
  date: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
  perceivedEffort: number | null
  sportMetrics: Record<string, unknown>
  notes: string | null
  createdAt: string
}

interface ShowProps {
  session: TrainingSessionProps
}

export default function SessionShow({ session }: ShowProps) {
  const [open, setOpen] = useState(false)
  const { formatSpeed, formatDistanceParts } = useUnitConversion()
  const rawPaceMinPerKm =
    session.distanceKm && session.distanceKm > 0
      ? session.durationMinutes / session.distanceKm
      : null
  const pace = rawPaceMinPerKm !== null ? formatSpeed(rawPaceMinPerKm) : null
  const hasSportMetrics = Object.keys(session.sportMetrics).length > 0

  function handleDelete() {
    router.delete(`/sessions/${session.id}`)
  }

  return (
    <>
      <Head title={session.sportName} />

      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6">
        <Link
          href="/sessions"
          preserveState
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Retour</span>
        </Link>
        <h1 className="text-lg font-bold text-foreground">{session.sportName}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Supprimer la séance"
          >
            <Trash2 size={18} />
          </button>
          <Link
            href={`/sessions/${session.id}/edit`}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Modifier la séance"
          >
            <Pencil size={18} />
          </Link>
        </div>
      </div>

      <div className="px-4 pb-8 md:px-6 space-y-6">
        {/* En-tête */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">{formatDate(session.date)}</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {new Date(session.date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Métriques principales */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Métriques principales
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">
                {formatDuration(session.durationMinutes)}
              </span>
              <span className="text-xs text-muted-foreground mt-1">Durée</span>
            </div>
            {session.distanceKm !== null && session.distanceKm !== undefined && (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-foreground">
                  {formatDistanceParts(Number(session.distanceKm)).value}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {formatDistanceParts(Number(session.distanceKm)).unit}
                </span>
              </div>
            )}
            {pace && (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-foreground">{pace}</span>
                <span className="text-xs text-muted-foreground mt-1">Allure</span>
              </div>
            )}
          </div>
        </div>

        {/* Métriques secondaires */}
        {(session.avgHeartRate !== null || session.perceivedEffort !== null) && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Métriques secondaires
            </h2>
            <div className="flex gap-6">
              {session.avgHeartRate !== null && (
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold text-foreground">{session.avgHeartRate}</span>
                  <span className="text-xs text-muted-foreground mt-1">bpm FC moy.</span>
                </div>
              )}
              {session.perceivedEffort !== null && (
                <div className="flex flex-col items-center">
                  <span className="text-3xl" aria-label={`Ressenti ${session.perceivedEffort}`}>
                    {EFFORT_EMOJIS[(session.perceivedEffort - 1) as 0 | 1 | 2 | 3 | 4]}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">Ressenti</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {session.notes && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Notes
            </h2>
            <p className="text-sm text-foreground whitespace-pre-wrap">{session.notes}</p>
          </div>
        )}

        {/* Métriques sport-spécifiques */}
        {hasSportMetrics && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Métriques spécifiques
            </h2>
            <div className="space-y-2">
              {Object.entries(session.sportMetrics).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatMetricKey(key)}</span>
                  <span className="text-sm font-medium text-foreground">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modale de confirmation de suppression */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette séance ?</DialogTitle>
            <DialogDescription>
              Cette action peut être annulée dans les 5 secondes après la suppression.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

SessionShow.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
