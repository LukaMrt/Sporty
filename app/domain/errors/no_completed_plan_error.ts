export class NoCompletedPlanError extends Error {
  constructor() {
    super('Aucun plan terminé trouvé pour cet utilisateur')
    this.name = 'NoCompletedPlanError'
  }
}
