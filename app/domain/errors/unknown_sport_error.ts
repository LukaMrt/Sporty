export class UnknownSportError extends Error {
  readonly i18nKey = 'planning.editor.errors.unknownSport'

  constructor(readonly sportSlug: string) {
    super(`Sport inconnu : ${sportSlug}`)
    this.name = 'UnknownSportError'
  }
}
