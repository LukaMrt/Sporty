import vine from '@vinejs/vine'

export const updateSessionValidator = vine.create(
  vine.object({
    sport_id: vine.number().positive().exists({ table: 'sports', column: 'id' }),
    date: vine.date(),
    duration_minutes: vine.number().min(1),
    distance_km: vine.number().min(0).nullable().optional(),
    avg_heart_rate: vine.number().min(30).max(250).nullable().optional(),
    perceived_effort: vine.number().min(1).max(5).nullable().optional(),
    sport_metrics: vine.object({}).allowUnknownProperties().optional(),
    notes: vine.string().maxLength(1000).nullable().optional(),
  })
)
