import { inject } from '@adonisjs/core'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ConnectorNotFoundError } from '#domain/errors/connector_not_found_error'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'

export interface UpdateConnectorSettingsInput {
  userId: number
  provider: ConnectorProvider
  autoImportEnabled: boolean
  pollingIntervalMinutes: number
}

@inject()
export default class UpdateConnectorSettings {
  constructor(private connectorRepository: ConnectorRepository) {}

  async execute(input: UpdateConnectorSettingsInput): Promise<void> {
    const connector = await this.connectorRepository.findByUserAndProvider(
      input.userId,
      input.provider
    )

    if (!connector) {
      throw new ConnectorNotFoundError()
    }

    if (connector.status !== ConnectorStatus.Connected) {
      throw new ConnectorNotFoundError()
    }

    await this.connectorRepository.updateSettings(input.userId, input.provider, {
      autoImportEnabled: input.autoImportEnabled,
      pollingIntervalMinutes: input.pollingIntervalMinutes,
    })
  }
}
