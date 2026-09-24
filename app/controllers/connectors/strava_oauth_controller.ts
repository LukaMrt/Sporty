import { randomBytes } from 'node:crypto'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import ConnectOAuthConnector from '#use_cases/connectors/connect_oauth_connector'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { oauthCallbackValidator } from '#validators/connectors/oauth_callback_validator'

@inject()
export default class StravaOAuthController {
  constructor(private connectOAuthConnector: ConnectOAuthConnector) {}

  async authorize({ session, response }: HttpContext) {
    if (!this.connectOAuthConnector.isConfigured()) {
      return response.redirect('/connectors')
    }

    const state = randomBytes(32).toString('hex')
    session.put('strava_oauth_state', state)
    return response.redirect(this.connectOAuthConnector.authorizationUrl(state))
  }

  async callback({ request, session, response, auth, i18n }: HttpContext) {
    if (!auth.user) {
      return response.redirect('/login')
    }

    const { code, state, error } = await oauthCallbackValidator.validate(request.qs())

    if (error) {
      session.flash('error', i18n.t('connectors.strava.denied'))
      return response.redirect('/connectors')
    }

    const storedState = session.get('strava_oauth_state') as string | undefined
    if (!state || !storedState || state !== storedState || !code) {
      session.flash('error', i18n.t('connectors.strava.invalidState'))
      return response.redirect('/connectors')
    }

    if (!this.connectOAuthConnector.isConfigured()) {
      session.flash('error', i18n.t('connectors.strava.missingConfig'))
      return response.redirect('/connectors')
    }

    try {
      await this.connectOAuthConnector.execute({
        userId: auth.user.id,
        provider: ConnectorProvider.Strava,
        code,
      })
      session.forget('strava_oauth_state')
      session.flash('success', i18n.t('connectors.strava.connected'))
    } catch (err) {
      logger.warn({ err, userId: auth.user.id }, 'Strava OAuth code exchange failed')
      session.flash('error', i18n.t('connectors.strava.error'))
    }

    return response.redirect('/connectors')
  }
}
