import { CannotDeleteSelfError } from '#domain/errors/cannot_delete_self_error'

export class UserDomainService {
  static assertCanDelete(targetId: number, requesterId: number): void {
    if (targetId === requesterId) {
      throw new CannotDeleteSelfError()
    }
  }
}
