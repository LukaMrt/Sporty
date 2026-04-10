export class ActiveGoalExistsError extends Error {
  constructor() {
    super('Un seul objectif actif a la fois')
    this.name = 'ActiveGoalExistsError'
  }
}
