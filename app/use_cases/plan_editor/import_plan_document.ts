import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { UnitOfWork } from '#domain/interfaces/unit_of_work'
import { InvalidPlanDocumentError } from '#domain/errors/invalid_plan_document_error'
import { NoActivePlanError } from '#domain/errors/no_active_plan_error'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { TrainingGoal } from '#domain/entities/training_goal'
import {
  PlanSource,
  PlanStatus,
  PlanType,
  PlannedSessionStatus,
  TrainingMethodology,
  TrainingState,
} from '#domain/value_objects/planning_types'
import {
  dayNameToDow,
  parsePlanDocument,
  sessionsWithOrder,
  timeToMinutes,
  type PlanDocGoal,
  type PlanDocument,
  type PlanDocWeek,
} from '#domain/services/plan_document'
import { addDaysIso } from '#domain/services/calendar'
import ActivePlanAccess from '#use_cases/plan_editor/active_plan_access'

export type ImportPlanResult = {
  plan: TrainingPlan
  mode: PlanDocument['mode']
  weeks: number
  sessions: number
}

/** Distance d'objectif → type de plan (utilisé par les plans suivants : transition, maintenance) */
function planTypeFor(goal: PlanDocGoal | null): PlanType {
  const d = goal?.distance_km
  if (!d) return PlanType.Custom
  if (Math.abs(d - 5) < 0.5) return PlanType.FiveKm
  if (Math.abs(d - 10) < 0.5) return PlanType.TenKm
  if (Math.abs(d - 21.1) < 0.5) return PlanType.HalfMarathon
  if (Math.abs(d - 42.2) < 0.5) return PlanType.Marathon
  return PlanType.Custom
}

/**
 * Importe un document de plan rédigé avec Claude.
 *
 * - `replace` : nouveau plan actif (l'ancien est abandonné, il reste dans
 *   l'historique) ; l'objectif est créé ou mis à jour s'il est fourni.
 * - `merge` : met à jour le plan actif. Chaque semaine fournie est remplacée,
 *   sauf ses séances déjà réalisées ; les nouvelles semaines sont ajoutées ;
 *   `delete_weeks` supprime des semaines (les suivantes sont renumérotées).
 *
 * Tout ou rien (UnitOfWork) : un plan n'est jamais importé à moitié.
 */
@inject()
export default class ImportPlanDocument {
  constructor(
    private planRepository: TrainingPlanRepository,
    private goalRepository: TrainingGoalRepository,
    private userProfileRepository: UserProfileRepository,
    private sportRepository: SportRepository,
    private unitOfWork: UnitOfWork,
    private access: ActivePlanAccess
  ) {}

  async execute(userId: number, text: string): Promise<ImportPlanResult> {
    const known = await this.sportRepository.findAll()
    const sports = known.map((s) => s.slug)
    const parsed = parsePlanDocument(text, sports)
    if (!parsed.ok) throw new InvalidPlanDocumentError(parsed.errors)
    const doc = parsed.document

    return this.unitOfWork.run(async () => {
      const plan =
        doc.mode === 'replace' ? await this.#replace(userId, doc) : await this.#merge(userId, doc)
      await this.access.refresh(plan)
      return {
        plan: (await this.planRepository.findById(plan.id)) ?? plan,
        mode: doc.mode,
        weeks: doc.weeks.length,
        sessions: doc.weeks.reduce((a, w) => a + w.sessions.length, 0),
      }
    })
  }

  async #replace(userId: number, doc: PlanDocument): Promise<TrainingPlan> {
    const previous = await this.planRepository.lockActiveByUserId(userId)
    if (previous) await this.planRepository.update(previous.id, { status: PlanStatus.Abandoned })

    const goal = await this.#syncGoal(userId, doc.plan.goal ?? null)
    const profile = await this.userProfileRepository.findByUserId(userId)
    const startDate = doc.plan.start_date!
    const firstWeekDays = [...new Set((doc.weeks[0]?.sessions ?? []).map((s) => s.day))]

