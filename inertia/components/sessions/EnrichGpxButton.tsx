import React, { useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import { Loader2, Upload } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'
import { postMultipart } from '~/lib/http'

/** Ajoute un fichier GPX à une séance saisie à la main (courbes, carte, splits) */
export default function EnrichGpxButton({ sessionId }: { sessionId: number }) {
  const { t } = useTranslation()
  const [enriching, setEnriching] = useState(false)
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const enrichFileRef = useRef<HTMLInputElement>(null)

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
      const res = await postMultipart(`/sessions/${sessionId}/enrich-gpx`, formData)

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

  return (
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
  )
}
