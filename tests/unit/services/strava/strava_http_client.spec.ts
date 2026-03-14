import { test } from '@japa/runner'
import { StravaHttpClient } from '#services/strava/strava_http_client'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import type { UpdateTokensInput, ConnectorRecord } from '#domain/interfaces/connector_repository'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorAuthError } from '#domain/errors/connector_auth_error'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeConnectorRepository(
  overrides: Partial<{
    updateTokens: (
      userId: number,
      provider: ConnectorProvider,
      data: UpdateTokensInput
    ) => Promise<void>
    setStatus: (
      userId: number,
      provider: ConnectorProvider,
      status: ConnectorStatus
    ) => Promise<void>
  }> = {}
): ConnectorRepository {
  class Mock extends ConnectorRepository {
    async findAllAutoImportEnabled() {
      return []
    }
    async upsert() {}
    async findFullByUserAndProvider(): Promise<null> {
      return null
    }
    async findByUserAndProvider(): Promise<ConnectorRecord | null> {
      return null
    }
    async disconnect() {}
    async updateTokens() {}
    async setStatus() {}
    async updateSettings() {}
    async findSettings() {
      return null
    }
  }
  return Object.assign(new Mock(), overrides)
}

function urlOf(input: string | URL | Request): string {
  if (input instanceof Request) return input.url
  if (input instanceof URL) return input.href
  return input
}

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const VALID_TOKENS = {
  accessToken: 'access_123',
  refreshToken: 'refresh_abc',
  expiresAt: Math.floor(Date.now() / 1000) + 3600, // valide pour 1h
}

const EXPIRED_TOKENS = {
  accessToken: 'old_access',
  refreshToken: 'old_refresh',
  expiresAt: Math.floor(Date.now() / 1000) - 60, // expiré il y a 1 min
}

const REFRESHED_TOKENS = {
  access_token: 'new_access',
  refresh_token: 'new_refresh',
  expires_at: Math.floor(Date.now() / 1000) + 7200,
}

const USER_ID = 1
const PROVIDER: ConnectorProvider = 'strava'
const CLIENT_ID = 'client_id'
const CLIENT_SECRET = 'client_secret'

// ─── Tests ────────────────────────────────────────────────────────────────────

