import vine from '@vinejs/vine'

export const generatePlanValidator = vine.create(
  vine.object({
    vdot: vine.number().min(15).max(85),
    sessions_per_week: vine.number().min(2).max(7),
    preferred_days: vine.array(vine.number().min(0).max(6)),
    plan_duration_weeks: vine.number().min(8),
  })
)
