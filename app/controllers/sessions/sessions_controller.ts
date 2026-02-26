import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CreateSession from '#use_cases/sessions/create_session'
import ListTrashedSessions from '#use_cases/sessions/list_trashed_sessions'
import UpdateSession from '#use_cases/sessions/update_session'
import DeleteSession from '#use_cases/sessions/delete_session'
import RestoreSession from '#use_cases/sessions/restore_session'
import ListSessions from '#use_cases/sessions/list_sessions'
import GetSession from '#use_cases/sessions/get_session'
import ListSports from '#use_cases/sports/list_sports'
import GetProfile from '#use_cases/profile/get_profile'
import { createSessionValidator } from '#validators/sessions/create_session_validator'
import { updateSessionValidator } from '#validators/sessions/update_session_validator'
import { DEFAULT_USER_PREFERENCES } from '#domain/entities/user_preferences'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'

@inject()
export default class SessionsController {
  constructor(
    private createSession: CreateSession,
    private updateSession: UpdateSession,
    private deleteSession: DeleteSession,
    private restoreSession: RestoreSession,
    private listSessions: ListSessions,
    private listTrashedSessions: ListTrashedSessions,
    private getSession: GetSession,
    private listSports: ListSports,
    private getProfile: GetProfile
  ) {}

  async trash({ inertia, auth }: HttpContext) {
    const user = auth.user!
    const sessions = await this.listTrashedSessions.execute(user.id)
    return inertia.render('Sessions/Trash', {
      sessions: sessions.map((s) => ({
        id: s.id,
        sportName: s.sportName,
        date: s.date,
        durationMinutes: s.durationMinutes,
        distanceKm: s.distanceKm,
        deletedAt: s.deletedAt ?? null,
      })),
    })
  }

  async index({ inertia, auth, request }: HttpContext) {
    const user = auth.user!
    const page = Number(request.input('page', 1))
    const sessions = await this.listSessions.execute(user.id, page)
    return inertia.render('Sessions/Index', {
      sessions: {
        data: sessions.data.map((s) => ({
          id: s.id,
          sportType: s.sportId,
          sportName: s.sportName,
          date: s.date,
          durationMinutes: s.durationMinutes,
          distanceKm: s.distanceKm,
          perceivedEffort: s.perceivedEffort,
        })),
        meta: sessions.meta,
      },
    })
  }

  async create({ inertia, auth }: HttpContext) {
    const user = auth.user!
    const [sessions, sports, profile] = await Promise.all([
      this.listSessions.execute(user.id),
      this.listSports.execute(),
      this.getProfile.execute(user.id),
    ])

    const defaultSportId = sessions.data[0]?.sportId ?? sports[0]?.id
    const speedUnit = profile?.preferences.speedUnit ?? DEFAULT_USER_PREFERENCES.speedUnit

    return inertia.render('Sessions/Create', {
      sports: sports.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
      defaultSportId,
      speedUnit,
    })
  }

  async show({ params, inertia, auth, response, session }: HttpContext) {
    try {
      const trainingSession = await this.getSession.execute(Number(params.id), auth.user!.id)
      return inertia.render('Sessions/Show', { session: trainingSession })
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof SessionForbiddenError) {
        session.flash('error', 'Séance introuvable')
        return response.redirect('/sessions')
      }
      throw error
    }
  }

  async edit({ params, inertia, auth, response, session }: HttpContext) {
    try {
      const trainingSession = await this.getSession.execute(Number(params.id), auth.user!.id)
      const sports = await this.listSports.execute()
      return inertia.render('Sessions/Edit', {
        session: trainingSession,
        sports: sports.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
      })
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof SessionForbiddenError) {
        session.flash('error', 'Séance introuvable')
        return response.redirect('/sessions')
      }
      throw error
    }
  }

  async update({ params, request, response, session, auth }: HttpContext) {
    try {
      const data = await request.validateUsing(updateSessionValidator)
      await this.updateSession.execute(Number(params.id), auth.user!.id, {
        sportId: data.sport_id,
        date: data.date.toISOString().split('T')[0],
        durationMinutes: data.duration_minutes,
        distanceKm: data.distance_km,
        avgHeartRate: data.avg_heart_rate,
        perceivedEffort: data.perceived_effort,
        sportMetrics: data.sport_metrics as Record<string, unknown> | undefined,
        notes: data.notes,
      })
      session.flash('success', 'Séance modifiée')
      return response.redirect(`/sessions/${params.id}`)
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof SessionForbiddenError) {
        session.flash('error', 'Séance introuvable ou accès refusé')
        return response.redirect('/sessions')
      }
      throw error
    }
  }

  async destroy({ params, response, session, auth }: HttpContext) {
    try {
      await this.deleteSession.execute(Number(params.id), auth.user!.id)
      session.flash('deleted_session_id', String(params.id))
      return response.redirect('/sessions')
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof SessionForbiddenError) {
        session.flash('error', 'Séance introuvable ou accès refusé')
        return response.redirect('/sessions')
      }
      throw error
    }
  }

  async restore({ params, response, session, auth }: HttpContext) {
    try {
      await this.restoreSession.execute(Number(params.id), auth.user!.id)
      session.flash('success', 'Séance restaurée')
      return response.redirect('/sessions/trash')
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof SessionForbiddenError) {
        session.flash('error', 'Séance introuvable ou accès refusé')
        return response.redirect('/sessions')
      }
      throw error
    }
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
