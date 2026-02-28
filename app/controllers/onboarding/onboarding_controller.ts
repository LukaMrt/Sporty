import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CompleteOnboarding from '#use_cases/onboarding/complete_onboarding'
import ListSports from '#use_cases/sports/list_sports'
import { completeOnboardingValidator } from '#validators/onboarding/complete_onboarding_validator'
import { UserLevel, UserObjective } from '#domain/entities/user_profile'

@inject()
export default class OnboardingController {
  private completeOnboarding: CompleteOnboarding
  private listSports: ListSports

  constructor(completeOnboarding: CompleteOnboarding, listSports: ListSports) {
    this.completeOnboarding = completeOnboarding
    this.listSports = listSports
  }

  async show({ inertia, auth, response }: HttpContext) {
    if (auth.user!.onboardingCompleted) {
      return response.redirect('/')
    }
    const sports = await this.listSports.execute()
    return inertia.render('Onboarding/Wizard', { sports })
  }

  async complete({ request, response, auth, i18n }: HttpContext) {
    const data = await request.validateUsing(completeOnboardingValidator)
    await this.completeOnboarding.execute({
      userId: auth.user!.id,
      sportId: data.sport_id,
      level: data.level as UserLevel,
      objective: (data.objective as UserObjective) ?? null,
      preferences: {
        speedUnit: data.preferred_unit,
        distanceUnit: data.distance_unit,
        weightUnit: data.weight_unit,
        weekStartsOn: data.week_starts_on,
        dateFormat: data.date_format,
        locale: i18n.locale as 'fr' | 'en',
      },
    })
    return response.redirect('/')
  }
}
