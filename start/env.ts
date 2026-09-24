/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),
  APP_NAME: Env.schema.string.optional(),
  /** Version déployée (SHA git injecté au build Docker) */
  APP_VERSION: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Stockage des fichiers et tâches de fond
  |----------------------------------------------------------
  */
  STORAGE_PATH: Env.schema.string.optional(),
  SCHEDULER_ENABLED: Env.schema.boolean.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum.optional(['cookie', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Rate limiting
  |----------------------------------------------------------
  */
  LIMITER_STORE: Env.schema.enum.optional(['database', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring connector token encryption
  |----------------------------------------------------------
  */
  CONNECTOR_ENCRYPTION_KEY: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring Strava OAuth connector
  |----------------------------------------------------------
  */
  APP_URL: Env.schema.string.optional(),
  STRAVA_CLIENT_ID: Env.schema.string.optional(),
  STRAVA_CLIENT_SECRET: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the open-wearables connector
  |----------------------------------------------------------
  | BASE_URL doit inclure le prefixe d'API, ex :
  |   https://wearables-api.example.com/api/v1
  | La cle API est saisie par chaque utilisateur, pas ici.
  */
  OPEN_WEARABLES_BASE_URL: Env.schema.string.optional(),
  OPEN_WEARABLES_API_KEY_HEADER: Env.schema.string.optional(),
  OPEN_WEARABLES_MAX_RPM: Env.schema.number.optional(),
  /** Secret de signature des webhooks (whsec_…), fourni par le serveur Open Wearables */
  OPEN_WEARABLES_WEBHOOK_SECRET: Env.schema.string.optional(),
})
