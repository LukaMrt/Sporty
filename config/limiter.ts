import env from '#start/env'
import { defineConfig, stores } from '@adonisjs/limiter'

const limiterConfig = defineConfig({
  default: env.get('LIMITER_STORE', 'database'),
  stores: {
    /**
     * Stockage en base : les compteurs survivent à un redémarrage
     * (un crash ne remet pas à zéro une tentative de brute-force).
     */
    database: stores.database({
      tableName: 'rate_limits',
    }),
    /**
     * Stockage en mémoire, utilisé en test
     */
    memory: stores.memory({}),
  },
})

export default limiterConfig

declare module '@adonisjs/limiter/types' {
  export interface LimitersList extends InferLimiters<typeof limiterConfig> {}
}
