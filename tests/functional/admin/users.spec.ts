import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getUser, getAdmin } from '#tests/helpers'

test.group('Admin / Users', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('GET /admin/users non connecté → redirect /login (AC#4)', async ({ client }) => {
    const response = await client.get('/admin/users').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /admin/users connecté en user simple → 403 (AC#4)', async ({ client }) => {
    const user = await getUser()

    const response = await client.get('/admin/users').loginAs(user).redirects(0)

    response.assertStatus(403)
  })

  test('GET /admin/users connecté en admin → 200 avec liste (AC#1, #3)', async ({ client }) => {
    const admin = await getAdmin()

    const response = await client.get('/admin/users').loginAs(admin)

    response.assertStatus(200)
  })
})
