import type { DataPoint } from '#domain/value_objects/run_metrics'

export interface SessionLoadInput {
  /** Durée de la séance en heures */
  durationHours: number

  // ── Branche TRIMPexp ──────────────────────────────────────────────────────
  /** Courbe FC (time en secondes, value en bpm) */
  heartRateCurve?: DataPoint[]
  /** FC maximale de l'athlète (bpm) */
  maxHR?: number
  /** FC de repos de l'athlète (bpm) */
  restHR?: number
  /** Sexe biologique (défaut : male) */
  sex?: 'male' | 'female'

  // ── Branche rTSS ─────────────────────────────────────────────────────────
  /** Allure moyenne de la séance en m/min */
  avgPaceMPerMin?: number
  /** VDOT de l'athlète */
  vdot?: number

  // ── Branche RPE ──────────────────────────────────────────────────────────
  /** Effort perçu (1-10) */
  perceivedEffort?: number
}
