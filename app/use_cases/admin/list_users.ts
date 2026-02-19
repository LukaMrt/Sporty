import { inject } from '@adonisjs/core'
import { UserRepository } from '#domain/interfaces/user_repository'
import type { User } from '#domain/entities/user'

@inject()
export default class ListUsers {
  constructor(private userRepository: UserRepository) {}

  async listAllUsers(): Promise<User[]> {
    return this.userRepository.findAll()
  }
}
