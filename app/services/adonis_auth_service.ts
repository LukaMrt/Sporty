import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { AuthService } from '#domain/interfaces/auth_service'
import { InvalidCredentialsError } from '#domain/errors/invalid_credentials_error'
import type { User } from '#domain/entities/user'
import UserModel from '#models/user'

@inject()
export class AdonisAuthService extends AuthService {
  private ctx: HttpContext

  constructor(ctx: HttpContext) {
    super()
    this.ctx = ctx
  }

  async login(user: User): Promise<void> {
    const model = await UserModel.findOrFail(user.id)
    await this.ctx.auth.use('web').login(model)
  }

  async attempt(email: string, password: string): Promise<number> {
    let user: UserModel
    try {
      user = await UserModel.verifyCredentials(email, password)
    } catch {
      throw new InvalidCredentialsError()
    }
    await this.ctx.auth.use('web').login(user)
    return user.id
  }

  async logout(): Promise<void> {
    await this.ctx.auth.use('web').logout()
  }
}
