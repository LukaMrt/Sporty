import vine from '@vinejs/vine'

export const confirmVdotValidator = vine.create(
  vine.object({
    vdot: vine.number().min(15).max(85),
  })
)

export const updateAthleteProfileValidator = vine.create(
  vine.object({
    sex: vine
      .enum(['male', 'female'] as const)
      .nullable()
      .optional(),
    max_heart_rate: vine.number().min(100).max(230).nullable().optional(),
    resting_heart_rate: vine.number().min(30).max(100).nullable().optional(),
    vma: vine.number().min(5).max(30).nullable().optional(),
  })
)

export const estimateVdotValidator = vine.create(
  vine.object({
    frequency: vine.enum(['never', 'occasional', 'regular', 'frequent'] as const).optional(),
    experience: vine.enum(['beginner', 'intermediate', 'advanced', 'expert'] as const).optional(),
    typical_distance: vine.enum(['less_5k', '5k_10k', '10k_half', 'half_plus'] as const).optional(),
  })
)
