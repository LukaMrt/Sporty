import { inject } from '@adonisjs/core'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { addDaysIso, todayInTimezone } from '#domain/services/calendar'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import { resolveZoneBounds } from '#domain/services/heart_rate_zone_bounds'
import { currentPlanWeek } from '#domain/services/plan_calendar'
import { buildPlanPrompt } from '#domain/services/plan_prompt'
import GetFitnessProfile from '#use_cases/fitness/get_fitness_profile'
import ExportPlanDocument from '#use_cases/plan_editor/export_plan_document'

const RECENT_WEEKS = 8

/**
 * Prompt complet pour Claude : format du document de plan, profil, forme,
 * volume récent par sport et, en révision, le plan actuel.
 */
@inject()
export default class GetPlanPrompt {
  constructor(
    private userProfileRepository: UserProfileRepository,
    private sportRepository: SportRepository,
    private sessionRepository: SessionRepository,
    private goalRepository: TrainingGoalRepository,
    private planRepository: TrainingPlanRepository,
    private getFitnessProfile: GetFitnessProfile,
    private exportPlanDocument: ExportPlanDocument
  ) {}

  async execute(userId: number, mode: 'create' | 'revise'): Promise<string> {
    const profile = await this.userProfileRepository.findByUserId(userId)
    const today = todayInTimezone(profile?.timezone)
    const from = addDaysIso(today, -7 * RECENT_WEEKS)

    const [sports, recent, goal, fitness, plan, currentPlan] = await Promise.all([
      this.sportRepository.findAll(),
      this.sessionRepository.findAnalysisEntries(userId, from, today),
      this.goalRepository.findActiveByUserId(userId),
      this.getFitnessProfile.execute(userId, { asOf: today }),
      this.planRepository.findActiveByUserId(userId),
      mode === 'revise' ? this.exportPlanDocument.execute(userId) : Promise.resolve(null),
    ])

    const bySport = new Map<string, { minutes: number; sessions: number }>()
    for (const s of recent) {
      const acc = bySport.get(s.sportSlug) ?? { minutes: 0, sessions: 0 }
      acc.minutes += s.durationMinutes
      acc.sessions++
      bySport.set(s.sportSlug, acc)
    }
    const sportName = (slug: string) => sports.find((s) => s.slug === slug)?.name ?? slug
    const zones = profile
      ? resolveZoneBounds(profile.hrZonesConfig, {
          maxHeartRate: profile.maxHeartRate,
          restingHeartRate: profile.restingHeartRate,
        })
      : null
    const weeks = plan ? await this.planRepository.findWeeksByPlanId(plan.id) : []

    return buildPlanPrompt({
      mode: mode === 'revise' && currentPlan ? 'revise' : 'create',
      today,
      sports: sports.map((s) => ({ slug: s.slug, name: s.name })),
      athlete: {
        sex: profile?.sex ?? null,
        maxHeartRate: profile?.maxHeartRate ?? null,
        restingHeartRate: profile?.restingHeartRate ?? null,
        lthr: profile?.hrZonesConfig?.lthr ?? null,
        hrZones: zones?.bounds ?? null,
        vdot: profile?.vdot ?? null,
        paceZones: profile?.vdot ? derivePaceZones(profile.vdot) : null,
        cssPacePer100m: profile?.cssPacePer100m ?? null,
        level: profile?.level ?? null,
      },
      fitness: fitness.profile
        ? {
            ctl: fitness.profile.chronicTrainingLoad,
            atl: fitness.profile.acuteTrainingLoad,
            tsb: fitness.profile.trainingStressBalance,
          }
        : null,
      recentVolume: [...bySport.entries()].map(([sport, v]) => ({
        sport: sportName(sport),
        minutesPerWeek: v.minutes / RECENT_WEEKS,
        sessionsPerWeek: v.sessions / RECENT_WEEKS,
      })),
      goal: goal
        ? {
            distanceKm: goal.targetDistanceKm,
            targetTimeMinutes: goal.targetTimeMinutes,
            eventDate: goal.eventDate,
          }
        : null,
      currentPlan,
      currentWeekNumber: plan ? currentPlanWeek(plan, weeks.length, today) : null,
    })
  }
}
