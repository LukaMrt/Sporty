import React, { Suspense } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { ChevronLeft } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'
import type { TrackPreview } from '~/components/analysis/TracksMap'

const TracksMap = React.lazy(() => import('~/components/analysis/TracksMap'))

export default function AnalysisMap({ tracks }: { tracks: TrackPreview[] }) {
  const { t } = useTranslation()
  return (
    <>
      <Head title={t('analysis.map.title')} />
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <Link
          href="/analysis"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('analysis.title')}
        </Link>
        <h1 className="text-xl font-semibold">{t('analysis.map.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('analysis.map.description', { count: tracks.length })}
        </p>
        {tracks.length === 0 ? (
          <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            {t('analysis.empty.noGps')}
          </p>
        ) : (
          // Leaflet accède à window : chargé à la demande, côté client uniquement
          <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-xl bg-muted" />}>
            <TracksMap tracks={tracks} onSelect={(id) => router.visit(`/sessions/${id}`)} />
          </Suspense>
        )}
        <p className="text-xs text-muted-foreground">
          {t('analysis.map.privacy')}{' '}
          <Link href="/profile" className="text-primary hover:underline">
            {t('analysis.map.privacyLink')}
          </Link>
        </p>
      </div>
    </>
  )
}

AnalysisMap.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
