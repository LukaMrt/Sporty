import React, { useEffect, useId, useRef, useState } from 'react'
import { Link } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'
import { HELP_METRICS_URL, type GlossaryTermId } from '~/lib/glossary'

type TermProps = {
  /** Notion du glossaire à expliquer */
  id: GlossaryTermId
  /** Texte affiché (par défaut : le nom complet de la notion) */
  children?: React.ReactNode
  /** Alignement du popup par rapport au terme */
  align?: 'left' | 'right'
}

/**
 * Terme souligné en pointillé qui explique une notion (CTL, SWOLF…).
 * S'ouvre au survol, au focus clavier et au toucher ; Échap ou un clic
 * ailleurs le referme. Renvoie vers la page d'aide complète.
 */
export default function Term({ id, children, align = 'right' }: TermProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const popupId = useId()
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    function onClickOutside(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
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

  function close() {
    setOpen(false)
    setPinned(false)
  }

  const base = `glossary.terms.${id}`

  return (
    <span
      ref={rootRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => !pinned && setOpen(false)}
    >
      <button
        type="button"
        className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-2 hover:decoration-foreground"
        aria-expanded={open}
        aria-describedby={open ? popupId : undefined}
        onClick={() => {
          // Toucher : ouvre et épingle ; second appui : referme
          if (pinned) close()
          else {
            setOpen(true)
            setPinned(true)
          }
        }}
        onFocus={() => setOpen(true)}
      >
        {children ?? t(`${base}.name`)}
      </button>

      {open && (
        <span
          id={popupId}
          role="tooltip"
          className={`absolute top-full z-20 mt-1 block w-72 max-w-[calc(100vw-2rem)] rounded-xl border bg-card p-3 text-left text-xs font-normal normal-case tracking-normal shadow-lg space-y-2 ${
            align === 'left' ? 'right-0' : 'left-0'
          }`}
        >
          <span className="block font-semibold text-foreground">{t(`${base}.name`)}</span>
          <span className="block leading-relaxed text-muted-foreground">{t(`${base}.short`)}</span>
          <span className="block italic leading-relaxed text-foreground/70">
            {t(`${base}.read`)}
          </span>
          <Link
            href={`${HELP_METRICS_URL}#${id}`}
            className="block text-primary underline underline-offset-2"
          >
            {t('glossary.learnMore')}
          </Link>
        </span>
      )}
    </span>
  )
}
