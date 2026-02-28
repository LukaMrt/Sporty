import type { HttpContext } from '@adonisjs/core/http'
import { registerValidator } from '#validators/auth/register_validator'
import RegisterUser from '#use_cases/auth/register_user'
import { UserAlreadyExistsError } from '#domain/errors/user_already_exists_error'
import { inject } from '@adonisjs/core'

@inject()
export default class RegisterController {
  constructor(private registerUser: RegisterUser) {}

  async show({ inertia, response }: HttpContext) {
    try {
      await this.registerUser.show()
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        return response.redirect('/login')
      }
      throw error
    }
    return inertia.render('Auth/Register', {})
  }

  async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator)
    try {
      await this.registerUser.registerUser({
        fullName: data.full_name,
        email: data.email,
        password: data.password,
      })
      return response.redirect('/')
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        return response.abort('Inscription fermée', 403)
      }
      throw error
    }
  }
}
