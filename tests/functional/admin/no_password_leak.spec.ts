import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getAdmin, getUser } from '#tests/helpers'

/**
 * Les props Inertia sont sérialisées dans le HTML (`data-page`) :
 * aucun hash de mot de passe ne doit jamais y apparaître.
 */
test.group('Admin / Pas de fuite de hash de mot de passe', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('GET /admin/users ne contient aucun hash scrypt', async ({ client, assert }) => {
    const admin = await getAdmin()
    const response = await client.get('/admin/users').loginAs(admin)
    response.assertStatus(200)
    assert.notInclude(response.text(), '$scrypt$')
    assert.notInclude(response.text(), '&quot;password&quot;')
  })

  test('GET /admin/users/:id/edit ne contient aucun hash scrypt', async ({ client, assert }) => {
    const admin = await getAdmin()
    const user = await getUser()
    const response = await client.get(`/admin/users/${user.id}/edit`).loginAs(admin)
    response.assertStatus(200)
    assert.notInclude(response.text(), '$scrypt$')
  })
})
