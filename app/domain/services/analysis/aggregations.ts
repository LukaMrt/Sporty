import type { FitnessDay } from '#domain/value_objects/fitness_profile'
import {
  EFFORT_DISTANCES,
  type EffortDistance,
  type SessionAnalysis,
} from '#domain/value_objects/session_analysis'
import { calculateVdot } from '#domain/services/vdot_calculator'
import { addDaysIso, dayOfWeekIso } from '#domain/services/calendar'

/** Séance vue par les analyses : colonnes légères + indicateurs stockés */
export interface AnalysisSession {
  id: number
  date: string
  sportSlug: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
  trainingLoad: number | null
  analysis: SessionAnalysis | null
}

const RUNNING = 'running'

/** Lundi de la semaine ISO contenant `date` */
export function weekStart(date: string): string {
  const dow = dayOfWeekIso(date)
  return addDaysIso(date, dow === 0 ? -6 : 1 - dow)
}

// ── B2 · Volume par semaine / mois ────────────────────────────────────────────

export interface VolumeBucket {
  period: string
  bySport: Record<string, { distanceKm: number; durationMinutes: number; sessions: number }>
}

export function volumeByPeriod(
  sessions: AnalysisSession[],
  granularity: 'week' | 'month'
): VolumeBucket[] {
  const buckets = new Map<string, VolumeBucket>()
  for (const s of sessions) {
    const period = granularity === 'week' ? weekStart(s.date) : s.date.slice(0, 7)
    const bucket = buckets.get(period) ?? { period, bySport: {} }
    const sport = (bucket.bySport[s.sportSlug] ??= {
      distanceKm: 0,
      durationMinutes: 0,
      sessions: 0,
    })
    sport.distanceKm = Math.round((sport.distanceKm + (s.distanceKm ?? 0)) * 10) / 10
    sport.durationMinutes += s.durationMinutes
    sport.sessions++
    buckets.set(period, bucket)
  }
  return [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period))
}

// ── B3 · Répartition d'intensité et 80/20 ─────────────────────────────────────

export interface IntensityWeek {
  week: string
  /** Minutes par zone Z1 → Z5 */
  zoneMinutes: [number, number, number, number, number]
  /** Part du temps en Z1–Z2 (0–1), null sans données FC */
  lowShare: number | null
  /** Plus de 20 % du temps en Z3 : semaine « trop grise » */
  tooMuchZ3: boolean
}

export function intensityByWeek(sessions: AnalysisSession[]): IntensityWeek[] {
  const weeks = new Map<string, [number, number, number, number, number]>()
  for (const s of sessions) {
    const secs = s.analysis?.zoneSeconds
    if (!secs) continue
    const key = weekStart(s.date)
    const acc = weeks.get(key) ?? [0, 0, 0, 0, 0]
    secs.forEach((v, i) => (acc[i] += v))
    weeks.set(key, acc)
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, secs]) => {
      const total = secs.reduce((a, b) => a + b, 0)
      return {
        week,
        zoneMinutes: secs.map((v) => Math.round(v / 60)) as IntensityWeek['zoneMinutes'],
        lowShare: total > 0 ? Math.round(((secs[0] + secs[1]) / total) * 100) / 100 : null,
        tooMuchZ3: total > 0 && secs[2] / total > 0.2,
      }
    })
}

// ── B4 · Monotonie et contrainte (Foster) ────────────────────────────────────

export interface MonotonyWeek {
  week: string
  load: number
  monotony: number | null
  strain: number | null
}

/**
 * Monotonie = moyenne / écart-type du TSS quotidien sur 7 jours ;
 * contrainte = charge hebdo × monotonie. Une monotonie > 2 signale un
 * entraînement trop uniforme, facteur de surmenage.
 */
