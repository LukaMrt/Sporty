import type { DataPoint } from '#domain/value_objects/run_metrics'

export type SessionLoadInput = {
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
  /** FC moyenne : TRIMPexp « mono-point » quand la courbe manque */
  avgHeartRate?: number
  /** FC au seuil saisie par l'athlète (sinon estimée à 88 % FCmax) */
  lthr?: number

  // ── Branche rTSS ─────────────────────────────────────────────────────────
  /** Allure moyenne de la séance en m/min */
  avgPaceMPerMin?: number
  /** VDOT de l'athlète */
  vdot?: number
  /**
   * La séance est-elle de la course à pied ? L'allure d'un autre sport (vélo…)
   * n'a pas de sens face à un VDOT : rTSS est alors ignoré. Non renseigné = course.
   */
  isRunning?: boolean

  // ── Branche sTSS (natation) ───────────────────────────────────────────────
  /** La séance est-elle de la natation ? */
  isSwimming?: boolean
  /** CSS de l'athlète en min/100 m */
  cssPacePer100m?: number

  // ── Branche RPE ──────────────────────────────────────────────────────────
  /** Effort perçu, échelle du formulaire : 1 à 5 */
  perceivedEffort?: number
}
