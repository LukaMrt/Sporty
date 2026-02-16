import vine from '@vinejs/vine'

export const registerValidator = vine.create(
  vine.object({
    full_name: vine.string().trim().minLength(2),
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8),
  })
)
