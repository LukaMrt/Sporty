/**
 * Méthode de calcul des zones cardiaques.
 *
 * - `auto`        : Karvonen si la FC repos est connue, sinon % FCmax (comportement historique)
 * - `karvonen`    : % de la FC de réserve (FCmax − FCrepos)
 * - `percent_max` : % de la FC max
 * - `lthr`        : % de la FC au seuil lactique (méthode Friel)
 * - `custom`      : bornes saisies manuellement par l'athlète
 */
export const HrZoneMethod = {
  Auto: 'auto',
  Karvonen: 'karvonen',
  PercentMax: 'percent_max',
  Lthr: 'lthr',
  Custom: 'custom',
} as const

export type HrZoneMethod = (typeof HrZoneMethod)[keyof typeof HrZoneMethod]

export const HR_ZONE_METHODS: HrZoneMethod[] = Object.values(HrZoneMethod)

/**
 * 6 bornes croissantes en bpm : [Z1 min, Z1/Z2, Z2/Z3, Z3/Z4, Z4/Z5, Z5 max].
 * Une FC sous la première borne est hors zone (0) ; au-dessus de la dernière, elle reste en Z5.
 */
export type ZoneBoundsBpm = [number, number, number, number, number, number]

export type HrZonesConfig = {
  method: HrZoneMethod
  /** FC au seuil lactique (bpm), requise pour la méthode `lthr` */
  lthr: number | null
  /** Bornes manuelles, requises pour la méthode `custom` */
  customBoundsBpm: ZoneBoundsBpm | null
}

export const DEFAULT_HR_ZONES_CONFIG: HrZonesConfig = {
  method: HrZoneMethod.Auto,
  lthr: null,
  customBoundsBpm: null,
}

/** Données physiologiques nécessaires aux méthodes calculées */
export type HrPhysiology = {
  maxHeartRate: number | null
  restingHeartRate: number | null
}

/** Raison pour laquelle une configuration ne peut pas produire de zones */
export type HrZonesIssue =
  'missing_max_hr' | 'missing_resting_hr' | 'missing_lthr' | 'invalid_bounds' | 'invalid_physiology'
