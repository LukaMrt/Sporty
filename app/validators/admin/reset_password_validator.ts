import vine from '@vinejs/vine'

export const resetPasswordValidator = vine.create(
  vine.object({
    password: vine.string().minLength(8),
  })
)
