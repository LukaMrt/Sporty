import { RateLimitManager } from '#domain/interfaces/rate_limit_manager'
import { DailyRateLimitError } from '#domain/errors/daily_rate_limit_error'

export { RateLimitManager }
export { DailyRateLimitError }

type Sleeper = (ms: number) => Promise<void>

const defaultSleeper: Sleeper = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export class StravaRateLimitManager extends RateLimitManager {
  #usage15min = 0
  #usageDaily = 0

  readonly #limit15min = 100
  readonly #limitDaily = 1000
  readonly #sleeper: Sleeper

  constructor(options: { sleeper?: Sleeper } = {}) {
    super()
    this.#sleeper = options.sleeper ?? defaultSleeper
  }

  get usage15min(): number {
    return this.#usage15min
  }

  get usageDaily(): number {
    return this.#usageDaily
  }

  update(usage15min: number, usageDaily: number): void {
    this.#usage15min = usage15min
    this.#usageDaily = usageDaily
  }

  msUntilNextQuarter(): number {
    const now = new Date()
    const secondsInCurrentQuarter = (now.getUTCMinutes() % 15) * 60 + now.getUTCSeconds()
    return (15 * 60 - secondsInCurrentQuarter) * 1000 - now.getUTCMilliseconds()
  }

  async waitIfNeeded(): Promise<void> {
    if (this.#usageDaily >= this.#limitDaily) {
      throw new DailyRateLimitError()
    }

    if (this.#usage15min >= this.#limit15min) {
      await this.#sleeper(this.msUntilNextQuarter())
    }
  }
}

/**
 * Throttle generique a fenetre glissante, pour les APIs qui n'exposent aucun
 * en-tete de quota (open-wearables).
 *
 * `update()` est volontairement sans effet : le port impose la signature Strava
 * (usage 15 min / quotidien), qui n'a pas d'equivalent ici. Le vrai filet de
 * securite reste le 429 + backoff du client HTTP ; ce throttle sert surtout a ne
 * pas marteler un serveur auto-heberge pendant la pagination des timeseries.
 */
export class ThrottlingRateLimitManager extends RateLimitManager {
  readonly #maxRequestsPerMinute: number
  readonly #sleeper: Sleeper
  readonly #now: () => number
  #timestamps: number[] = []

  constructor(
    options: { maxRequestsPerMinute?: number; sleeper?: Sleeper; now?: () => number } = {}
  ) {
    super()
    this.#maxRequestsPerMinute = options.maxRequestsPerMinute ?? 120
    this.#sleeper = options.sleeper ?? defaultSleeper
    this.#now = options.now ?? (() => Date.now())
  }

  update(_usage15min: number, _usageDaily: number): void {
    // Sans objet : open-wearables n'expose pas de compteur de quota.
  }

  async waitIfNeeded(): Promise<void> {
    const windowStart = this.#now() - 60_000
    this.#timestamps = this.#timestamps.filter((t) => t > windowStart)

    if (this.#timestamps.length >= this.#maxRequestsPerMinute) {
      const oldest = this.#timestamps[0]
      const waitMs = oldest + 60_000 - this.#now()
      if (waitMs > 0) await this.#sleeper(waitMs)
      this.#timestamps = this.#timestamps.filter((t) => t > this.#now() - 60_000)
    }

    this.#timestamps.push(this.#now())
  }
}
