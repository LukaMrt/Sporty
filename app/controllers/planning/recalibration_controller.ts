import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ToggleAutoRecalibrate, {
  NoActivePlanError,
} from '#use_cases/planning/toggle_auto_recalibrate'
import HandleVdotDownProposal from '#use_cases/planning/handle_vdot_down_proposal'
import { vdotDownProposalValidator } from '#validators/planning/recalibration_validator'

@inject()
export default class RecalibrationController {
  constructor(
    private toggleAutoRecalibrateUseCase: ToggleAutoRecalibrate,
    private handleVdotDownProposalUseCase: HandleVdotDownProposal
  ) {}

  async toggle({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const newValue = await this.toggleAutoRecalibrateUseCase.execute(user.id)
      return response.ok({ autoRecalibrate: newValue })
    } catch (error) {
      if (error instanceof NoActivePlanError) {
        return response.notFound({ message: error.message })
      }
      throw error
    }
  }

  async handleVdotProposal({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(vdotDownProposalValidator)

    try {
      await this.handleVdotDownProposalUseCase.execute(user.id, data.action)
      session.flash('success', 'planning.recalibration.proposalHandled')
      return response.redirect().back()
    } catch (error) {
      if (error instanceof NoActivePlanError) {
        return response.notFound({ message: error.message })
      }
      throw error
    }
  }
}
