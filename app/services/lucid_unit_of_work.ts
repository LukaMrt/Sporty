import db from '@adonisjs/lucid/services/db'
import { UnitOfWork } from '#domain/interfaces/unit_of_work'
import { transactionStorage } from '#repositories/transaction_context'

export class LucidUnitOfWork extends UnitOfWork {
  async run<T>(fn: () => Promise<T>): Promise<T> {
    // Imbrication : on réutilise la transaction englobante
    if (transactionStorage.getStore()) return fn()
    return db.transaction((trx) => transactionStorage.run(trx, fn))
  }
}
