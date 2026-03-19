import type { DataPoint, GpsPoint, KmSplit } from '#domain/value_objects/run_metrics'

export interface RawTrackpoint {
  lat: number
  lon: number
  timeMs: number
  ele?: number
  hr?: number
  cad?: number
  /** Distance cumulée en mètres depuis le début (optionnel — fourni par Strava) */
  distanceCum?: number
}

export interface TrackAnalysisResult {
  durationSeconds: number
  distanceMeters: number
  minHeartRate?: number
  avgHeartRate?: number
  maxHeartRate?: number
  cadenceAvg?: number
  elevationGain?: number
  elevationLoss?: number
  heartRateCurve?: DataPoint[]
  paceCurve?: DataPoint[]
  altitudeCurve?: DataPoint[]
  gpsTrack?: GpsPoint[]
  splits?: KmSplit[]
}

export function analyze(points: RawTrackpoint[]): TrackAnalysisResult {
  const hasHr = points.some((p) => p.hr !== undefined)
  const hasCad = points.some((p) => p.cad !== undefined)
  const hasEle = points.some((p) => p.ele !== undefined)
  const hasDistanceCum = points.some((p) => p.distanceCum !== undefined)

  const distanceMeters = hasDistanceCum
    ? (points[points.length - 1].distanceCum ?? computeTotalDistance(points))
    : computeTotalDistance(points)

  const durationSeconds = Math.round((points[points.length - 1].timeMs - points[0].timeMs) / 1000)

  const rawPace = computeRawPace(points)
  const smoothedPace = smoothPace(rawPace, points, 30)

  const startMs = points[0].timeMs
  const endMs = points[points.length - 1].timeMs
  const samples = buildTimeSamples(startMs, endMs, 15)

  const paceCurve = resampleValues(samples, points, smoothedPace)
  const heartRateCurve = hasHr
    ? resampleValues(
        samples,
        points,
        points.map((p) => p.hr ?? 0)
      )
    : undefined
  const altitudeCurve = hasEle
    ? resampleValues(
        samples,
        points,
        points.map((p) => p.ele ?? 0)
      )
    : undefined
  const gpsTrack = resampleGps(samples, points)

  let elevationGain: number | undefined
  let elevationLoss: number | undefined
  if (hasEle) {
    const { gain, loss } = computeElevation(points)
    elevationGain = gain
    elevationLoss = loss
  }

  let minHeartRate: number | undefined
  let avgHeartRate: number | undefined
  let maxHeartRate: number | undefined
  if (hasHr) {
    const hrValues = points.filter((p) => p.hr !== undefined).map((p) => p.hr as number)
    minHeartRate = Math.min(...hrValues)
    maxHeartRate = Math.max(...hrValues)
    avgHeartRate = Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)
  }

  let cadenceAvg: number | undefined
  if (hasCad) {
    const cadValues = points.filter((p) => p.cad !== undefined).map((p) => p.cad as number)
    cadenceAvg = Math.round(cadValues.reduce((a, b) => a + b, 0) / cadValues.length)
  }

  const splits = computeSplits(points, hasDistanceCum)

  return {
    durationSeconds,
    distanceMeters,
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

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function computeTotalDistance(points: RawTrackpoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon)
  }
  return total
}

function computeRawPace(points: RawTrackpoint[]): number[] {
  const paces: number[] = [0]
  for (let i = 1; i < points.length; i++) {
    const dt = (points[i].timeMs - points[i - 1].timeMs) / 1000
    const dd = haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon)
    paces.push(dd > 0.5 ? (dt / dd) * 1000 : 0)
  }
  return paces
}

function smoothPace(rawPace: number[], points: RawTrackpoint[], windowSec: number): number[] {
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

function buildTimeSamples(startMs: number, endMs: number, intervalSec: number): number[] {
  const samples: number[] = []
  for (let t = startMs; t <= endMs; t += intervalSec * 1000) {
    samples.push(t)
  }
  return samples
}

function resampleValues(samples: number[], points: RawTrackpoint[], values: number[]): DataPoint[] {
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
      return { time: timeSeconds, value: values[lo] }
    }

    const ratio = (t - points[lo].timeMs) / (points[hi].timeMs - points[lo].timeMs)
    const value = values[lo] + ratio * (values[hi] - values[lo])

    return { time: timeSeconds, value: Math.round(value * 100) / 100 }
  })
}

function resampleGps(samples: number[], points: RawTrackpoint[]): GpsPoint[] {
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

function computeElevation(points: RawTrackpoint[]): { gain: number; loss: number } {
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

function computeSplits(points: RawTrackpoint[], useDistanceCum: boolean): KmSplit[] {
  const splits: KmSplit[] = []
  let cumDistance = 0
  let lastKmBoundary = 0
  let currentKm = 1
  let splitStartIdx = 0

  for (let i = 1; i < points.length; i++) {
    const segDist = useDistanceCum
      ? (points[i].distanceCum ?? 0) - (points[i - 1].distanceCum ?? 0)
      : haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon)
    cumDistance += segDist

    while (cumDistance >= currentKm * 1000) {
      const distToKm = currentKm * 1000 - lastKmBoundary
      const segRatio = distToKm / (cumDistance - lastKmBoundary)
      const kmTimeMs =
        points[splitStartIdx].timeMs + segRatio * (points[i].timeMs - points[splitStartIdx].timeMs)

      const splitDuration = (kmTimeMs - points[splitStartIdx].timeMs) / 1000
      const paceSeconds = Math.round(splitDuration)

      let avgHeartRate: number | undefined
      const splitHr = points.slice(splitStartIdx, i + 1).filter((p) => p.hr !== undefined)
      if (splitHr.length > 0) {
        avgHeartRate = Math.round(
          splitHr.reduce((a, p) => a + (p.hr as number), 0) / splitHr.length
        )
      }

      const splitPoints = points.slice(splitStartIdx, i + 1)
      const hasEle = splitPoints.some((p) => p.ele !== undefined)
      let elevationGain: number | undefined
      if (hasEle) {
        const { gain } = computeElevation(splitPoints)
        elevationGain = gain
      }

      splits.push({ km: currentKm, paceSeconds, avgHeartRate, elevationGain })

      lastKmBoundary = currentKm * 1000
      splitStartIdx = i
      currentKm++
    }
  }

  // Dernier km partiel
  const remainingDist = cumDistance - lastKmBoundary
  if (remainingDist > 50) {
    const lastPoints = points.slice(splitStartIdx)
    const splitDuration = (points[points.length - 1].timeMs - points[splitStartIdx].timeMs) / 1000
    const paceSeconds = Math.round((splitDuration / remainingDist) * 1000)

    let avgHeartRate: number | undefined
    const splitHr = lastPoints.filter((p) => p.hr !== undefined)
    if (splitHr.length > 0) {
      avgHeartRate = Math.round(splitHr.reduce((a, p) => a + (p.hr as number), 0) / splitHr.length)
    }

    let elevationGain: number | undefined
    if (lastPoints.some((p) => p.ele !== undefined)) {
      const { gain } = computeElevation(lastPoints)
      elevationGain = gain
    }

    splits.push({ km: currentKm, paceSeconds, avgHeartRate, elevationGain, partial: true })
  }

  return splits
}
