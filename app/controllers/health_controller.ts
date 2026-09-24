import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'

/**
 * GET /health — sonde de disponibilité (Docker HEALTHCHECK).
 * Vérifie la connexion à la base : l'app ne sert à rien sans elle.
 */
export default class HealthController {
  async show({ response }: HttpContext) {
    try {
      await db.rawQuery('SELECT 1')
      return response.ok({ status: 'ok', version: env.get('APP_VERSION', 'dev') })
    } catch {
      return response.serviceUnavailable({ status: 'error', database: 'unreachable' })
    }
  }
}
