import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import type { SessionLoadInput } from '#domain/value_objects/session_load_input'
import type { TrainingLoad } from '#domain/value_objects/training_load'
import type { DataPoint } from '#domain/value_objects/run_metrics'

// ── Constantes TRIMPexp (Banister, 1991) ─────────────────────────────────────

const K_MALE = 1.92
const K_FEMALE = 1.67

/** FC au seuil lactique estimée à 88% FCmax (convention Daniels zone T) */
const LTHR_PCT_OF_MAX = 0.88

// ── Helpers TRIMPexp ──────────────────────────────────────────────────────────

/**
 * Calcule le TRIMPexp Banister depuis une courbe FC.
 * TRIMPexp = Σ (Δt × HRr × 0.64 × e^(k × HRr))
 * HRr = (FC_exercice - FC_repos) / (FC_max - FC_repos)
 */
function calculateTrImpExp(
  heartRateCurve: DataPoint[],
  maxHR: number,
  restHR: number,
  k: number
): number {
  if (heartRateCurve.length < 2) return 0

  let trimp = 0
  for (let i = 1; i < heartRateCurve.length; i++) {
    const prev = heartRateCurve[i - 1]
    const curr = heartRateCurve[i]
    const deltaT = (curr.time - prev.time) / 60 // en minutes
    const avgHR = (prev.value + curr.value) / 2
    const hrr = (avgHR - restHR) / (maxHR - restHR)
    if (hrr <= 0) continue
    trimp += deltaT * hrr * 0.64 * Math.exp(k * hrr)
  }

  return trimp
}

/**
 * Construit une courbe FC plate à lthr sur 1h (3600 secondes, 1 point/s).
 * Sert de référence pour la normalisation hrTSS.
 */
function referenceTrImpExp1hAtLthr(maxHR: number, restHR: number, k: number): number {
  const lthr = maxHR * LTHR_PCT_OF_MAX
  // 2 points suffisent pour une courbe plate (Δt = 3600s)
  const curve: DataPoint[] = [
    { time: 0, value: lthr },
    { time: 3600, value: lthr },
  ]
  return calculateTrImpExp(curve, maxHR, restHR, k)
}

// ── Helpers rTSS ──────────────────────────────────────────────────────────────

/**
 * Calcule la vitesse au seuil lactique depuis le VDOT.
 * On résout numériquement : à quelle vitesse (m/min) VDOT = vdot_athlète à 88% VO2max.
 * Approximation directe : allure seuil ≈ vitesse au VDOT × √0.88 (Daniels).
 */
function thresholdPaceMPerMin(vdot: number): number {
  // Velocity correspondant à 88% VDOT (% VO2max threshold)
  // VO2 = -4.60 + 0.182258*v + 0.000104*v²  → résolution inverse
  // On utilise une approximation linéaire suffisante pour la normalisation
  // À 88% VDOT, %VO2max ≈ 0.88 → on cherche v tel que VO2(v) / pctVO2max(t_seuil) = vdot * 0.88
  // En pratique, allure seuil ≈ vitesse 5K × 0.88^0.5 (simplification Daniels)
  // Méthode directe : résolution quadratique de VO2 = vdot * 0.88
  const targetVO2 = vdot * 0.88
  // VO2 = -4.60 + 0.182258*v + 0.000104*v²
  // 0.000104*v² + 0.182258*v + (-4.60 - targetVO2) = 0
  const a = 0.000104
  const b = 0.182258
  const c = -4.6 - targetVO2
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return 200 // fallback (ne devrait pas arriver)
  return (-b + Math.sqrt(discriminant)) / (2 * a)
}

// ── TrainingLoadCalculatorImpl ────────────────────────────────────────────────

export class TrainingLoadCalculatorImpl extends TrainingLoadCalculator {
  calculate(input: SessionLoadInput): TrainingLoad {
    // Branche 1 : TRIMPexp (FC disponible)
    if (
      input.heartRateCurve &&
      input.heartRateCurve.length >= 2 &&
      input.maxHR !== undefined &&
      input.restHR !== undefined
    ) {
      return this.#calcHrTss(input)
    }

    // Branche 2 : rTSS (allure + VDOT disponibles)
    if (input.avgPaceMPerMin !== undefined && input.vdot !== undefined) {
      return this.#calcRtss(input)
    }

    // Branche 3 : Session RPE
    if (input.perceivedEffort !== undefined && input.perceivedEffort > 0) {
      return this.#calcRpe(input)
    }

    // Branche 4 : fallback
    return { value: 0, method: 'rpe' }
  }

  #calcHrTss(input: SessionLoadInput): TrainingLoad {
    const { heartRateCurve, maxHR, restHR, sex } = input as Required<
      Pick<SessionLoadInput, 'heartRateCurve' | 'maxHR' | 'restHR'>
    > &
      SessionLoadInput
    const k = sex === 'female' ? K_FEMALE : K_MALE

    const trimpSession = calculateTrImpExp(heartRateCurve, maxHR, restHR, k)
    const trimpRef = referenceTrImpExp1hAtLthr(maxHR, restHR, k)

    if (trimpRef === 0) return { value: 0, method: 'trimp_exp' }

    const value = (trimpSession / trimpRef) * 100
    return { value: Math.round(value * 10) / 10, method: 'trimp_exp' }
  }

  #calcRtss(input: SessionLoadInput): TrainingLoad {
    const { avgPaceMPerMin, vdot, durationHours } = input as Required<
      Pick<SessionLoadInput, 'avgPaceMPerMin' | 'vdot' | 'durationHours'>
    >
    const thresholdPace = thresholdPaceMPerMin(vdot)
    const intensityFactor = avgPaceMPerMin / thresholdPace
    const value = intensityFactor ** 2 * durationHours * 100
    return { value: Math.round(value * 10) / 10, method: 'rtss' }
  }

  #calcRpe(input: SessionLoadInput): TrainingLoad {
    // Session RPE : effort × durée en minutes / facteur normalisation
    // Coeff normalisation : 1h à effort 7/10 (seuil) = 100 TSS
    // => coeff = 7 * 60 / 100 = 4.2
    const RPE_NORM_COEFF = 4.2
    const durationMinutes = input.durationHours * 60
    const value = ((input.perceivedEffort ?? 0) * durationMinutes) / RPE_NORM_COEFF
    return { value: Math.round(value * 10) / 10, method: 'rpe' }
  }
}
