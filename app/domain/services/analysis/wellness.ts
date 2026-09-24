import type { DailyWellness } from '#domain/value_objects/daily_wellness'
import { addDaysIso } from '#domain/services/calendar'

export type Baseline = {
  mean: number
  sd: number
  samples: number
}

/** Moyenne et écart-type des `days` jours précédant `date` (exclu) */
export function baseline(
  series: DailyWellness[],
  field: 'restingHeartRate' | 'hrvRmssd' | 'sleepMinutes' | 'respiratoryRate' | 'spo2',
  date: string,
  days: number
): Baseline | null {
  const from = addDaysIso(date, -days)
  const values = series
    .filter((d) => d.date >= from && d.date < date && d[field] !== null)
    .map((d) => d[field] as number)
  if (values.length < Math.min(5, days)) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length)
  return { mean: Math.round(mean * 10) / 10, sd: Math.round(sd * 10) / 10, samples: values.length }
}

// ── E1 · Tendances FC repos & HRV ────────────────────────────────────────────

export type RecoveryPoint = {
  date: string
  hrv: number | null
  hrv7: number | null
  hrvBand: { low: number; high: number } | null
  restingHr: number | null
  restingHr7: number | null
}

function rollingMean(
  series: DailyWellness[],
  field: 'hrvRmssd' | 'restingHeartRate',
  date: string
) {
  const values = series
    .filter((d) => d.date > addDaysIso(date, -7) && d.date <= date && d[field] !== null)
    .map((d) => d[field] as number)
  return values.length > 0
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
    : null
}

export function recoveryTrend(series: DailyWellness[]): RecoveryPoint[] {
  return series.map((day) => {
    const base = baseline(series, 'hrvRmssd', day.date, 60)
    return {
      date: day.date,
      hrv: day.hrvRmssd,
      hrv7: rollingMean(series, 'hrvRmssd', day.date),
      hrvBand: base ? { low: base.mean - base.sd, high: base.mean + base.sd } : null,
      restingHr: day.restingHeartRate,
      restingHr7: rollingMean(series, 'restingHeartRate', day.date),
    }
  })
}

/** HRV (moyenne 7 j) sous la bande normale depuis au moins `days` jours consécutifs */
export function hrvBelowBandStreak(points: RecoveryPoint[]): number {
  let streak = 0
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i]
    if (p.hrv7 === null || !p.hrvBand) break
    if (p.hrv7 < p.hrvBand.low) streak++
    else break
  }
  return streak
}

// ── E3 · Forme du jour (transparente) ────────────────────────────────────────

export type ReadinessLevel = 'good' | 'moderate' | 'low' | 'unknown'

export type ReadinessComponent = {
  key: 'hrv' | 'restingHr' | 'sleep' | 'tsb'
  /** Score de la composante, de −1 (défavorable) à +1 (favorable) */
  score: number
  value: number | null
  reference: number | null
}

export type Readiness = {
  level: ReadinessLevel
  /** Moyenne des composantes disponibles (−1 → +1) */
  score: number | null
  components: ReadinessComponent[]
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v))

/**
 * Indicateur composite volontairement simple et lisible : chaque composante
 * compare la valeur du jour à la ligne de base de l'athlète, en écarts-types.
 * Aucune pondération cachée : toutes les composantes sont renvoyées.
 */
export function readinessOf(series: DailyWellness[], date: string, tsb: number | null): Readiness {
  const today = series.find((d) => d.date === date)
  const components: ReadinessComponent[] = []

  const hrvBase = baseline(series, 'hrvRmssd', date, 60)
  if (today?.hrvRmssd !== null && today?.hrvRmssd !== undefined && hrvBase && hrvBase.sd > 0) {
    components.push({
      key: 'hrv',
      score: clamp((today.hrvRmssd - hrvBase.mean) / (2 * hrvBase.sd)),
      value: today.hrvRmssd,
      reference: hrvBase.mean,
    })
  }
  const rhrBase = baseline(series, 'restingHeartRate', date, 60)
  if (
    today?.restingHeartRate !== null &&
    today?.restingHeartRate !== undefined &&
    rhrBase &&
    rhrBase.sd > 0
  ) {
    // FC repos plus élevée que d'habitude = défavorable
    components.push({
      key: 'restingHr',
      score: clamp((rhrBase.mean - today.restingHeartRate) / (2 * rhrBase.sd)),
      value: today.restingHeartRate,
      reference: rhrBase.mean,
    })
  }
  if (today?.sleepMinutes !== null && today?.sleepMinutes !== undefined) {
    // 7 h 30 comme cible, −1 à 5 h ou moins
    components.push({
      key: 'sleep',
      score: clamp((today.sleepMinutes - 450) / 150),
      value: today.sleepMinutes,
      reference: 450,
    })
  }
  if (tsb !== null) {
    // Fraîcheur : TSB ≥ +10 favorable, ≤ −30 défavorable
    components.push({ key: 'tsb', score: clamp((tsb + 10) / 20), value: tsb, reference: 0 })
  }

  if (components.length === 0) return { level: 'unknown', score: null, components }
  const score =
    Math.round((components.reduce((a, c) => a + c.score, 0) / components.length) * 100) / 100
  const level: ReadinessLevel = score >= 0.2 ? 'good' : score >= -0.3 ? 'moderate' : 'low'
  return { level, score, components }
}

// ── E5 · Signaux faibles ─────────────────────────────────────────────────────

export type WeakSignal =
  'respiratory_rate_high' | 'spo2_low' | 'skin_temperature_high' | 'resting_hr_high'

/**
 * Valeurs nocturnes inhabituelles (> 2 écarts-types de la ligne de base) :
 * possible début de maladie ou de surmenage. Alerte douce, pas un diagnostic.
 */
export function weakSignals(series: DailyWellness[], date: string): WeakSignal[] {
  const today = series.find((d) => d.date === date)
  if (!today) return []
  const signals: WeakSignal[] = []
  const above = (field: 'respiratoryRate' | 'restingHeartRate', value: number | null) => {
    const base = baseline(series, field, date, 30)
    return value !== null && base !== null && base.sd > 0 && value > base.mean + 2 * base.sd
  }
  if (above('respiratoryRate', today.respiratoryRate)) signals.push('respiratory_rate_high')
  if (above('restingHeartRate', today.restingHeartRate)) signals.push('resting_hr_high')
  if (today.spo2 !== null && today.spo2 < 94) signals.push('spo2_low')
  if (today.skinTemperatureDeviation !== null && today.skinTemperatureDeviation > 0.8) {
    signals.push('skin_temperature_high')
  }
  return signals
}

// ── G1 · Poids lissé ──────────────────────────────────────────────────────────

/** Moyenne mobile exponentielle du poids (lisse les variations d'hydratation) */
export function smoothedWeight(
  series: DailyWellness[],
  alpha = 0.1
): { date: string; weight: number; trend: number }[] {
  let trend: number | null = null
  const out: { date: string; weight: number; trend: number }[] = []
  for (const day of series) {
    if (day.weightKg === null) continue
    trend = trend === null ? day.weightKg : trend + alpha * (day.weightKg - trend)
    out.push({ date: day.date, weight: day.weightKg, trend: Math.round(trend * 10) / 10 })
  }
  return out
}
