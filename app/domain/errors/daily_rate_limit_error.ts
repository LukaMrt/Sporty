export class DailyRateLimitError extends Error {
  constructor() {
    super('Daily rate limit reached — retry tomorrow')
    this.name = 'DailyRateLimitError'
  }
}
