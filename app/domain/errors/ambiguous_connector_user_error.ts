/**
 * La cle donne acces a plusieurs utilisateurs : impossible de choisir sans
 * ambiguite a qui rattacher le connecteur.
 */
export class AmbiguousConnectorUserError extends Error {
  constructor(public readonly count: number) {
    super(`Cle API rattachee a ${count} utilisateurs`)
    this.name = 'AmbiguousConnectorUserError'
  }
}
