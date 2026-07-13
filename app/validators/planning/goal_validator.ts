import vine from '@vinejs/vine'

export const createGoalValidator = vine.create(
  vine.object({
    target_distance_km: vine.number().positive().max(500),
    target_time_minutes: vine.number().positive().nullable().optional(),
    event_date: vine
      .date({ formats: ['YYYY-MM-DD'] })
      .afterOrEqual('today')
      .nullable()
      .optional(),
  })
)

export const updateGoalValidator = vine.create(
  vine.object({
    target_distance_km: vine.number().positive().max(500).optional(),
    target_time_minutes: vine.number().positive().nullable().optional(),
    event_date: vine
      .date({ formats: ['YYYY-MM-DD'] })
      .afterOrEqual('today')
      .nullable()
      .optional(),
  })
)
