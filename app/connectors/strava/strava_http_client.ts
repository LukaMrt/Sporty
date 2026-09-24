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

/**
 * Refresh en cours par utilisateur/provider. Strava fait tourner le refresh token :
 * deux refresh concurrents (scheduler + requête utilisateur) invalideraient l'un
 * des deux. Les appels simultanés partagent donc la même promesse (mono-instance).
 */
const inflightRefreshes = new Map<string, Promise<ConnectorTokens>>()

/** Réponse d'erreur du refresh qui signifie un refresh token révoqué ou invalide */
const PERMANENT_REFRESH_STATUSES = new Set([400, 401])

export class StravaTransientError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StravaTransientError'
  }
}

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

  get tokens(): ConnectorTokens {
    return { ...this.#tokens }
  }

  async get<T>(url: string): Promise<T> {
    if (this.#isExpired()) {
      await this.#refresh()
    }

    return this.#executeWithRetry<T>(url, 0, false)
  }

  async #executeWithRetry<T>(url: string, attempt: number, refreshed: boolean): Promise<T> {
    // Chaque tentative (y compris après un 401) respecte le rate limit
    await this.rateLimitManager.waitIfNeeded()

    const response = await this.fetcher(url, {
      headers: { Authorization: `Bearer ${this.#tokens.accessToken}` },
    })

    this.#updateRateLimit(response)

    if (response.status === 429 || response.status === 500 || response.status === 503) {
      if (attempt >= MAX_RETRIES) {
        throw new StravaTransientError(`Strava API error: ${response.status} after max retries`)
      }
      await this.backoff(attempt)
      return this.#executeWithRetry<T>(url, attempt + 1, refreshed)
    }

    if (response.status === 401) {
      // Un seul refresh par requête : un 401 persistant est une vraie révocation
      if (refreshed) throw new ConnectorAuthError('Strava')
      await this.#refresh()
      return this.#executeWithRetry<T>(url, attempt, true)
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

  async #refresh(): Promise<void> {
    const key = `${this.userId}:${this.provider}`
    let pending = inflightRefreshes.get(key)
    if (!pending) {
      pending = this.#doRefresh().finally(() => inflightRefreshes.delete(key))
      inflightRefreshes.set(key, pending)
    }
    this.#tokens = await pending
  }

  async #doRefresh(): Promise<ConnectorTokens> {
    let response: Response
    try {
      response = await this.fetcher('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: this.#tokens.refreshToken,
        }),
      })
    } catch (error) {
      // Réseau indisponible : transitoire, le connecteur reste valide
      throw new StravaTransientError(`Strava token refresh failed: ${String(error)}`)
    }

    if (!response.ok) {
      // Seul un refresh token refusé (400/401) justifie de passer le connecteur en erreur ;
      // un 429/5xx de Strava est transitoire et sera retenté à la prochaine synchro.
      if (PERMANENT_REFRESH_STATUSES.has(response.status)) {
        await this.connectorRepository.setStatus(this.userId, this.provider, ConnectorStatus.Error)
        throw new ConnectorAuthError('Strava')
      }
      throw new StravaTransientError(`Strava token refresh failed: ${response.status}`)
    }

    const newTokens = (await response.json()) as StravaRefreshResponse

    // Persist-before-use : sauvegarder en DB avant de mettre à jour l'état in-memory
    await this.connectorRepository.updateTokens(this.userId, this.provider, {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      tokenExpiresAtSeconds: newTokens.expires_at,
    })

    return {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: newTokens.expires_at,
    }
  }
}
