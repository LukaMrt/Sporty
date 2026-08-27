import { CYCLING_SLUGS, type SportySportSlug } from '#connectors/sport_slug'

/**
 * Allure normalisee Sporty : km/h pour le velo, min/km pour tout le reste.
 *
 * Factorise ici pour que les connecteurs ne divergent pas sur une metrique qui
 * alimente l'estimation de VDOT et les plans.
 */
export function computeAllure(speedMs: number | null, sportSlug: SportySportSlug): number | null {
  if (speedMs === null || speedMs <= 0) return null
  if (CYCLING_SLUGS.includes(sportSlug)) {
    return speedMs * 3.6
  }
  return 1000 / (speedMs * 60)
}

/** Variante pour les APIs qui ne donnent pas de vitesse mais distance + duree. */
export function computeAllureFromDistance(
  distanceMeters: number | null,
  durationSeconds: number,
  sportSlug: SportySportSlug
): number | null {
  if (distanceMeters === null || distanceMeters <= 0 || durationSeconds <= 0) return null
  return computeAllure(distanceMeters / durationSeconds, sportSlug)
}
