import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ImportedPlan from '#use_cases/imported_plan/imported_plan'
import { importPlanValidator } from '#validators/analysis/analysis_validator'

/** H3 · Plan rédigé dans Claude : import et comparaison avec le réalisé */
@inject()
export default class ImportedPlanController {
  constructor(private importedPlan: ImportedPlan) {}

  async show({ inertia, auth }: HttpContext) {
    const calendar = await this.importedPlan.calendar(auth.user!.id)
    return inertia.render('Plan/Index', { calendar })
  }

  async store({ request, response, session, auth, i18n }: HttpContext) {
    const { plan } = await request.validateUsing(importPlanValidator)
    const result = await this.importedPlan.import(auth.user!.id, plan)
    if (!result.ok) {
      session.flashErrors({ plan: i18n.t(`plan.errors.${result.error}`) })
      return response.redirect().back()
    }
    session.flash('success', i18n.t('plan.imported', { count: result.entries.length }))
    return response.redirect('/plan')
  }

  async clear({ response, session, auth, i18n }: HttpContext) {
    await this.importedPlan.clear(auth.user!.id)
    session.flash('success', i18n.t('plan.cleared'))
    return response.redirect('/plan')
  }
}
