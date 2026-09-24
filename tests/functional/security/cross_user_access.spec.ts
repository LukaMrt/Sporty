import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Session from '#models/session'
import Connector from '#models/connector'
import ImportSession from '#models/import_session'
import TrainingGoal from '#models/training_goal'
import TrainingPlan from '#models/training_plan'
import PlannedWeek from '#models/planned_week'
import PlannedSession from '#models/planned_session'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { ImportSessionStatus } from '#domain/value_objects/import_session_status'
import {
  IntensityZone,
  PlanStatus,
  PlanType,
  PlannedSessionStatus,
  SessionType,
  TrainingMethodology,
} from '#domain/value_objects/planning_types'
import { getUser, getUser2 } from '#tests/helpers'

/**
 * §13.1 · Chaque ressource adressée par `:id` doit être inaccessible à un autre
 * utilisateur : on vérifie la réponse ET que la ressource est inchangée.
 */
async function victimResources(ownerId: number) {
  process.env['CONNECTOR_ENCRYPTION_KEY'] = 'test_encryption_key_32_bytes_long!!'
  const session = await Session.query()
    .where('userId', ownerId)
    .whereNull('deletedAt')
    .firstOrFail()
  const trashed = await Session.create({
    userId: ownerId,
    sportId: session.sportId,
    date: DateTime.now(),
    durationMinutes: 30,
    sportMetrics: {},
    deletedAt: DateTime.now(),
  })
  const connector = await Connector.create({
    userId: ownerId,
    provider: ConnectorProvider.Strava,
    status: ConnectorStatus.Connected,
    encryptedAccessToken: 'enc_access',
    encryptedRefreshToken: 'enc_refresh',
    autoImportEnabled: false,
    pollingIntervalMinutes: 60,
  })
  const staged = await ImportSession.create({
    connectorId: connector.id,
    externalId: 'victim-ext',
    status: ImportSessionStatus.New,
    rawData: null,
  })
  const goal = await TrainingGoal.create({
    userId: ownerId,
    targetDistanceKm: 10,
    status: 'active',
  })
  const plan = await TrainingPlan.create({
    userId: ownerId,
    goalId: goal.id,
    methodology: TrainingMethodology.Daniels,
    level: PlanType.TenKm,
    status: PlanStatus.Active,
    autoRecalibrate: false,
    vdotAtCreation: 45,
    currentVdot: 45,
    sessionsPerWeek: 3,
    preferredDays: [1, 3, 6],
    startDate: DateTime.now(),
    endDate: DateTime.now().plus({ weeks: 4 }),
  })
  await PlannedWeek.create({
    planId: plan.id,
    weekNumber: 1,
    phaseName: 'EQ',
    phaseLabel: 'EQ',
    isRecoveryWeek: false,
    targetVolumeMinutes: 150,
  })
  const planned = await PlannedSession.create({
    planId: plan.id,
    weekNumber: 1,
    dayOfWeek: 1,
    sessionType: SessionType.Easy,
    targetDurationMinutes: 45,
    intensityZone: IntensityZone.Z2,
    status: PlannedSessionStatus.Pending,
  })
  return { session, trashed, staged, goal, plan, planned }
}

test.group("Sécurité / accès aux ressources d'un autre utilisateur", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())
  group.each.teardown(() => {
    delete process.env['CONNECTOR_ENCRYPTION_KEY']
  })

  test('séances : lecture, édition, suppression, restauration, GPX', async ({ client, assert }) => {
    const attacker = await getUser()
    const victim = await getUser2()
    const r = await victimResources(victim.id)

    for (const url of [`/sessions/${r.session.id}`, `/sessions/${r.session.id}/edit`]) {
      const res = await client.get(url).loginAs(attacker).redirects(0)
      assert.notEqual(res.status(), 200, url)
    }
    const gpx = await client.get(`/sessions/${r.session.id}/gpx`).loginAs(attacker)
    gpx.assertStatus(404)

    await client
      .put(`/sessions/${r.session.id}`)
      .form({ sport_id: r.session.sportId, date: '2026-01-01', duration_minutes: 1 })
      .loginAs(attacker)
      .redirects(0)
    await client.delete(`/sessions/${r.session.id}`).loginAs(attacker).redirects(0)
    await client.post(`/sessions/${r.trashed.id}/restore`).loginAs(attacker).redirects(0)

    const session = await Session.findOrFail(r.session.id)
    assert.notEqual(session.durationMinutes, 1)
    assert.isNull(session.deletedAt)
    const trashed = await Session.findOrFail(r.trashed.id)
    assert.isNotNull(trashed.deletedAt)
  })

  test("import : ignorer / restaurer / réimporter la ligne d'un autre", async ({
    client,
    assert,
  }) => {
    const attacker = await getUser()
    const victim = await getUser2()
    const r = await victimResources(victim.id)

    for (const action of ['ignore', 'restore', 'reimport']) {
      await client.post(`/import/sessions/${r.staged.id}/${action}`).loginAs(attacker).redirects(0)
    }
    const staged = await ImportSession.findOrFail(r.staged.id)
    assert.equal(staged.status, ImportSessionStatus.New)
  })

  test('planning : séance planifiée, objectif, historique', async ({ client, assert }) => {
    const attacker = await getUser()
    const victim = await getUser2()
    const r = await victimResources(victim.id)

    await client
      .put(`/planning/sessions/${r.planned.id}`)
      .json({ day_of_week: 5 })
      .loginAs(attacker)
      .redirects(0)
    await client
      .post(`/planning/sessions/${r.planned.id}/link`)
      .json({ completed_session_id: r.session.id })
      .loginAs(attacker)
      .redirects(0)
    await client
      .put(`/planning/goals/${r.goal.id}`)
      .json({ target_distance_km: 42 })
      .loginAs(attacker)
      .redirects(0)
    await client.post(`/planning/goals/${r.goal.id}/abandon`).loginAs(attacker).redirects(0)
    const history = await client
      .get(`/planning/history/${r.plan.id}`)
      .loginAs(attacker)
      .redirects(0)
    assert.notEqual(history.status(), 200)

    const planned = await PlannedSession.findOrFail(r.planned.id)
    assert.equal(planned.dayOfWeek, 1)
    assert.isNull(planned.completedSessionId)
    const goal = await TrainingGoal.findOrFail(r.goal.id)
    assert.equal(goal.targetDistanceKm, 10)
    assert.equal(goal.status, 'active')
  })
})
