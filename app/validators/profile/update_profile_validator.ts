import vine, { SimpleMessagesProvider } from '@vinejs/vine'

export const updateProfileValidator = vine.create(
  vine.object({
    full_name: vine.string().trim().minLength(2).optional(),
    email: vine
      .string()
      .email()
      .normalizeEmail()
      .unique(async (db, value, field) => {
        const userId = field.meta.userId as number
        const row: unknown = await db
          .from('users')
          .where('email', value)
          .whereNot('id', userId)
          .first()
        return !row
      })
      .optional(),
    sport_id: vine.number().positive().exists({ table: 'sports', column: 'id' }).optional(),
    level: vine.enum(['beginner', 'intermediate', 'advanced'] as const).optional(),
    objective: vine
      .enum([
        'endurance_progress',
        'run_faster',
        'comeback_after_break',
        'maintain_fitness',
        'prepare_competition',
      ] as const)
      .nullable()
      .optional(),
    max_heart_rate: vine.number().withoutDecimals().min(100).max(250).optional().nullable(),
    vma: vine.number().min(5).max(30).optional().nullable(),
    preferred_unit: vine.enum(['km_h', 'min_km'] as const).optional(),
    distance_unit: vine.enum(['km', 'mi'] as const).optional(),
    weight_unit: vine.enum(['kg', 'lbs'] as const).optional(),
    week_starts_on: vine.enum(['monday', 'sunday'] as const).optional(),
    date_format: vine.enum(['DD/MM/YYYY', 'MM/DD/YYYY'] as const).optional(),
    locale: vine.enum(['fr', 'en'] as const).optional(),
  })
)

updateProfileValidator.messagesProvider = new SimpleMessagesProvider({
  'email.database.unique': 'Cet email est déjà utilisé',
})
