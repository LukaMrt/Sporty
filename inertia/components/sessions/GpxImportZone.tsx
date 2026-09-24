import React, { Suspense, useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { useTranslation } from '~/hooks/use_translation'
import { postMultipart } from '~/lib/http'

const SessionMap = React.lazy(() => import('~/components/sessions/SessionMap'))

export type GpsPoint = {
  lat: number
  lon: number
  ele?: number
  time: number
}

export type GpxParsedData = {
  tempId: string
  startDate: string
  durationMinutes: number
  distanceKm: number
  avgHeartRate: number | null
  minHeartRate: number | null
  maxHeartRate: number | null
  cadenceAvg: number | null
  elevationGain: number | null
  elevationLoss: number | null
  sportMetrics: {
    gpsTrack?: GpsPoint[]
    [key: string]: unknown
  }
}

/**
 * Import d'un fichier GPX (clic ou glisser-déposer) : le serveur l'analyse et
 * le garde en fichier temporaire ; le formulaire est pré-rempli via `onParsed`.
 */
export default function GpxImportZone({ onParsed }: { onParsed: (data: GpxParsedData) => void }) {
  const { t } = useTranslation()
  const [gpxParsing, setGpxParsing] = useState(false)
  const [gpxError, setGpxError] = useState<string | null>(null)
  const [gpsTrack, setGpsTrack] = useState<GpsPoint[] | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleGpxFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setGpxError(null)

    if (file.size > 10 * 1024 * 1024) {
      setGpxError(t('sessions.form.gpxTooLarge'))
      return
    }

    setGpxParsing(true)
    try {
      const formData = new FormData()
      formData.append('gpx_file', file)

      const res = await postMultipart('/sessions/parse-gpx', formData)

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setGpxError(body.error ?? t('sessions.form.gpxError'))
        return
      }

      const data = (await res.json()) as GpxParsedData

      onParsed(data)

      // Tracé GPS pour l'aperçu
      if (Array.isArray(data.sportMetrics.gpsTrack)) {
        setGpsTrack(data.sportMetrics.gpsTrack)
      }
    } catch {
      setGpxError(t('sessions.form.gpxError'))
    } finally {
      setGpxParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Ne désactiver le survol que si on quitte vraiment la zone (pas un enfant)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      void handleGpxFileChange({
        target: { files: e.dataTransfer.files },
      } as React.ChangeEvent<HTMLInputElement>)
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx"
        className="hidden"
        onChange={(e) => {
          void handleGpxFileChange(e)
        }}
        aria-label={t('sessions.form.importGpx')}
      />
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !gpxParsing && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !gpxParsing && fileInputRef.current?.click()}
        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-3 text-sm font-medium transition-colors
          ${isDragOver ? 'border-primary bg-primary/5 text-primary' : 'border-input text-muted-foreground hover:border-ring hover:text-foreground'}
          ${gpxParsing ? 'pointer-events-none opacity-60' : ''}`}
      >
        {gpxParsing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {t('sessions.form.gpxParsing')}
          </>
        ) : (
          <>
            <Upload size={16} />
            {isDragOver ? t('sessions.form.gpxDrop') : t('sessions.form.importGpx')}
          </>
        )}
      </div>
      {gpxError && (
        <p className="text-sm text-destructive" role="alert">
          {gpxError}
        </p>
      )}
      {gpsTrack && gpsTrack.length > 1 && (
        <div className="mt-2">
          <Suspense
            fallback={
              <div className="flex h-80 items-center justify-center rounded-lg bg-muted/30">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            }
          >
            <SessionMap gpsTrack={gpsTrack} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
