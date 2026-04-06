import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Session from '#models/session'
import TrainingGoal from '#models/training_goal'
import TrainingPlan from '#models/training_plan'
import PlannedWeek from '#models/planned_week'
import PlannedSession from '#models/planned_session'
import Sport from '#models/sport'
import { getAdmin } from '#tests/helpers'
import {
  TrainingMethodology,
  PlanType,
  PlanStatus,
  PlannedSessionStatus,
  SessionType,
  IntensityZone,
} from '#domain/value_objects/planning_types'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createActivePlan(userId: number) {
  const goal = await TrainingGoal.create({
    userId,
    targetDistanceKm: 42,
    status: 'active',
  })

  const plan = await TrainingPlan.create({
    userId,
    goalId: goal.id,
    methodology: TrainingMethodology.Daniels,
    level: PlanType.Marathon,
    status: PlanStatus.Active,
    autoRecalibrate: false,
    vdotAtCreation: 45,
    currentVdot: 45,
    sessionsPerWeek: 3,
    preferredDays: [1, 3, 6],
    startDate: DateTime.now().minus({ weeks: 1 }),
    endDate: DateTime.now().plus({ weeks: 11 }),
  })

  await PlannedWeek.create({
    planId: plan.id,
    weekNumber: 1,
    phaseName: 'FI',
    phaseLabel: 'Fondation',
    isRecoveryWeek: false,
    targetVolumeMinutes: 200,
  })

  return { goal, plan }
}

async function createSession(userId: number, daysAgo: number) {
  const sport = await Sport.findByOrFail('slug', 'running')
  return Session.create({
    userId,
    sportId: sport.id,
    date: DateTime.now().minus({ days: daysAgo }),
    durationMinutes: 45,
    distanceKm: 8,
    sportMetrics: {},
  })
}

/** Supprime toutes les séances non-supprimées de l'utilisateur (dans la transaction de test) */
async function clearSessions(userId: number) {
  await Session.query().where('userId', userId).whereNull('deletedAt').delete()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.group('Planning / Détection inactivité', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  // AC #2 — séance récente → pas de bannière
  test('GET /planning → inactivityLevel none si séance < 14 jours', async ({ client, assert }) => {
    const user = await getAdmin()
    await clearSessions(user.id)
    await createActivePlan(user.id)
    await createSession(user.id, 3)

    const response = await client
      .get('/planning')
      .loginAs(user)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    response.assertStatus(200)
    const body = response.body() as { props: { overview: { inactivityLevel: string } } }
    assert.equal(body.props.overview.inactivityLevel, 'none')
  })

  // AC #2 — inactivité > 14 jours → warning
  test('GET /planning → inactivityLevel warning si séance entre 14 et 28 jours', async ({
    client,
    assert,
  }) => {
    const user = await getAdmin()
    await clearSessions(user.id)
    await createActivePlan(user.id)
    await createSession(user.id, 20)

    const response = await client
      .get('/planning')
      .loginAs(user)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    response.assertStatus(200)
    const body = response.body() as {
      props: { overview: { inactivityLevel: string; daysSinceLastSession: number } }
    }
    assert.equal(body.props.overview.inactivityLevel, 'warning')
    assert.equal(body.props.overview.daysSinceLastSession, 20)
  })

  // AC #4 — inactivité > 4 semaines → critical
  test('GET /planning → inactivityLevel critical si séance > 28 jours', async ({
    client,
    assert,
  }) => {
    const user = await getAdmin()
    await clearSessions(user.id)
    await createActivePlan(user.id)
    await createSession(user.id, 35)

    const response = await client
      .get('/planning')
      .loginAs(user)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    response.assertStatus(200)
    const body = response.body() as { props: { overview: { inactivityLevel: string } } }
    assert.equal(body.props.overview.inactivityLevel, 'critical')
  })

  // AC #2 — aucune séance → none (pas de fausse alarme)
  test('GET /planning → inactivityLevel none si aucune séance', async ({ client, assert }) => {
    const user = await getAdmin()
    await clearSessions(user.id)
    await createActivePlan(user.id)

    const response = await client
      .get('/planning')
      .loginAs(user)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    response.assertStatus(200)
    const body = response.body() as {
      props: { overview: { inactivityLevel: string; daysSinceLastSession: number | null } }
    }
    assert.equal(body.props.overview.inactivityLevel, 'none')
    assert.isNull(body.props.overview.daysSinceLastSession)
  })

  // AC #3 — POST resume-from-inactivity → redirect /planning
  test('POST /planning/resume-from-inactivity → recalibre et redirige', async ({
    client,
    assert,
  }) => {
    const user = await getAdmin()
    await clearSessions(user.id)
    const { plan } = await createActivePlan(user.id)
    await createSession(user.id, 20)

    // Semaine future pour que la recalibration ait quelque chose à reconstruire
    await PlannedWeek.create({
      planId: plan.id,
      weekNumber: 2,
      phaseName: 'FI',
      phaseLabel: 'Fondation',
      isRecoveryWeek: false,
      targetVolumeMinutes: 200,
    })
    await PlannedSession.create({
      planId: plan.id,
      weekNumber: 2,
      dayOfWeek: 1,
      sessionType: SessionType.Easy,
      targetDurationMinutes: 45,
      intensityZone: IntensityZone.Z2,
      status: PlannedSessionStatus.Pending,
    })

    const response = await client
      .post('/planning/resume-from-inactivity')
      .loginAs(user)
      .json({ days_since: 20 })
      .redirects(0)

    response.assertStatus(302)
    assert.equal(response.header('location'), '/planning')
  })

  // AC #5 — POST abandon-for-new-plan → redirect /planning/goal
  test('POST /planning/abandon-for-new-plan → abandonne et redirige vers wizard', async ({
    client,
    assert,
  }) => {
    const user = await getAdmin()
    await clearSessions(user.id)
    await createActivePlan(user.id)

    const response = await client.post('/planning/abandon-for-new-plan').loginAs(user).redirects(0)

    response.assertStatus(302)
    assert.equal(response.header('location'), '/planning/goal')

    const goal = await TrainingGoal.query().where('userId', user.id).first()
    assert.equal(goal?.status, 'abandoned')
  })
})
