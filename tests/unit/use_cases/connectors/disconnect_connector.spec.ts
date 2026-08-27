import { test } from '@japa/runner'
import DisconnectConnector from '#use_cases/connectors/disconnect_connector'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { ConnectorFactory } from '#domain/interfaces/connector_factory'
import { RateLimitManager } from '#domain/interfaces/rate_limit_manager'
import { Connector } from '#domain/interfaces/connector'
import type { ConnectorTokens, MappedSessionData } from '#domain/interfaces/connector'
import type { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'

const PROVIDER = ConnectorProvider.Strava

interface DisconnectCall {
  userId: number
  provider: string
}

function makeConnectorRepository(calls: DisconnectCall[]): ConnectorRepository {
  class Mock extends ConnectorRepository {
    async findById() {
      return null
    }
    async updateLastSyncAt() {}
    async findAllAutoImportEnabled() {
      return []
    }
    async upsert() {}
    async findFullByUserAndProvider() {
      return null
    }
    async findByUserAndProvider() {
      return null
    }
    async disconnect(userId: number, provider: ConnectorProvider) {
      calls.push({ userId, provider })
    }
    async updateTokens() {}
    async setStatus() {}
    async updateSettings() {}
    async findSettings() {
      return null
    }
  }
  return new Mock()
}

function makeConnector(overrides: Partial<{ disconnect: () => Promise<void> }> = {}): Connector {
  class Mock extends Connector {
    readonly id = 1
    async authenticate(): Promise<ConnectorTokens> {
      return { accessToken: '', refreshToken: '', expiresAt: 0 }
    }
    async listSessions() {
      return []
    }
    async getSessionDetail(): Promise<MappedSessionData> {
      throw new Error('Not implemented')
    }
    async getConnectionStatus(): Promise<ConnectorStatus> {
      throw new Error('Not implemented')
    }
    async disconnect(): Promise<void> {}
  }
  return Object.assign(new Mock(), overrides)
}

function makeRegistry(connector: Connector | null, registered = true): ConnectorRegistry {
  class FactoryMock extends ConnectorFactory {
    async make(): Promise<Connector | null> {
      return connector
    }
  }
  class RateLimitMock extends RateLimitManager {
    update(): void {}
    async waitIfNeeded(): Promise<void> {}
  }
  class Mock extends ConnectorRegistry {
    has(): boolean {
      return registered
    }
    getFactory(): ConnectorFactory {
      return new FactoryMock()
    }
    getRateLimitManager(): RateLimitManager {
      return new RateLimitMock()
    }
  }
  return new Mock()
}

test.group('DisconnectConnector', () => {
  test('revoque cote provider puis supprime la ligne locale', async ({ assert }) => {
    let revoked = false
    const calls: DisconnectCall[] = []
    const useCase = new DisconnectConnector(
      makeConnectorRepository(calls),
      makeRegistry(
        makeConnector({
          disconnect: async () => {
            revoked = true
          },
        })
      )
    )

    await useCase.execute({ userId: 7, provider: PROVIDER })

    assert.isTrue(revoked)
    assert.deepEqual(calls, [{ userId: 7, provider: PROVIDER }])
  })

  test('supprime la ligne locale meme si la revocation distante echoue', async ({ assert }) => {
    const calls: DisconnectCall[] = []
    const useCase = new DisconnectConnector(
      makeConnectorRepository(calls),
      makeRegistry(
        makeConnector({
          disconnect: async () => {
            throw new Error('Network error')
          },
        })
      )
    )

    await useCase.execute({ userId: 7, provider: PROVIDER })

    assert.deepEqual(calls, [{ userId: 7, provider: PROVIDER }])
  })

  test('supprime la ligne locale quand la factory renvoie null (connecteur en erreur)', async ({
    assert,
  }) => {
    const calls: DisconnectCall[] = []
    const useCase = new DisconnectConnector(makeConnectorRepository(calls), makeRegistry(null))

    await useCase.execute({ userId: 7, provider: PROVIDER })

    assert.deepEqual(calls, [{ userId: 7, provider: PROVIDER }])
  })

  test('supprime la ligne locale quand le provider n est pas enregistre', async ({ assert }) => {
    const calls: DisconnectCall[] = []
    const useCase = new DisconnectConnector(
      makeConnectorRepository(calls),
      makeRegistry(makeConnector(), false)
    )

    await useCase.execute({ userId: 7, provider: PROVIDER })

    assert.deepEqual(calls, [{ userId: 7, provider: PROVIDER }])
  })
})
