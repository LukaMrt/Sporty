export class LastAdminError extends Error {
  readonly i18nKey = 'admin.errors.lastAdmin'

  constructor() {
    super('At least one administrator must remain')
    this.name = 'LastAdminError'
  }
}
