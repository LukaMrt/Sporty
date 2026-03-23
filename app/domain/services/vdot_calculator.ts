import type { PaceZoneRange, PaceZones } from '#domain/value_objects/pace_zones'

// ── Formules Daniels-Gilbert (1979) ───────────────────────────────────────────
// v en m/min
// VO₂ = -4.60 + 0.182258 × v + 0.000104 × v²
// %VO₂max = 0.8 + 0.1894393 × e^(-0.012778 × t) + 0.2989558 × e^(-0.1932605 × t)
// VDOT = VO₂ / %VO₂max

function vo2AtVelocity(velocityMperMin: number): number {
  return -4.6 + 0.182258 * velocityMperMin + 0.000104 * velocityMperMin ** 2
}

function pctVo2maxAtDuration(durationMinutes: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * durationMinutes) +
    0.2989558 * Math.exp(-0.1932605 * durationMinutes)
  )
}

// ── calculateVdot ─────────────────────────────────────────────────────────────

/**
 * Calcule le VDOT depuis une performance de course.
 * @param distanceMeters Distance en mètres
 * @param durationMinutes Durée en minutes
 */
export function calculateVdot(distanceMeters: number, durationMinutes: number): number {
  const velocityMperMin = distanceMeters / durationMinutes
  const vo2 = vo2AtVelocity(velocityMperMin)
  const pctVo2max = pctVo2maxAtDuration(durationMinutes)
  return vo2 / pctVo2max
}

// ── derivePaceZones ───────────────────────────────────────────────────────────

// Zones en % VDOT selon Daniels
const ZONE_RANGES = {
  easy: { min: 0.59, max: 0.74 },
  marathon: { min: 0.75, max: 0.84 },
  threshold: { min: 0.83, max: 0.88 },
  interval: { min: 0.95, max: 1.0 },
  repetition: { min: 1.05, max: 1.2 },
} as const

/**
 * Convertit une vitesse en m/min vers min/km.
 * À vitesse plus élevée = allure plus basse (min/km).
 */
function velocityToPaceMinPerKm(velocityMperMin: number): number {
  return 1000 / velocityMperMin
}

/**
 * Trouve la vitesse (m/min) correspondant à un VO₂ cible.
 * Résolution quadratique directe de l'Équation 1 : VO₂ = -4.6 + 0.182258v + 0.000104v²
 * Pas de durée implicite — résolution pure de la relation VO₂ ↔ vitesse.
 */
function velocityForVO2(targetVO2: number): number {
  // 0.000104v² + 0.182258v + (-4.6 - targetVO2) = 0
  const a = 0.000104
  const b = 0.182258
  const c = -4.6 - targetVO2
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return 200 // fallback (ne devrait pas arriver pour des VDOT raisonnables)
  return (-b + Math.sqrt(discriminant)) / (2 * a)
}

function buildZoneRange(vdot: number, pctMin: number, pctMax: number): PaceZoneRange {
  // VO₂ cible = %zone × VDOT → résolution directe VO₂ → vitesse
  const vMin = velocityForVO2(vdot * pctMin)
  const vMax = velocityForVO2(vdot * pctMax)
  return {
    minPacePerKm: velocityToPaceMinPerKm(vMax), // allure min = vitesse max
    maxPacePerKm: velocityToPaceMinPerKm(vMin), // allure max = vitesse min
  }
}

/**
 * Dérive les 5 zones d'allure Daniels depuis un VDOT.
 */
export function derivePaceZones(vdot: number): PaceZones {
  return {
    easy: buildZoneRange(vdot, ZONE_RANGES.easy.min, ZONE_RANGES.easy.max),
    marathon: buildZoneRange(vdot, ZONE_RANGES.marathon.min, ZONE_RANGES.marathon.max),
    threshold: buildZoneRange(vdot, ZONE_RANGES.threshold.min, ZONE_RANGES.threshold.max),
    interval: buildZoneRange(vdot, ZONE_RANGES.interval.min, ZONE_RANGES.interval.max),
    repetition: buildZoneRange(vdot, ZONE_RANGES.repetition.min, ZONE_RANGES.repetition.max),
  }
}

// ── vdotFromVma ───────────────────────────────────────────────────────────────

/**
 * Estime un VDOT depuis une VMA (vitesse maximale aérobie) en km/h.
 * VMA ≈ vitesse à 100% VO₂max → on résout calculateVdot à cette vitesse.
 */
