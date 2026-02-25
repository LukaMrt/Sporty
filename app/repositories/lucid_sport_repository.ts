import type { SportSummary } from '#domain/interfaces/sport_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import SportModel from '#models/sport'

export default class LucidSportRepository extends SportRepository {
  async findAll(): Promise<SportSummary[]> {
    const sports = await SportModel.all()
    return sports.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))
  }
}
