import { inject } from '@adonisjs/core'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import type { PaceZones } from '#domain/value_objects/pace_zones'

/**
 * Enregistre le VDOT confirmé par l'athlète dans son profil. Il était stocké
 * en session (perdu à la déconnexion) et ne servait donc jamais à la charge rTSS.
 */
@inject()
export default class ConfirmVdot {
  constructor(private userProfileRepository: UserProfileRepository) {}

  async execute(userId: number, vdot: number): Promise<{ vdot: number; paceZones: PaceZones }> {
    const profile = await this.userProfileRepository.findByUserId(userId)
    if (profile) await this.userProfileRepository.update(userId, { vdot })
    return { vdot, paceZones: derivePaceZones(vdot) }
  }
}
