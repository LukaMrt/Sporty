import React, { useState } from 'react'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
  /** Texte principal affiché dans le popup */
  description: string
  /** Texte secondaire en italique (interprétation, conseil…) */
  interpretation?: string
  /** Contenu libre affiché sous la description (zones, barres…) */
  children?: React.ReactNode
  /** Alignement du popup par rapport à l'icône */
  align?: 'left' | 'right'
}

export default function InfoTooltip({
  description,
  interpretation,
  children,
  align = 'right',
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label="Plus d'informations"
      >
        <Info size={14} />
      </button>

      {open && (
        <div
          className={`absolute top-6 z-10 w-64 rounded-xl border bg-card p-3 shadow-lg space-y-2 text-xs ${
            align === 'left' ? 'right-0' : 'left-0'
          }`}
        >
          <p className="text-muted-foreground leading-relaxed">{description}</p>
          {interpretation && (
            <p className="text-foreground/70 italic leading-relaxed">{interpretation}</p>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
