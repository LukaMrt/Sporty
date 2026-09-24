import { test } from '@japa/runner'
import LoginUser from '#use_cases/auth/login_user'
import { InvalidCredentialsError } from '#domain/errors/invalid_credentials_error'
import { NoRegisteredUserError } from '#domain/errors/no_registered_user_error'
import { makeMockUserRepository } from '#tests/helpers/mock_user_repository'
import { makeMockUserProfileRepository } from '#tests/helpers/mock_user_profile_repository'
import { makeMockAuthService } from '#tests/helpers/mock_auth_service'
import type { UserProfile } from '#domain/entities/user_profile'

test.group('LoginUser — use case', () => {
  test('credentials valides → session ouverte, locale du profil renvoyée', async ({ assert }) => {
    let attemptedWith = ''
    const authService = makeMockAuthService({
      attempt: async (email) => {
        attemptedWith = email
        return 7
      },
    })
    const profiles = makeMockUserProfileRepository({
      findByUserId: async (userId) =>
        userId === 7
          ? ({ userId: 7, preferences: { locale: 'en' } } as UserProfile)
          : null,
    })
    const useCase = new LoginUser(authService, makeMockUserRepository(), profiles)

    const result = await useCase.execute('user@example.com', 'validpassword')

    assert.equal(attemptedWith, 'user@example.com')
    assert.equal(result.locale, 'en')
  })

  test('sans profil → locale null', async ({ assert }) => {
    const useCase = new LoginUser(
      makeMockAuthService(),
      makeMockUserRepository(),
      makeMockUserProfileRepository({ findByUserId: async () => null })
    )

    const result = await useCase.execute('user@example.com', 'validpassword')

    assert.isNull(result.locale)
  })

  test('credentials invalides → lance InvalidCredentialsError', async ({ assert }) => {
    const authService = makeMockAuthService({
      attempt: async () => {
        throw new InvalidCredentialsError()
      },
    })
    const useCase = new LoginUser(
      authService,
      makeMockUserRepository(),
      makeMockUserProfileRepository()
    )

    await assert.rejects(
      () => useCase.execute('user@example.com', 'wrongpassword'),
      InvalidCredentialsError
    )
  })

  test("ensureUsersExist — des users existent → pas d'erreur", async () => {
    const userRepository = makeMockUserRepository({ countAll: async () => 1 })
    const useCase = new LoginUser(
      makeMockAuthService(),
      userRepository,
      makeMockUserProfileRepository()
    )

    await useCase.ensureUsersExist()
  })

  test('ensureUsersExist — aucun user → lance NoRegisteredUserError', async ({ assert }) => {
    const userRepository = makeMockUserRepository({ countAll: async () => 0 })
    const useCase = new LoginUser(
      makeMockAuthService(),
      userRepository,
      makeMockUserProfileRepository()
    )

    await assert.rejects(() => useCase.ensureUsersExist(), NoRegisteredUserError)
  })
})
