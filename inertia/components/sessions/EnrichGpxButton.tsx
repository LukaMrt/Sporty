import React, { useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import { Loader2, Upload } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'

/**
 * Ajoute (ou remplace) le GPX d'une séance : carte, altitude, splits. Sur une
 * séance importée, la durée et la FC de la montre sont conservées.
 */
export default function EnrichGpxButton({
  sessionId,
  replace = false,
}: {
  sessionId: number
  replace?: boolean
}) {
  const { t } = useTranslation()
  const [enriching, setEnriching] = useState(false)
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const enrichFileRef = useRef<HTMLInputElement>(null)

  function handleEnrichGpxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnrichError(null)

    if (file.size > 10 * 1024 * 1024) {
      setEnrichError(t('sessions.form.gpxTooLarge'))
      return
    }

    // Envoi via Inertia (et non fetch) : la redirection est suivie par Inertia,
    // qui affiche le message flash de succès ou d'erreur (GPX d'un autre jour…)
    router.post(
      `/sessions/${sessionId}/enrich-gpx`,
      { gpx_file: file },
      {
        forceFormData: true,
        preserveScroll: true,
        onStart: () => setEnriching(true),
        onError: (errors) => setEnrichError(errors.gpx_file ?? t('sessions.form.gpxError')),
        onFinish: () => {
          setEnriching(false)
          if (enrichFileRef.current) enrichFileRef.current.value = ''
        },
      }
    )
  }

  return (
    <div className="space-y-1">
      <input
        ref={enrichFileRef}
        type="file"
        accept=".gpx"
        className="hidden"
        onChange={handleEnrichGpxChange}
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
            {replace ? t('sessions.form.replaceGpx') : t('sessions.form.enrichGpx')}
          </>
        )}
      </Button>
      {enrichError && (
        <p className="text-sm text-destructive" role="alert">
          {enrichError}
        </p>
      )}
    </div>
  )
}
