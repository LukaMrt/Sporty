import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import TrainingPlanModel from '#models/training_plan'

export default class SimulatePlanEnd extends BaseCommand {
  static commandName = 'dev:simulate-plan-end'
  static description =
    "Backdates la date de fin du plan actif pour déclencher l'écran post-plan (dev uniquement)"

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({
    description:
      'Nombre de jours dans le passé pour la end_date (ex: 1 = hier, 0 = reset vers futur)',
    required: false,
  })
  declare days: string

  async run() {
    if (this.app.inProduction) {
      this.logger.error('Cette commande ne peut pas être exécutée en production.')
      return
    }

    const daysBack = Number(this.days ?? 1)
    if (Number.isNaN(daysBack) || daysBack < 0) {
      this.logger.error('Le nombre de jours doit être un entier positif (ou 0 pour reset).')
      return
    }

    const plan = await TrainingPlanModel.query().whereIn('status', ['active', 'draft']).first()

    if (!plan) {
      this.logger.error("Aucun plan actif trouvé. Générez d'abord un plan via /planning.")
      return
    }

    if (daysBack === 0) {
      // Reset : remet la end_date 10 semaines dans le futur
      plan.endDate = DateTime.now().plus({ weeks: 10 })
      await plan.save()
      this.logger.success(`Plan #${plan.id} — end_date remise au ${plan.endDate.toISODate() ?? ''}`)
      this.logger.info('Rechargez /planning pour retrouver la vue normale du plan.')
      return
    }

    plan.endDate = DateTime.now().minus({ days: daysBack })
    await plan.save()

    this.logger.success(
      `Plan #${plan.id} — end_date backdatée au ${plan.endDate.toISODate() ?? ''} (J-${daysBack})`
    )
    this.logger.info(
      "Rechargez /planning → l'écran post-plan devrait s'afficher si trainingState ≠ 'idle'."
    )
    this.logger.info('Pour revenir à la normale : node ace dev:simulate-plan-end 0')
  }
}
