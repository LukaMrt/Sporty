/**
 * Règles de périodisation Daniels : phases, répartition des séances de qualité
 * par distance et par phase, règles de volume et d'affûtage.
 */
import { SessionType } from '#domain/value_objects/planning_types'

// ---------------------------------------------------------------------------
// Daniels phases — internal constants
// ---------------------------------------------------------------------------

export const DANIELS_PHASES = [
  { name: 'FI' },
  { name: 'EQ' },
  { name: 'TQ' },
  { name: 'FQ' },
] as const

export type PhaseName = (typeof DANIELS_PHASES)[number]['name']

// ---------------------------------------------------------------------------
// Distance category helper
// ---------------------------------------------------------------------------

export type DistanceCategory = '5k' | '10k' | 'half' | 'marathon'

export function getDistanceCategory(distanceKm: number): DistanceCategory {
  if (distanceKm <= 5) return '5k'
  if (distanceKm <= 10) return '10k'
  if (distanceKm <= 21.1) return 'half'
  return 'marathon'
}

// ---------------------------------------------------------------------------
// Quality session matrix per phase × distance
// ---------------------------------------------------------------------------

export type QualityMix = SessionType[]

export const QUALITY_MATRIX: Record<DistanceCategory, Record<PhaseName, QualityMix>> = {
  '5k': {
    FI: [SessionType.Easy],
    EQ: [SessionType.Repetition, SessionType.Tempo],
    TQ: [SessionType.Repetition, SessionType.Interval], // 5k : R > I (Daniels §4.3 : R 200-400m prioritaire)
    FQ: [SessionType.Tempo, SessionType.Repetition],
  },
  '10k': {
    FI: [SessionType.Easy],
    EQ: [SessionType.Repetition, SessionType.Tempo],
    TQ: [SessionType.Interval, SessionType.Tempo],
    FQ: [SessionType.Tempo, SessionType.Interval],
  },
  'half': {
    FI: [SessionType.Easy],
    EQ: [SessionType.Repetition, SessionType.Tempo],
    TQ: [SessionType.Interval, SessionType.Tempo, SessionType.MarathonPace],
    FQ: [SessionType.Tempo, SessionType.MarathonPace],
  },
  'marathon': {
    FI: [SessionType.Easy],
    EQ: [SessionType.Repetition, SessionType.Tempo, SessionType.MarathonPace],
    TQ: [SessionType.Interval, SessionType.Tempo, SessionType.MarathonPace],
    FQ: [SessionType.MarathonPace, SessionType.Tempo],
  },
}

// ---------------------------------------------------------------------------
// Volume rules (Daniels percentages applied to work minutes)
// ---------------------------------------------------------------------------

// Cap par séance easy : évite d'absorber tout le volume résiduel sur un seul jour (§7.1 TID pyramidal)
export const MAX_EASY_SESSION_MINUTES = 90

export const VOLUME_RULES = {
  longRunMaxPct: 0.3,
  intervalMaxPct: 0.08,
  tempoMaxPct: 0.1,
  repetitionMaxPct: 0.05,
  weeklyProgressionMax: 0.1,
  recoveryReduction: 0.25, // deterministic 25% (midpoint of Daniels 20-30%)
  recoveryFrequency: 3, // every 3-4 weeks
  taperAlpha: 1.5, // Mujika non-linear exponent
}

// ---------------------------------------------------------------------------
// Taper configuration
// ---------------------------------------------------------------------------

export function getTaperWeeks(distanceKm: number): number {
  if (distanceKm <= 10) return 2
  if (distanceKm <= 21.1) return 3 // 14-21 days per Mujika & Padilla
  return 3
}

// ---------------------------------------------------------------------------
// Interval templates
// ---------------------------------------------------------------------------
