import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import Session from '#models/session'

export default class SimulateInactivity extends BaseCommand {
  static commandName = 'dev:simulate-inactivity'
  static description =
    'Décale les séances dans le passé pour tester la bannière inactivité (dev uniquement)'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({
    description:
      'Nombre de jours depuis la dernière séance (ex: 20 pour warning, 35 pour critical)',
    required: false,
  })
  declare days: string

  async run() {
    if (this.app.inProduction) {
      this.logger.error('Cette commande ne peut pas être exécutée en production.')
      return
    }

    const daysBack = Number(this.days ?? 20)
    if (Number.isNaN(daysBack) || daysBack < 0) {
      this.logger.error('Le nombre de jours doit être un entier positif.')
      return
    }

    const targetDate = DateTime.now().minus({ days: daysBack })

    await Session.query().whereNull('deletedAt').update({ date: targetDate.toISODate() })

    const level = daysBack >= 28 ? 'critical' : daysBack >= 14 ? 'warning' : 'none'

    this.logger.success(
      `Séances décalées au ${targetDate.toISODate() ?? ''} (J-${daysBack}) → inactivityLevel = "${level}"`
    )
    this.logger.info('Rechargez /planning dans le navigateur pour voir la bannière.')
    this.logger.info("Pour revenir à aujourd'hui : node ace dev:simulate-inactivity 0")
  }
}
