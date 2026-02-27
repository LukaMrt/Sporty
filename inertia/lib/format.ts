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
  const minutes = Math.floor(paceMin)
  const seconds = Math.round((paceMin - minutes) * 60)
  return `${minutes}'${seconds.toString().padStart(2, '0')}/km`
}

export function formatPaceMinSec(paceMinPerKm: number): string {
  const minutes = Math.floor(paceMinPerKm)
  const seconds = Math.round((paceMinPerKm - minutes) * 60)
  return `${minutes}'${seconds.toString().padStart(2, '0')}`
}

export function formatTrend(trendSeconds: number): string {
  const sign = trendSeconds < 0 ? '-' : '+'
  const abs = Math.abs(trendSeconds)
  return `${sign}${abs}s/km vs mois dernier`
}

export function formatMetricKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatChartDate(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${day}/${month}`
}

export function formatChartValue(value: number, metric: string): string {
  if (metric === 'pace') {
    const minutes = Math.floor(value)
    const seconds = Math.round((value - minutes) * 60)
    return `${minutes}'${seconds.toString().padStart(2, '0')}/km`
  }
  if (metric === 'heartRate') {
    return `${Math.round(value)} bpm`
  }
  return `${value.toFixed(1)} km`
}

export function formatDate(iso: string): string {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split('T')[0]
  if (iso === todayStr) return "Aujourd'hui"
  if (iso === yesterdayStr) return 'Hier'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
