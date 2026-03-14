import { RateLimitManager } from '#domain/interfaces/rate_limit_manager'

export { RateLimitManager }

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

  async waitIfNeeded(): Promise<void> {
    if (this.#usageDaily >= this.#limitDaily) {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setUTCHours(24, 0, 0, 0)
      await this.#sleeper(midnight.getTime() - now.getTime())
    } else if (this.#usage15min >= this.#limit15min) {
      const now = new Date()
      const secondsInCurrentQuarter = (now.getUTCMinutes() % 15) * 60 + now.getUTCSeconds()
      const msUntilNextQuarter =
        (15 * 60 - secondsInCurrentQuarter) * 1000 - now.getUTCMilliseconds()
      await this.#sleeper(msUntilNextQuarter)
    }
  }
}
