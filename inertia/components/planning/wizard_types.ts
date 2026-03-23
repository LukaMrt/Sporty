import type { PaceZones } from '~/components/planning/VdotEstimationForm'

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface WizardState {
  distanceKm: number | null
  targetTimeMinutes: number | null
  eventDate: string | null
  vdot: number | null
  paceZones: PaceZones | null
  sessionsPerWeek: 3 | 4 | 5
  preferredDays: DayKey[]
  planDurationWeeks: number | null
}

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const DISTANCE_SHORTCUTS = [
  { label: '5K', value: 5 },
  { label: '10K', value: 10 },
  { label: 'Semi', value: 21.1 },
  { label: 'Marathon', value: 42.195 },
]

export function defaultDuration(distanceKm: number, vdot: number): number {
  const level = vdot < 30 ? 'beginner' : vdot <= 45 ? 'intermediate' : 'advanced'
  if (distanceKm <= 5.5) return 8
  if (distanceKm <= 12) return level === 'beginner' ? 12 : 8
  if (distanceKm <= 22) return level === 'beginner' ? 16 : level === 'intermediate' ? 12 : 10
  return level === 'beginner' ? 20 : level === 'intermediate' ? 16 : 14
}

export function weeksUntilDate(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(1, Math.round(diff / (7 * 24 * 60 * 60 * 1000)))
}
