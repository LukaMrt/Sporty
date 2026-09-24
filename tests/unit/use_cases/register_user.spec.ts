import { test } from '@japa/runner'
import RegisterUser from '#use_cases/auth/register_user'
import { UserAlreadyExistsError } from '#domain/errors/user_already_exists_error'
import { makeMockUserRepository } from '#tests/helpers/mock_user_repository'
import { makeMockAuthService } from '#tests/helpers/mock_auth_service'
import type { NewUser, User } from '#domain/entities/user'

test.group('RegisterUser — use case', () => {
  test('premier utilisateur → rôle admin créé et connecté', async ({ assert }) => {
    let loggedIn: User | null = null
    const useCase = new RegisterUser(
      makeMockUserRepository(),
      makeMockAuthService({
        login: async (user) => {
          loggedIn = user
        },
      })
    )

    const user = await useCase.registerUser({
      fullName: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
    })

    assert.equal(user.role, 'admin')
    assert.equal(loggedIn!.email, 'admin@example.com')
  })

  test('utilisateur déjà existant (création refusée atomiquement) → UserAlreadyExistsError', async ({
    assert,
  }) => {
    const repo = makeMockUserRepository({ createFirstUser: async () => null })
    const useCase = new RegisterUser(repo, makeMockAuthService())

    await assert.rejects(
      () =>
        useCase.registerUser({
          fullName: 'Test',
          email: 'test@example.com',
          password: 'password123',
        }),
      UserAlreadyExistsError
    )
  })

  test('show() refuse si un utilisateur existe déjà', async ({ assert }) => {
    const repo = makeMockUserRepository({ countAll: async () => 1 })
    const useCase = new RegisterUser(repo, makeMockAuthService())

    await assert.rejects(() => useCase.show(), UserAlreadyExistsError)
  })

  test("l'entité renvoyée ne contient jamais le mot de passe", async ({ assert }) => {
    const captured: NewUser[] = []
    const repo = makeMockUserRepository({
      createFirstUser: async (data) => {
        captured.push(data)
        return {
          id: 1,
          createdAt: '',
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          onboardingCompleted: data.onboardingCompleted,
        }
      },
    })
    const useCase = new RegisterUser(repo, makeMockAuthService())

    const user = await useCase.registerUser({
      fullName: 'Test',
      email: 'test@example.com',
      password: 'plaintext_password',
    })

    // Transmis en clair au repository (hashé par le mixin withAuthFinder)
    assert.equal(captured[0].password, 'plaintext_password')
    assert.notProperty(user, 'password')
  })
})
