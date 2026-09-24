/**
 * Calcul des bornes des zones cardiaques selon la méthode choisie par l'athlète.
 *
 * Module PUR : il n'importe que des types, pour que le frontend puisse l'utiliser
 * tel quel (aperçu en direct des zones, validation côté client).
 */
import type {
  HrPhysiology,
  HrZoneMethod,
  HrZonesConfig,
  HrZonesIssue,
  ZoneBoundsBpm,
} from '../value_objects/heart_rate_zones_config.js'
import type { DataPoint, HeartRateZones } from '../value_objects/run_metrics.js'

/** Fractions historiques (FC de réserve ou FCmax) : Z1 min → Z5 max */
const STANDARD_FRACTIONS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0] as const

/** Friel : Z2 = 85 %, Z3 = 90 %, Z4 = 95 %, Z5 = 100 % de la LTHR (plancher Z1 = 75 %) */
const LTHR_FRACTIONS = [0.75, 0.85, 0.9, 0.95, 1.0] as const
/** Plafond Z5 quand la FCmax est inconnue */
const LTHR_CEILING_FRACTION = 1.1

export const MIN_PLAUSIBLE_BPM = 30
export const MAX_PLAUSIBLE_BPM = 250

/** Méthode réellement appliquée, `auto` résolu */
export type ResolvedHrZoneMethod = Exclude<HrZoneMethod, 'auto'>

export interface ZoneBoundsResult {
  method: ResolvedHrZoneMethod
  bounds: ZoneBoundsBpm
}

export type ZoneBoundsOutcome = ZoneBoundsResult | { issue: HrZonesIssue }

export function isZoneBoundsResult(outcome: ZoneBoundsOutcome): outcome is ZoneBoundsResult {
  return 'bounds' in outcome
}

function round6(values: number[]): ZoneBoundsBpm {
  return values.map((v) => Math.round(v)) as ZoneBoundsBpm
}

/**
 * Valide 6 bornes : entiers strictement croissants, dans une plage plausible.
 */
export function validateZoneBounds(bounds: readonly number[] | null | undefined): boolean {
  if (!bounds || bounds.length !== 6) return false
  for (let i = 0; i < 6; i++) {
    const v = bounds[i]
    if (!Number.isFinite(v) || v < MIN_PLAUSIBLE_BPM || v > MAX_PLAUSIBLE_BPM) return false
    if (i > 0 && v <= bounds[i - 1]) return false
  }
  return true
}

function hasValidPhysiology(physio: HrPhysiology): boolean {
  const { maxHeartRate: max, restingHeartRate: rest } = physio
  if (max !== null && (max < MIN_PLAUSIBLE_BPM || max > MAX_PLAUSIBLE_BPM)) return false
  if (max !== null && rest !== null && rest >= max) return false
  return true
}

/**
 * Bornes produites par une méthode donnée, ou la raison pour laquelle elle est indisponible.
 */
export function computeZoneBounds(
  method: HrZoneMethod,
  physio: HrPhysiology,
  config: Pick<HrZonesConfig, 'lthr' | 'customBoundsBpm'>
): ZoneBoundsOutcome {
  if (!hasValidPhysiology(physio)) return { issue: 'invalid_physiology' }
  const { maxHeartRate: max, restingHeartRate: rest } = physio

  switch (method) {
    case 'auto':
      return computeZoneBounds(rest !== null ? 'karvonen' : 'percent_max', physio, config)

    case 'karvonen': {
      if (max === null) return { issue: 'missing_max_hr' }
      if (rest === null) return { issue: 'missing_resting_hr' }
      const reserve = max - rest
      return { method, bounds: round6(STANDARD_FRACTIONS.map((f) => rest + f * reserve)) }
    }

    case 'percent_max': {
      if (max === null) return { issue: 'missing_max_hr' }
      return { method, bounds: round6(STANDARD_FRACTIONS.map((f) => f * max)) }
    }

    case 'lthr': {
      const lthr = config.lthr
      if (lthr === null || lthr === undefined) return { issue: 'missing_lthr' }
      const ceiling = max !== null && max > lthr ? max : lthr * LTHR_CEILING_FRACTION
      const bounds = round6([...LTHR_FRACTIONS.map((f) => f * lthr), ceiling])
      return validateZoneBounds(bounds) ? { method, bounds } : { issue: 'invalid_bounds' }
    }

    case 'custom': {
      const custom = config.customBoundsBpm
      if (!validateZoneBounds(custom)) return { issue: 'invalid_bounds' }
      return { method, bounds: [...custom!] as ZoneBoundsBpm }
    }
  }
}

