import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import GetStravaConnector from '#use_cases/connectors/get_strava_connector'

@inject()
export default class ConnectorsController {
  constructor(private getStravaConnector: GetStravaConnector) {}

  async index({ inertia, auth }: HttpContext) {
    const stravaConfigured = Boolean(env.get('STRAVA_CLIENT_ID') && env.get('STRAVA_CLIENT_SECRET'))
    const stravaStatus = await this.getStravaConnector.getStatus(auth.user!.id)

    return inertia.render('Connectors/Index', { stravaConfigured, stravaStatus })
  }
}
