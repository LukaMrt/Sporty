import { emptyWellness, type DailyWellness } from '#domain/value_objects/daily_wellness'
import type { RawOwTimeSeriesSample } from '#connectors/open_wearables/types'

/**
 * Types de séries temporelles Open Wearables → champ quotidien Sporty.
 * `mode` : moyenne des échantillons du jour, ou dernière valeur (poids…).
 */
const TIMESERIES_FIELDS: Record<
  string,
  { field: keyof DailyWellness; mode: 'mean' | 'last' | 'max' }
> = {
  resting_heart_rate: { field: 'restingHeartRate', mode: 'mean' },
  heart_rate_variability_rmssd: { field: 'hrvRmssd', mode: 'mean' },
  weight: { field: 'weightKg', mode: 'last' },
  body_fat_percentage: { field: 'bodyFatPercent', mode: 'last' },
  respiratory_rate: { field: 'respiratoryRate', mode: 'mean' },
  oxygen_saturation: { field: 'spo2', mode: 'mean' },
  skin_temperature: { field: 'skinTemperatureDeviation', mode: 'mean' },
  vo2_max: { field: 'vo2Max', mode: 'last' },
  heart_rate_recovery_one_minute: { field: 'heartRateRecovery', mode: 'mean' },
  // Secours Garmin quand les scores ne sont pas exposés : Body Battery au plus haut
  // (réserve du matin), stress moyen de la journée
  garmin_body_battery: { field: 'bodyBattery', mode: 'max' },
  garmin_stress_level: { field: 'stressScore', mode: 'mean' },
}

export const WELLNESS_TIMESERIES_TYPES = Object.keys(TIMESERIES_FIELDS)

/** Événement de sommeil OW (champs optionnels : la couverture dépend de la montre) */
export type RawOwSleep = {
  start_time: string
  end_time: string
  duration_seconds?: number | null
  efficiency?: number | null
  efficiency_percent?: number | null
  deep_sleep_minutes?: number | null
  light_sleep_minutes?: number | null
  rem_sleep_minutes?: number | null
  awake_minutes?: number | null
  stages?: { stage: string; start_time: string; end_time: string }[] | null
  is_nap?: boolean | null
}

/** Résumé de sommeil par nuit (`/summaries/sleep`) : session principale + mesures nocturnes */
export type RawOwSleepSummary = {
  date: string
  start_time?: string | null
  end_time?: string | null
  duration_minutes?: number | null
  efficiency_percent?: number | null
  stages?: {
    awake_minutes?: number | null
    light_minutes?: number | null
    deep_minutes?: number | null
    rem_minutes?: number | null
  } | null
  interruptions_count?: number | null
  nap_duration_minutes?: number | null
  avg_heart_rate_bpm?: number | null
  avg_hrv_rmssd_ms?: number | null
  avg_respiratory_rate?: number | null
  avg_spo2_percent?: number | null
}

export type RawOwActivitySummary = {
  date: string
  steps?: number | null
  intensity_minutes?: { moderate?: number | null; vigorous?: number | null } | null
  moderate_minutes?: number | null
  vigorous_minutes?: number | null
  active_calories_kcal?: number | null
  sedentary_minutes?: number | null
}

/** Score calculé par la montre (`/health-scores`) */
export type RawOwHealthScore = {
  category: string
  value: number | null
  recorded_at: string
}

/** Catégorie de score Open Wearables → champ quotidien Sporty */
const SCORE_FIELDS: Record<string, keyof DailyWellness> = {
  sleep: 'sleepScore',
  readiness: 'readinessScore',
  recovery: 'recoveryScore',
  body_battery: 'bodyBattery',
  stress: 'stressScore',
  strain: 'strainScore',
}

/** Jour local d'un horodatage : la chaîne OW porte déjà son offset */
const localDate = (timestamp: string) => timestamp.slice(0, 10)

function getOrCreate(days: Map<string, DailyWellness>, date: string): DailyWellness {
  let day = days.get(date)
  if (!day) {
    day = emptyWellness(date)
    days.set(date, day)
  }
  return day
}

function stageMinutes(sleep: RawOwSleep, names: string[]): number | null {
  if (!sleep.stages?.length) return null
  const ms = sleep.stages
    .filter((s) => names.includes(s.stage.toLowerCase()))
    .reduce((sum, s) => sum + (Date.parse(s.end_time) - Date.parse(s.start_time)), 0)
  return Math.round(ms / 60_000)
}

/** Heure locale d'un horodatage OW en minutes après minuit (l'offset est déjà appliqué) */
function localMinutes(timestamp: string): number {
  return Number(timestamp.slice(11, 13)) * 60 + Number(timestamp.slice(14, 16))
}

const round1 = (v: number) => Math.round(v * 10) / 10

