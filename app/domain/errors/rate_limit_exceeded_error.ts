export class RateLimitExceededError extends Error {
  constructor(retryAfterSeconds?: number) {
    super(
      retryAfterSeconds !== undefined
        ? `Limite de requêtes dépassée — réessayez dans ${retryAfterSeconds}s`
        : 'Limite de requêtes dépassée'
    )
    this.name = 'RateLimitExceededError'
  }
}
