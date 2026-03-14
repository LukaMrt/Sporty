import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { updateConnectorSettingsValidator } from '#validators/connectors/update_connector_settings_validator'
import UpdateConnectorSettings from '#use_cases/connectors/update_connector_settings'
import { ConnectorScheduler } from '#domain/interfaces/connector_scheduler'
import { ConnectorNotFoundError } from '#domain/errors/connector_not_found_error'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'

const VALID_PROVIDERS = new Set(Object.values(ConnectorProvider))

@inject()
export default class ConnectorSettingsController {
  constructor(
    private updateConnectorSettings: UpdateConnectorSettings,
    private scheduler: ConnectorScheduler
  ) {}

  async update({ request, response, auth, params, i18n }: HttpContext) {
    const provider = params.provider as string

    if (!VALID_PROVIDERS.has(provider as ConnectorProvider)) {
      return response.abort(i18n.t('connectors.settings.providerNotFound'), 404)
    }

    const payload = await request.validateUsing(updateConnectorSettingsValidator)

    let connectorId: number
    try {
      const result = await this.updateConnectorSettings.execute({
        userId: auth.user!.id,
        provider: provider as ConnectorProvider,
        autoImportEnabled: payload.auto_import_enabled,
        pollingIntervalMinutes: payload.polling_interval_minutes,
      })
      connectorId = result.connectorId
    } catch (error) {
      if (error instanceof ConnectorNotFoundError) {
        return response.abort(i18n.t('connectors.settings.connectorNotFound'), 404)
      }
      throw error
    }

    if (payload.auto_import_enabled) {
      this.scheduler.addConnector(connectorId, auth.user!.id, payload.polling_interval_minutes)
    } else {
      this.scheduler.removeConnector(connectorId)
    }

    return response.redirect().back()
  }
}
