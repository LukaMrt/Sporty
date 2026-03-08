export interface ImportProgress {
  total: number
  completed: number
  failed: number
  errors: string[]
}

export abstract class ImportProgressPort {
  abstract init(userId: number, total: number): void
  abstract incrementCompleted(userId: number): void
  abstract incrementFailed(userId: number, reason?: string): void
  abstract get(userId: number): ImportProgress | null
  abstract clear(userId: number): void
}
