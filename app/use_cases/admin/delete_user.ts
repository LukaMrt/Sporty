import { inject } from '@adonisjs/core'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserDomainService } from '#domain/services/user_domain_service'
import { UserNotFoundError } from '#domain/errors/user_not_found_error'
import { UserRole } from '#domain/value_objects/user_role'
import { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'

@inject()
export default class DeleteUser {
  constructor(
    private userRepository: UserRepository,
    private gpxFileStorage: GpxFileStorage
  ) {}

  async execute(targetId: number, requesterId: number): Promise<void> {
    UserDomainService.assertCanDelete(targetId, requesterId)
    const target = await this.userRepository.findById(targetId)
    if (!target) throw new UserNotFoundError(targetId)
    const adminCount = await this.userRepository.countByRole(UserRole.Admin)
    UserDomainService.assertKeepsAnAdmin(target, adminCount, null)
    await this.userRepository.delete(targetId)
    // La cascade SQL supprime les lignes, pas les fichiers GPX
    await this.gpxFileStorage.deleteAllForUser(targetId)
  }
}
