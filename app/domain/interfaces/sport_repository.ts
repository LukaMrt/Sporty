export type SportSummary = {
  id: number
  name: string
  slug: string
}

export abstract class SportRepository {
  abstract findAll(): Promise<SportSummary[]>
}
