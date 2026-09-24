import type { GpsPoint } from '#domain/value_objects/run_metrics'

const EARTH_RADIUS_M = 6_371_000

/** Distance orthodromique (m) entre deux coordonnées */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const h =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function haversine(a: GpsPoint, b: GpsPoint): number {
  return distanceMeters(a.lat, a.lon, b.lat, b.lon)
}

/** Distance cumulée (m) à chaque point de la trace */
export function cumulativeDistances(track: GpsPoint[]): number[] {
  const out = [0]
  for (let i = 1; i < track.length; i++) out.push(out[i - 1] + haversine(track[i - 1], track[i]))
  return out
}