/** Agrège les séries brutes, le sommeil et l'activité en une ligne par jour */
export function toDailyWellness(input: {
  samples: RawOwTimeSeriesSample[]
  sleeps: RawOwSleep[]
  /** Résumés par nuit : prioritaires sur les événements de sommeil */
  sleepSummaries?: RawOwSleepSummary[]
  activities: RawOwActivitySummary[]
  scores?: RawOwHealthScore[]
}): DailyWellness[] {
  const days = new Map<string, DailyWellness>()
  const sums = new Map<string, { sum: number; n: number }>()

  for (const sample of input.samples) {
    const mapping = TIMESERIES_FIELDS[sample.type]
    if (!mapping || !Number.isFinite(sample.value)) continue
    const date = localDate(sample.timestamp)
    const day = getOrCreate(days, date)
    if (mapping.mode === 'last') {
      ;(day[mapping.field] as number | null) = sample.value
    } else if (mapping.mode === 'max') {
      const current = day[mapping.field] as number | null
      ;(day[mapping.field] as number | null) =
        current === null ? sample.value : Math.max(current, sample.value)
    } else {
      const key = `${date}|${mapping.field}`
      const acc = sums.get(key) ?? { sum: 0, n: 0 }
      acc.sum += sample.value
      acc.n++
      sums.set(key, acc)
    }
  }
  for (const [key, { sum, n }] of sums) {
    const [date, field] = key.split('|') as [string, keyof DailyWellness]
    ;(getOrCreate(days, date)[field] as number | null) = Math.round((sum / n) * 10) / 10
  }

  const summaries = input.sleepSummaries ?? []
  const summarized = new Set(summaries.map((s) => s.date.slice(0, 10)))
  for (const summary of summaries) {
    const day = getOrCreate(days, summary.date.slice(0, 10))
    day.sleepMinutes = summary.duration_minutes ?? day.sleepMinutes
    day.sleepEfficiency = summary.efficiency_percent ?? day.sleepEfficiency
    day.sleepDeepMinutes = summary.stages?.deep_minutes ?? null
    day.sleepRemMinutes = summary.stages?.rem_minutes ?? null
    day.sleepLightMinutes = summary.stages?.light_minutes ?? null
    day.sleepAwakeMinutes = summary.stages?.awake_minutes ?? null
    day.sleepInterruptions = summary.interruptions_count ?? null
    day.napMinutes = summary.nap_duration_minutes ?? null
    day.sleepHeartRate = summary.avg_heart_rate_bpm ?? null
    if (summary.start_time && summary.end_time) {
      const crossesMidnight = summary.start_time.slice(0, 10) < summary.end_time.slice(0, 10)
      day.sleepBedtimeMinutes = localMinutes(summary.start_time) - (crossesMidnight ? 1440 : 0)
      day.sleepWakeMinutes = localMinutes(summary.end_time)
    }
    // Mesures de la nuit : plus comparables d'un jour à l'autre que la moyenne de la journée
    if (summary.avg_hrv_rmssd_ms) day.hrvRmssd = round1(summary.avg_hrv_rmssd_ms)
    if (summary.avg_respiratory_rate) day.respiratoryRate = round1(summary.avg_respiratory_rate)
    if (summary.avg_spo2_percent) day.spo2 = round1(summary.avg_spo2_percent)
  }

  for (const sleep of input.sleeps) {
    if (sleep.is_nap || summarized.has(localDate(sleep.end_time))) continue
    // Nuit rattachée au jour du réveil
    const day = getOrCreate(days, localDate(sleep.end_time))
    const duration =
      sleep.duration_seconds ?? (Date.parse(sleep.end_time) - Date.parse(sleep.start_time)) / 1000
    day.sleepMinutes = (day.sleepMinutes ?? 0) + Math.round(duration / 60)
    const efficiency = sleep.efficiency_percent ?? sleep.efficiency ?? null
    if (efficiency !== null) day.sleepEfficiency = efficiency <= 1 ? efficiency * 100 : efficiency
    day.sleepDeepMinutes = sleep.deep_sleep_minutes ?? stageMinutes(sleep, ['deep'])
    day.sleepRemMinutes = sleep.rem_sleep_minutes ?? stageMinutes(sleep, ['rem'])
    day.sleepLightMinutes = sleep.light_sleep_minutes ?? stageMinutes(sleep, ['light', 'core'])
    day.sleepAwakeMinutes = sleep.awake_minutes ?? stageMinutes(sleep, ['awake'])
  }

  for (const activity of input.activities) {
    const day = getOrCreate(days, activity.date.slice(0, 10))
    day.steps = activity.steps ?? day.steps
    const moderate = activity.intensity_minutes?.moderate ?? activity.moderate_minutes ?? 0
    const vigorous = activity.intensity_minutes?.vigorous ?? activity.vigorous_minutes ?? 0
    if (moderate || vigorous) day.activeMinutes = moderate + vigorous
    day.activeCaloriesKcal = activity.active_calories_kcal ?? day.activeCaloriesKcal
    day.sedentaryMinutes = activity.sedentary_minutes ?? day.sedentaryMinutes
  }

  // Scores de la montre : prioritaires sur les séries de secours (Garmin)
  for (const score of input.scores ?? []) {
    const field = SCORE_FIELDS[score.category?.toLowerCase()]
    if (!field || score.value === null || !score.recorded_at) continue
    ;(getOrCreate(days, localDate(score.recorded_at))[field] as number | null) = score.value
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}
