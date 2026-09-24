import vine from '@vinejs/vine'

export const analysisValidator = vine.create(
  vine.object({
    range: vine.enum(['3m', '6m', '12m', 'all'] as const).optional(),
    /** Allure de référence (s/km) pour « FC à allure de référence » */
    pace: vine.number().withoutDecimals().min(150).max(900).optional(),
  })
)

export const compareValidator = vine.create(
  vine.object({
    ids: vine.array(vine.number().withoutDecimals().positive()).minLength(2).maxLength(4),
  })
)

export const reportValidator = vine.create(
  vine.object({
    period: vine.enum(['week', 'month'] as const).optional(),
    date: vine
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
)

export const importPlanValidator = vine.create(
  vine.object({
    plan: vine.string().trim().minLength(1).maxLength(50_000),
  })
)
