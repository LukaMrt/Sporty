import type { ConnectorRepository } from '#domain/interfaces/connector_repository'
import type { ConnectorTokens } from '#domain/interfaces/connector'
import { ConnectorAuthError } from '#domain/errors/connector_auth_error'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { RateLimitManager } from '#connectors/rate_limit_manager'

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>
type Backoff = (attempt: number) => Promise<void>

interface StravaRefreshResponse {
  access_token: string
  refresh_token: string
  expires_at: number
}

const MAX_RETRIES = 3

const defaultBackoff: Backoff = (attempt) =>
  new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000 + Math.random() * 500))

export class StravaHttpClient {
  #tokens: ConnectorTokens

  constructor(
    private readonly userId: number,
    private readonly provider: ConnectorProvider,
    tokens: ConnectorTokens,
    private readonly connectorRepository: ConnectorRepository,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly rateLimitManager: RateLimitManager,
    private readonly fetcher: Fetcher = fetch,
    private readonly backoff: Backoff = defaultBackoff
  ) {
    this.#tokens = { ...tokens }
  }

  async get<T>(url: string): Promise<T> {
    await this.rateLimitManager.waitIfNeeded()

    if (this.#isExpired()) {
      await this.#doRefresh()
    }

    return this.#executeWithRetry<T>(url, 0)
  }

  async #executeWithRetry<T>(url: string, attempt: number): Promise<T> {
    const response = await this.fetcher(url, {
      headers: { Authorization: `Bearer ${this.#tokens.accessToken}` },
    })

    this.#updateRateLimit(response)

    if (response.status === 429) {
      if (attempt >= MAX_RETRIES) {
        throw new Error('Strava rate limit exceeded after max retries')
      }
      await this.backoff(attempt)
      return this.#executeWithRetry<T>(url, attempt + 1)
    }

    if (response.status === 500 || response.status === 503) {
      if (attempt >= MAX_RETRIES) {
        throw new Error(`Strava API error: ${response.status}`)
      }
      await this.backoff(attempt)
      return this.#executeWithRetry<T>(url, attempt + 1)
    }

    if (response.status === 401) {
      await this.#doRefresh()
      const retry = await this.fetcher(url, {
        headers: { Authorization: `Bearer ${this.#tokens.accessToken}` },
      })
      this.#updateRateLimit(retry)
      if (!retry.ok) {
        throw new ConnectorAuthError('Strava')
      }
      return retry.json() as Promise<T>
    }

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  #updateRateLimit(response: Response): void {
    const usage = response.headers.get('x-ratelimit-usage')
    if (!usage) return
    const [raw15min, rawDaily] = usage.split(',')
    const usage15min = Number(raw15min)
    const usageDaily = Number(rawDaily)
    if (!Number.isNaN(usage15min) && !Number.isNaN(usageDaily)) {
      this.rateLimitManager.update(usage15min, usageDaily)
    }
  }

  #isExpired(): boolean {
    return this.#tokens.expiresAt <= Math.floor(Date.now() / 1000)
  }

  async #doRefresh(): Promise<void> {
    const response = await this.fetcher('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.#tokens.refreshToken,
      }),
    })

    if (!response.ok) {
      await this.connectorRepository.setStatus(this.userId, this.provider, ConnectorStatus.Error)
      throw new ConnectorAuthError('Strava')
    }

    const newTokens = (await response.json()) as StravaRefreshResponse

    // Persist-before-use : sauvegarder en DB avant de mettre à jour l'état in-memory
    await this.connectorRepository.updateTokens(this.userId, this.provider, {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      tokenExpiresAtSeconds: newTokens.expires_at,
    })

    this.#tokens = {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: newTokens.expires_at,
    }
  }
}
