import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CreateSession from '#use_cases/sessions/create_session'
import ListSessions from '#use_cases/sessions/list_sessions'
import ListSports from '#use_cases/sports/list_sports'
import GetProfile from '#use_cases/profile/get_profile'
import { createSessionValidator } from '#validators/sessions/create_session_validator'
import { DEFAULT_USER_PREFERENCES } from '#domain/entities/user_preferences'

@inject()
export default class SessionsController {
  constructor(
    private createSession: CreateSession,
    private listSessions: ListSessions,
    private listSports: ListSports,
    private getProfile: GetProfile
  ) {}

  async index({ inertia, auth }: HttpContext) {
    const user = auth.user!
    const sessions = await this.listSessions.execute(user.id)
    return inertia.render('Sessions/Index', { sessions })
  }

  async create({ inertia, auth }: HttpContext) {
    const user = auth.user!
    const [sessions, sports, profile] = await Promise.all([
      this.listSessions.execute(user.id),
      this.listSports.execute(),
      this.getProfile.execute(user.id),
    ])

    const defaultSportId = sessions[0]?.sportId ?? sports[0]?.id
    const speedUnit = profile?.preferences.speedUnit ?? DEFAULT_USER_PREFERENCES.speedUnit

    return inertia.render('Sessions/Create', {
      sports: sports.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
      defaultSportId,
      speedUnit,
    })
  }

  async store({ request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(createSessionValidator)
    const user = auth.user!

    await this.createSession.execute(user.id, {
      sportId: data.sport_id,
      date: data.date.toISOString().split('T')[0],
      durationMinutes: data.duration_minutes,
      distanceKm: data.distance_km,
      avgHeartRate: data.avg_heart_rate,
      perceivedEffort: data.perceived_effort,
      sportMetrics: data.sport_metrics as Record<string, unknown> | undefined,
      notes: data.notes,
    })

    session.flash('success', 'Séance ajoutée')
    return response.redirect('/sessions')
  }
}
