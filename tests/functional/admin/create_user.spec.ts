import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import { getAdmin, getUser, SEEDED_ADMIN_EMAIL } from '#tests/helpers'

test.group('Admin / Créer utilisateur', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('POST /admin/users non connecté → redirect /login', async ({ client }) => {
    const response = await client
      .post('/admin/users')
      .form({ full_name: 'Test', email: 'test@example.com', password: 'password123', role: 'user' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /admin/users en user simple → 403', async ({ client }) => {
    const user = await getUser()

    const response = await client
      .post('/admin/users')
      .form({ full_name: 'Test', email: 'test@example.com', password: 'password123', role: 'user' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(403)
  })

  test('POST /admin/users valide avec rôle user → crée le user et redirige', async ({
    client,
    assert,
  }) => {
    const admin = await getAdmin()

    const response = await client
      .post('/admin/users')
      .form({
        full_name: 'Nouveau User',
        email: 'nouveau@example.com',
        password: 'password123',
        role: 'user',
      })
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/admin/users')

    const created = await User.findBy('email', 'nouveau@example.com')
    assert.isNotNull(created)
    assert.equal(created!.fullName, 'Nouveau User')
    assert.equal(created!.role, 'user')
    assert.isFalse(created!.onboardingCompleted)
    assert.notEqual(created!.password, 'password123')
  })

  test('POST /admin/users valide avec rôle admin → crée un admin', async ({ client, assert }) => {
    const admin = await getAdmin()

    const response = await client
      .post('/admin/users')
      .form({
        full_name: 'Nouvel Admin',
        email: 'newadmin@example.com',
        password: 'password123',
        role: 'admin',
      })
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)

    const created = await User.findBy('email', 'newadmin@example.com')
    assert.equal(created!.role, 'admin')
  })

  test('POST /admin/users email déjà utilisé → redirect back avec erreur', async ({
    client,
    assert,
  }) => {
    const admin = await getAdmin()

    const response = await client
      .post('/admin/users')
      .form({
        full_name: 'Doublon',
        email: SEEDED_ADMIN_EMAIL,
        password: 'password123',
        role: 'user',
      })
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    const duplicates = await User.query().where('email', SEEDED_ADMIN_EMAIL)
    assert.equal(duplicates.length, 1)
  })

  test('POST /admin/users email invalide → redirect back avec erreur', async ({
    client,
    assert,
  }) => {
    const admin = await getAdmin()

    const response = await client
      .post('/admin/users')
      .form({ full_name: 'Test', email: 'pas-un-email', password: 'password123', role: 'user' })
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    assert.isNull(await User.findBy('email', 'pas-un-email'))
  })

  test('POST /admin/users mot de passe trop court → redirect back avec erreur', async ({
    client,
    assert,
  }) => {
    const admin = await getAdmin()

    const response = await client
      .post('/admin/users')
      .form({ full_name: 'Test', email: 'test@example.com', password: 'court', role: 'user' })
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    assert.isNull(await User.findBy('email', 'test@example.com'))
  })

  test('POST /admin/users nom vide → redirect back avec erreur', async ({ client, assert }) => {
    const admin = await getAdmin()

    const response = await client
      .post('/admin/users')
      .form({ full_name: '', email: 'test@example.com', password: 'password123', role: 'user' })
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    assert.isNull(await User.findBy('email', 'test@example.com'))
  })

  test('POST /admin/users rôle invalide → redirect back avec erreur', async ({
    client,
    assert,
  }) => {
    const admin = await getAdmin()

    const response = await client
      .post('/admin/users')
      .form({
        full_name: 'Test',
        email: 'test@example.com',
        password: 'password123',
        role: 'superadmin',
      })
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    assert.isNull(await User.findBy('email', 'test@example.com'))
  })

  test('GET /admin/users/create en admin → 200', async ({ client }) => {
    const admin = await getAdmin()

    const response = await client.get('/admin/users/create').loginAs(admin)

    response.assertStatus(200)
  })

  test('GET /admin/users/create non connecté → redirect /login', async ({ client }) => {
    const response = await client.get('/admin/users/create').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
