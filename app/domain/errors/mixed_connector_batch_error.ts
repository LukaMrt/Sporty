/**
 * Un lot d'import ne peut porter que sur un seul connecteur : chaque ecran de
 * staging est mono-provider, et un lot mixte n'a pas de connecteur unique a
 * interroger.
 */
export class MixedConnectorBatchError extends Error {
  constructor() {
    super('Import batch spans multiple connectors')
    this.name = 'MixedConnectorBatchError'
  }
}
