import { ApiKeyConnectorVerifier } from '#domain/interfaces/api_key_connector_verifier'
import type { VerifiedApiKeyIdentity } from '#domain/interfaces/api_key_connector_verifier'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { InvalidApiKeyError } from '#domain/errors/invalid_api_key_error'
import { AmbiguousConnectorUserError } from '#domain/errors/ambiguous_connector_user_error'
import { ConnectorUnreachableError } from '#domain/errors/connector_unreachable_error'
import type { Fetcher } from '#connectors/open_wearables/open_wearables_http_client'
import type { OwUserList, RawOwUser } from '#connectors/open_wearables/types'

function displayNameOf(user: RawOwUser): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return full || user.email || user.id
}

export class OpenWearablesApiKeyVerifier extends ApiKeyConnectorVerifier {
  constructor(
    private baseUrl: string,
    private apiKeyHeader: string,
    private fetcher: Fetcher = fetch
  ) {
    super()
  }

  async verify(_provider: ConnectorProvider, apiKey: string): Promise<VerifiedApiKeyIdentity> {
    if (!this.baseUrl) throw new ConnectorUnreachableError('open-wearables')

    let response: Response
    try {
      response = await this.fetcher(`${this.baseUrl.replace(/\/$/, '')}/users`, {
        headers: { [this.apiKeyHeader]: apiKey, Accept: 'application/json' },
      })
    } catch {
      throw new ConnectorUnreachableError('open-wearables')
    }

    if (response.status === 401 || response.status === 403) {
      throw new InvalidApiKeyError('open-wearables')
    }
    if (!response.ok) {
      throw new ConnectorUnreachableError('open-wearables')
    }

    const body = (await response.json()) as OwUserList
    const users = body.items ?? []

    if (users.length === 0) throw new InvalidApiKeyError('open-wearables')
    // Une cle personnelle ne voit qu'un utilisateur. Au-dela, on refuse plutot
    // que de rattacher les seances au mauvais athlete.
    if (users.length > 1) throw new AmbiguousConnectorUserError(users.length)

    return { externalUserId: users[0].id, displayName: displayNameOf(users[0]) }
  }
}
