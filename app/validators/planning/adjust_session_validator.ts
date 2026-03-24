import vine from '@vinejs/vine'

export const adjustSessionValidator = vine.create(
  vine.object({
    day_of_week: vine.number().min(0).max(6).optional(),
    target_duration_minutes: vine.number().min(1).optional(),
    target_pace_per_km: vine
      .string()
      .regex(/^\d{1,2}:\d{2}$/)
      .optional(),
  })
)

export const linkCompletedSessionValidator = vine.create(
  vine.object({
    completed_session_id: vine.number().min(1),
  })
)
