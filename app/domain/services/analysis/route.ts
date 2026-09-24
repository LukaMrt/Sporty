import type { GpsPoint } from '#domain/value_objects/run_metrics'
import { cumulativeDistances, distanceMeters } from '#domain/services/analysis/geo'

/** Maille de ~200 m pour comparer des parcours malgré le bruit GPS */
const CELL_DEG = 0.002
const SIGNATURE_POINTS = 12

export interface RouteSignature {
  start: string
  end: string
  distanceM: number
  /** Cellules traversées à intervalles réguliers de distance */
  cells: string[]
}

const cellOf = (p: GpsPoint) => `${Math.round(p.lat / CELL_DEG)}:${Math.round(p.lon / CELL_DEG)}`

/** Point de la trace à une distance cumulée donnée */
function pointAt(track: GpsPoint[], cum: number[], distance: number): GpsPoint {
  const i = cum.findIndex((d) => d >= distance)
  return track[i < 0 ? track.length - 1 : i]
}

/** F4 · Empreinte compacte d'un parcours (quelques centaines d'octets) */
export function routeSignature(track: GpsPoint[]): RouteSignature | null {
  if (track.length < 10) return null
  const cum = cumulativeDistances(track)
  const total = cum[cum.length - 1]
  if (total < 500) return null
  const cells = Array.from({ length: SIGNATURE_POINTS }, (_, k) =>
    cellOf(pointAt(track, cum, (total * (k + 1)) / (SIGNATURE_POINTS + 1)))
  )
  return {
    start: cellOf(track[0]),
    end: cellOf(track[track.length - 1]),
    distanceM: Math.round(total),
    cells,
  }
}

/** Deux cellules voisines (le GPS peut basculer d'une maille à l'autre) */
function near(a: string, b: string): boolean {
  const [ay, ax] = a.split(':').map(Number)
  const [by, bx] = b.split(':').map(Number)
  return Math.abs(ay - by) <= 1 && Math.abs(ax - bx) <= 1
}

/**
 * Même parcours : départ et arrivée voisins, distance à ±7 %, et au moins 75 %
 * des points de passage communs (dans un sens ou dans l'autre).
 */
export function sameRoute(a: RouteSignature, b: RouteSignature): boolean {
  if (Math.abs(a.distanceM - b.distanceM) / Math.max(a.distanceM, b.distanceM) > 0.07) return false
  const matches = (cells: string[]) =>
    a.cells.filter((cell, i) => near(cell, cells[i])).length / a.cells.length
  const forward = near(a.start, b.start) && near(a.end, b.end) && matches(b.cells) >= 0.75
  const reverse =
    near(a.start, b.end) && near(a.end, b.start) && matches([...b.cells].reverse()) >= 0.75
  return forward || reverse
}

/** Trace allégée pour les cartes (≤ `maxPoints` points, coordonnées arrondies à ~1 m) */
export function trackPreview(track: GpsPoint[], maxPoints = 200): [number, number][] {
  if (track.length === 0) return []
  const step = Math.max(1, Math.ceil(track.length / maxPoints))
  const out: [number, number][] = []
  for (let i = 0; i < track.length; i += step) {
    out.push([Math.round(track[i].lat * 1e5) / 1e5, Math.round(track[i].lon * 1e5) / 1e5])
  }
  const last = track[track.length - 1]
  out.push([Math.round(last.lat * 1e5) / 1e5, Math.round(last.lon * 1e5) / 1e5])
  return out
}

// ── Zones de confidentialité (masquage autour du domicile) ───────────────────

export interface PrivacyZone {
  lat: number
  lon: number
  radiusM: number
}

/** Retire les points situés dans une zone de confidentialité (affichage et partage) */
export function maskPoints<T extends { lat: number; lon: number }>(
  points: T[],
  zones: PrivacyZone[]
): T[] {
  if (zones.length === 0) return points
  return points.filter((p) =>
    zones.every((z) => distanceMeters(p.lat, p.lon, z.lat, z.lon) > z.radiusM)
  )
}

// ── F3 · Alignement sur la distance ───────────────────────────────────────────

export interface DistancePoint {
  /** Distance cumulée (km) */
  km: number
  /** Temps écoulé (s) */
  elapsed: number
  /** Allure sur le dernier intervalle (s/km) */
  pace: number | null
  heartRate: number | null
}

/**
 * Rééchantillonne une séance tous les `stepM` mètres : permet de superposer
 * plusieurs séances sur un axe commun de distance (et non de temps).
 */
export function alignByDistance(
  track: GpsPoint[],
  heartRateCurve: { time: number; value: number }[] = [],
  stepM = 100
): DistancePoint[] {
  if (track.length < 2) return []
  const cum = cumulativeDistances(track)
  const t0 = track[0].time
  const hrAt = (time: number) => {
    if (heartRateCurve.length === 0) return null
    let best = heartRateCurve[0]
    for (const p of heartRateCurve) {
      if (p.time > time) break
      best = p
    }
    return best.value
  }

  const out: DistancePoint[] = []
  let j = 0
  let previousElapsed = 0
  for (let d = stepM; d <= cum[cum.length - 1]; d += stepM) {
    while (j < cum.length - 1 && cum[j + 1] < d) j++
    const seg = cum[j + 1] - cum[j]
    const ratio = seg > 0 ? (d - cum[j]) / seg : 0
    const time = track[j].time + ratio * (track[j + 1].time - track[j].time)
    const elapsed = time - t0
    out.push({
      km: Math.round(d) / 1000,
      elapsed: Math.round(elapsed),
      pace: Math.round(((elapsed - previousElapsed) / stepM) * 1000),
      heartRate: hrAt(time - t0),
    })
    previousElapsed = elapsed
  }
  return out
}
