import type { AnalysisSession } from '#domain/services/analysis/aggregations'
import { weekStart } from '#domain/services/analysis/aggregations'

export const SWIMMING_SLUG = 'swimming'

/** Distances (m) des records d'allure natation */
export const SWIM_RECORD_DISTANCES = [400, 1000, 1500, 3000] as const
export type SwimRecordDistance = (typeof SWIM_RECORD_DISTANCES)[number]

function isSwim(s: AnalysisSession): s is AnalysisSession & { distanceKm: number } {
  return s.sportSlug === SWIMMING_SLUG && !!s.distanceKm && s.distanceKm > 0
}

/** Allure en min/100 m */
function pacePer100m(durationMinutes: number, distanceKm: number): number {
  return durationMinutes / (distanceKm * 10)
}

const round2 = (v: number) => Math.round(v * 100) / 100

/**
 * Allure moyenne natation par semaine, pondérée par la distance : l'équivalent
 * natation de l'EF course (une allure qui baisse = progrès).
 */
export function swimPaceTrend(
  sessions: AnalysisSession[]
): { week: string; pacePer100m: number; distanceM: number }[] {
  const weeks = new Map<string, { minutes: number; km: number }>()
  for (const s of sessions) {
    if (!isSwim(s)) continue
    const key = weekStart(s.date)
    const acc = weeks.get(key) ?? { minutes: 0, km: 0 }
    acc.minutes += s.durationMinutes
    acc.km += s.distanceKm
    weeks.set(key, acc)
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, { minutes, km }]) => ({
      week,
      pacePer100m: round2(pacePer100m(minutes, km)),
      distanceM: Math.round(km * 1000),
    }))
}

export type SwimRecord = {
  distance: SwimRecordDistance
  pacePer100m: number
  sessionId: number
  date: string
}

/**
 * Meilleure allure moyenne parmi les séances d'au moins `distance` mètres.
 * Sans découpage par longueur, c'est une allure de séance entière, pas un
 * meilleur effort mesuré à l'intérieur de la séance.
 */
export function swimRecords(sessions: AnalysisSession[], since?: string): SwimRecord[] {
  const swims = sessions.filter((s) => isSwim(s) && (!since || s.date >= since))
  return SWIM_RECORD_DISTANCES.flatMap((distance) => {
    let best: SwimRecord | null = null
    for (const s of swims) {
      if (s.distanceKm! * 1000 < distance) continue
      const pace = pacePer100m(s.durationMinutes, s.distanceKm!)
      if (!best || pace < best.pacePer100m) {
        best = { distance, pacePer100m: round2(pace), sessionId: s.id, date: s.date }
      }
    }
    return best ? [best] : []
  })
}

/** Distance (km) par sport : on n'additionne jamais des km de nage et de course */
export function distanceBySport(sessions: AnalysisSession[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const s of sessions) {
    if (!s.distanceKm) continue
    totals[s.sportSlug] = Math.round(((totals[s.sportSlug] ?? 0) + s.distanceKm) * 100) / 100
  }
  return totals
}

/** Records d'allure de la période qui battent tout ce qui précède */
export function newSwimRecords(period: SwimRecord[], before: SwimRecord[]): SwimRecord[] {
  const previous = new Map(before.map((r) => [r.distance, r.pacePer100m]))
  return period.filter(
    (r) => !previous.has(r.distance) || r.pacePer100m < previous.get(r.distance)!
  )
}
