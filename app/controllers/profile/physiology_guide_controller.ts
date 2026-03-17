import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetProfile from '#use_cases/profile/get_profile'

@inject()
export default class PhysiologyGuideController {
  constructor(private getProfile: GetProfile) {}

  async show({ inertia, auth }: HttpContext) {
    const profile = await this.getProfile.execute(auth.user!.id)

    return inertia.render('Profile/PhysiologyGuide', {
      currentMaxHeartRate: profile?.maxHeartRate ?? null,
      currentVma: profile?.vma ?? null,
    })
  }
}
