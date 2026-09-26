/** Formats de la page Analyse (toujours localisés : « 1,05 » en français) */

export const DISTANCE_KEYS: Record<number, string> = {
  400: '400m',
  1000: '1k',
  1609: 'mile',
  5000: '5k',
  10000: '10k',
  21097: 'half',
  42195: 'marathon',
}

export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatPace(secondsPerKm: number): string {
  return `${formatSeconds(secondsPerKm)}/km`
}

export function formatNumber(value: number, locale: string, maxDigits = 1): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxDigits }).format(value)
}

export function formatSigned(value: number, locale: string, maxDigits = 1): string {
  const formatted = formatNumber(Math.abs(value), locale, maxDigits)
  return value > 0 ? `+${formatted}` : value < 0 ? `−${formatted}` : formatted
}

export function shortDate(iso: string, locale: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export function longDate(iso: string, locale: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** « 2026-06 » → « juin 26 » */
export function monthLabel(yyyymm: string, locale: string): string {
  return new Date(`${yyyymm}-01T00:00:00`).toLocaleDateString(locale, {
    month: 'short',
    year: '2-digit',
  })
}

/** Durée en minutes → « 1 h 32 » / « 42 min » */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}
