import type { ConnectorRepository } from '#domain/interfaces/connector_repository'
import type { ConnectorTokens } from '#domain/interfaces/connector'
import { ConnectorAuthError } from '#domain/errors/connector_auth_error'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

interface StravaRefreshResponse {
  access_token: string
  refresh_token: string
  expires_at: number
}

export class StravaHttpClient {
  private tokens: ConnectorTokens

  constructor(
    private readonly userId: number,
    private readonly provider: ConnectorProvider,
    tokens: ConnectorTokens,
    private readonly connectorRepository: ConnectorRepository,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly fetcher: Fetcher = fetch
  ) {
    this.tokens = { ...tokens }
  }

  async get<T>(url: string): Promise<T> {
    if (this.isExpired()) {
      await this.doRefresh()
    }

    const response = await this.fetcher(url, {
      headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
    })

    if (response.status === 401) {
      await this.doRefresh()
      const retry = await this.fetcher(url, {
        headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
      })
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

  private isExpired(): boolean {
    return this.tokens.expiresAt <= Math.floor(Date.now() / 1000)
  }

  private async doRefresh(): Promise<void> {
    const response = await this.fetcher('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refreshToken,
      }),
    })

    if (!response.ok) {
      await this.connectorRepository.setStatus(this.userId, this.provider, ConnectorStatus.Error)
      throw new ConnectorAuthError('Strava')
    }

    const newTokens = (await response.json()) as StravaRefreshResponse

    // Persist-before-use : sauvegarder en DB avant de mettre à jour l'état in-memory (FR6)
    await this.connectorRepository.updateTokens(this.userId, this.provider, {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      tokenExpiresAtSeconds: newTokens.expires_at,
    })

    this.tokens = {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: newTokens.expires_at,
    }
  }
}
