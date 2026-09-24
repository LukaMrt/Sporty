/** Métriques de récupération et de santé d'une journée (toutes optionnelles : dépend de la montre) */
export type DailyWellness = {
  date: string
  restingHeartRate: number | null
  hrvRmssd: number | null
  sleepMinutes: number | null
  sleepEfficiency: number | null
  sleepDeepMinutes: number | null
  sleepRemMinutes: number | null
  sleepLightMinutes: number | null
  sleepAwakeMinutes: number | null
  sleepScore: number | null
  steps: number | null
  activeMinutes: number | null
  weightKg: number | null
  bodyFatPercent: number | null
  respiratoryRate: number | null
  skinTemperatureDeviation: number | null
  spo2: number | null
  vo2Max: number | null
}

export const WELLNESS_FIELDS = [
  'restingHeartRate',
  'hrvRmssd',
  'sleepMinutes',
  'sleepEfficiency',
  'sleepDeepMinutes',
  'sleepRemMinutes',
  'sleepLightMinutes',
  'sleepAwakeMinutes',
  'sleepScore',
  'steps',
  'activeMinutes',
  'weightKg',
  'bodyFatPercent',
  'respiratoryRate',
  'skinTemperatureDeviation',
  'spo2',
  'vo2Max',
] as const satisfies readonly (keyof DailyWellness)[]

export function emptyWellness(date: string): DailyWellness {
  const day = { date } as DailyWellness
  for (const field of WELLNESS_FIELDS) day[field] = null
  return day
}
