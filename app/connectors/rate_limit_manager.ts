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
