import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getUser, getUser2 } from '#tests/helpers'
import Session from '#models/session'
import type User from '#models/user'
import type { ApiClient } from '@japa/api-client'
import ImportedPlanEntry from '#models/imported_plan_entry'

test.group('Analyse', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('GET /analysis non connecté → /login', async ({ client }) => {
    const response = await client.get('/analysis').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /analysis rend la page pour chaque période', async ({ client }) => {
    const user = await getUser()
    for (const range of ['3m', '6m', '12m', 'all']) {
      const response = await client
        .get(`/analysis?range=${range}`)
        .loginAs(user)
        .header('X-Inertia', 'true')
        .header('X-Inertia-Version', '1')
      response.assertStatus(200)
      response.assertBodyContains({ component: 'Analysis/Index' })
    }
  })

  test('export CSV des séances : uniquement les séances de l’utilisateur', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const response = await client.get('/export/sessions.csv').loginAs(user)
    response.assertStatus(200)
    const lines = response.text().trim().split('\n')
    const own = await Session.query().where('userId', user.id).whereNull('deletedAt')
    assert.equal(lines.length - 1, own.length)
  })

  test('GPX d’une séance d’un autre utilisateur → 404', async ({ client }) => {
    const user = await getUser()
    const other = await getUser2()
    const session = await Session.query().where('userId', other.id).firstOrFail()
    const response = await client.get(`/sessions/${session.id}/gpx`).loginAs(user)
    response.assertStatus(404)
  })

  test('webhook sans signature valide → 401', async ({ client }) => {
    const response = await client.post('/webhooks/open-wearables').json({ type: 'workout.created' })
    response.assertStatus(401)
  })
})

test.group('Analyse / vues complémentaires', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  const inertia = (client: ApiClient, url: string, user: User) =>
    client.get(url).loginAs(user).header('X-Inertia', 'true').header('X-Inertia-Version', '1')

  test('carte, bilan et plan répondent', async ({ client }) => {
    const user = await getUser()
    for (const [url, component] of [
      ['/analysis/map', 'Analysis/Map'],
      ['/analysis/report?period=month', 'Analysis/Report'],
      ['/plan', 'Plan/Index'],
    ]) {
      const response = await inertia(client, url, user)
      response.assertStatus(200)
      response.assertBodyContains({ component })
    }
  })

  test('comparaison : séances d’un autre utilisateur refusées', async ({ client }) => {
    const user = await getUser()
    const other = await getUser2()
    const mine = await Session.query().where('userId', user.id).firstOrFail()
    const theirs = await Session.query().where('userId', other.id).firstOrFail()
    const response = await client
      .get(`/analysis/compare?ids[]=${mine.id}&ids[]=${theirs.id}`)
      .loginAs(user)
    response.assertStatus(404)
  })

  test('import de plan puis affichage', async ({ client, assert }) => {
    const user = await getUser()
    const response = await client
      .post('/plan')
      .form({ plan: '- 2026-03-02 : Footing 45 min' })
      .loginAs(user)
      .redirects(0)
    response.assertStatus(302)
    const rows = await ImportedPlanEntry.query().where('userId', user.id)
    assert.lengthOf(rows, 1)
  })
})
