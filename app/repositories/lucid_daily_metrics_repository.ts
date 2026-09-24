import { DateTime } from 'luxon'
import { DailyMetricsRepository } from '#domain/interfaces/daily_metrics_repository'
import { WELLNESS_FIELDS, type DailyWellness } from '#domain/value_objects/daily_wellness'
import DailyMetric from '#models/daily_metric'

export default class LucidDailyMetricsRepository extends DailyMetricsRepository {
  async upsertMany(userId: number, days: DailyWellness[], source: string): Promise<void> {
    for (const day of days) {
      const existing = await DailyMetric.query()
        .where('userId', userId)
        .where('date', day.date)
        .first()
      const model = existing ?? new DailyMetric()
      model.userId = userId
      model.date = DateTime.fromISO(day.date)
      model.source = source
      for (const field of WELLNESS_FIELDS) {
        // Une source partielle ne doit pas effacer une valeur déjà connue
        if (day[field] !== null) model[field] = day[field]
        else if (!existing) model[field] = null
      }
      await model.save()
    }
  }

  async findRange(userId: number, from: string, to: string): Promise<DailyWellness[]> {
    const rows = await DailyMetric.query()
      .where('userId', userId)
      .whereBetween('date', [from, to])
      .orderBy('date', 'asc')
    return rows.map((row) => {
      const out = { date: row.date.toISODate() ?? '' } as DailyWellness
      for (const field of WELLNESS_FIELDS) out[field] = row[field] ?? null
      return out
    })
  }
}
