export function paceToKmh(paceMinPerKm: number): number {
  return 60 / paceMinPerKm
}

export function kmToMiles(km: number): number {
  return km * 0.621371
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

export function formatPace(durationMinutes: number, distanceKm: number | null): string | null {
  if (!distanceKm || distanceKm === 0) return null
  const paceMin = durationMinutes / distanceKm
  let minutes = Math.floor(paceMin)
  let seconds = Math.round((paceMin - minutes) * 60)
  if (seconds === 60) {
    minutes++
    seconds = 0
  }
  return `${minutes}'${seconds.toString().padStart(2, '0')}/km`
}

export function formatPaceMinSec(paceMinPerKm: number): string {
  let minutes = Math.floor(paceMinPerKm)
  let seconds = Math.round((paceMinPerKm - minutes) * 60)
  if (seconds === 60) {
    minutes++
    seconds = 0
  }
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
    let minutes = Math.floor(value)
    let seconds = Math.round((value - minutes) * 60)
    if (seconds === 60) {
      minutes++
      seconds = 0
    }
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
