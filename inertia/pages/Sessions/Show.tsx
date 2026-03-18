import React, { Suspense, useRef, useState } from 'react'

const SessionMap = React.lazy(() => import('~/components/sessions/SessionMap'))
import { Head, Link, router } from '@inertiajs/react'
import { ChevronLeft, Pencil, Trash2, Upload, Loader2 } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import { EFFORT_EMOJIS } from '~/lib/effort'
import { formatDate, formatDuration } from '~/lib/format'
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
import { useTranslation } from '~/hooks/use_translation'
import SessionCurvesChart from '~/components/sessions/SessionCurvesChart'
import MetricInsight, { METRIC_INSIGHTS } from '~/components/sessions/MetricInsight'
import HeartRateZonesChart from '~/components/sessions/HeartRateZonesChart'
import CardiacDriftIndicator from '~/components/sessions/CardiacDriftIndicator'
import TrimpIndicator from '~/components/sessions/TrimpIndicator'
import SplitsTable from '~/components/sessions/SplitsTable'
import type {
  DataPoint,
  GpsPoint,
  KmSplit,
  HeartRateZones,
} from '../../../app/domain/value_objects/run_metrics'

const METRIC_LABELS: Record<string, string> = {
  minHeartRate: 'FC min',
  maxHeartRate: 'FC max',
  cadenceAvg: 'Cadence moy.',
  elevationGain: 'Dénivelé +',
  elevationLoss: 'Dénivelé −',
  cardiacDrift: 'Drift cardiaque',
  trimp: 'TRIMP',
  avgPacePerKm: 'Allure moy.',
}

const METRIC_UNITS: Record<string, string> = {
  minHeartRate: ' bpm',
  maxHeartRate: ' bpm',
  cadenceAvg: ' spm',
  elevationGain: ' m',
  elevationLoss: ' m',
  cardiacDrift: ' %',
}

function formatMetricValue(key: string, value: number | string): string {
  const unit = METRIC_UNITS[key] ?? ''
  return `${value}${unit}`
}

interface SportMetricsWithCurves {
  heartRateCurve?: DataPoint[]
  paceCurve?: DataPoint[]
  altitudeCurve?: DataPoint[]
  splits?: KmSplit[]
  hrZones?: HeartRateZones
  cardiacDrift?: number
  trimp?: number
  gpsTrack?: GpsPoint[]
  [key: string]: unknown
}

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
  sportMetrics: SportMetricsWithCurves
  notes: string | null
  importedFrom: string | null
  gpxFilePath: string | null
  createdAt: string
}

interface HrZoneThreshold {
  zone: number
  minBpm: number
  maxBpm: number
}

interface ShowProps {
  session: TrainingSessionProps
  hrZoneThresholds: HrZoneThreshold[] | null
}

