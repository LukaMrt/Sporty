import { test } from '@japa/runner'
import ImportPlanDocument from '#use_cases/plan_editor/import_plan_document'
import ExportPlanDocument from '#use_cases/plan_editor/export_plan_document'
import ActivePlanAccess from '#use_cases/plan_editor/active_plan_access'
import CreatePlannedSession from '#use_cases/plan_editor/create_planned_session'
import UpdatePlannedSession from '#use_cases/plan_editor/update_planned_session'
import DeletePlannedSession from '#use_cases/plan_editor/delete_planned_session'
import AddPlanWeek from '#use_cases/plan_editor/add_plan_week'
import DeletePlanWeek from '#use_cases/plan_editor/delete_plan_week'
import AutoLinkCompletedSession from '#use_cases/planning/auto_link_completed_session'
import {
  ImmediateUnitOfWork,
  InMemoryGoalRepo,
  InMemoryPlanRepo,
  InMemorySessionRepo,
  StaticSportRepository,
} from '#tests/helpers/base_mocks'
import { makeMockUserProfileRepository } from '#tests/helpers/mock_user_profile_repository'
import { InvalidPlanDocumentError } from '#domain/errors/invalid_plan_document_error'
import { NoActivePlanError } from '#domain/errors/no_active_plan_error'
import { UnknownSportError } from '#domain/errors/unknown_sport_error'
import { WeekHasCompletedSessionsError } from '#domain/errors/week_has_completed_sessions_error'
import { PlannedSessionForbiddenError } from '#domain/errors/planned_session_forbidden_error'
import {
  IntensityZone,
  PlanSource,
  PlanStatus,
  PlannedSessionStatus,
  SessionType,
} from '#domain/value_objects/planning_types'
import type { PlannedSessionFields } from '#domain/entities/planned_session'

const SPORTS = [
  { id: 1, name: 'Course à pied', slug: 'running' },
  { id: 2, name: 'Vélo', slug: 'cycling' },
  { id: 3, name: 'Renforcement', slug: 'strength' },
]

function setup() {
  const plans = new InMemoryPlanRepo()
  const goals = new InMemoryGoalRepo()
  const sessions = new InMemorySessionRepo()
  const sports = new StaticSportRepository(SPORTS)
  const profiles = makeMockUserProfileRepository({
    update: async (_userId, data) => ({ ...data }) as never,
  })
  const access = new ActivePlanAccess(plans)
  const uow = new ImmediateUnitOfWork()
  return {
    plans,
    goals,
    sessions,
    importDoc: new ImportPlanDocument(plans, goals, profiles, sports, uow, access),
    exportDoc: new ExportPlanDocument(plans, goals),
    create: new CreatePlannedSession(plans, sports, access),
    update: new UpdatePlannedSession(plans, sports, access),
    remove: new DeletePlannedSession(plans, access),
    addWeek: new AddPlanWeek(plans, uow, access),
    deleteWeek: new DeletePlanWeek(plans, uow, access),
    autoLink: new AutoLinkCompletedSession(plans, sessions),
  }
}

const doc = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    version: 1,
    mode: 'replace',
    plan: {
      name: 'Semi 1h45',
      start_date: '2026-10-05',
      goal: { distance_km: 21.1, target_time: '1:45:00', event_date: '2027-01-17' },
    },
    weeks: [
      {
        week: 1,
        phase: 'Base',
        notes: 'Reprise',
        sessions: [
          { day: 'tuesday', sport: 'running', type: 'easy', duration_minutes: 45 },
          { day: 'tuesday', sport: 'strength', type: 'strength', duration_minutes: 30 },
          { day: 'sunday', sport: 'cycling', type: 'long_run', duration_minutes: 120 },
        ],
      },
      {
        week: 2,
        sessions: [{ day: 'thursday', sport: 'running', type: 'tempo', duration_minutes: 50 }],
      },
    ],
    ...overrides,
  })

const FIELDS: PlannedSessionFields = {
  dayOfWeek: 3,
  sportSlug: 'running',
  sessionType: SessionType.Easy,
  title: null,
  description: '',
  targetDurationMinutes: 40,
  targetDistanceKm: null,
  intensityZone: IntensityZone.Z2,
  targetPacePerKm: null,
  targetPacePer100m: null,
  targetPowerWatts: null,
  targetRpe: null,
  intervals: null,
  exercises: null,
}

