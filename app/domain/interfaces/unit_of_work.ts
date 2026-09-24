/**
 * Exécute un bloc de façon atomique : toutes les écritures des repositories
 * faites pendant `fn` sont validées ensemble ou annulées ensemble.
 */
export abstract class UnitOfWork {
  abstract run<T>(fn: () => Promise<T>): Promise<T>
}
