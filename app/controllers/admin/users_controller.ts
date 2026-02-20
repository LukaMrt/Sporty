import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListUsers from '#use_cases/admin/list_users'
import CreateUser from '#use_cases/admin/create_user'
import { createUserValidator } from '#validators/admin/create_user_validator'
import type { UserRole } from '#domain/value_objects/user_role'

@inject()
export default class UsersController {
  constructor(
    private listUsers: ListUsers,
    private createUser: CreateUser
  ) {}

  async index({ inertia }: HttpContext) {
    const users = await this.listUsers.listAllUsers()
    return inertia.render('Admin/Users/Index', { users })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('Admin/Users/Create')
  }

  async store({ request, response, session }: HttpContext) {
    const data = await request.validateUsing(createUserValidator)
    await this.createUser.execute({
      fullName: data.full_name,
      email: data.email,
      password: data.password,
      role: data.role as UserRole,
    })
    session.flash('success', 'Utilisateur créé')
    return response.redirect('/admin/users')
  }
}
