import vine from '@vinejs/vine'

export const changePasswordValidator = vine.compile(
  vine.object({
    current_password: vine.string(),
    new_password: vine.string().minLength(8).confirmed({
      confirmationField: 'new_password_confirmation',
    }),
  })
)
