export function paceToKmh(paceMinPerKm: number): number {
  return 60 / paceMinPerKm
}

export function kmToMiles(km: number): number {
  return km * 0.621371
}

export function toMinSec(decimalMinutes: number): { minutes: number; seconds: number } {
  let minutes = Math.floor(decimalMinutes)
  let seconds = Math.round((decimalMinutes - minutes) * 60)
  if (seconds === 60) {
    minutes++
    seconds = 0
  }
  return { minutes, seconds }
}

/** Formate une durée en minutes pouvant être fractionnaire (ex: 0.33 → "20s", 1.5 → "1min 30s", 45 → "45min") */
export function formatBlockDuration(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (s === 0) return `${m}min`
  return `${m}min ${s}s`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m.toString().padStart(2, '0')}`
}

export function formatPace(durationMinutes: number, distanceKm: number | null): string | null {
  if (!distanceKm || distanceKm === 0) return null
  const { minutes, seconds } = toMinSec(durationMinutes / distanceKm)
  return `${minutes}'${seconds.toString().padStart(2, '0')}/km`
}

export function formatPaceMinSec(paceMinPerKm: number): string {
  const { minutes, seconds } = toMinSec(paceMinPerKm)
  return `${minutes}'${seconds.toString().padStart(2, '0')}`
}

export function formatTrend(
  trendSeconds: number,
  unitLabel: string = 's/km',
  periodLabel: string = 'période précédente'
): string {
  const sign = trendSeconds < 0 ? '-' : '+'
  const abs = Math.abs(trendSeconds)
  return `${sign}${abs}${unitLabel} vs ${periodLabel}`
}

export function formatMetricKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatChartDate(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

export function formatChartValue(value: number, metric: string): string {
  if (metric === 'pace') {
    const { minutes, seconds } = toMinSec(value)
    return `${minutes}'${seconds.toString().padStart(2, '0')}/km`
  }
  if (metric === 'heartRate') {
    return `${Math.round(value)} bpm`
  }
  return `${value.toFixed(1)} km`
}

export function isoWeek(iso: string): string {
  const [y, m, dd] = iso.split('-').map(Number)
  const d = new Date(y, m - 1, dd)
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const year = d.getFullYear()
  const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7)
  return `${year}-W${week.toString().padStart(2, '0')}`
}

export function isThisWeek(iso: string): boolean {
  const [y, m, dd] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, dd)
  const now = new Date()
  // ISO week: Monday = day 1
  const dayOfWeek = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 7)
  return date >= monday && date < sunday
}

export function isThisMonth(iso: string): boolean {
  const [y, m] = iso.split('-').map(Number)
  const now = new Date()
  return y === now.getFullYear() && m === now.getMonth() + 1
}

export function formatDate(iso: string): string {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split('T')[0]
  if (iso === todayStr) return "Aujourd'hui"
  if (iso === yesterdayStr) return 'Hier'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
