import { CannotDeleteSelfError } from '#domain/errors/cannot_delete_self_error'
import { LastAdminError } from '#domain/errors/last_admin_error'
import type { User } from '#domain/entities/user'
import { UserRole } from '#domain/value_objects/user_role'

export class UserDomainService {
  static assertCanDelete(targetId: number, requesterId: number): void {
    if (targetId === requesterId) {
      throw new CannotDeleteSelfError()
    }
  }

  /**
   * Empêche de retirer le dernier administrateur (suppression ou rétrogradation).
   * @param adminCount nombre d'admins actuellement en base
   */
  static assertKeepsAnAdmin(target: User, adminCount: number, nextRole: User['role'] | null): void {
    const losesAdmin = target.role === UserRole.Admin && nextRole !== UserRole.Admin
    if (losesAdmin && adminCount <= 1) {
      throw new LastAdminError()
    }
  }
}
