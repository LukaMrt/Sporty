import type { RouteSignature } from '#domain/services/analysis/route'

/** Distances standard des meilleurs efforts (mètres) */
export const EFFORT_DISTANCES = [400, 1000, 1609, 5000, 10000, 21097, 42195] as const
export type EffortDistance = (typeof EFFORT_DISTANCES)[number]

/**
 * Indicateurs calculés une fois par séance (à l'écriture) et stockés dans
 * `sessions.analysis` : petits, ils sont lus par les graphiques sans charger
 * les courbes complètes.
 */
export type SessionAnalysis = {
  /** Meilleur temps (s) sur chaque distance standard, à l'intérieur de la séance */
  bestEfforts: Partial<Record<EffortDistance, number>>
  /** Efficiency Factor : vitesse (m/min) / FC moyenne */
  efficiencyFactor: number | null
  /** Découplage aérobie Pa:HR (%) entre les deux moitiés ; positif = dérive */
  decoupling: number | null
  /** Secondes passées dans chaque zone (Z1 → Z5) */
  zoneSeconds: [number, number, number, number, number] | null
  /** FC max observée (percentile 99 de la courbe, ignore les pics isolés) */
  observedMaxHr: number | null
  /** Meilleure FC moyenne sur 20 min (estimation LTHR) */
  best20MinHr: number | null
  /** Séance « facile » : FC moyenne en Z1–Z2 */
  easy: boolean
  /** Allure ajustée à la pente (s/km, modèle de Minetti) ; null sans altitude */
  gradeAdjustedPace?: number | null
  /** Empreinte du parcours pour détecter les parcours récurrents (F4) */
  route?: RouteSignature | null
}

export const EMPTY_SESSION_ANALYSIS: SessionAnalysis = {
  bestEfforts: {},
  efficiencyFactor: null,
  decoupling: null,
  zoneSeconds: null,
  observedMaxHr: null,
  best20MinHr: null,
  easy: false,
  gradeAdjustedPace: null,
}