/**
 * Applique la configuration de l'athlète. Si la méthode choisie n'est plus
 * applicable (ex. FC repos effacée), on retombe sur `auto` plutôt que de
 * perdre les zones ; renvoie `null` si même `auto` est impossible (pas de FCmax).
 */
export function resolveZoneBounds(
  config: HrZonesConfig | null | undefined,
  physio: HrPhysiology
): ZoneBoundsResult | null {
  const cfg = config ?? { method: 'auto', lthr: null, customBoundsBpm: null }
  const chosen = computeZoneBounds(cfg.method, physio, cfg)
  if (isZoneBoundsResult(chosen)) return chosen
  const fallback = computeZoneBounds('auto', physio, cfg)
  return isZoneBoundsResult(fallback) ? fallback : null
}

/** Un résultat par méthode (hors `auto`), pour l'aperçu comparatif */
export function previewAllMethods(
  physio: HrPhysiology,
  config: Pick<HrZonesConfig, 'lthr' | 'customBoundsBpm'>
): Record<HrZoneMethod, ZoneBoundsOutcome> {
  return {
    auto: computeZoneBounds('auto', physio, config),
    karvonen: computeZoneBounds('karvonen', physio, config),
    percent_max: computeZoneBounds('percent_max', physio, config),
    lthr: computeZoneBounds('lthr', physio, config),
    custom: computeZoneBounds('custom', physio, config),
  }
}

/**
 * Zone (1–5) d'une FC. 0 sous la borne basse de Z1 ; au-dessus de Z5 max, reste en Z5.
 */
export function getZoneForBpm(bounds: ZoneBoundsBpm, hr: number): number {
  if (hr < bounds[0]) return 0
  for (let zone = 1; zone <= 5; zone++) {
    if (hr < bounds[zone]) return zone
  }
  return 5
}

/**
 * Répartition temporelle (%) par zone d'une courbe FC. La durée d'un segment est
 * l'écart jusqu'au point suivant ; le temps hors zone compte dans le total.
 */
export function calculateZonesFromBounds(
  bounds: ZoneBoundsBpm,
  heartRateCurve: DataPoint[]
): HeartRateZones {
  const empty = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
  if (heartRateCurve.length === 0) return empty

  const durations = [0, 0, 0, 0, 0]
  let total = 0
  for (let i = 0; i < heartRateCurve.length - 1; i++) {
    const segment = heartRateCurve[i + 1].time - heartRateCurve[i].time
    if (segment <= 0) continue
    const zone = getZoneForBpm(bounds, heartRateCurve[i].value)
    if (zone >= 1) durations[zone - 1] += segment
    total += segment
  }
  if (total === 0) return empty

  const pct = (d: number) => Math.round((d / total) * 100)
  return {
    z1: pct(durations[0]),
    z2: pct(durations[1]),
    z3: pct(durations[2]),
    z4: pct(durations[3]),
    z5: pct(durations[4]),
  }
}

/** Format attendu par le graphique de zones du frontend */
export function boundsToThresholds(
  bounds: ZoneBoundsBpm
): Array<{ zone: number; minBpm: number; maxBpm: number }> {
  return [1, 2, 3, 4, 5].map((zone) => ({
    zone,
    minBpm: bounds[zone - 1],
    maxBpm: bounds[zone],
  }))
}
