import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import { getAdmin, SEEDED_ADMIN_EMAIL, SEEDED_PASSWORD } from '#tests/helpers'

test.group('Profile / Changement de mot de passe', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('PUT /profile/password non connecté → redirect /login', async ({ client }) => {
    const response = await client
      .put('/profile/password')
      .form({
        current_password: SEEDED_PASSWORD,
        new_password: 'newpass123',
        new_password_confirmation: 'newpass123',
      })
      .redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('PUT /profile/password valide → mot de passe changé', async ({ client }) => {
    const user = await getAdmin()
    const newPassword = 'mynewpassword'

    const response = await client
      .put('/profile/password')
      .form({
        current_password: SEEDED_PASSWORD,
        new_password: newPassword,
        new_password_confirmation: newPassword,
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    // Vérifier que le nouveau mot de passe fonctionne
    await User.verifyCredentials(SEEDED_ADMIN_EMAIL, newPassword)
  })

  test('PUT /profile/password ancien mdp incorrect → erreur', async ({ client }) => {
    const user = await getAdmin()

    const response = await client
      .put('/profile/password')
      .form({
        current_password: 'wrongpassword',
        new_password: 'newpass123',
        new_password_confirmation: 'newpass123',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('errorsBag', {
      current_password: 'Mot de passe actuel incorrect',
    })
  })

  test('PUT /profile/password confirmation ne match pas → erreur validation', async ({
    client,
  }) => {
    const user = await getAdmin()

    const response = await client
      .put('/profile/password')
      .form({
        current_password: SEEDED_PASSWORD,
        new_password: 'newpass123',
        new_password_confirmation: 'differentpassword',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('errorsBag', {
      E_VALIDATION_ERROR: 'The form could not be saved. Please check the errors below.',
    })
  })

  test('PUT /profile/password nouveau mdp < 8 chars → erreur validation', async ({ client }) => {
    const user = await getAdmin()

    const response = await client
      .put('/profile/password')
      .form({
        current_password: SEEDED_PASSWORD,
        new_password: 'short',
        new_password_confirmation: 'short',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('errorsBag', {
      E_VALIDATION_ERROR: 'The form could not be saved. Please check the errors below.',
    })
  })
})
