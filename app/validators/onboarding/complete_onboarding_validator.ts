import vine from '@vinejs/vine'

export const completeOnboardingValidator = vine.compile(
  vine.object({
    sport_id: vine.number().positive().exists({ table: 'sports', column: 'id' }),
    level: vine.enum(['beginner', 'intermediate', 'advanced'] as const),
    objective: vine
      .enum([
        'endurance_progress',
        'run_faster',
        'comeback_after_break',
        'maintain_fitness',
        'prepare_competition',
      ] as const)
      .optional(),
    preferred_unit: vine.enum(['km_h', 'min_km'] as const),
    distance_unit: vine.enum(['km', 'mi'] as const),
    weight_unit: vine.enum(['kg', 'lbs'] as const),
    week_starts_on: vine.enum(['monday', 'sunday'] as const),
    date_format: vine.enum(['DD/MM/YYYY', 'MM/DD/YYYY'] as const),
  })
)
