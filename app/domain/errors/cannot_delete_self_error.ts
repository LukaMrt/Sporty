export class CannotDeleteSelfError extends Error {
  /** Clé de traduction à afficher à l'utilisateur */
  readonly i18nKey = 'admin.errors.cannotDeleteSelf'

  constructor() {
    super('Cannot delete your own account')
    this.name = 'CannotDeleteSelfError'
  }
}