    const plan = await this.planRepository.create({
      userId,
      goalId: goal?.id ?? null,
      methodology: TrainingMethodology.Custom,
      level: planTypeFor(doc.plan.goal ?? null),
      status: PlanStatus.Active,
      // Le plan vient de Claude : pas de réécriture automatique par le moteur
      autoRecalibrate: false,
      vdotAtCreation: profile?.vdot ?? 0,
      currentVdot: profile?.vdot ?? 0,
      sessionsPerWeek: 1,
      preferredDays: firstWeekDays.map(dayNameToDow),
      startDate,
      endDate: addDaysIso(startDate, doc.weeks.length * 7),
      lastRecalibratedAt: null,
      pendingVdotDown: null,
      source: PlanSource.Imported,
      name: doc.plan.name ?? null,
      notes: doc.plan.notes ?? null,
    })
    for (const week of [...doc.weeks].sort((a, b) => a.week - b.week)) {
      await this.#createWeek(plan.id, week)
    }
    await this.userProfileRepository.update(userId, { trainingState: TrainingState.Preparation })
    return plan
  }

  async #merge(userId: number, doc: PlanDocument): Promise<TrainingPlan> {
    const plan = await this.planRepository.lockActiveByUserId(userId)
    if (!plan) throw new NoActivePlanError()

    if (doc.plan.goal) {
      const goal = await this.#syncGoal(userId, doc.plan.goal)
      if (goal && goal.id !== plan.goalId)
        await this.planRepository.update(plan.id, { goalId: goal.id })
    }
    if (doc.plan.name !== null && doc.plan.name !== undefined) {
      await this.planRepository.update(plan.id, { name: doc.plan.name })
    }
    if (doc.plan.notes !== null && doc.plan.notes !== undefined) {
      await this.planRepository.update(plan.id, { notes: doc.plan.notes })
    }

    for (const docWeek of [...doc.weeks].sort((a, b) => a.week - b.week)) {
      const weeks = await this.planRepository.findWeeksByPlanId(plan.id)
      const existing = weeks.find((w) => w.weekNumber === docWeek.week)
      if (!existing) {
        // Semaines intermédiaires manquantes : créées vides (repos)
        for (let n = weeks.length + 1; n < docWeek.week; n++) {
          await this.#createWeek(plan.id, { week: n, sessions: [] })
        }
        await this.#createWeek(plan.id, docWeek)
        continue
      }
      await this.planRepository.updateWeek(existing.id, {
        phaseLabel: docWeek.phase ?? existing.phaseLabel,
        isRecoveryWeek: docWeek.recovery_week ?? existing.isRecoveryWeek,
        notes: docWeek.notes ?? existing.notes,
      })
      // Les séances réalisées restent (liées aux séances faites) ; le reste est remplacé
      const planSessions = await this.planRepository.findSessionsByPlanId(plan.id)
      const current = planSessions.filter((s) => s.weekNumber === docWeek.week)
      for (const s of current) {
        if (s.status !== PlannedSessionStatus.Completed)
          await this.planRepository.deleteSession(s.id)
      }
      const kept = current.filter((s) => s.status === PlannedSessionStatus.Completed)
      await this.planRepository.createSessions(
        sessionsWithOrder({ ...docWeek, sessions: docWeek.sessions.filter((s) => !s.done) }).map(
          (session) => ({
            ...session,
            planId: plan.id,
            weekNumber: docWeek.week,
            // Après les séances déjà faites du même jour
            orderInDay:
              (session.orderInDay ?? 0) +
              kept.filter((k) => k.dayOfWeek === session.dayOfWeek).length,
          })
        )
      )
    }

    for (const n of [...new Set(doc.delete_weeks ?? [])].sort((a, b) => b - a)) {
      await this.planRepository.deleteWeek(plan.id, n)
    }
    return plan
  }

  async #createWeek(planId: number, week: PlanDocWeek): Promise<void> {
    await this.planRepository.createWeek({
      planId,
      weekNumber: week.week,
      phaseName: 'custom',
      phaseLabel: week.phase ?? '',
      isRecoveryWeek: week.recovery_week ?? false,
      targetVolumeMinutes: week.sessions.reduce((a, s) => a + s.duration_minutes, 0),
      notes: week.notes ?? null,
    })
    await this.planRepository.createSessions(
      sessionsWithOrder(week).map((session) => ({ ...session, planId, weekNumber: week.week }))
    )
  }

  /** Crée l'objectif, ou met à jour l'objectif actif, à partir du document */
  async #syncGoal(userId: number, goal: PlanDocGoal | null): Promise<TrainingGoal | null> {
    const active = await this.goalRepository.findActiveByUserId(userId)
    if (!goal) return active
    const data = {
      targetDistanceKm: goal.distance_km,
      targetTimeMinutes: goal.target_time ? Math.round(timeToMinutes(goal.target_time)) : null,
      eventDate: goal.event_date ?? null,
    }
    if (active) return this.goalRepository.update(active.id, data)
    return this.goalRepository.create({ userId, status: 'active', ...data })
  }
}
