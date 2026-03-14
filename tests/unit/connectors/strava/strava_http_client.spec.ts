import { test } from '@japa/runner'
import { StravaHttpClient } from '#connectors/strava/strava_http_client'
import { RateLimitManager, StravaRateLimitManager } from '#connectors/rate_limit_manager'
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
    async findById() {
      return null
    }
    async updateLastSyncAt() {}
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

function makeRateLimitManager(
  overrides: Partial<{
    waitIfNeeded: () => Promise<void>
    update: (a: number, b: number) => void
  }> = {}
): RateLimitManager {
  class Mock extends RateLimitManager {
    update() {}
    async waitIfNeeded() {}
  }
  return Object.assign(new Mock(), overrides)
}

function urlOf(input: string | URL | Request): string {
  if (input instanceof Request) return input.url
  if (input instanceof URL) return input.href
  return input
}

function makeJsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

const VALID_TOKENS = {
  accessToken: 'access_123',
  refreshToken: 'refresh_abc',
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
}

const EXPIRED_TOKENS = {
  accessToken: 'old_access',
  refreshToken: 'old_refresh',
  expiresAt: Math.floor(Date.now() / 1000) - 60,
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

function makeClient(
  overrides: {
    tokens?: typeof VALID_TOKENS
    repo?: ConnectorRepository
    rateLimitManager?: RateLimitManager
    fetcher?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  } = {}
): StravaHttpClient {
  return new StravaHttpClient(
    USER_ID,
    PROVIDER,
    overrides.tokens ?? VALID_TOKENS,
    overrides.repo ?? makeConnectorRepository(),
    CLIENT_ID,
    CLIENT_SECRET,
    overrides.rateLimitManager ?? makeRateLimitManager(),
    overrides.fetcher ?? (async () => makeJsonResponse({ ok: true }))
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.group('StravaHttpClient (connectors) — Rate Limit', () => {
  test('AC#1 — waitIfNeeded est appelé avant chaque requête', async ({ assert }) => {
    let waited = false
    const rlm = makeRateLimitManager({
      waitIfNeeded: async () => {
        waited = true
      },
    })
    const client = makeClient({ rateLimitManager: rlm })
    await client.get('https://www.strava.com/api/v3/athlete')
    assert.isTrue(waited, 'waitIfNeeded doit être appelé avant la requête')
  })

  test('AC#1 — X-RateLimit-Usage header est parsé et RateLimitManager.update() est appelé', async ({
    assert,
  }) => {
    let updated15min = -1
    let updatedDaily = -1
    const rlm = makeRateLimitManager({
      update: (a, b) => {
        updated15min = a
        updatedDaily = b
      },
    })
    const fetcher = async () => makeJsonResponse({ id: 1 }, 200, { 'X-RateLimit-Usage': '42,567' })
    const client = makeClient({ rateLimitManager: rlm, fetcher })
    await client.get('https://www.strava.com/api/v3/athlete')
    assert.equal(updated15min, 42)
    assert.equal(updatedDaily, 567)
  })

  test('AC#1 — X-RateLimit-Usage header en casse mixte est parsé correctement', async ({
    assert,
  }) => {
    let updated15min = -1
    const rlm = makeRateLimitManager({
      update: (a) => {
        updated15min = a
      },
    })
    // Response.headers.get() est déjà case-insensitive nativement
    const fetcher = async () => makeJsonResponse({ id: 1 }, 200, { 'x-ratelimit-usage': '10,200' })
    const client = makeClient({ rateLimitManager: rlm, fetcher })
    await client.get('https://www.strava.com/api/v3/athlete')
    assert.equal(updated15min, 10)
  })

  test("AC#1 — absence du header X-RateLimit-Usage ne lève pas d'erreur", async ({ assert }) => {
    const client = makeClient()
    const result = await client.get<{ id: number }>('https://www.strava.com/api/v3/athlete')
    assert.property(result, 'ok')
  })
})

test.group('StravaHttpClient (connectors) — Retry 429', () => {
  test('AC#2 — HTTP 429 → retry avec backoff (vérifie le nombre de tentatives)', async ({
    assert,
  }) => {
    let callCount = 0
    const fetcher = async () => {
      callCount++
      if (callCount <= 2) return makeJsonResponse(null, 429)
      return makeJsonResponse({ id: 1 })
    }
    // On passe un backoff de 0ms pour accélérer le test
    const client = new StravaHttpClient(
      USER_ID,
      PROVIDER,
      VALID_TOKENS,
      makeConnectorRepository(),
      CLIENT_ID,
      CLIENT_SECRET,
      makeRateLimitManager(),
      fetcher,
      () => Promise.resolve() // backoff noop
    )
    const result = await client.get<{ id: number }>('https://www.strava.com/api/v3/athlete')
    assert.equal(callCount, 3)
    assert.deepEqual(result, { id: 1 })
  })

  test('AC#2 — HTTP 429 x4 → lève une erreur après max 3 retries', async ({ assert }) => {
    const fetcher = async () => makeJsonResponse(null, 429)
    const client = new StravaHttpClient(
      USER_ID,
      PROVIDER,
      VALID_TOKENS,
      makeConnectorRepository(),
      CLIENT_ID,
      CLIENT_SECRET,
      makeRateLimitManager(),
      fetcher,
      () => Promise.resolve()
    )
    try {
      await client.get('https://www.strava.com/api/v3/athlete')
      assert.fail('doit lever une erreur')
    } catch (err) {
      assert.instanceOf(err, Error)
    }
  })
})

test.group('StravaHttpClient (connectors) — Retry 500/503', () => {
  test('AC#3 — HTTP 500 → retry max 3 fois', async ({ assert }) => {
    let callCount = 0
    const fetcher = async () => {
      callCount++
      if (callCount <= 2) return makeJsonResponse(null, 500)
      return makeJsonResponse({ id: 1 })
    }
    const client = new StravaHttpClient(
      USER_ID,
      PROVIDER,
      VALID_TOKENS,
      makeConnectorRepository(),
      CLIENT_ID,
      CLIENT_SECRET,
      makeRateLimitManager(),
      fetcher,
      () => Promise.resolve()
    )
    const result = await client.get<{ id: number }>('https://www.strava.com/api/v3/athlete')
    assert.equal(callCount, 3)
    assert.deepEqual(result, { id: 1 })
  })

  test('AC#3 — HTTP 503 x4 → lève une erreur après max 3 retries', async ({ assert }) => {
    const fetcher = async () => makeJsonResponse(null, 503)
    const client = new StravaHttpClient(
      USER_ID,
      PROVIDER,
      VALID_TOKENS,
      makeConnectorRepository(),
      CLIENT_ID,
      CLIENT_SECRET,
      makeRateLimitManager(),
      fetcher,
      () => Promise.resolve()
    )
    try {
      await client.get('https://www.strava.com/api/v3/athlete')
      assert.fail('doit lever une erreur')
    } catch (err) {
      assert.instanceOf(err, Error)
    }
  })
})

test.group('StravaHttpClient (connectors) — Refresh Token (AC#4)', () => {
  test("AC#4 — 401 → déclenche un refresh puis réexécute l'appel", async ({ assert }) => {
    let callCount = 0
    let refreshCalled = false
    const repo = makeConnectorRepository({
      updateTokens: async () => {
        refreshCalled = true
      },
    })
    const fetcher = async (input: string | URL | Request) => {
      const url = urlOf(input)
      if (url.includes('oauth/token')) return makeJsonResponse(REFRESHED_TOKENS)
      callCount++
      if (callCount === 1) return makeJsonResponse(null, 401)
      return makeJsonResponse({ id: 1 })
    }
    const client = makeClient({ repo, fetcher })
    const result = await client.get<{ id: number }>('https://www.strava.com/api/v3/athlete')
    assert.isTrue(refreshCalled, 'updateTokens doit être appelé (persist-before-use)')
    assert.equal(callCount, 2)
    assert.deepEqual(result, { id: 1 })
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
      if (url.includes('oauth/token')) return makeJsonResponse(REFRESHED_TOKENS)
      apiCallCount++
      return makeJsonResponse({ id: 1 })
    }
    const client = makeClient({ tokens: EXPIRED_TOKENS, repo, fetcher })
    await client.get('https://www.strava.com/api/v3/athlete')
    assert.isTrue(refreshCalled)
    assert.equal(apiCallCount, 1)
  })

  test('AC#4 — échec du refresh → connecteur passe en état error + ConnectorAuthError', async ({
    assert,
  }) => {
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
    const client = makeClient({ repo, fetcher })
    try {
      await client.get('https://www.strava.com/api/v3/athlete')
      assert.fail('doit lever une exception')
    } catch (err) {
      assert.instanceOf(err, ConnectorAuthError)
    }
    assert.equal(statusSet, 'error')
  })
})

test.group('StravaHttpClient (connectors) — Appel nominal', () => {
  test('AC#1 — appel réussi avec token valide retourne le JSON', async ({ assert }) => {
    const expected = { id: 42, name: 'Morning Run' }
    const fetcher = async () => makeJsonResponse(expected)
    const client = makeClient({ fetcher })
    const result = await client.get<typeof expected>('https://www.strava.com/api/v3/athlete')
    assert.deepEqual(result, expected)
  })

  test('AC#1 — le bearer token est envoyé dans le header Authorization', async ({ assert }) => {
    let sentAuth: string | null = null
    const fetcher = async (_input: string | URL | Request, init?: RequestInit) => {
      sentAuth = (init?.headers as Record<string, string>)?.['Authorization'] ?? null
      return makeJsonResponse({ ok: true })
    }
    const client = makeClient({ fetcher })
    await client.get('https://www.strava.com/api/v3/athlete')
    assert.equal(sentAuth, `Bearer ${VALID_TOKENS.accessToken}`)
  })
})

test.group('StravaHttpClient (connectors) — Intégration RateLimitManager réel', () => {
  test('AC#1 — met à jour le StravaRateLimitManager après une réponse avec header', async ({
    assert,
  }) => {
    const rlm = new StravaRateLimitManager()
    const fetcher = async () => makeJsonResponse({ id: 1 }, 200, { 'X-RateLimit-Usage': '15,300' })
    const client = new StravaHttpClient(
      USER_ID,
      PROVIDER,
      VALID_TOKENS,
      makeConnectorRepository(),
      CLIENT_ID,
      CLIENT_SECRET,
      rlm,
      fetcher
    )
    await client.get('https://www.strava.com/api/v3/athlete')
    assert.equal(rlm.usage15min, 15)
    assert.equal(rlm.usageDaily, 300)
  })
})
