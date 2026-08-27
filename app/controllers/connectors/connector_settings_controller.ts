import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { updateConnectorSettingsValidator } from '#validators/connectors/update_connector_settings_validator'
import UpdateConnectorSettings from '#use_cases/connectors/update_connector_settings'
import { ConnectorNotFoundError } from '#domain/errors/connector_not_found_error'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { isKnownProvider } from '#domain/value_objects/connector_descriptor'

@inject()
export default class ConnectorSettingsController {
  constructor(
    private updateConnectorSettings: UpdateConnectorSettings,
    private connectorRegistry: ConnectorRegistry
  ) {}

  async update({ request, response, auth, params, i18n }: HttpContext) {
    const provider = params.provider as string

    // Connu du domaine ET branche dans le registre : sinon 404, jamais 500.
    if (!isKnownProvider(provider) || !this.connectorRegistry.has(provider)) {
      return response.abort(i18n.t('connectors.settings.providerNotFound'), 404)
    }

    const payload = await request.validateUsing(updateConnectorSettingsValidator)

    try {
      await this.updateConnectorSettings.execute({
        userId: auth.user!.id,
        provider,
        autoImportEnabled: payload.auto_import_enabled,
        pollingIntervalMinutes: payload.polling_interval_minutes,
      })
    } catch (error) {
      if (error instanceof ConnectorNotFoundError) {
        return response.abort(i18n.t('connectors.settings.connectorNotFound'), 404)
      }
      throw error
    }

    return response.redirect().back()
  }
}
