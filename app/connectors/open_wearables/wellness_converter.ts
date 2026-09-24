import { emptyWellness, type DailyWellness } from '#domain/value_objects/daily_wellness'
import type { RawOwTimeSeriesSample } from '#connectors/open_wearables/types'

/**
 * Types de séries temporelles Open Wearables → champ quotidien Sporty.
 * `mode` : moyenne des échantillons du jour, ou dernière valeur (poids…).
 */
const TIMESERIES_FIELDS: Record<string, { field: keyof DailyWellness; mode: 'mean' | 'last' }> = {
  resting_heart_rate: { field: 'restingHeartRate', mode: 'mean' },
  heart_rate_variability_rmssd: { field: 'hrvRmssd', mode: 'mean' },
  weight: { field: 'weightKg', mode: 'last' },
  body_fat_percentage: { field: 'bodyFatPercent', mode: 'last' },
  respiratory_rate: { field: 'respiratoryRate', mode: 'mean' },
  oxygen_saturation: { field: 'spo2', mode: 'mean' },
  skin_temperature: { field: 'skinTemperatureDeviation', mode: 'mean' },
  vo2_max: { field: 'vo2Max', mode: 'last' },
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

export type RawOwActivitySummary = {
  date: string
  steps?: number | null
  intensity_minutes?: { moderate?: number | null; vigorous?: number | null } | null
  moderate_minutes?: number | null
  vigorous_minutes?: number | null
}

export type RawOwHealthScore = {
  date?: string
  timestamp?: string
  type?: string
  name?: string
  value: number
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

/** Agrège les séries brutes, le sommeil et l'activité en une ligne par jour */
export function toDailyWellness(input: {
  samples: RawOwTimeSeriesSample[]
  sleeps: RawOwSleep[]
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

  for (const sleep of input.sleeps) {
    if (sleep.is_nap) continue
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
  }

  for (const score of input.scores ?? []) {
    const kind = (score.type ?? score.name ?? '').toLowerCase()
    const date = (score.date ?? score.timestamp ?? '').slice(0, 10)
    if (kind === 'sleep' && date) getOrCreate(days, date).sleepScore = score.value
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}
