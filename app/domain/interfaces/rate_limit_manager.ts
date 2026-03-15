export abstract class RateLimitManager {
  abstract update(usage15min: number, usageDaily: number): void
  abstract waitIfNeeded(): Promise<void>
}
