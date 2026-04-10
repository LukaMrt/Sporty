import vine from '@vinejs/vine'

export const createGoalValidator = vine.create(
  vine.object({
    target_distance_km: vine.number().positive(),
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
    target_distance_km: vine.number().positive().optional(),
    target_time_minutes: vine.number().positive().nullable().optional(),
    event_date: vine
      .date({ formats: ['YYYY-MM-DD'] })
      .afterOrEqual('today')
      .nullable()
      .optional(),
  })
)
