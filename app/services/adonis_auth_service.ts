import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { AuthService } from '#domain/interfaces/auth_service'
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
}