test.group('StravaHttpClient — get()', () => {
  test('AC#1 — appel réussi avec token valide : retourne le JSON', async ({ assert }) => {
    const expected = { id: 42, name: 'Morning Run' }
    const fetcher = async () => makeJsonResponse(expected)
    const repo = makeConnectorRepository()
    const client = new StravaHttpClient(
      USER_ID,
      PROVIDER,
      VALID_TOKENS,
      repo,
      CLIENT_ID,
      CLIENT_SECRET,
      fetcher
    )

    const result = await client.get<typeof expected>('https://www.strava.com/api/v3/athlete')

    assert.deepEqual(result, expected)
  })

  test("AC#1 — 401 → déclenche un refresh puis réexécute l'appel", async ({ assert }) => {
    let callCount = 0
    let refreshCalled = false
    const repo = makeConnectorRepository({
      updateTokens: async () => {
        refreshCalled = true
      },
    })

    const fetcher = async (input: string | URL | Request) => {
      const url = urlOf(input)
      if (url.includes('oauth/token')) {
        return makeJsonResponse(REFRESHED_TOKENS)
      }
      callCount++
      if (callCount === 1) return makeJsonResponse(null, 401)
      return makeJsonResponse({ id: 1 })
    }

    const client = new StravaHttpClient(
      USER_ID,
      PROVIDER,
      VALID_TOKENS,
      repo,
      CLIENT_ID,
      CLIENT_SECRET,
      fetcher
    )
    const result = await client.get<{ id: number }>('https://www.strava.com/api/v3/athlete')

    assert.isTrue(refreshCalled, 'updateTokens doit être appelé (persist-before-use)')
    assert.equal(callCount, 2, "l'appel original doit être réexécuté")
    assert.deepEqual(result, { id: 1 })
  })

  test('AC#2 — persist-before-use : updateTokens appelé avant la réponse finale', async ({
    assert,
  }) => {
    const order: string[] = []
    const repo = makeConnectorRepository({
      updateTokens: async () => {
        order.push('persist')
      },
    })

    const fetcher = async (input: string | URL | Request) => {
      const url = urlOf(input)
      if (url.includes('oauth/token')) {
        return makeJsonResponse(REFRESHED_TOKENS)
      }
      if (order.length === 0) return makeJsonResponse(null, 401)
      order.push('api_response')
      return makeJsonResponse({ ok: true })
    }

    const client = new StravaHttpClient(
      USER_ID,
      PROVIDER,
      VALID_TOKENS,
      repo,
      CLIENT_ID,
      CLIENT_SECRET,
      fetcher
    )
    await client.get('https://www.strava.com/api/v3/athlete')

    assert.deepEqual(order, ['persist', 'api_response'])
  })

  test("AC#4 — refresh proactif si token expiré avant l'appel", async ({ assert }) => {
    let refreshCalled = false
    let apiCallCount = 0
    const repo = makeConnectorRepository({
      updateTokens: async () => {
        refreshCalled = true
      },
    })

    const fetcher = async (input: string | URL | Request) => {
      const url = urlOf(input)
      if (url.includes('oauth/token')) {
        return makeJsonResponse(REFRESHED_TOKENS)
      }
      apiCallCount++
      return makeJsonResponse({ id: 1 })
    }

    const client = new StravaHttpClient(
      USER_ID,
      PROVIDER,
      EXPIRED_TOKENS,
      repo,
      CLIENT_ID,
      CLIENT_SECRET,
      fetcher
    )
    await client.get('https://www.strava.com/api/v3/athlete')

    assert.isTrue(refreshCalled, 'le refresh proactif doit être déclenché')
    assert.equal(apiCallCount, 1, "l'appel API ne doit pas retourner 401 (proactif = pas de retry)")
  })

  test('AC#3 — échec du refresh : connecteur passe en état error', async ({ assert }) => {
    let statusSet: ConnectorStatus | null = null
    const repo = makeConnectorRepository({
      setStatus: async (_userId, _provider, status) => {
        statusSet = status
      },
    })

    const fetcher = async (input: string | URL | Request) => {
      const url = urlOf(input)
      if (url.includes('oauth/token')) return makeJsonResponse({ error: 'invalid_grant' }, 401)
      return makeJsonResponse(null, 401)
    }

    const client = new StravaHttpClient(
      USER_ID,
      PROVIDER,
      VALID_TOKENS,
      repo,
      CLIENT_ID,
      CLIENT_SECRET,
      fetcher
    )

    try {
      await client.get('https://www.strava.com/api/v3/athlete')
      assert.fail('doit lever une exception')
    } catch (err) {
      assert.instanceOf(err, ConnectorAuthError)
    }

    assert.equal(statusSet, 'error', 'le connecteur doit passer en état error')
  })

  test('AC#3 — aucun appel API supplémentaire après un échec de refresh', async ({ assert }) => {
    let apiCallCount = 0
    const repo = makeConnectorRepository()

    const fetcher = async (input: string | URL | Request) => {
      const url = urlOf(input)
      if (url.includes('oauth/token')) return makeJsonResponse({ error: 'invalid_grant' }, 401)
      apiCallCount++
      return makeJsonResponse(null, 401)
    }

    const client = new StravaHttpClient(
      USER_ID,
      PROVIDER,
      VALID_TOKENS,
      repo,
      CLIENT_ID,
      CLIENT_SECRET,
      fetcher
    )

    try {
      await client.get('https://www.strava.com/api/v3/athlete')
    } catch {
      // attendu
    }

    // 1 seul appel API initial (le 401 qui déclenche le refresh), puis 0 retry après échec
    assert.equal(apiCallCount, 1)
  })

  test('AC#3 — refresh proactif échoue : connecteur passe en état error', async ({ assert }) => {
    let statusSet: ConnectorStatus | null = null
    const repo = makeConnectorRepository({
      setStatus: async (_userId, _provider, status) => {
        statusSet = status
      },
    })

    const fetcher = async (input: string | URL | Request) => {
      const url = urlOf(input)
      if (url.includes('oauth/token')) return makeJsonResponse({ error: 'invalid_grant' }, 400)
      return makeJsonResponse({ id: 1 })
    }

    const client = new StravaHttpClient(
      USER_ID,
      PROVIDER,
      EXPIRED_TOKENS,
      repo,
      CLIENT_ID,
      CLIENT_SECRET,
      fetcher
    )

    try {
      await client.get('https://www.strava.com/api/v3/athlete')
      assert.fail('doit lever une exception')
    } catch (err) {
      assert.instanceOf(err, ConnectorAuthError)
    }

    assert.equal(statusSet, 'error')
  })
})
