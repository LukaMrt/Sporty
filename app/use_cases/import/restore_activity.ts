import { inject } from '@adonisjs/core'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'

export interface RestoreActivityInput {
  id: number
}

@inject()
export default class RestoreActivity {
  constructor(private importActivityRepository: ImportActivityRepository) {}

  async execute(input: RestoreActivityInput): Promise<void> {
    await this.importActivityRepository.setNew(input.id)
  }
}
