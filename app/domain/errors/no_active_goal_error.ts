export class NoActiveGoalError extends Error {
  constructor() {
    super('Aucun objectif actif trouvé pour cet utilisateur')
    this.name = 'NoActiveGoalError'
  }
}
