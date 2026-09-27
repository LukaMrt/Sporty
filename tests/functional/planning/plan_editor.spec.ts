import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient } from '@japa/api-client'
import type User from '#models/user'
import TrainingPlan from '#models/training_plan'
import PlannedSession from '#models/planned_session'
import PlannedWeek from '#models/planned_week'
import { getAdmin } from '#tests/helpers'

const DOCUMENT = {
  version: 1,
  mode: 'replace',
  plan: { name: 'Plan Claude', start_date: '2026-10-05', notes: 'Régularité avant tout' },
  weeks: [
    {
      week: 1,
      phase: 'Base',
      sessions: [
        {
          day: 'tuesday',
          sport: 'running',
          type: 'interval',
          title: '6 × 1000 m',
          duration_minutes: 60,
        },
        {
          day: 'tuesday',
          sport: 'strength',
          type: 'strength',
          duration_minutes: 30,
          exercises: [{ name: 'Squat', sets: 3, reps: '10' }],
        },
        {
          day: 'saturday',
          sport: 'cycling',
          type: 'long_run',
          duration_minutes: 120,
          power_watts: 170,
        },
      ],
    },
  ],
}

const inertia = (client: ApiClient, url: string, user: User) =>
  client.get(url).loginAs(user).header('X-Inertia', 'true').header('X-Inertia-Version', '1')

async function importPlan(client: ApiClient, user: User, document: unknown = DOCUMENT) {
  return client
    .post('/planning/import')
    .loginAs(user)
    .header('Accept', 'application/json')
    .json({ document: typeof document === 'string' ? document : JSON.stringify(document) })
}

test.group('Éditeur de plan (Claude)', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('page d’import et prompt pour Claude', async ({ client, assert }) => {
    const user = await getAdmin()
    const page = await inertia(client, '/planning/import', user)
    page.assertStatus(200)
    page.assertBodyContains({ component: 'Planning/Import' })

    const prompt = await client.get('/planning/prompt?mode=create').loginAs(user)
    prompt.assertStatus(200)
    assert.include(prompt.text(), '`duration_minutes`')
    assert.include(prompt.text(), '`strength`')
  })

  test('document invalide → 422 avec toutes les erreurs, rien n’est créé', async ({
    client,
    assert,
  }) => {
    const user = await getAdmin()
    const before = await TrainingPlan.query().where('userId', user.id).count('* as total')
    const response = await importPlan(client, user, {
      ...DOCUMENT,
      weeks: [{ week: 1, sessions: [{ day: 'mardi', sport: 'yoga', type: 'easy' }] }],
    })
    response.assertStatus(422)
    const body = response.body() as { errors: { path: string; code: string }[] }
    assert.isTrue(
      body.errors.some((e) => e.path === 'weeks[0].sessions[0].day' && e.code === 'invalid_value')
    )
    assert.isTrue(body.errors.some((e) => e.path === 'weeks[0].sessions[0].duration_minutes'))
    const after = await TrainingPlan.query().where('userId', user.id).count('* as total')
    assert.equal(after[0].$extras.total, before[0].$extras.total)
  })

  test('import, affichage dans Planning, export identique', async ({ client, assert }) => {
    const user = await getAdmin()
    const response = await importPlan(client, user)
    response.assertStatus(200)

    const plan = await TrainingPlan.query()
      .where('userId', user.id)
      .where('status', 'active')
      .firstOrFail()
    assert.equal(plan.source, 'imported')
    assert.equal(plan.name, 'Plan Claude')
    const sessions = await PlannedSession.query().where('planId', plan.id).orderBy('order_in_day')
    assert.sameMembers(
      sessions.map((s) => s.sportSlug),
      ['running', 'strength', 'cycling']
    )
    assert.equal(sessions.find((s) => s.sportSlug === 'strength')!.exercises![0].name, 'Squat')

    const page = await inertia(client, '/planning', user)
    page.assertStatus(200)
    page.assertBodyContains({ component: 'Planning/Index' })

    const exported = await client.get('/planning/export.json').loginAs(user)
    exported.assertStatus(200)
    const body = exported.body() as { plan: { name: string }; weeks: { sessions: unknown[] }[] }
    assert.equal(body.plan.name, 'Plan Claude')
    assert.lengthOf(body.weeks[0].sessions, 3)
  })

  test('édition : séance ajoutée, modifiée, supprimée ; semaine ajoutée et modifiée', async ({
    client,
    assert,
  }) => {
    const user = await getAdmin()
    await importPlan(client, user)
    const plan = await TrainingPlan.query()
      .where('userId', user.id)
      .where('status', 'active')
      .firstOrFail()

    const fields = {
      dayOfWeek: 4,
      sportSlug: 'swimming',
      sessionType: 'technique',
      title: 'Éducatifs crawl',
      description: '10 × 50 m éducatifs',
      targetDurationMinutes: 45,
      targetDistanceKm: 1.5,
      intensityZone: 'z2',
      targetPacePerKm: null,
      targetPacePer100m: '2:05',
      targetPowerWatts: null,
      targetRpe: 4,
      intervals: [
        {
          type: 'work',
          durationMinutes: null,
          distanceMeters: 50,
          targetPace: null,
          intensityZone: 'z2',
          repetitions: 10,
          recoveryDurationMinutes: 0.25,
          recoveryType: 'rest',
          notes: 'Rattrapé',
        },
      ],
      exercises: null,
    }
    const created = await client
      .post('/planning/weeks/1/sessions')
      .loginAs(user)
      .json(fields)
      .redirects(0)
    created.assertStatus(302)
    const swim = await PlannedSession.query()
      .where('planId', plan.id)
      .where('sportSlug', 'swimming')
      .firstOrFail()
    assert.equal(swim.title, 'Éducatifs crawl')
    assert.equal(swim.intervals![0].notes, 'Rattrapé')

    await client
      .put(`/planning/sessions/${swim.id}/details`)
      .loginAs(user)
      .json({ ...fields, targetDurationMinutes: 60 })
      .redirects(0)
    await swim.refresh()
    assert.equal(swim.targetDurationMinutes, 60)

    await client.delete(`/planning/sessions/${swim.id}`).loginAs(user).redirects(0)
    assert.isNull(await PlannedSession.find(swim.id))

    await client.post('/planning/weeks').loginAs(user).json({ copyFromWeek: 1 }).redirects(0)
    await client
      .put('/planning/weeks/2')
      .loginAs(user)
      .json({ phaseLabel: 'Développement', notes: 'On monte en charge', isRecoveryWeek: false })
      .redirects(0)
    const week2 = await PlannedWeek.query()
      .where('planId', plan.id)
      .where('weekNumber', 2)
      .firstOrFail()
    assert.equal(week2.phaseLabel, 'Développement')
    assert.equal(week2.notes, 'On monte en charge')
    const copies = await PlannedSession.query().where('planId', plan.id).where('weekNumber', 2)
    assert.lengthOf(copies, 3)
  })

  test('champs invalides refusés par le validateur', async ({ client }) => {
    const user = await getAdmin()
    await importPlan(client, user)
    const response = await client
      .post('/planning/weeks/1/sessions')
      .loginAs(user)
      .header('Accept', 'application/json')
      .json({ dayOfWeek: 9, sportSlug: 'running', sessionType: 'fartlek' })
    response.assertStatus(422)
  })
})
