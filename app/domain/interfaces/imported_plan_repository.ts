import type { ImportedPlanEntry } from '#domain/value_objects/imported_plan_entry'

export abstract class ImportedPlanRepository {
  /** Remplace les séances prévues de l'utilisateur sur la période couverte par `entries` */
  abstract replaceRange(userId: number, entries: ImportedPlanEntry[]): Promise<void>
  abstract findRange(
    userId: number,
    from: string,
    to: string
  ): Promise<(ImportedPlanEntry & { id: number })[]>
  abstract clear(userId: number): Promise<void>
}
