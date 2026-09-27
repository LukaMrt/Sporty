export class PlannedWeekNotFoundError extends Error {
  readonly i18nKey = 'planning.editor.errors.weekNotFound'

  constructor(readonly weekNumber: number) {
    super(`Semaine ${weekNumber} introuvable dans le plan actif`)
    this.name = 'PlannedWeekNotFoundError'
  }
}
