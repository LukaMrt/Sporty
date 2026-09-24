import { OAuthClient } from '#domain/interfaces/oauth_client'
import type { ConnectorTokens } from '#domain/interfaces/connector'

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export class StravaOAuthClient extends OAuthClient {
  constructor(
    private clientId: string | undefined,
    private clientSecret: string | undefined,
    private appUrl: string,
    private fetcher: Fetcher = fetch
  ) {
    super()
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret)
  }

  authorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId ?? '',
      redirect_uri: `${this.appUrl}/connectors/strava/callback`,
      response_type: 'code',
      scope: 'read,activity:read_all',
      state,
    })
    return `https://www.strava.com/oauth/authorize?${params.toString()}`
  }

  async exchangeCode(code: string): Promise<ConnectorTokens> {
    const response = await this.fetcher('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    })
    if (!response.ok) {
      throw new Error(`Strava token exchange failed: ${response.status}`)
    }
    const tokens = (await response.json()) as {
      access_token: string
      refresh_token: string
      expires_at: number
    }
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_at,
    }
  }
}
