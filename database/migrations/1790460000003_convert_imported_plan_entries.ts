import { BaseSchema } from '@adonisjs/lucid/schema'

type Entry = {
  user_id: number
  date: string | Date
  title: string
  target_duration_minutes: number | null
  target_distance_km: number | null
  notes: string | null
}

const iso = (d: string | Date) =>
  typeof d === 'string'
    ? d.slice(0, 10)
    : new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const dayOfWeek = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay()

/**
 * L'ancien import Claude (liste plate `imported_plan_entries`) devient un vrai
 * plan Sporty : une semaine par tranche de 7 jours à partir du lundi de la
 * première séance. Le plan devient le plan actif s'il n'y en a pas déjà un ;
 * sinon il est conservé dans l'historique (abandonné).
 */
export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      const entries = (await db.from('imported_plan_entries').orderBy('date', 'asc')) as Entry[]
      const byUser = new Map<number, Entry[]>()
      for (const e of entries) byUser.set(e.user_id, [...(byUser.get(e.user_id) ?? []), e])

      for (const [userId, list] of byUser) {
        const first = iso(list[0].date)
        const start = addDays(first, -((dayOfWeek(first) + 6) % 7)) // lundi
        const weekOf = (date: string) =>
          Math.floor(
            (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / (7 * 86_400_000)
          ) + 1
        const weeks = weekOf(iso(list.at(-1)!.date))
        const hasActive: unknown = await db
          .from('training_plans')
          .where('user_id', userId)
          .whereIn('status', ['active', 'draft'])
          .first()
        const now = new Date()

        const [plan] = (await db
          .table('training_plans')
          .insert({
            user_id: userId,
            goal_id: null,
            methodology: 'custom',
            plan_type: 'custom',
            status: hasActive ? 'abandoned' : 'active',
            auto_recalibrate: false,
            vdot_at_creation: 0,
            current_vdot: 0,
            sessions_per_week: Math.max(1, Math.round(list.length / weeks)),
            preferred_days: JSON.stringify([]),
            start_date: start,
            end_date: addDays(start, weeks * 7),
            source: 'imported',
            name: 'Plan importé de Claude',
            created_at: now,
            updated_at: now,
          })
          .returning('id')) as { id: number }[]

        for (let w = 1; w <= weeks; w++) {
          const inWeek = list.filter((e) => weekOf(iso(e.date)) === w)
          await db.table('planned_weeks').insert({
            plan_id: plan.id,
            week_number: w,
            phase_name: 'custom',
            phase_label: '',
            is_recovery_week: false,
            target_volume_minutes: inWeek.reduce((a, e) => a + (e.target_duration_minutes ?? 0), 0),
            created_at: now,
            updated_at: now,
          })
        }
        for (const [index, e] of list.entries()) {
          const date = iso(e.date)
          await db.table('planned_sessions').insert({
            plan_id: plan.id,
            week_number: weekOf(date),
            day_of_week: dayOfWeek(date),
            session_type: 'easy',
            sport_slug: 'running',
            title: e.title,
            description: e.notes ?? '',
            target_duration_minutes: e.target_duration_minutes ?? 30,
            target_distance_km: e.target_distance_km,
            intensity_zone: 'z2',
            status: 'pending',
            order_in_day: index,
            created_at: now,
            updated_at: now,
          })
        }
      }
    })
    this.schema.dropTable('imported_plan_entries')
  }

  async down() {
    this.schema.createTable('imported_plan_entries', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.date('date').notNullable()
      table.string('title', 200).notNullable()
      table.integer('target_duration_minutes').nullable()
      table.float('target_distance_km').nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['user_id', 'date'])
    })
  }
}
