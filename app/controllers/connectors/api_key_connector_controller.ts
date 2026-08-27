import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ConnectApiKeyConnector from '#use_cases/connectors/connect_api_key_connector'
import { connectApiKeyValidator } from '#validators/connectors/connect_api_key_validator'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { InvalidApiKeyError } from '#domain/errors/invalid_api_key_error'
import { AmbiguousConnectorUserError } from '#domain/errors/ambiguous_connector_user_error'
import { ConnectorUnreachableError } from '#domain/errors/connector_unreachable_error'
import {
  describeProvider,
  isKnownProvider,
  ConnectorAuthKind,
} from '#domain/value_objects/connector_descriptor'

@inject()
export default class ApiKeyConnectorController {
  constructor(
    private connectApiKeyConnector: ConnectApiKeyConnector,
    private connectorRegistry: ConnectorRegistry
  ) {}

  async store({ request, response, auth, params, session, i18n }: HttpContext) {
    const raw = String(params.provider ?? '')
    if (!isKnownProvider(raw) || !this.connectorRegistry.has(raw)) {
      return response.abort(i18n.t('connectors.settings.providerNotFound'), 404)
    }

    const descriptor = describeProvider(raw)
    if (descriptor.authKind !== ConnectorAuthKind.ApiKey) {
      return response.abort(i18n.t('connectors.settings.providerNotFound'), 404)
    }

    const payload = await request.validateUsing(connectApiKeyValidator)
    const key = `connectors.${descriptor.i18nKey}`

    try {
      await this.connectApiKeyConnector.execute({
        userId: auth.user!.id,
        provider: raw,
        apiKey: payload.api_key,
      })
      session.flash('success', i18n.t(`${key}.connected`))
    } catch (error) {
      if (error instanceof InvalidApiKeyError) {
        session.flash('error', i18n.t(`${key}.invalidApiKey`))
      } else if (error instanceof AmbiguousConnectorUserError) {
        session.flash('error', i18n.t(`${key}.multipleUsers`))
      } else if (error instanceof ConnectorUnreachableError) {
        session.flash('error', i18n.t(`${key}.unreachable`))
      } else {
        throw error
      }
    }

    return response.redirect().back()
  }
}
