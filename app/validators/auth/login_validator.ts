import vine from '@vinejs/vine'

export const loginValidator = vine.create(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(1),
  })
)
