import { usePage } from '@inertiajs/react'

interface TranslationProps {
  locale: string
  translations: Record<string, string>
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template
  )
}

export function useTranslation() {
  const { locale, translations } = usePage<TranslationProps>().props

  function t(key: string, params?: Record<string, string | number>): string {
    const value = translations[key]
    if (value === undefined) return key
    if (params) return interpolate(value, params)
    return value
  }

  return { t, locale }
}
