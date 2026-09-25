/** Sous-types de natation reconnus (saisie manuelle et import) */
export type SwimSubType = 'pool' | 'open_water'

/**
 * Métriques spécifiques à la natation, stockées dans `sportMetrics` à côté des
 * métriques communes (FC, calories…). Tous les champs sont optionnels : leur
 * disponibilité dépend de la montre et du provider.
 */
export type SwimMetrics = {
  subType?: SwimSubType | null
  /** Longueur du bassin en mètres (25, 50…) ; absente en eau libre */
  poolLengthM?: number | null
  /** Nombre de longueurs nagées */
  laps?: number | null
  /** Nombre total de mouvements de bras */
  strokes?: number | null
  /** SWOLF moyen : secondes + mouvements par longueur (plus bas = plus efficace) */
  swolf?: number | null
}
