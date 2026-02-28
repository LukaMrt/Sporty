import React from 'react'
import { router } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'

const LOCALES = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
]

export default function LocaleSwitcher() {
  const { locale } = useTranslation()

  function switchLocale(code: string) {
    router.post('/locale', { locale: code }, { preserveScroll: true })
  }

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => switchLocale(code)}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${
            locale === code
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
