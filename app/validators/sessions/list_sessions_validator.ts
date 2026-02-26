import vine from '@vinejs/vine'

export const listSessionsValidator = vine.create(
  vine.object({
    sportId: vine.number().positive().optional(),
    sortBy: vine.enum(['date', 'duration_minutes', 'distance_km']).optional(),
    sortOrder: vine.enum(['asc', 'desc']).optional(),
    page: vine.number().positive().optional(),
  })
)
