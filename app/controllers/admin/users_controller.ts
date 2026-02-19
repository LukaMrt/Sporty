import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListUsers from '#use_cases/admin/list_users'

@inject()
export default class UsersController {
  constructor(private listUsers: ListUsers) {}

  async index({ inertia }: HttpContext) {
    const users = await this.listUsers.listAllUsers()
    return inertia.render('Admin/Users/Index', { users })
  }
}