test.group('Import d’un plan Claude — remplacement', () => {
  test('crée un vrai plan actif : semaines, séances multisports, objectif', async ({ assert }) => {
    const { importDoc, plans, goals } = setup()
    const result = await importDoc.execute(1, doc())

    assert.equal(result.mode, 'replace')
    assert.equal(result.plan.source, PlanSource.Imported)
    assert.isFalse(result.plan.autoRecalibrate)
    assert.equal(result.plan.name, 'Semi 1h45')
    assert.equal(result.plan.endDate, '2026-10-19')
    const weeks = await plans.findWeeksByPlanId(result.plan.id)
    assert.lengthOf(weeks, 2)
    assert.equal(weeks[0].phaseLabel, 'Base')
    assert.equal(weeks[0].targetVolumeMinutes, 195)
    const planned = await plans.findSessionsByPlanId(result.plan.id)
    assert.deepEqual(
      planned
        .filter((s) => s.weekNumber === 1)
        .map((s) => [s.sportSlug, s.dayOfWeek, s.orderInDay]),
      [
        ['running', 2, 0],
        ['strength', 2, 1],
        ['cycling', 0, 0],
      ].sort((a, b) => (a[1] as number) - (b[1] as number))
    )
    const goal = await goals.findActiveByUserId(1)
    assert.equal(goal?.targetTimeMinutes, 105)
    assert.equal(result.plan.goalId, goal?.id)
  })

  test('l’ancien plan actif est abandonné (conservé dans l’historique)', async ({ assert }) => {
    const { importDoc, plans } = setup()
    const old = await plans.seedPlan({ startDate: '2026-09-01', weeks: 4 })
    await importDoc.execute(1, doc())
    assert.equal((await plans.findById(old.id))!.status, PlanStatus.Abandoned)
  })

  test('document invalide : rien n’est importé, toutes les erreurs sont renvoyées', async ({
    assert,
  }) => {
    const { importDoc, plans } = setup()
    try {
      await importDoc.execute(1, doc({ weeks: [{ week: 1, sessions: [{ day: 'lundi' }] }] }))
      assert.fail('devait échouer')
    } catch (error) {
      assert.instanceOf(error, InvalidPlanDocumentError)
      assert.isAbove((error as InvalidPlanDocumentError).errors.length, 2)
    }
    assert.lengthOf(plans.plans, 0)
  })
})

test.group('Import d’un plan Claude — fusion', () => {
  test('remplace les semaines fournies, garde les séances réalisées, ajoute et supprime', async ({
    assert,
  }) => {
    const { importDoc, plans } = setup()
    const { plan } = await importDoc.execute(1, doc())
    const initial = await plans.findSessionsByPlanId(plan.id)
    const week1 = initial.filter((s) => s.weekNumber === 1)
    const easy = week1.find((s) => s.sessionType === SessionType.Easy)!
    await plans.updateSession(easy.id, {
      status: PlannedSessionStatus.Completed,
      completedSessionId: 99,
    })

    await importDoc.execute(
      1,
      JSON.stringify({
        version: 1,
        mode: 'merge',
        plan: {},
        weeks: [
          {
            week: 1,
            phase: 'Base révisée',
            sessions: [
              { day: 'tuesday', sport: 'running', type: 'easy', duration_minutes: 45, done: true },
              { day: 'friday', sport: 'running', type: 'recovery', duration_minutes: 30 },
            ],
          },
          {
            week: 3,
            sessions: [{ day: 'monday', sport: 'cycling', type: 'easy', duration_minutes: 60 }],
          },
        ],
        delete_weeks: [2],
      })
    )

    const weeks = await plans.findWeeksByPlanId(plan.id)
    // Semaine 2 supprimée : l'ancienne semaine 3 devient la 2
    assert.deepEqual(
      weeks.map((w) => w.weekNumber),
      [1, 2]
    )
    assert.equal(weeks[0].phaseLabel, 'Base révisée')
    const sessions = await plans.findSessionsByPlanId(plan.id)
    const w1 = sessions.filter((s) => s.weekNumber === 1)
    // Séance réalisée conservée (non dupliquée), anciennes séances en attente remplacées
    assert.deepEqual(
      w1.map((s) => [s.sessionType, s.status]),
      [
        [SessionType.Easy, PlannedSessionStatus.Completed],
        [SessionType.Recovery, PlannedSessionStatus.Pending],
      ]
    )
    assert.equal(sessions.find((s) => s.weekNumber === 2)?.sportSlug, 'cycling')
    assert.equal((await plans.findById(plan.id))!.endDate, '2026-10-19')
  })

  test('fusion sans plan actif → erreur explicite', async ({ assert }) => {
    const { importDoc } = setup()
    await assert.rejects(
      () =>
        importDoc.execute(1, JSON.stringify({ version: 1, mode: 'merge', plan: {}, weeks: [] })),
      NoActivePlanError
    )
  })

  test('export puis réimport : le plan est identique', async ({ assert }) => {
    const { importDoc, exportDoc, plans } = setup()
    const first = await importDoc.execute(1, doc())
    const exported = await exportDoc.execute(1)
    const second = await importDoc.execute(1, JSON.stringify(exported))
    const a = await plans.findSessionsByPlanId(first.plan.id)
    const b = await plans.findSessionsByPlanId(second.plan.id)
    const shape = (list: typeof a) =>
      list.map((s) => [
        s.weekNumber,
        s.dayOfWeek,
        s.orderInDay,
        s.sportSlug,
        s.sessionType,
        s.targetDurationMinutes,
      ])
    assert.deepEqual(shape(b), shape(a))
  })
})