export function vdotFromVma(vmaKmh: number): number {
  // VMA en m/min
  const vmaMMmin = (vmaKmh * 1000) / 60
  // À VMA on est à ~100% VO₂max (~6 min effort)
  const durationMin = 6
  const distanceM = vmaMMmin * durationMin
  return calculateVdot(distanceM, durationMin)
}

// ── vdotFromQuestionnaire ─────────────────────────────────────────────────────

export type RunningFrequency = 'never' | 'occasional' | 'regular' | 'frequent'
export type RunningExperience = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type TypicalDistance = 'less_5k' | '5k_10k' | '10k_half' | 'half_plus'

// Table de mapping conservateur : score = fréquence + expérience + distance → VDOT
// Scores 0-2 → VDOT 25, 3-4 → 32, 5-6 → 38, 7-8 → 45, 9+ → 52
const FREQUENCY_SCORE: Record<RunningFrequency, number> = {
  never: 0,
  occasional: 1,
  regular: 2,
  frequent: 3,
}

const EXPERIENCE_SCORE: Record<RunningExperience, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  expert: 3,
}

const DISTANCE_SCORE: Record<TypicalDistance, number> = {
  'less_5k': 0,
  '5k_10k': 1,
  '10k_half': 2,
  'half_plus': 3,
}

const SCORE_TO_VDOT: [maxScore: number, vdot: number][] = [
  [2, 25],
  [4, 32],
  [6, 38],
  [8, 45],
  [9, 52],
]

/**
 * Estime un VDOT conservateur depuis les réponses au questionnaire d'onboarding.
 */
export function vdotFromQuestionnaire(
  frequency: RunningFrequency,
  experience: RunningExperience,
  typicalDistance: TypicalDistance
): number {
  const score =
    FREQUENCY_SCORE[frequency] + EXPERIENCE_SCORE[experience] + DISTANCE_SCORE[typicalDistance]
  for (const [maxScore, vdot] of SCORE_TO_VDOT) {
    if (score <= maxScore) return vdot
  }
  return 52
}

// ── vdotFromHistory ───────────────────────────────────────────────────────────

export interface RunSession {
  distanceMeters: number
  durationMinutes: number
  date: Date
  sportType?: string
}

const SIX_WEEKS_MS = 6 * 7 * 24 * 60 * 60 * 1000
const MIN_DISTANCE_METERS = 3000
const MIN_ELIGIBLE_SESSIONS = 3
const PACE_REGULARITY_THRESHOLD = 0.15 // CV < 15% = allure régulière

/**
 * Estime le VDOT depuis un historique de séances de course.
 * Filtre : running > 3km, allure régulière (CV < 15%), 6 dernières semaines.
 * Retourne le VDOT au 90e percentile, ou null si < 3 séances éligibles.
 */
export function vdotFromHistory(sessions: RunSession[]): number | null {
  const cutoff = new Date(Date.now() - SIX_WEEKS_MS)

  const eligible = sessions.filter((s) => {
    const isRunning = !s.sportType || s.sportType.toLowerCase().includes('run')
    const isLongEnough = s.distanceMeters >= MIN_DISTANCE_METERS
    const isRecent = s.date >= cutoff
    return isRunning && isLongEnough && isRecent
  })

  if (eligible.length < MIN_ELIGIBLE_SESSIONS) return null

  // Filtre : allure régulière — on garde les séances dans ±15% de la moyenne
  const paces = eligible.map((s) => s.distanceMeters / s.durationMinutes)
  const meanPace = paces.reduce((a, b) => a + b, 0) / paces.length
  const std = Math.sqrt(paces.reduce((a, v) => a + (v - meanPace) ** 2, 0) / paces.length)
  const cv = std / meanPace

  const regularSessions =
    cv < PACE_REGULARITY_THRESHOLD
      ? eligible
      : eligible.filter((s) => {
          const pace = s.distanceMeters / s.durationMinutes
          return Math.abs(pace - meanPace) / meanPace < PACE_REGULARITY_THRESHOLD
        })

  const vdots = regularSessions.map((s) => calculateVdot(s.distanceMeters, s.durationMinutes))
  vdots.sort((a, b) => a - b)

  const p90Index = Math.floor(0.9 * (vdots.length - 1))
  return vdots[p90Index]
}