export function monotonyByWeek(days: FitnessDay[]): MonotonyWeek[] {
  const weeks = new Map<string, number[]>()
  for (const d of days) {
    const key = weekStart(d.date)
    ;(weeks.get(key) ?? weeks.set(key, []).get(key)!).push(d.tss)
  }
  return [...weeks.entries()]
    .filter(([, tss]) => tss.length === 7)
    .map(([week, tss]) => {
      const load = tss.reduce((a, b) => a + b, 0)
      const mean = load / 7
      const sd = Math.sqrt(tss.reduce((a, v) => a + (v - mean) ** 2, 0) / 7)
      const monotony = sd > 0 ? Math.round((mean / sd) * 100) / 100 : null
      return {
        week,
        load: Math.round(load),
        monotony,
        strain: monotony !== null ? Math.round(load * monotony) : null,
      }
    })
}

// ── C1 · Meilleurs efforts ────────────────────────────────────────────────────

export interface EffortRecord {
  distance: EffortDistance
  seconds: number
  sessionId: number
  date: string
}

export function bestEfforts(sessions: AnalysisSession[], since?: string): EffortRecord[] {
  const records = new Map<EffortDistance, EffortRecord>()
  for (const s of sessions) {
    if (s.sportSlug !== RUNNING || (since && s.date < since)) continue
    for (const distance of EFFORT_DISTANCES) {
      const seconds = s.analysis?.bestEfforts?.[distance]
      if (!seconds) continue
      const current = records.get(distance)
      if (!current || seconds < current.seconds) {
        records.set(distance, { distance, seconds, sessionId: s.id, date: s.date })
      }
    }
  }
  return EFFORT_DISTANCES.flatMap((d) => (records.has(d) ? [records.get(d)!] : []))
}

// ── C3 / C4 · VDOT dérivé et prédictions ─────────────────────────────────────

/** Distances assez longues pour une estimation de VDOT fiable (≥ 1 mile) */
const VDOT_MIN_DISTANCE = 1609

/** VDOT le plus élevé parmi des meilleurs efforts (Daniels) */
export function vdotFromEfforts(records: EffortRecord[]): number | null {
  const vdots = records
    .filter((r) => r.distance >= VDOT_MIN_DISTANCE)
    .map((r) => calculateVdot(r.distance, r.seconds / 60))
    .filter((v) => Number.isFinite(v) && v > 0)
  return vdots.length > 0 ? Math.round(Math.max(...vdots) * 10) / 10 : null
}

/** VDOT par mois (meilleurs efforts de chaque mois) */
export function vdotHistory(sessions: AnalysisSession[]): { month: string; vdot: number }[] {
  const byMonth = new Map<string, AnalysisSession[]>()
  for (const s of sessions) {
    const month = s.date.slice(0, 7)
    ;(byMonth.get(month) ?? byMonth.set(month, []).get(month)!).push(s)
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([month, list]) => {
      const vdot = vdotFromEfforts(bestEfforts(list))
      return vdot ? [{ month, vdot }] : []
    })
}

/** Temps (s) prédit sur `distance` pour un VDOT donné (inversion de Daniels par dichotomie) */
export function predictTimeFromVdot(vdot: number, distance: number): number {
  let lo = distance / 400 // 400 m/min : borne rapide irréaliste
  let hi = distance / 50 // 50 m/min : marche lente
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    // Un temps plus long donne un VDOT plus faible
    if (calculateVdot(distance, mid) > vdot) lo = mid
    else hi = mid
  }
  return Math.round(((lo + hi) / 2) * 60)
}

/** Formule de Riegel : T2 = T1 × (D2 / D1)^1,06 */
export function riegel(seconds: number, fromDistance: number, toDistance: number): number {
  return Math.round(seconds * (toDistance / fromDistance) ** 1.06)
}

export const PREDICTION_DISTANCES = [5000, 10000, 21097, 42195] as const

export function racePredictions(
  vdot: number | null,
  reference: EffortRecord | null
): { distance: number; vdotSeconds: number | null; riegelSeconds: number | null }[] {
  return PREDICTION_DISTANCES.map((distance) => ({
    distance,
    vdotSeconds: vdot ? predictTimeFromVdot(vdot, distance) : null,
    riegelSeconds: reference ? riegel(reference.seconds, reference.distance, distance) : null,
  }))
}

// ── D1 · Efficacité aérobie ───────────────────────────────────────────────────

