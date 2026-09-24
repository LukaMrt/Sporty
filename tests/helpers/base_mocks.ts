/**
 * Classes de base des mocks de ports : implémentations neutres de toutes les
 * méthodes, pour que les mocks locaux des tests n'aient à surcharger que ce
 * qu'ils utilisent (et ne cassent plus à chaque ajout de méthode au port).
 */
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { SessionLoadEntry } from '#domain/interfaces/session_repository'
import { UnitOfWork } from '#domain/interfaces/unit_of_work'
import { EventEmitter } from '#domain/interfaces/event_emitter'
import { Logger } from '#domain/interfaces/logger'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { SportRepository } from '#domain/interfaces/sport_repository'
import type { SportSummary } from '#domain/interfaces/sport_repository'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'
import type { TrainingLoad } from '#domain/value_objects/training_load'
import type { AnalysisSession } from '#domain/services/analysis/aggregations'

const NOW = () => new Date().toISOString()

export class BaseMockPlanRepo extends TrainingPlanRepository {
  #nextId = 1000

  async create(data: Omit<TrainingPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrainingPlan> {
    return { ...data, id: this.#nextId++, createdAt: NOW(), updatedAt: NOW() }
  }
  async findById(_id: number): Promise<TrainingPlan | null> {
    return null
  }
  async findByUserId(_userId: number): Promise<TrainingPlan[]> {
    return []
  }
  async findActiveByUserId(_userId: number): Promise<TrainingPlan | null> {
    return null
  }
  async lockActiveByUserId(userId: number): Promise<TrainingPlan | null> {
    return this.findActiveByUserId(userId)
  }
  async findAllActive(): Promise<TrainingPlan[]> {
    return []
  }
  async findActiveByGoalId(_goalId: number): Promise<TrainingPlan | null> {
    return null
  }
  async update(
    id: number,
    data: Partial<Omit<TrainingPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<TrainingPlan> {
    const existing = await this.findById(id)
    return { ...(existing as TrainingPlan), ...data, id }
  }
  async delete(_id: number): Promise<void> {}
  async createWeek(
    data: Omit<PlannedWeek, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PlannedWeek> {
    return { ...data, id: this.#nextId++, createdAt: NOW(), updatedAt: NOW() }
  }
  async createWeeks(
    data: Omit<PlannedWeek, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<PlannedWeek[]> {
    const out: PlannedWeek[] = []
    for (const week of data) out.push(await this.createWeek(week))
    return out
  }
  async findWeeksByPlanId(_planId: number): Promise<PlannedWeek[]> {
    return []
  }
  async createSession(
    data: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PlannedSession> {
    return { ...data, id: this.#nextId++, createdAt: NOW(), updatedAt: NOW() }
  }
  async createSessions(
    data: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<PlannedSession[]> {
    const out: PlannedSession[] = []
    for (const session of data) out.push(await this.createSession(session))
    return out
  }
  async findSessionById(_id: number): Promise<PlannedSession | null> {
    return null
  }
  async findSessionsByPlanId(_planId: number): Promise<PlannedSession[]> {
    return []
  }
  async updateSession(
    id: number,
    data: Partial<Omit<PlannedSession, 'id' | 'planId' | 'createdAt' | 'updatedAt'>>
  ): Promise<PlannedSession> {
    const existing = await this.findSessionById(id)
    return { ...(existing as PlannedSession), ...data, id }
  }
  async deleteSessionsFromWeek(_planId: number, _fromWeekNumber: number): Promise<void> {}
}

export class BaseMockSessionRepo extends SessionRepository {
  async create(
    data: Omit<TrainingSession, 'id' | 'createdAt' | 'sportName'>
  ): Promise<TrainingSession> {
    return { id: 1, sportName: 'Course à pied', createdAt: NOW(), ...data }
  }
  async findAllByUserId(): Promise<PaginatedResult<TrainingSession>> {
    return { data: [], meta: { total: 0, page: 1, perPage: 20, lastPage: 1 } }
  }
  async findById(_id: number): Promise<TrainingSession | null> {
    return null
  }
  async findByIdIncludingTrashed(_id: number): Promise<TrainingSession | null> {
    return null
  }
  async update(
    id: number,
    data: Partial<Omit<TrainingSession, 'id' | 'userId' | 'createdAt' | 'sportName'>>
  ): Promise<TrainingSession> {
    const existing = await this.findById(id)
    return { ...(existing as TrainingSession), ...data, id }
  }
  async findTrashedByUserId(): Promise<TrainingSession[]> {
    return []
  }
  async softDelete(): Promise<void> {}
  async restore(): Promise<void> {}
  async findByUserIdAndDateRange(
    _userId: number,
    _startDate: string,
    _endDate: string
  ): Promise<TrainingSession[]> {
    return []
  }
  async findByUserAndExternalIds(): Promise<{ externalId: string; id: number }[]> {
    return []
  }
  async forceDelete(): Promise<void> {}
  /** Par défaut dérivé de findByUserIdAndDateRange, que les tests surchargent déjà */
  async findLoadEntries(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<SessionLoadEntry[]> {
    const sessions = await this.findByUserIdAndDateRange(userId, startDate, endDate)
    return sessions.map((s) => ({
      id: s.id,
      date: s.date,
      sportSlug: s.sportSlug ?? 'running',
      durationMinutes: s.durationMinutes,
      distanceKm: s.distanceKm,
      trainingLoad: s.trainingLoad ?? null,
      loadMethod: s.loadMethod ?? null,
    }))
  }
  async findByIds(ids: number[]): Promise<TrainingSession[]> {
    const out: TrainingSession[] = []
    for (const id of ids) {
      const s = await this.findById(id)
      if (s) out.push(s)
    }
    return out
  }
  async findAllAliveByUserId(_userId: number): Promise<TrainingSession[]> {
    return []
  }
  async findTrackPreviews(
    userId: number
  ): Promise<{ id: number; date: string; sportSlug: string; track: [number, number][] }[]> {
    const sessions = await this.findAllAliveByUserId(userId)
    return sessions
      .filter((s) => s.trackPreview)
      .map((s) => ({
        id: s.id,
        date: s.date,
        sportSlug: s.sportSlug ?? 'running',
        track: s.trackPreview!,
      }))
  }
  async findAnalysisEntries(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<AnalysisSession[]> {
    const sessions = await this.findByUserIdAndDateRange(userId, startDate, endDate)
    return sessions.map((s) => ({
      id: s.id,
      date: s.date,
      sportSlug: s.sportSlug ?? 'running',
      durationMinutes: s.durationMinutes,
      distanceKm: s.distanceKm,
      avgHeartRate: s.avgHeartRate,
      trainingLoad: s.trainingLoad ?? null,
      analysis: s.analysis ?? null,
    }))
  }
}

/** Exécute directement le bloc (pas de transaction en test unitaire) */
export class ImmediateUnitOfWork extends UnitOfWork {
  runs = 0
  async run<T>(fn: () => Promise<T>): Promise<T> {
    this.runs++
    return fn()
  }
}

export class RecordingEventEmitter extends EventEmitter {
  events: { event: string; data: Record<string, unknown> }[] = []
  async emit(event: string, data: Record<string, unknown>): Promise<void> {
    this.events.push({ event, data })
  }
}

export class SilentLogger extends Logger {
  entries: { level: string; message: string; context: Record<string, unknown> }[] = []
  info(context: Record<string, unknown>, message: string): void {
    this.entries.push({ level: 'info', message, context })
  }
  warn(context: Record<string, unknown>, message: string): void {
    this.entries.push({ level: 'warn', message, context })
  }
  error(context: Record<string, unknown>, message: string): void {
    this.entries.push({ level: 'error', message, context })
  }
}

export class FixedLoadCalculator extends TrainingLoadCalculator {
  constructor(private load: TrainingLoad = { value: 50, method: 'rpe' }) {
    super()
  }
  calculate(): TrainingLoad {
    return this.load
  }
}

export class StaticSportRepository extends SportRepository {
  constructor(
    private sports: SportSummary[] = [{ id: 1, name: 'Course à pied', slug: 'running' }]
  ) {
    super()
  }
  async findAll(): Promise<SportSummary[]> {
    return this.sports
  }
}

import { ConnectorScheduler } from '#domain/interfaces/connector_scheduler'

export class RecordingScheduler extends ConnectorScheduler {
  removed: number[] = []
  added: number[] = []
  async start(): Promise<void> {}
  stop(): void {}
  addConnector(connectorId: number): void {
    this.added.push(connectorId)
  }
  removeConnector(connectorId: number): void {
    this.removed.push(connectorId)
  }
  updateInterval(): void {}
}

import type GetFitnessProfile from '#use_cases/fitness/get_fitness_profile'
import type { FitnessProfileResult } from '#use_cases/fitness/get_fitness_profile'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'

export const SAMPLE_FITNESS: FitnessProfile = {
  chronicTrainingLoad: 45,
  acuteTrainingLoad: 50,
  trainingStressBalance: -5,
  acuteChronicWorkloadRatio: 1.1,
  calculatedAt: new Date(),
}

/** Remplace le use case GetFitnessProfile par un résultat fixe */
export function stubGetFitnessProfile(profile: FitnessProfile | null = SAMPLE_FITNESS) {
  const result: FitnessProfileResult = {
    asOf: new Date().toISOString().slice(0, 10),
    profile,
    series: [],
    methods: { trimp_exp: 0, rtss: 0, rpe: 0 },
  }
  return { execute: async () => result } as unknown as GetFitnessProfile
}

import {
  IntensityZone,
  PlanStatus,
  PlanType,
  PlannedSessionStatus,
  SessionType,
  TrainingMethodology,
} from '#domain/value_objects/planning_types'

/** Dépôt de plans en mémoire, avec état réel (tests de scénarios) */
export class InMemoryPlanRepo extends BaseMockPlanRepo {
  plans: TrainingPlan[] = []
  weeks: PlannedWeek[] = []
  sessions: PlannedSession[] = []
  #id = 1

  async create(data: Omit<TrainingPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrainingPlan> {
    const plan = { ...data, id: this.#id++, createdAt: NOW(), updatedAt: NOW() }
    this.plans.push(plan)
    return plan
  }
  async findById(id: number) {
    return this.plans.find((p) => p.id === id) ?? null
  }
  async findByUserId(userId: number) {
    return this.plans.filter((p) => p.userId === userId)
  }
  async findActiveByUserId(userId: number) {
    return (
      [...this.plans]
        .reverse()
        .find(
          (p) =>
            p.userId === userId && (p.status === PlanStatus.Active || p.status === PlanStatus.Draft)
        ) ?? null
    )
  }
  async findAllActive() {
    return this.plans.filter((p) => p.status === PlanStatus.Active)
  }
  async update(id: number, data: Partial<TrainingPlan>) {
    const plan = this.plans.find((p) => p.id === id)!
    Object.assign(plan, data)
    return plan
  }
  async createWeek(data: Omit<PlannedWeek, 'id' | 'createdAt' | 'updatedAt'>) {
    const week = { ...data, id: this.#id++, createdAt: NOW(), updatedAt: NOW() }
    this.weeks.push(week)
    return week
  }
  async findWeeksByPlanId(planId: number) {
    return this.weeks.filter((w) => w.planId === planId).sort((a, b) => a.weekNumber - b.weekNumber)
  }
  async createSession(data: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'>) {
    const session = { ...data, id: this.#id++, createdAt: NOW(), updatedAt: NOW() }
    this.sessions.push(session)
    return session
  }
  async findSessionById(id: number) {
    return this.sessions.find((s) => s.id === id) ?? null
  }
  async findSessionsByPlanId(planId: number) {
    return this.sessions
      .filter((s) => s.planId === planId)
      .sort((a, b) => a.weekNumber - b.weekNumber || a.dayOfWeek - b.dayOfWeek)
      .map((s) => ({ ...s }))
  }
  async updateSession(id: number, data: Partial<PlannedSession>) {
    const session = this.sessions.find((s) => s.id === id)!
    Object.assign(session, data)
    return { ...session }
  }
  async deleteSessionsFromWeek(planId: number, fromWeekNumber: number) {
    this.sessions = this.sessions.filter(
      (s) => !(s.planId === planId && s.weekNumber >= fromWeekNumber)
    )
  }

  /** Crée un plan actif de `weeks` semaines, une séance par jour de `days` */
  async seedPlan(options: {
    userId?: number
    startDate: string
    weeks: number
    days?: number[]
    sessionType?: SessionType
    autoRecalibrate?: boolean
    goalId?: number | null
    vdot?: number
  }): Promise<TrainingPlan> {
    const plan = await this.create({
      userId: options.userId ?? 1,
      goalId: options.goalId ?? null,
      methodology: TrainingMethodology.Daniels,
      level: PlanType.TenKm,
      status: PlanStatus.Active,
      autoRecalibrate: options.autoRecalibrate ?? true,
      vdotAtCreation: options.vdot ?? 45,
      currentVdot: options.vdot ?? 45,
      sessionsPerWeek: (options.days ?? [2, 4, 6]).length,
      preferredDays: options.days ?? [2, 4, 6],
      startDate: options.startDate,
      endDate: new Date(Date.parse(options.startDate) + options.weeks * 7 * 86_400_000)
        .toISOString()
        .slice(0, 10),
      lastRecalibratedAt: null,
      pendingVdotDown: null,
    })
    for (let w = 1; w <= options.weeks; w++) {
      await this.createWeek({
        planId: plan.id,
        weekNumber: w,
        phaseName: 'EQ',
        phaseLabel: 'EQ',
        isRecoveryWeek: false,
        targetVolumeMinutes: 180,
      })
      for (const day of options.days ?? [2, 4, 6]) {
        await this.createSession({
          planId: plan.id,
          weekNumber: w,
          dayOfWeek: day,
          sessionType: options.sessionType ?? SessionType.Easy,
          targetDurationMinutes: 60,
          targetDistanceKm: null,
          targetPacePerKm: null,
          intensityZone: IntensityZone.Z2,
          intervals: null,
          targetLoadTss: 56,
          completedSessionId: null,
          status: PlannedSessionStatus.Pending,
        })
      }
    }
    return plan
  }
}

/** Moteur de plan minimal : régénère les semaines reçues telles quelles */
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import type { GeneratedPlan } from '#domain/interfaces/training_plan_engine'
import type { RecalibrationContext } from '#domain/value_objects/recalibration_context'

export class EchoPlanEngine extends TrainingPlanEngine {
  recalibrations: RecalibrationContext[] = []
  generatePlan(): GeneratedPlan {
    return { weeks: [], methodology: TrainingMethodology.Daniels, totalWeeks: 0 }
  }
  generateMaintenancePlan(): GeneratedPlan {
    return {
      methodology: TrainingMethodology.Daniels,
      totalWeeks: 1,
      weeks: [
        {
          weekNumber: 1,
          phaseName: 'MAINT',
          isRecoveryWeek: false,
          targetVolumeMinutes: 100,
          sessions: [
            {
              dayOfWeek: 2,
              sessionType: SessionType.Easy,
              targetDurationMinutes: 40,
              targetDistanceKm: null,
              targetPacePerKm: null,
              intensityZone: IntensityZone.Z2,
              intervals: null,
            },
          ],
        },
      ],
    }
  }
  generateTransitionPlan(): GeneratedPlan {
    return this.generateMaintenancePlan()
  }
  recalibrate(ctx: RecalibrationContext): GeneratedPlan {
    this.recalibrations.push(ctx)
    return {
      methodology: TrainingMethodology.Daniels,
      totalWeeks: ctx.remainingWeeks.length,
      weeks: ctx.remainingWeeks,
    }
  }
}

import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import type { TrainingGoal } from '#domain/entities/training_goal'

export class StaticGoalRepo extends TrainingGoalRepository {
  constructor(private goal: TrainingGoal | null = null) {
    super()
  }
  async create(): Promise<TrainingGoal> {
    throw new Error('not implemented')
  }
  async findById() {
    return this.goal
  }
  async findByUserId() {
    return this.goal ? [this.goal] : []
  }
  async findActiveByUserId() {
    return this.goal
  }
  async update(): Promise<TrainingGoal> {
    throw new Error('not implemented')
  }
  async delete(): Promise<void> {}
}

/** Dépôt de séances réalisées en mémoire */
export class InMemorySessionRepo extends BaseMockSessionRepo {
  constructor(public sessions: TrainingSession[] = []) {
    super()
  }
  add(partial: Partial<TrainingSession> & { id: number; date: string }): TrainingSession {
    const session: TrainingSession = {
      userId: 1,
      sportId: 1,
      sportName: 'Course à pied',
      sportSlug: 'running',
      durationMinutes: 60,
      distanceKm: 10,
      avgHeartRate: null,
      perceivedEffort: null,
      sportMetrics: {},
      notes: null,
      createdAt: NOW(),
      trainingLoad: null,
      loadMethod: null,
      ...partial,
    }
    this.sessions.push(session)
    return session
  }
  async findById(id: number) {
    return this.sessions.find((s) => s.id === id) ?? null
  }
  async findByUserIdAndDateRange(userId: number, start: string, end: string) {
    return this.sessions
      .filter((s) => s.userId === userId && s.date >= start && s.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date))
  }
  async findAllAliveByUserId(userId: number) {
    return this.sessions.filter((s) => s.userId === userId)
  }
}
