import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetProfile from '#use_cases/profile/get_profile'
import UpdateProfile from '#use_cases/profile/update_profile'
import ListSports from '#use_cases/sports/list_sports'
import { updateProfileValidator } from '#validators/profile/update_profile_validator'
import type { UserPreferences } from '#domain/entities/user_preferences'
import { UserLevel, UserObjective } from '#domain/entities/user_profile'

@inject()
export default class ProfileController {
  constructor(
    private getProfile: GetProfile,
    private updateProfile: UpdateProfile,
    private listSports: ListSports
  ) {}

  async show({ inertia, auth }: HttpContext) {
    const user = auth.user!
    const profile = await this.getProfile.execute(user.id)
    const sports = await this.listSports.execute()

    return inertia.render('Profile/Edit', {
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
      profile: profile
        ? {
            sportId: profile.sportId,
            level: profile.level,
            objective: profile.objective,
            preferredUnit: profile.preferences.speedUnit,
            preferences: profile.preferences,
          }
        : null,
      sports: sports.map((s) => ({ id: s.id, name: s.name })),
    })
  }

  async update({ request, response, session, auth, i18n }: HttpContext) {
    const data = await request.validateUsing(updateProfileValidator, {
      meta: { userId: auth.user!.id },
    })

    const preferences: Partial<UserPreferences> = {}
    if (data.preferred_unit !== undefined) preferences.speedUnit = data.preferred_unit
    if (data.distance_unit !== undefined) preferences.distanceUnit = data.distance_unit
    if (data.weight_unit !== undefined) preferences.weightUnit = data.weight_unit
    if (data.week_starts_on !== undefined) preferences.weekStartsOn = data.week_starts_on
    if (data.date_format !== undefined) preferences.dateFormat = data.date_format
    if (data.locale !== undefined) {
      preferences.locale = data.locale
      session.put('locale', data.locale)
      i18n.switchLocale(data.locale)
    }

    const currentProfile = await this.getProfile.execute(auth.user!.id)
    const mergedPreferences =
      Object.keys(preferences).length > 0 && currentProfile
        ? { ...currentProfile.preferences, ...preferences }
        : undefined

    await this.updateProfile.execute(auth.user!.id, {
      fullName: data.full_name,
      email: data.email,
      sportId: data.sport_id,
      level: data.level as UserLevel | undefined,
      objective: data.objective as UserObjective | null | undefined,
      preferences: mergedPreferences,
    })

    session.flash('success', i18n.t('profile.flash.updated'))
    return response.redirect().back()
  }
}
