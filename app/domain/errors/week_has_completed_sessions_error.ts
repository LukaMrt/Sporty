/** Une semaine contenant des séances déjà réalisées ne peut pas être supprimée */
export class WeekHasCompletedSessionsError extends Error {
  readonly i18nKey = 'planning.editor.errors.weekHasCompletedSessions'

  constructor(readonly weekNumber: number) {
    super(`La semaine ${weekNumber} contient des séances réalisées`)
    this.name = 'WeekHasCompletedSessionsError'
  }
}
