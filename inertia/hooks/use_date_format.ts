import { usePage } from '@inertiajs/react'
import type { UserPreferences } from '../../app/domain/entities/user_preferences'

interface PageProps {
  userPreferences?: UserPreferences | null
}

const LOCALE_MAP: Record<UserPreferences['locale'], string> = {
  fr: 'fr-FR',
  en: 'en-US',
}

export function useDateFormat() {
  const { userPreferences } = usePage<PageProps>().props
  const locale = LOCALE_MAP[userPreferences?.locale ?? 'fr']

  const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
    return new Date(date).toLocaleDateString(
      locale,
      options ?? {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    )
  }

  const formatShortDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return { formatDate, formatShortDate, locale }
}
