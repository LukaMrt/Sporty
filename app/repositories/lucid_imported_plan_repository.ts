import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { ImportedPlanRepository } from '#domain/interfaces/imported_plan_repository'
import type { ImportedPlanEntry } from '#domain/value_objects/imported_plan_entry'
import ImportedPlanEntryModel from '#models/imported_plan_entry'

export default class LucidImportedPlanRepository extends ImportedPlanRepository {
  async replaceRange(userId: number, entries: ImportedPlanEntry[]): Promise<void> {
    if (entries.length === 0) return
    const dates = entries.map((e) => e.date).sort()
    await db.transaction(async (trx) => {
      await ImportedPlanEntryModel.query({ client: trx })
        .where('userId', userId)
        .whereBetween('date', [dates[0], dates[dates.length - 1]])
        .delete()
      await ImportedPlanEntryModel.createMany(
        entries.map((e) => ({
          userId,
          date: DateTime.fromISO(e.date),
          title: e.title,
          targetDurationMinutes: e.targetDurationMinutes,
          targetDistanceKm: e.targetDistanceKm,
          notes: e.notes,
        })),
        { client: trx }
      )
    })
  }

  async findRange(userId: number, from: string, to: string) {
    const rows = await ImportedPlanEntryModel.query()
      .where('userId', userId)
      .whereBetween('date', [from, to])
      .orderBy('date', 'asc')
    return rows.map((r) => ({
      id: r.id,
      date: r.date.toISODate() ?? '',
      title: r.title,
      targetDurationMinutes: r.targetDurationMinutes,
      targetDistanceKm: r.targetDistanceKm,
      notes: r.notes,
    }))
  }

  async clear(userId: number): Promise<void> {
    await ImportedPlanEntryModel.query().where('userId', userId).delete()
  }
}
