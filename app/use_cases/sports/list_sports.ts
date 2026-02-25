import { inject } from '@adonisjs/core'
import type { SportSummary } from '#domain/interfaces/sport_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'

@inject()
export default class ListSports {
  constructor(private sportRepository: SportRepository) {}

  async execute(): Promise<SportSummary[]> {
    return this.sportRepository.findAll()
  }
}
