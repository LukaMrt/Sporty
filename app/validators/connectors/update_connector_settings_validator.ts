import vine from '@vinejs/vine'

export const updateConnectorSettingsValidator = vine.create(
  vine.object({
    auto_import_enabled: vine.boolean(),
    polling_interval_minutes: vine.number().min(5).max(60),
  })
)
