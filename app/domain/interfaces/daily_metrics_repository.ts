import type { DailyWellness } from '#domain/value_objects/daily_wellness'

export abstract class DailyMetricsRepository {
  /** Insère ou fusionne (les champs null n'écrasent pas une valeur existante) */
  abstract upsertMany(userId: number, days: DailyWellness[], source: string): Promise<void>
  abstract findRange(userId: number, from: string, to: string): Promise<DailyWellness[]>
}
