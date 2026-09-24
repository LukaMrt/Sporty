import { inject } from '@adonisjs/core'
import type { User } from '#domain/entities/user'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserNotFoundError } from '#domain/errors/user_not_found_error'
import { UserDomainService } from '#domain/services/user_domain_service'
import { UserRole } from '#domain/value_objects/user_role'

export type UpdateUserInput = {
  fullName?: string
  email?: string
  role?: UserRole
}

@inject()
export default class UpdateUser {
  constructor(private userRepository: UserRepository) {}

  async execute(id: number, input: UpdateUserInput): Promise<User> {
    if (input.role !== undefined) {
      const target = await this.userRepository.findById(id)
      if (!target) throw new UserNotFoundError(id)
      const adminCount = await this.userRepository.countByRole(UserRole.Admin)
      UserDomainService.assertKeepsAnAdmin(target, adminCount, input.role)
    }
    return this.userRepository.update(id, input)
  }
}
