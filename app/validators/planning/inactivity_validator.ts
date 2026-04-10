import vine from '@vinejs/vine'

export const resumeFromInactivityValidator = vine.create(
  vine.object({
    days_since: vine.number().min(0),
  })
)
