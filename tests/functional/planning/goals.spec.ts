import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import TrainingGoalModel from '#models/training_goal'
import UserProfile from '#models/user_profile'
import { getAdmin } from '#tests/helpers'
import { TrainingState } from '#domain/value_objects/planning_types'

test.group('Goals / CRUD objectifs', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  // AC #1 — créer un objectif avec distance, temps cible, date
  test('POST /planning/goals → crée un objectif actif', async ({ client, assert }) => {
    const user = await getAdmin()
    const response = await client
      .post('/planning/goals')
      .loginAs(user)
      .header('Accept', 'application/json')
      .json({ target_distance_km: 42.195, target_time_minutes: 240, event_date: '2027-04-01' })
    response.assertStatus(200)
    const body = response.body() as { goal: { status: string; targetDistanceKm: number } }
    assert.equal(body.goal.status, 'active')
    assert.equal(body.goal.targetDistanceKm, 42.195)
  })

  // AC #1 — distance obligatoire
  test('POST /planning/goals sans distance → 422', async ({ client }) => {
    const user = await getAdmin()
    const response = await client
      .post('/planning/goals')
      .loginAs(user)
      .header('Accept', 'application/json')
      .json({ target_time_minutes: 120 })
    response.assertStatus(422)
  })

  // AC #1 — trainingState passe à in_plan
  test('POST /planning/goals → trainingState devient in_plan', async ({ client, assert }) => {
    const user = await getAdmin()
    await client
      .post('/planning/goals')
      .loginAs(user)
      .header('Accept', 'application/json')
      .json({ target_distance_km: 10 })
    const profile = await UserProfile.findByOrFail('userId', user.id)
    assert.equal(profile.trainingState, TrainingState.InPlan)
  })

  // AC #2 — un seul objectif actif à la fois
  test('POST /planning/goals avec objectif actif existant → 422', async ({ client, assert }) => {
    const user = await getAdmin()
    await TrainingGoalModel.create({ userId: user.id, targetDistanceKm: 10, status: 'active' })
    const response = await client
      .post('/planning/goals')
      .loginAs(user)
      .header('Accept', 'application/json')
      .json({ target_distance_km: 21 })
    response.assertStatus(422)
    const body = response.body() as { message: string }
    assert.include(body.message, 'seul objectif actif')
  })

  // AC #3 — modifier un objectif
  test('PUT /planning/goals/:id → met à jour les champs', async ({ client, assert }) => {
    const user = await getAdmin()
    const goal = await TrainingGoalModel.create({
      userId: user.id,
      targetDistanceKm: 10,
      status: 'active',
    })
    const response = await client
      .put(`/planning/goals/${goal.id}`)
      .loginAs(user)
      .header('Accept', 'application/json')
      .json({ target_distance_km: 21.1 })
    response.assertStatus(200)
    const body = response.body() as { goal: { targetDistanceKm: number } }
    assert.equal(body.goal.targetDistanceKm, 21.1)
  })

  // AC #4 — abandonner passe le statut à 'abandoned'
  test('POST /planning/goals/:id/abandon → objectif passe à abandoned', async ({
    client,
    assert,
  }) => {
    const user = await getAdmin()
    const goal = await TrainingGoalModel.create({
      userId: user.id,
      targetDistanceKm: 42,
      status: 'active',
    })
    const response = await client
      .post(`/planning/goals/${goal.id}/abandon`)
      .loginAs(user)
      .header('Accept', 'application/json')
    response.assertStatus(200)
    await goal.refresh()
    assert.equal(goal.status, 'abandoned')
  })

  // AC #5 — trainingState repasse à idle après abandon
  test('POST /planning/goals/:id/abandon → trainingState repasse à idle', async ({
    client,
    assert,
  }) => {
    const user = await getAdmin()
    await UserProfile.query()
      .where('userId', user.id)
      .update({ trainingState: TrainingState.InPlan })
    const goal = await TrainingGoalModel.create({
      userId: user.id,
      targetDistanceKm: 42,
      status: 'active',
    })
    await client
      .post(`/planning/goals/${goal.id}/abandon`)
      .loginAs(user)
      .header('Accept', 'application/json')
    const profile = await UserProfile.findByOrFail('userId', user.id)
    assert.equal(profile.trainingState, TrainingState.Idle)
  })

  // non connecté → redirect
  test('POST /planning/goals non connecté → redirect /login', async ({ client }) => {
    const response = await client
      .post('/planning/goals')
      .json({ target_distance_km: 10 })
      .redirects(0)
    response.assertStatus(302)
  })

  // AC #3 — update sans authentification → 302
  test('PUT /planning/goals/:id non connecté → redirect /login', async ({ client }) => {
    const response = await client
      .put('/planning/goals/1')
      .json({ target_distance_km: 10 })
      .redirects(0)
    response.assertStatus(302)
  })
})
