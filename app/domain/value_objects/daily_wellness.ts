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
  /** Coucher (minutes par rapport à minuit, négatif = la veille : 23 h 30 → −30) */
  sleepBedtimeMinutes: number | null
  /** Lever (minutes après minuit du jour du réveil) */
  sleepWakeMinutes: number | null
  sleepInterruptions: number | null
  napMinutes: number | null
  /** FC moyenne pendant la nuit */
  sleepHeartRate: number | null
  /** Scores calculés par la montre (0–100, sauf strain : échelle du fournisseur) */
  readinessScore: number | null
  recoveryScore: number | null
  bodyBattery: number | null
  stressScore: number | null
  strainScore: number | null
  /** FC récupérée en 1 minute après un effort (bpm) */
  heartRateRecovery: number | null
  activeCaloriesKcal: number | null
  sedentaryMinutes: number | null
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
  'sleepBedtimeMinutes',
  'sleepWakeMinutes',
  'sleepInterruptions',
  'napMinutes',
  'sleepHeartRate',
  'readinessScore',
  'recoveryScore',
  'bodyBattery',
  'stressScore',
  'strainScore',
  'heartRateRecovery',
  'activeCaloriesKcal',
  'sedentaryMinutes',
] as const satisfies readonly (keyof DailyWellness)[]

export function emptyWellness(date: string): DailyWellness {
  const day = { date } as DailyWellness
  for (const field of WELLNESS_FIELDS) day[field] = null
  return day
}
