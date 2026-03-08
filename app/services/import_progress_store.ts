import { ImportProgressPort } from '#domain/interfaces/import_progress_port'
import type { ImportProgress } from '#domain/interfaces/import_progress_port'

export type { ImportProgress }

export class ImportProgressStore extends ImportProgressPort {
  readonly #store = new Map<number, ImportProgress>()

  init(userId: number, total: number): void {
    this.#store.set(userId, { total, completed: 0, failed: 0, errors: [] })
  }

  incrementCompleted(userId: number): void {
    const p = this.#store.get(userId)
    if (p) p.completed++
  }

  incrementFailed(userId: number, reason?: string): void {
    const p = this.#store.get(userId)
    if (p) {
      p.failed++
      if (reason) p.errors.push(reason)
    }
  }

  get(userId: number): ImportProgress | null {
    return this.#store.get(userId) ?? null
  }

  clear(userId: number): void {
    this.#store.delete(userId)
  }
}
