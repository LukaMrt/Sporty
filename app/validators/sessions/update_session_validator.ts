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
    min_heart_rate: vine.number().min(30).max(250).nullable().optional(),
    max_heart_rate: vine.number().min(30).max(250).nullable().optional(),
    cadence_avg: vine.number().min(50).max(250).nullable().optional(),
    elevation_gain: vine.number().min(0).max(10000).nullable().optional(),
    elevation_loss: vine.number().min(0).max(10000).nullable().optional(),
  })
)
