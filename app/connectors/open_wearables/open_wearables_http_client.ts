import type { RateLimitManager } from '#domain/interfaces/rate_limit_manager'
import { ConnectorAuthError } from '#domain/errors/connector_auth_error'
import type { OwPaginated } from '#connectors/open_wearables/types'

export type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

type Backoff = (attempt: number) => Promise<void>

const MAX_RETRIES = 3
/** Le serveur plafonne a 100 ; au-dela il tronque silencieusement. */
export const MAX_PAGE_SIZE = 100
/** Borne dure : 50 pages x 100 = 5000 elements, tres au-dela des usages reels. */
const DEFAULT_MAX_PAGES = 50

const defaultBackoff: Backoff = (attempt) =>
  new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000 + Math.random() * 500))

export type QueryValue = string | number | string[]

export class OpenWearablesHttpClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private apiKeyHeader: string,
    private rateLimitManager: RateLimitManager,
    private fetcher: Fetcher = fetch,
    private backoff: Backoff = defaultBackoff
  ) {}

  async get<T>(path: string, query: Record<string, QueryValue> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl.replace(/\/$/, '')}${path}`)
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        // FastAPI attend la repetition du parametre pour une liste.
        for (const item of value) url.searchParams.append(key, item)
      } else {
        url.searchParams.set(key, String(value))
      }
    }
    return this.#executeWithRetry<T>(url.toString(), 0)
  }

  /**
   * Suit la pagination par cursor jusqu'a epuisement.
   *
   * Trois garde-fous, dont un non theorique : un cursor qui ne progresse pas
   * boucle a l'infini et sature le serveur.
   */
  async getAllPages<T>(
    path: string,
    query: Record<string, QueryValue> = {},
    maxPages = DEFAULT_MAX_PAGES
  ): Promise<T[]> {
    const all: T[] = []
    const seenCursors = new Set<string>()
    let cursor: string | null = null

    for (let page = 0; page < maxPages; page++) {
      const pageQuery: Record<string, QueryValue> = { ...query, limit: MAX_PAGE_SIZE }
      if (cursor) pageQuery.cursor = cursor

      const body = await this.get<OwPaginated<T>>(path, pageQuery)
      all.push(...body.data)

      const next = body.pagination?.next_cursor
      if (!body.pagination?.has_more || !next) break
      if (seenCursors.has(next)) break // cursor qui ne progresse pas
      seenCursors.add(next)
      cursor = next
    }

    return all
  }

  async #executeWithRetry<T>(url: string, attempt: number): Promise<T> {
    await this.rateLimitManager.waitIfNeeded()

    const response = await this.fetcher(url, {
      headers: { [this.apiKeyHeader]: this.apiKey, Accept: 'application/json' },
    })

    if (response.ok) return (await response.json()) as T

    // Pas de refresh possible : la cle API est statique. Une 401/403 signifie
    // que la cle est invalide ou revoquee, ce qui bascule le connecteur en erreur.
    if (response.status === 401 || response.status === 403) {
      throw new ConnectorAuthError('open-wearables')
    }

    const retryable = response.status === 429 || response.status === 500 || response.status === 503
    if (retryable && attempt < MAX_RETRIES) {
      const retryAfter = Number(response.headers.get('retry-after'))
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
      } else {
        await this.backoff(attempt)
      }
      return this.#executeWithRetry<T>(url, attempt + 1)
    }

    throw new Error(`open-wearables API error: ${response.status}`)
  }
}
