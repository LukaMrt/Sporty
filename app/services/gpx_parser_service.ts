import { XMLParser } from 'fast-xml-parser'
import { GpxParser, type GpxParseResult } from '#domain/interfaces/gpx_parser'
import { GpxParseError } from '#domain/errors/gpx_parse_error'
import type { DataPoint, GpsPoint, KmSplit } from '#domain/value_objects/run_metrics'

interface RawTrackpoint {
  lat: number
  lon: number
  ele?: number
  timeMs: number // timestamp Unix ms
  hr?: number
  cad?: number
}

interface ParsedXml {
  gpx?: {
    trk?: Array<{
      trkseg?: Array<{
        trkpt?: Array<Record<string, unknown>>
      }>
    }>
  }
}

export class GpxParserService extends GpxParser {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['trkpt', 'trkseg', 'trk'].includes(name),
  })

  parse(content: string): GpxParseResult {
    let root: ParsedXml
    try {
      root = this.parser.parse(content) as ParsedXml
    } catch {
      throw new GpxParseError('Format GPX invalide')
    }

    const trkpts = root?.gpx?.trk?.[0]?.trkseg?.[0]?.trkpt
    if (!trkpts) {
      throw new GpxParseError('Aucun trackpoint trouvé')
    }

    const rawPoints = this.extractTrackpoints(trkpts)

    if (rawPoints.length < 2) {
      throw new GpxParseError('Aucun trackpoint trouvé')
    }

    const distanceMeters = this.computeTotalDistance(rawPoints)
    const durationSeconds = Math.round(
      (rawPoints[rawPoints.length - 1].timeMs - rawPoints[0].timeMs) / 1000
    )

    const hasHr = rawPoints.some((p) => p.hr !== undefined)
    const hasCad = rawPoints.some((p) => p.cad !== undefined)
    const hasEle = rawPoints.some((p) => p.ele !== undefined)

    // Allure instantanée (s/m) + lissage 30s
    const rawPace = this.computeRawPace(rawPoints)
    const smoothedPace = this.smoothPace(rawPace, rawPoints, 30)

    // Rééchantillonnage 15s
    const startMs = rawPoints[0].timeMs
    const endMs = rawPoints[rawPoints.length - 1].timeMs
    const samples = this.buildTimeSamples(startMs, endMs, 15)

    const paceCurve = this.resampleValues(samples, rawPoints, smoothedPace)
    const heartRateCurve = hasHr
      ? this.resampleValues(
          samples,
          rawPoints,
          rawPoints.map((p) => p.hr ?? 0)
        )
      : undefined
    const altitudeCurve = hasEle
      ? this.resampleValues(
          samples,
          rawPoints,
          rawPoints.map((p) => p.ele ?? 0)
        )
      : undefined
    const gpsTrack = this.resampleGps(samples, rawPoints)

    // Dénivelé (seuil bruit 2m)
    let elevationGain: number | undefined
    let elevationLoss: number | undefined
    if (hasEle) {
      const { gain, loss } = this.computeElevation(rawPoints)
      elevationGain = gain
      elevationLoss = loss
    }

    // FC min/moy/max
    let minHeartRate: number | undefined
    let avgHeartRate: number | undefined
    let maxHeartRate: number | undefined
    if (hasHr) {
      const hrValues = rawPoints.filter((p) => p.hr !== undefined).map((p) => p.hr as number)
      minHeartRate = Math.min(...hrValues)
      maxHeartRate = Math.max(...hrValues)
      avgHeartRate = Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)
    }

    // Cadence moyenne
    let cadenceAvg: number | undefined
    if (hasCad) {
      const cadValues = rawPoints.filter((p) => p.cad !== undefined).map((p) => p.cad as number)
      cadenceAvg = Math.round(cadValues.reduce((a, b) => a + b, 0) / cadValues.length)
    }

    // Splits au km
    const splits = this.computeSplits(rawPoints)

    const startTime = new Date(rawPoints[0].timeMs).toISOString()

    return {
      durationSeconds,
      distanceMeters,
      startTime,
      minHeartRate,
      avgHeartRate,
      maxHeartRate,
      cadenceAvg,
      elevationGain,
      elevationLoss,
      heartRateCurve,
      paceCurve,
      altitudeCurve,
      gpsTrack,
      splits,
    }
  }

  private extractTrackpoints(trkpts: Array<Record<string, unknown>>): RawTrackpoint[] {
    const points: RawTrackpoint[] = []

    for (const pt of trkpts) {
      const lat = Number.parseFloat(String(pt['@_lat']))
      const lon = Number.parseFloat(String(pt['@_lon']))
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue

      const timeStr = pt['time']
      if (typeof timeStr !== 'string') continue
      const timeMs = new Date(timeStr).getTime()
      if (Number.isNaN(timeMs)) continue

      const eleRaw = pt['ele']
      const ele =
        typeof eleRaw === 'number'
          ? eleRaw
          : typeof eleRaw === 'string'
            ? Number.parseFloat(eleRaw)
            : undefined

      // Extensions : cherche hr et cad de manière flexible (tous namespaces)
      let hr: number | undefined
      let cad: number | undefined
      if (pt['extensions']) {
        const hrVal = this.findInExtensions(pt['extensions'], 'hr')
        const cadVal = this.findInExtensions(pt['extensions'], 'cad')
        if (hrVal !== undefined) hr = Math.round(Number.parseFloat(hrVal))
        if (cadVal !== undefined) cad = Math.round(Number.parseFloat(cadVal))
      }

      points.push({ lat, lon, ele, timeMs, hr, cad })
    }

    return points
  }

  /** Cherche récursivement une clé (suffixe ou exact) dans un objet d'extensions */
  private findInExtensions(obj: unknown, key: string): string | undefined {
    if (typeof obj !== 'object' || obj === null) return undefined

    for (const k of Object.keys(obj)) {
      if (k === key || k.endsWith(':' + key)) {
        const val = (obj as Record<string, unknown>)[k]
        if (typeof val === 'number' || typeof val === 'string') return String(val)
      }
      const found = this.findInExtensions((obj as Record<string, unknown>)[k], key)
      if (found !== undefined) return found
    }
    return undefined
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000
    const toRad = (d: number) => (d * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  private computeTotalDistance(points: RawTrackpoint[]): number {
    let total = 0
    for (let i = 1; i < points.length; i++) {
      total += this.haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon)
    }
    return total
  }

  /** Retourne allure en s/m pour chaque point (0 pour le premier) */
  private computeRawPace(points: RawTrackpoint[]): number[] {
    const paces: number[] = [0]
    for (let i = 1; i < points.length; i++) {
      const dt = (points[i].timeMs - points[i - 1].timeMs) / 1000
      const dd = this.haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon)
      paces.push(dd > 0.5 ? dt / dd : 0)
    }
    return paces
  }

  /** Lissage allure sur fenêtre glissante de windowSec secondes */
  private smoothPace(rawPace: number[], points: RawTrackpoint[], windowSec: number): number[] {
    const smoothed: number[] = []
    for (let i = 0; i < points.length; i++) {
      const windowMs = windowSec * 1000
      const tEnd = points[i].timeMs
      const tStart = tEnd - windowMs

      const vals: number[] = []
      for (let j = 0; j <= i; j++) {
        if (points[j].timeMs >= tStart && rawPace[j] > 0) {
          vals.push(rawPace[j])
        }
      }
      smoothed.push(vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0)
    }
    return smoothed
  }

  /** Génère la liste des timestamps cibles (toutes les intervalSec secondes) */
  private buildTimeSamples(startMs: number, endMs: number, intervalSec: number): number[] {
    const samples: number[] = []
    for (let t = startMs; t <= endMs; t += intervalSec * 1000) {
      samples.push(t)
    }
    return samples
  }

  /** Rééchantillonne un tableau de valeurs par interpolation linéaire */
  private resampleValues(
    samples: number[],
    points: RawTrackpoint[],
    values: number[]
  ): DataPoint[] {
    return samples.map((t) => {
      const timeSeconds = Math.round((t - points[0].timeMs) / 1000)

      // Trouver les deux points encadrants
      let lo = 0
      let hi = points.length - 1
      for (let i = 0; i < points.length - 1; i++) {
        if (points[i].timeMs <= t && points[i + 1].timeMs >= t) {
          lo = i
          hi = i + 1
          break
        }
      }

      if (lo === hi) {
        return { time: timeSeconds, value: values[lo] }
      }

      const ratio = (t - points[lo].timeMs) / (points[hi].timeMs - points[lo].timeMs)
      const value = values[lo] + ratio * (values[hi] - values[lo])

      return { time: timeSeconds, value: Math.round(value * 100) / 100 }
    })
  }

  /** Rééchantillonne le tracé GPS */
  private resampleGps(samples: number[], points: RawTrackpoint[]): GpsPoint[] {
    return samples.map((t) => {
      const timeSeconds = Math.round((t - points[0].timeMs) / 1000)

      let lo = 0
      let hi = points.length - 1
      for (let i = 0; i < points.length - 1; i++) {
        if (points[i].timeMs <= t && points[i + 1].timeMs >= t) {
          lo = i
          hi = i + 1
          break
        }
      }

      if (lo === hi) {
        return { lat: points[lo].lat, lon: points[lo].lon, ele: points[lo].ele, time: timeSeconds }
      }

      const ratio = (t - points[lo].timeMs) / (points[hi].timeMs - points[lo].timeMs)
      const lat = points[lo].lat + ratio * (points[hi].lat - points[lo].lat)
      const lon = points[lo].lon + ratio * (points[hi].lon - points[lo].lon)
      const loEle = points[lo].ele
      const hiEle = points[hi].ele
      const ele =
        loEle !== undefined && hiEle !== undefined ? loEle + ratio * (hiEle - loEle) : undefined

      return {
        lat: Math.round(lat * 1e7) / 1e7,
        lon: Math.round(lon * 1e7) / 1e7,
        ele,
        time: timeSeconds,
      }
    })
  }

  private computeElevation(points: RawTrackpoint[]): { gain: number; loss: number } {
    const NOISE_THRESHOLD = 2
    let gain = 0
    let loss = 0

    for (let i = 1; i < points.length; i++) {
      if (points[i].ele === undefined || points[i - 1].ele === undefined) continue
      const delta = (points[i].ele as number) - (points[i - 1].ele as number)
      if (delta > NOISE_THRESHOLD) gain += delta
      else if (delta < -NOISE_THRESHOLD) loss += Math.abs(delta)
    }

    return { gain: Math.round(gain), loss: Math.round(loss) }
  }

  private computeSplits(points: RawTrackpoint[]): KmSplit[] {
    const splits: KmSplit[] = []
    let cumDistance = 0
    let lastKmBoundary = 0
    let currentKm = 1
    let splitStartIdx = 0

    for (let i = 1; i < points.length; i++) {
      const segDist = this.haversine(
        points[i - 1].lat,
        points[i - 1].lon,
        points[i].lat,
        points[i].lon
      )
      cumDistance += segDist

      while (cumDistance >= currentKm * 1000) {
        // Interpoler le timestamp exact du passage au km
        const distToKm = currentKm * 1000 - lastKmBoundary
        const segRatio = distToKm / (cumDistance - lastKmBoundary + segDist)
        const kmTimeMs =
          points[splitStartIdx].timeMs +
          segRatio * (points[i].timeMs - points[splitStartIdx].timeMs)

        const splitDuration = (kmTimeMs - points[splitStartIdx].timeMs) / 1000
        const paceSeconds = Math.round(splitDuration)

        // FC moyenne du split
        let avgHeartRate: number | undefined
        const splitHr = points.slice(splitStartIdx, i + 1).filter((p) => p.hr !== undefined)
        if (splitHr.length > 0) {
          avgHeartRate = Math.round(
            splitHr.reduce((a, p) => a + (p.hr as number), 0) / splitHr.length
          )
        }

        // Dénivelé du split
        const splitPoints = points.slice(splitStartIdx, i + 1)
        const hasEle = splitPoints.some((p) => p.ele !== undefined)
        let elevationGain: number | undefined
        if (hasEle) {
          const { gain } = this.computeElevation(splitPoints)
          elevationGain = gain
        }

        splits.push({ km: currentKm, paceSeconds, avgHeartRate, elevationGain })

        lastKmBoundary = currentKm * 1000
        splitStartIdx = i
        currentKm++
      }
    }

    return splits
  }
}
