import { AsyncLocalStorage } from 'node:async_hooks'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Transaction courante, propagée implicitement aux repositories Lucid : les use
 * cases restent indépendants de Lucid (ils ne voient que le port UnitOfWork).
 */
export const transactionStorage = new AsyncLocalStorage<TransactionClientContract>()

/** Options de requête Lucid : dans la transaction courante s'il y en a une */
export function txOptions(): { client: TransactionClientContract } | undefined {
  const client = transactionStorage.getStore()
  return client ? { client } : undefined
}
