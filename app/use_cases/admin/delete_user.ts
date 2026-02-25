import { inject } from '@adonisjs/core'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserDomainService } from '#domain/services/user_domain_service'

@inject()
export default class DeleteUser {
  constructor(private userRepository: UserRepository) {}

  async execute(targetId: number, requesterId: number): Promise<void> {
    UserDomainService.assertCanDelete(targetId, requesterId)
    await this.userRepository.delete(targetId)
  }
}
