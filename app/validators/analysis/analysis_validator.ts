import vine from '@vinejs/vine'

export const analysisValidator = vine.create(
  vine.object({
    range: vine.enum(['3m', '6m', '12m', 'all'] as const).optional(),
    /** Allure de référence (s/km) pour « FC à allure de référence » */
    pace: vine.number().withoutDecimals().min(150).max(900).optional(),
  })
)