export function efficiencyTrend(sessions: AnalysisSession[]): { week: string; ef: number }[] {
  const weeks = new Map<string, number[]>()
  for (const s of sessions) {
    const ef = s.analysis?.efficiencyFactor
    if (s.sportSlug !== RUNNING || !s.analysis?.easy || !ef) continue
    const key = weekStart(s.date)
    ;(weeks.get(key) ?? weeks.set(key, []).get(key)!).push(ef)
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, values]) => ({
      week,
      ef: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1000) / 1000,
    }))
}

// ── D2 · Découplage des sorties longues ──────────────────────────────────────

export function decouplingOfLongRuns(
  sessions: AnalysisSession[],
  minMinutes = 60
): { sessionId: number; date: string; decoupling: number }[] {
  return sessions
    .filter(
      (s) =>
        s.sportSlug === RUNNING &&
        s.durationMinutes >= minMinutes &&
        s.analysis?.decoupling !== null &&
        s.analysis?.decoupling !== undefined
    )
    .map((s) => ({ sessionId: s.id, date: s.date, decoupling: s.analysis!.decoupling! }))
}

// ── D3 · FC à allure de référence ────────────────────────────────────────────

/** FC moyenne des séances dont l'allure moyenne est à ± `toleranceSec` de la référence */
export function heartRateAtPace(
  sessions: AnalysisSession[],
  referencePaceSecPerKm: number,
  toleranceSec = 10
): { month: string; heartRate: number; sessions: number }[] {
  const byMonth = new Map<string, number[]>()
  for (const s of sessions) {
    if (s.sportSlug !== RUNNING || !s.avgHeartRate || !s.distanceKm) continue
    const pace = (s.durationMinutes * 60) / s.distanceKm
    if (Math.abs(pace - referencePaceSecPerKm) > toleranceSec) continue
    const month = s.date.slice(0, 7)
    ;(byMonth.get(month) ?? byMonth.set(month, []).get(month)!).push(s.avgHeartRate)
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, hrs]) => ({
      month,
      heartRate: Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length),
      sessions: hrs.length,
    }))
}

/** Allure médiane (s/km) des sorties faciles : référence par défaut de D3 */
export function medianEasyPace(sessions: AnalysisSession[]): number | null {
  const paces = sessions
    .filter((s) => s.sportSlug === RUNNING && s.analysis?.easy && s.distanceKm)
    .map((s) => (s.durationMinutes * 60) / s.distanceKm!)
    .sort((a, b) => a - b)
  return paces.length > 0 ? Math.round(paces[Math.floor(paces.length / 2)]) : null
}

// ── D6 · Suggestions FCmax / LTHR ─────────────────────────────────────────────

export interface PhysiologySuggestion {
  observedMaxHr: number | null
  observedMaxHrSessionId: number | null
  estimatedLthr: number | null
  lthrSessionId: number | null
}

/**
 * FCmax observée (percentile 99 le plus élevé) et LTHR estimée (meilleure FC
 * moyenne sur 20 min × 0,95, protocole Friel) sur la période fournie.
 */
export function physiologySuggestion(sessions: AnalysisSession[]): PhysiologySuggestion {
  let max: { hr: number; id: number } | null = null
  let lthr: { hr: number; id: number } | null = null
  for (const s of sessions) {
    const observed = s.analysis?.observedMaxHr
    if (observed && (!max || observed > max.hr)) max = { hr: observed, id: s.id }
    const best20 = s.analysis?.best20MinHr
    if (best20 && (!lthr || best20 > lthr.hr)) lthr = { hr: best20, id: s.id }
  }
  return {
    observedMaxHr: max?.hr ?? null,
    observedMaxHrSessionId: max?.id ?? null,
    estimatedLthr: lthr ? Math.round(lthr.hr * 0.95) : null,
    lthrSessionId: lthr?.id ?? null,
  }
}

// ── F1 · Calendrier ───────────────────────────────────────────────────────────

export function dailyLoadCalendar(days: FitnessDay[]): { date: string; tss: number }[] {
  return days.map((d) => ({ date: d.date, tss: d.tss }))
}