export default function SessionShow({ session, hrZoneThresholds }: ShowProps) {
  const [open, setOpen] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const enrichFileRef = useRef<HTMLInputElement>(null)
  const { formatSpeed, formatDistanceParts, speedUnit } = useUnitConversion()
  const { t } = useTranslation()

  async function handleEnrichGpxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnrichError(null)

    if (file.size > 10 * 1024 * 1024) {
      setEnrichError(t('sessions.form.gpxTooLarge'))
      return
    }

    setEnriching(true)
    try {
      const formData = new FormData()
      formData.append('gpx_file', file)
      const csrfToken =
        document.cookie
          .split(';')
          .map((c) => c.trim())
          .find((c) => c.startsWith('XSRF-TOKEN='))
          ?.split('=')[1] ?? ''

      const res = await fetch(`/sessions/${session.id}/enrich-gpx`, {
        method: 'POST',
        headers: { 'X-XSRF-TOKEN': decodeURIComponent(csrfToken) },
        body: formData,
      })

      if (res.redirected) {
        router.reload()
        return
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setEnrichError(body.error ?? t('sessions.form.gpxError'))
      }
    } catch {
      setEnrichError(t('sessions.form.gpxError'))
    } finally {
      setEnriching(false)
      if (enrichFileRef.current) enrichFileRef.current.value = ''
    }
  }
  const rawPaceMinPerKm =
    session.distanceKm && session.distanceKm > 0
      ? session.durationMinutes / session.distanceKm
      : null
  const pace = rawPaceMinPerKm !== null ? formatSpeed(rawPaceMinPerKm) : null

  const {
    heartRateCurve,
    paceCurve,
    altitudeCurve,
    splits,
    hrZones,
    cardiacDrift,
    trimp,
    gpsTrack,
    ...scalarMetrics
  } = session.sportMetrics
  const primitiveMetrics = Object.entries(scalarMetrics).filter(
    ([, v]) => typeof v === 'number' || typeof v === 'string'
  )
  const hasGpsTrack = Array.isArray(gpsTrack) && gpsTrack.length > 1
  const hasSportMetrics = primitiveMetrics.length > 0
  const hasSplits = splits && splits.length > 0
  const hasAnalysis = !!hrZones || hasSplits
  const showHrZoneInvite = !hrZones && session.avgHeartRate !== null
  const hasCurves =
    (heartRateCurve && heartRateCurve.length > 0) ||
    (paceCurve && paceCurve.length > 0) ||
    (altitudeCurve && altitudeCurve.length > 0)

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
          <span className="text-sm font-medium">{t('sessions.show.back')}</span>
        </Link>
        <h1 className="text-lg font-bold text-foreground">{session.sportName}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            aria-label={t('sessions.show.deleteAriaLabel')}
          >
            <Trash2 size={18} />
          </button>
          <Link
            href={`/sessions/${session.id}/edit`}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t('sessions.show.editAriaLabel')}
          >
            <Pencil size={18} />
          </Link>
        </div>
      </div>

      <div className="px-4 pb-8 md:px-6 space-y-6">
        {/* Bouton enrichissement GPX (visible uniquement si pas de GPX) */}
        {!session.gpxFilePath && (
          <div className="space-y-1">
            <input
              ref={enrichFileRef}
              type="file"
              accept=".gpx"
              className="hidden"
              onChange={(e) => {
                void handleEnrichGpxChange(e)
              }}
              aria-label={t('sessions.form.enrichGpx')}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => enrichFileRef.current?.click()}
              disabled={enriching}
            >
              {enriching ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t('sessions.form.gpxParsing')}
                </>
              ) : (
                <>
                  <Upload size={14} />
                  {t('sessions.form.enrichGpx')}
                </>
              )}
            </Button>
            {enrichError && (
              <p className="text-sm text-destructive" role="alert">
                {enrichError}
              </p>
            )}
          </div>
        )}

        {/* Badge source d'import */}
        {session.importedFrom && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800 dark:bg-orange-900/20">
            <p className="text-sm text-orange-700 dark:text-orange-400">
              {t('sessions.show.importedFrom', {
                source:
                  session.importedFrom.charAt(0).toUpperCase() + session.importedFrom.slice(1),
              })}
            </p>
          </div>
        )}

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
            {t('sessions.show.primaryMetrics')}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">
                {formatDuration(session.durationMinutes)}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {t('sessions.show.duration')}
              </span>
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
                <span className="text-xs text-muted-foreground mt-1">
                  {t('sessions.show.pace')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Métriques secondaires */}
        {(session.avgHeartRate !== null || session.perceivedEffort !== null) && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('sessions.show.secondaryMetrics')}
            </h2>
            <div className="flex gap-6">
              {session.avgHeartRate !== null && (
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold text-foreground">{session.avgHeartRate}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {t('sessions.show.heartRate')}
                  </span>
                </div>
              )}
              {session.perceivedEffort !== null && (
                <div className="flex flex-col items-center">
                  <span
                    className="text-3xl"
                    aria-label={t('sessions.show.effortLabel', { value: session.perceivedEffort })}
                  >
                    {EFFORT_EMOJIS[(session.perceivedEffort - 1) as 0 | 1 | 2 | 3 | 4]}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {t('sessions.show.effort')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {session.notes && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {t('sessions.show.notes')}
            </h2>
            <p className="text-sm text-foreground whitespace-pre-wrap">{session.notes}</p>
          </div>
        )}

        {/* Métriques sport-spécifiques */}
        {hasSportMetrics && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('sessions.show.specificMetrics')}
            </h2>
            <div className="space-y-2">
              {primitiveMetrics.map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">{METRIC_LABELS[key] ?? key}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {formatMetricValue(key, value as number | string)}
                    </span>
                    {METRIC_INSIGHTS[key] && typeof value === 'number' && (
                      <MetricInsight metricKey={key} value={value} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section Analyse : zones FC, drift, TRIMP, splits */}
        {(hasAnalysis || showHrZoneInvite) && (
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('sessions.show.analysis')}
            </h2>

            {/* Invitation à configurer FC max si pas de zones mais FC présente */}
            {showHrZoneInvite && (
              <p className="text-sm text-muted-foreground">
                {t('sessions.show.hrZoneInvite')}{' '}
                <Link href="/profile" className="underline hover:text-foreground transition-colors">
                  {t('sessions.show.hrZoneInviteLink')}
                </Link>
              </p>
            )}

            {/* Zones FC */}
            {hrZones && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-2">
                  {t('sessions.show.hrZones')}
                </h3>
                <HeartRateZonesChart
                  hrZones={hrZones}
                  hrZoneThresholds={hrZoneThresholds ?? undefined}
                />
              </div>
            )}

            {/* Drift cardiaque + TRIMP */}
            {(cardiacDrift !== undefined || trimp !== undefined) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cardiacDrift !== undefined && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-1">
                      {t('sessions.show.cardiacDrift')}
                    </h3>
                    <CardiacDriftIndicator value={cardiacDrift} />
                  </div>
                )}
                {trimp !== undefined && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-1">
                      {t('sessions.show.trimp')}
                    </h3>
                    <TrimpIndicator value={trimp} />
                  </div>
                )}
              </div>
            )}

            {/* Splits */}
            {hasSplits && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-2">
                  {t('sessions.show.splits')}
                </h3>
                <SplitsTable splits={splits} />
              </div>
            )}
          </div>
        )}

        {/* Carte GPS du parcours */}
        {hasGpsTrack && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('sessions.show.map')}
            </h2>
            <Suspense
              fallback={
                <div className="flex h-80 items-center justify-center rounded-lg bg-muted/30">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              }
            >
              <SessionMap
                gpsTrack={gpsTrack ?? []}
                heartRateCurve={heartRateCurve}
                paceCurve={paceCurve}
                altitudeCurve={altitudeCurve}
              />
            </Suspense>
          </div>
        )}

        {/* Graphique courbes FC / allure / altitude */}
        {hasCurves && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('sessions.show.curves')}
            </h2>
            <SessionCurvesChart
              heartRateCurve={heartRateCurve}
              paceCurve={paceCurve}
              altitudeCurve={altitudeCurve}
              speedUnit={speedUnit}
              hrZoneThresholds={hrZoneThresholds ?? undefined}
            />
          </div>
        )}
      </div>

      {/* Modale de confirmation de suppression */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sessions.show.deleteTitle')}</DialogTitle>
            <DialogDescription>{t('sessions.show.deleteDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('sessions.show.deleteCancel')}</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              {t('sessions.show.deleteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

SessionShow.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
