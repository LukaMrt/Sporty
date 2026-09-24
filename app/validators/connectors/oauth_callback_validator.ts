import vine from '@vinejs/vine'

export const oauthCallbackValidator = vine.create(
  vine.object({
    code: vine.string().trim().maxLength(512).optional(),
    state: vine.string().trim().maxLength(128).optional(),
    error: vine.string().trim().maxLength(128).optional(),
  })
)
