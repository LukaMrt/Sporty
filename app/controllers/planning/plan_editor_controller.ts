import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ImportPlanDocument from '#use_cases/plan_editor/import_plan_document'
import ExportPlanDocument from '#use_cases/plan_editor/export_plan_document'
import GetPlanPrompt from '#use_cases/plan_editor/get_plan_prompt'
import CreatePlannedSession from '#use_cases/plan_editor/create_planned_session'
import UpdatePlannedSession from '#use_cases/plan_editor/update_planned_session'
import DeletePlannedSession from '#use_cases/plan_editor/delete_planned_session'
import AddPlanWeek from '#use_cases/plan_editor/add_plan_week'
import UpdatePlanWeek from '#use_cases/plan_editor/update_plan_week'
import DeletePlanWeek from '#use_cases/plan_editor/delete_plan_week'
import UpdatePlanInfo from '#use_cases/plan_editor/update_plan_info'
import {
  addWeekValidator,
  importPlanValidator,
  planInfoValidator,
  planPromptValidator,
  plannedSessionValidator,
  updateWeekValidator,
} from '#validators/planning/plan_editor_validator'
import { InvalidPlanDocumentError } from '#domain/errors/invalid_plan_document_error'
import { NoActivePlanError } from '#domain/errors/no_active_plan_error'
import { PlannedSessionNotFoundError } from '#domain/errors/planned_session_not_found_error'
import { PlannedSessionForbiddenError } from '#domain/errors/planned_session_forbidden_error'
import { PlannedWeekNotFoundError } from '#domain/errors/planned_week_not_found_error'
import { UnknownSportError } from '#domain/errors/unknown_sport_error'
import { WeekHasCompletedSessionsError } from '#domain/errors/week_has_completed_sessions_error'

/** Erreurs métier attendues de l'édition : message traduit, pas d'erreur 500 */
const EXPECTED_ERRORS = [
  NoActivePlanError,
  PlannedSessionNotFoundError,
  PlannedSessionForbiddenError,
  PlannedWeekNotFoundError,
  UnknownSportError,
  WeekHasCompletedSessionsError,
]

/**
 * Édition complète du plan actif : import / export / prompt Claude, et
 * modification de chaque partie (plan, semaines, séances). Contrôleur mince :
 * valide, délègue au use case, redirige avec un message.
 */
@inject()
export default class PlanEditorController {
  constructor(
    private importPlanDocument: ImportPlanDocument,
    private exportPlanDocument: ExportPlanDocument,
    private getPlanPrompt: GetPlanPrompt,
    private createPlannedSession: CreatePlannedSession,
    private updatePlannedSession: UpdatePlannedSession,
    private deletePlannedSession: DeletePlannedSession,
    private addPlanWeek: AddPlanWeek,
    private updatePlanWeek: UpdatePlanWeek,
    private deletePlanWeek: DeletePlanWeek,
    private updatePlanInfo: UpdatePlanInfo
  ) {}

  /** Exécute une modification ; les erreurs métier deviennent un message flash */
  async #edit(ctx: HttpContext, action: () => Promise<unknown>, successKey: string) {
    try {
      await action()
      ctx.session.flash('success', ctx.i18n.t(successKey))
    } catch (error) {
      if (!EXPECTED_ERRORS.some((E) => error instanceof E)) throw error
      const key = (error as Error & { i18nKey?: string }).i18nKey
      ctx.session.flash('error', key ? ctx.i18n.t(key) : (error as Error).message)
    }
    return ctx.response.redirect().back()
  }

  async importPage({ inertia, auth }: HttpContext) {
    const current = await this.exportPlanDocument.execute(auth.user!.id)
    return inertia.render('Planning/Import', { hasActivePlan: current !== null })
  }

  /** Prompt à copier dans Claude (texte brut) */
  async prompt({ auth, request, response }: HttpContext) {
    const { mode } = await request.validateUsing(planPromptValidator)
    const prompt = await this.getPlanPrompt.execute(auth.user!.id, mode ?? 'create')
    response.header('Content-Type', 'text/plain; charset=utf-8')
    return response.send(prompt)
  }

  /** Import JSON (appel AJAX : un document invalide renvoie toutes ses erreurs, en 422) */
  async import({ auth, request, response, session, i18n }: HttpContext) {
    const { document } = await request.validateUsing(importPlanValidator)
    try {
      const result = await this.importPlanDocument.execute(auth.user!.id, document)
      session.flash(
        'success',
        i18n.t(`planning.editor.imported.${result.mode}`, {
          weeks: result.weeks,
          sessions: result.sessions,
        })
      )
      return response.ok({ ok: true, mode: result.mode })
    } catch (error) {
      if (error instanceof InvalidPlanDocumentError) {
        return response.unprocessableEntity({ ok: false, errors: error.errors })
      }
      if (error instanceof NoActivePlanError) {
        return response.unprocessableEntity({
          ok: false,
          errors: [{ path: 'mode', code: 'no_active_plan' }],
        })
      }
      throw error
    }
  }

  async export({ auth, response }: HttpContext) {
    const document = await this.exportPlanDocument.execute(auth.user!.id)
    if (!document) return response.notFound()
    response.attachment('sporty-plan.json')
    return response.json(document)
  }

  async updatePlan(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(planInfoValidator)
    return this.#edit(
      ctx,
      () => this.updatePlanInfo.execute(ctx.auth.user!.id, data),
      'planning.editor.saved'
    )
  }

  async addWeek(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(addWeekValidator)
    return this.#edit(
      ctx,
      () => this.addPlanWeek.execute(ctx.auth.user!.id, data),
      'planning.editor.weekAdded'
    )
  }

  async updateWeek(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(updateWeekValidator)
    return this.#edit(
      ctx,
      () => this.updatePlanWeek.execute(ctx.auth.user!.id, Number(ctx.params.weekNumber), data),
      'planning.editor.saved'
    )
  }

  async deleteWeek(ctx: HttpContext) {
    return this.#edit(
      ctx,
      () => this.deletePlanWeek.execute(ctx.auth.user!.id, Number(ctx.params.weekNumber)),
      'planning.editor.weekDeleted'
    )
  }

  async createSession(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(plannedSessionValidator)
    return this.#edit(
      ctx,
      () =>
        this.createPlannedSession.execute(ctx.auth.user!.id, Number(ctx.params.weekNumber), {
          ...data,
          title: data.title || null,
        }),
      'planning.editor.sessionAdded'
    )
  }

  async updateSession(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(plannedSessionValidator)
    return this.#edit(
      ctx,
      () =>
        this.updatePlannedSession.execute(ctx.auth.user!.id, Number(ctx.params.id), {
          ...data,
          title: data.title || null,
        }),
      'planning.editor.saved'
    )
  }

  async deleteSession(ctx: HttpContext) {
    return this.#edit(
      ctx,
      () => this.deletePlannedSession.execute(ctx.auth.user!.id, Number(ctx.params.id)),
      'planning.editor.sessionDeleted'
    )
  }
}
