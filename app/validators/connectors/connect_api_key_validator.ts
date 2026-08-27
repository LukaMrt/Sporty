import vine from '@vinejs/vine'

export const connectApiKeyValidator = vine.create(
  vine.object({
    api_key: vine.string().trim().minLength(8).maxLength(512),
  })
)
