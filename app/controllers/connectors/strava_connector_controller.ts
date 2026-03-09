import { randomBytes } from 'node:crypto'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import ConnectStrava from '#use_cases/connectors/connect_strava'
import DisconnectStrava from '#use_cases/connectors/disconnect_strava'
import GetStravaConnector from '#use_cases/connectors/get_strava_connector'
import ListPreImportActivities, {
  ConnectorNotConnectedError,
} from '#use_cases/import/list_pre_import_activities'
interface RawActivityData {
  name?: string
  sportType?: string
  startDate?: string
  distanceMeters?: number | null
  durationSeconds?: number
}

interface StagingActivityDto {
  id: number
  externalId: string
  status: string
  date: string
  name: string
  sportType: string
  durationMinutes: number
  distanceKm: number | null
}

@inject()
export default class StravaConnectorController {
  constructor(
    private connectStrava: ConnectStrava,
    private disconnectStrava: DisconnectStrava,
    private getStravaConnector: GetStravaConnector,
    private listPreImportActivities: ListPreImportActivities
  ) {}

  async show({ inertia, auth }: HttpContext) {
    const stravaStatus = await this.getStravaConnector.getStatus(auth.user!.id)
    const clientId = env.get('STRAVA_CLIENT_ID')
    const clientSecret = env.get('STRAVA_CLIENT_SECRET')
    const stravaConfigured = Boolean(
      clientId &&
      !clientId.includes('change-me') &&
      clientSecret &&
      !clientSecret.includes('change-me')
    )

    try {
      const records = await this.listPreImportActivities.execute({ userId: auth.user!.id })
      const activities: StagingActivityDto[] = records.map((r) => {
        const raw = (r.rawData ?? {}) as unknown as RawActivityData
        const distanceM = raw.distanceMeters ?? null
        return {
          id: r.id,
          externalId: r.externalId,
          status: r.status,
          date: raw.startDate ?? '',
          name: raw.name ?? r.externalId,
          sportType: raw.sportType ?? '',
          durationMinutes: raw.durationSeconds ? raw.durationSeconds / 60 : 0,
          distanceKm: distanceM && distanceM > 0 ? distanceM / 1000 : null,
        }
      })
      return inertia.render('Connectors/Show', { stravaStatus, stravaConfigured, activities })
    } catch (error) {
      if (error instanceof ConnectorNotConnectedError) {
        return inertia.render('Connectors/Show', {
          stravaStatus,
          stravaConfigured,
          activities: null,
        })
      }
      throw error
    }
  }

  async authorize({ session, response }: HttpContext) {
    const clientId = env.get('STRAVA_CLIENT_ID')
    if (!clientId) {
      return response.redirect('/connectors')
    }

    const state = randomBytes(32).toString('hex')
    session.put('strava_oauth_state', state)

    const appUrl = env.get('APP_URL') ?? `http://${env.get('HOST')}:${env.get('PORT')}`
    const redirectUri = `${appUrl}/connectors/strava/callback`

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read,activity:read_all',
      state,
    })

    return response.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`)
  }

  async callback({ request, session, response, auth, i18n }: HttpContext) {
    if (!auth.user) {
      return response.redirect('/login')
    }

    const { code, state, error } = request.qs() as {
      code?: string
      state?: string
      error?: string
    }

    if (error) {
      session.flash('error', i18n.t('connectors.strava.denied'))
      return response.redirect('/connectors')
    }

    const storedState = session.get('strava_oauth_state') as string | undefined
    if (!state || !storedState || state !== storedState) {
      session.flash('error', i18n.t('connectors.strava.invalidState'))
      return response.redirect('/connectors')
    }

    const clientId = env.get('STRAVA_CLIENT_ID')
    const clientSecret = env.get('STRAVA_CLIENT_SECRET')
    if (!clientId || !clientSecret) {
      session.flash('error', i18n.t('connectors.strava.missingConfig'))
      return response.redirect('/connectors')
    }

    try {
      const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error(`Strava token exchange failed: ${tokenResponse.status}`)
      }

      const tokens = (await tokenResponse.json()) as {
        access_token: string
        refresh_token: string
        expires_at: number
      }

      await this.connectStrava.execute({
        userId: auth.user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_at,
      })

      session.forget('strava_oauth_state')
      session.flash('success', i18n.t('connectors.strava.connected'))
    } catch {
      session.flash('error', i18n.t('connectors.strava.error'))
    }

    return response.redirect('/connectors')
  }

  async disconnect({ response, auth, session, i18n }: HttpContext) {
    if (!auth.user) {
      return response.redirect('/login')
    }

    await this.disconnectStrava.execute(auth.user.id)
    session.flash('success', i18n.t('connectors.strava.disconnected'))

    return response.redirect('/connectors')
  }
}