test.group('Édition du plan', () => {
  test('ajouter une séance : plusieurs par jour, dans l’ordre', async ({ assert }) => {
    const { importDoc, create } = setup()
    await importDoc.execute(1, doc())
    const created = await create.execute(1, 1, { ...FIELDS, dayOfWeek: 2, sportSlug: 'cycling' })
    assert.equal(created.orderInDay, 2)
    assert.isAbove(created.targetLoadTss!, 0)
  })

  test('sport inconnu refusé', async ({ assert }) => {
    const { importDoc, create } = setup()
    await importDoc.execute(1, doc())
    await assert.rejects(
      () => create.execute(1, 1, { ...FIELDS, sportSlug: 'yoga' }),
      UnknownSportError
    )
  })

  test('modifier une séance : tous les champs, charge recalculée, volume de semaine à jour', async ({
    assert,
  }) => {
    const { importDoc, update, plans } = setup()
    const { plan } = await importDoc.execute(1, doc())
    const [first] = await plans.findSessionsByPlanId(plan.id)
    const updated = await update.execute(1, first.id, {
      targetDurationMinutes: 90,
      intensityZone: IntensityZone.Z4,
      title: '3 × 15 min seuil',
      exercises: null,
    })
    assert.equal(updated.title, '3 × 15 min seuil')
    assert.isAbove(updated.targetLoadTss!, first.targetLoadTss!)
    const planWeeks = await plans.findWeeksByPlanId(plan.id)
    const week = planWeeks.find((w) => w.weekNumber === first.weekNumber)!
    assert.equal(week.targetVolumeMinutes, 195 - first.targetDurationMinutes + 90)
  })

  test('une séance d’un autre plan est refusée', async ({ assert }) => {
    const { importDoc, update, plans } = setup()
    await importDoc.execute(1, doc())
    const other = await plans.seedPlan({ userId: 2, startDate: '2026-10-05', weeks: 1 })
    const [foreign] = await plans.findSessionsByPlanId(other.id)
    await assert.rejects(
      () => update.execute(1, foreign.id, { targetDurationMinutes: 10 }),
      PlannedSessionForbiddenError
    )
  })

  test('supprimer une séance', async ({ assert }) => {
    const { importDoc, remove, plans } = setup()
    const { plan } = await importDoc.execute(1, doc())
    const [first] = await plans.findSessionsByPlanId(plan.id)
    await remove.execute(1, first.id)
    assert.isNull(await plans.findSessionById(first.id))
  })

  test('ajouter une semaine copiée d’une autre (séances remises « à faire »)', async ({
    assert,
  }) => {
    const { importDoc, addWeek, plans } = setup()
    const { plan } = await importDoc.execute(1, doc())
    const [s] = await plans.findSessionsByPlanId(plan.id)
    await plans.updateSession(s.id, {
      status: PlannedSessionStatus.Completed,
      completedSessionId: 5,
    })
    const week = await addWeek.execute(1, { copyFromWeek: 1 })
    assert.equal(week.weekNumber, 3)
    const all = await plans.findSessionsByPlanId(plan.id)
    const copies = all.filter((x) => x.weekNumber === 3)
    assert.lengthOf(copies, 3)
    assert.isTrue(
      copies.every(
        (x) => x.status === PlannedSessionStatus.Pending && x.completedSessionId === null
      )
    )
    assert.equal((await plans.findById(plan.id))!.endDate, '2026-10-26')
  })

  test('supprimer une semaine : refusé si des séances sont réalisées, sinon renumérotation', async ({
    assert,
  }) => {
    const { importDoc, deleteWeek, plans } = setup()
    const { plan } = await importDoc.execute(1, doc())
    const [s] = await plans.findSessionsByPlanId(plan.id)
    await plans.updateSession(s.id, { status: PlannedSessionStatus.Completed })
    await assert.rejects(() => deleteWeek.execute(1, 1), WeekHasCompletedSessionsError)

    await deleteWeek.execute(1, 2)
    assert.lengthOf(await plans.findWeeksByPlanId(plan.id), 1)
  })
})

test.group('Lien automatique multisport', () => {
  test('une sortie vélo se lie à la séance de vélo prévue, pas à la course', async ({ assert }) => {
    const { importDoc, autoLink, sessions } = setup()
    await importDoc.execute(1, doc())
    sessions.add({ id: 50, date: '2026-10-11', sportSlug: 'cycling' }) // dimanche semaine 1
    sessions.add({ id: 51, date: '2026-10-11', sportSlug: 'running' })
    const linked = await autoLink.execute(1, 50)
    assert.equal(linked?.sportSlug, 'cycling')
    assert.isNull(await autoLink.execute(1, 51))
  })
})
