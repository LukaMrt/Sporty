import { inject } from '@adonisjs/core'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'

export interface IgnoreActivityInput {
  id: number
  userId: number
}

@inject()
export default class IgnoreActivity {
  constructor(private importActivityRepository: ImportActivityRepository) {}

  async execute(input: IgnoreActivityInput): Promise<void> {
    await this.importActivityRepository.setIgnored(input.id, input.userId)
  }
}
