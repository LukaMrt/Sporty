import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import { getAdmin, getUser, SEEDED_ADMIN_EMAIL } from '#tests/helpers'

test.group('Admin / Gérer utilisateur', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // ─── GET edit ────────────────────────────────────────────────────────────────

  test('GET /admin/users/:id/edit non connecté → redirect /login', async ({ client }) => {
    const admin = await getAdmin()
    const response = await client.get(`/admin/users/${admin.id}/edit`).redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /admin/users/:id/edit en user simple → 403', async ({ client }) => {
    const admin = await getAdmin()
    const user = await getUser()
    const response = await client.get(`/admin/users/${admin.id}/edit`).loginAs(user).redirects(0)
    response.assertStatus(403)
  })

  test('GET /admin/users/:id/edit en admin → 200', async ({ client }) => {
    const admin = await getAdmin()
    const response = await client.get(`/admin/users/${admin.id}/edit`).loginAs(admin)
    response.assertStatus(200)
  })

  // ─── PUT update ───────────────────────────────────────────────────────────────

  test('PUT /admin/users/:id en user simple → 403', async ({ client }) => {
    const admin = await getAdmin()
    const user = await getUser()
    const response = await client
      .put(`/admin/users/${admin.id}`)
      .form({ full_name: 'Nouveau', email: 'nouveau@example.com' })
      .loginAs(user)
      .redirects(0)
    response.assertStatus(403)
  })

  test('PUT /admin/users/:id valide → user modifié en DB', async ({ client, assert }) => {
    const admin = await getAdmin()
    const user = await getUser()

    const response = await client
      .put(`/admin/users/${user.id}`)
      .form({ full_name: 'Nom Modifié', email: 'modifie@example.com' })
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)

    const updated = await User.findOrFail(user.id)
    assert.equal(updated.fullName, 'Nom Modifié')
    assert.equal(updated.email, 'modifie@example.com')
  })

  test('PUT /admin/users/:id email dupliqué → erreur + pas de modification', async ({
    client,
    assert,
  }) => {
    const admin = await getAdmin()
    const user = await getUser()
    const originalEmail = user.email

    const response = await client
      .put(`/admin/users/${user.id}`)
      .form({ full_name: user.fullName, email: SEEDED_ADMIN_EMAIL })
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)

    const unchanged = await User.findOrFail(user.id)
    assert.equal(unchanged.email, originalEmail)
  })

  // ─── PUT password ─────────────────────────────────────────────────────────────

  test('PUT /admin/users/:id/password valide → password mis à jour', async ({ client, assert }) => {
    const admin = await getAdmin()
    const user = await getUser()
    const oldPasswordHash = user.password

    const response = await client
      .put(`/admin/users/${user.id}/password`)
      .form({ password: 'nouveaumotdepasse123' })
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)

    const updated = await User.findOrFail(user.id)
    assert.notEqual(updated.password, oldPasswordHash)
    assert.notEqual(updated.password, 'nouveaumotdepasse123')

    // Vérification via verifyCredentials
    const verified = await User.verifyCredentials(user.email, 'nouveaumotdepasse123')
    assert.equal(verified.id, user.id)
  })

  test('PUT /admin/users/:id/password trop court → erreur', async ({ client, assert }) => {
    const admin = await getAdmin()
    const user = await getUser()
    const oldHash = user.password

    const response = await client
      .put(`/admin/users/${user.id}/password`)
      .form({ password: 'court' })
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)

    const unchanged = await User.findOrFail(user.id)
    assert.equal(unchanged.password, oldHash)
  })

  test('PUT /admin/users/:id/password en user simple → 403', async ({ client }) => {
    const admin = await getAdmin()
    const user = await getUser()

    const response = await client
      .put(`/admin/users/${admin.id}/password`)
      .form({ password: 'nouveaumotdepasse123' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(403)
  })

  // ─── DELETE ───────────────────────────────────────────────────────────────────

  test('DELETE /admin/users/:id en user simple → 403', async ({ client }) => {
    const user = await getUser()

    const response = await client.delete(`/admin/users/${user.id}`).loginAs(user).redirects(0)

    response.assertStatus(403)
  })

  test('DELETE /admin/users/:id valide → user supprimé', async ({ client, assert }) => {
    const admin = await getAdmin()
    const user = await getUser()

    const response = await client.delete(`/admin/users/${user.id}`).loginAs(admin).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/admin/users')

    const deleted = await User.find(user.id)
    assert.isNull(deleted)
  })

  test('DELETE /admin/users/:id self-delete → redirect avec erreur flash', async ({
    client,
    assert,
  }) => {
    const admin = await getAdmin()

    const response = await client.delete(`/admin/users/${admin.id}`).loginAs(admin).redirects(0)

    response.assertStatus(302)

    // L'admin est toujours en base
    const stillExists = await User.find(admin.id)
    assert.isNotNull(stillExists)
  })
})
