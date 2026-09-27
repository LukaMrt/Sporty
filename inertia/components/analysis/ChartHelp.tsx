import { useEffect, useId, useRef, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { useTranslation } from '~/hooks/use_translation'

/** Graphiques qui ont une aide « Comment lire ? » (`analysis.help.<id>`) */
export type HelpId =
  | 'fitness'
  | 'tsb'
  | 'acwr'
  | 'loadBySport'
  | 'projection'
  | 'adherence'
  | 'calendar'
  | 'volume'
  | 'regularity'
  | 'intensity'
  | 'records'
  | 'paceCurve'
  | 'predictions'
  | 'vdotHistory'
  | 'ef'
  | 'decoupling'
  | 'hrAtPace'
  | 'hrv'
  | 'restingHr'
  | 'sleep'
  | 'loadVsHrv'
  | 'correlation'
  | 'swimPace'
  | 'watchScores'
  | 'sleepSchedule'
  | 'hrr'

/**
 * Aide de niveau 1 : discrète (petit lien gris), elle explique comment lire le
 * graphique, à quoi ressemble une bonne valeur et ce qui doit alerter.
 */
export default function ChartHelp({ id }: { id: HelpId }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const popupId = useId()
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onClickOutside(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('touchstart', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('touchstart', onClickOutside)
    }
  }, [open])

  const base = `analysis.help.${id}`
  const parts = [
    { key: 'read', label: t('analysis.help.labels.read') },
    { key: 'good', label: t('analysis.help.labels.good') },
    { key: 'watch', label: t('analysis.help.labels.watch') },
  ].filter(({ key }) => t(`${base}.${key}`) !== `${base}.${key}`)

  return (
    <span ref={rootRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground transition hover:text-foreground"
      >
        <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
        {t('analysis.help.howToRead')}
      </button>
      {open && (
        <span
          id={popupId}
          role="dialog"
          aria-label={t('analysis.help.howToRead')}
          className="absolute top-full right-0 z-30 mt-1 block w-80 max-w-[calc(100vw-2rem)] space-y-2 rounded-xl border bg-card p-3 text-left text-xs shadow-lg"
        >
          {parts.map(({ key, label }) => (
            <span key={key} className="block leading-relaxed">
              <span className="font-semibold text-foreground">{label} </span>
              <span className="text-muted-foreground">{t(`${base}.${key}`)}</span>
            </span>
          ))}
        </span>
      )}
    </span>
  )
}
