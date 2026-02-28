import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListUsers from '#use_cases/admin/list_users'
import CreateUser from '#use_cases/admin/create_user'
import GetUser from '#use_cases/admin/get_user'
import UpdateUser from '#use_cases/admin/update_user'
import ResetUserPassword from '#use_cases/admin/reset_user_password'
import DeleteUser from '#use_cases/admin/delete_user'
import { createUserValidator } from '#validators/admin/create_user_validator'
import { updateUserValidator } from '#validators/admin/update_user_validator'
import { resetPasswordValidator } from '#validators/admin/reset_password_validator'
import { UserNotFoundError } from '#domain/errors/user_not_found_error'
import { CannotDeleteSelfError } from '#domain/errors/cannot_delete_self_error'
import type { UserRole } from '#domain/value_objects/user_role'

@inject()
export default class UsersController {
  constructor(
    private listUsers: ListUsers,
    private createUser: CreateUser,
    private getUser: GetUser,
    private updateUser: UpdateUser,
    private resetUserPassword: ResetUserPassword,
    private deleteUser: DeleteUser
  ) {}

  async index({ inertia }: HttpContext) {
    const users = await this.listUsers.listAllUsers()
    return inertia.render('Admin/Users/Index', { users })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('Admin/Users/Create', {})
  }

  async store({ request, response, session, i18n }: HttpContext) {
    const data = await request.validateUsing(createUserValidator)
    await this.createUser.execute({
      fullName: data.full_name,
      email: data.email,
      password: data.password,
      role: data.role as UserRole,
    })
    session.flash('success', i18n.t('admin.flash.userCreated'))
    return response.redirect('/admin/users')
  }

  async edit({ params, inertia, response, session, i18n }: HttpContext) {
    try {
      const user = await this.getUser.execute(Number(params.id))
      return inertia.render('Admin/Users/Edit', { user })
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        session.flash('error', i18n.t('admin.flash.notFound'))
        return response.redirect('/admin/users')
      }
      throw error
    }
  }

  async update({ params, request, response, session, i18n }: HttpContext) {
    const id = Number(params.id)
    try {
      const data = await request.validateUsing(updateUserValidator, {
        meta: { userId: id },
      })
      await this.updateUser.execute(id, {
        fullName: data.full_name,
        email: data.email,
      })
      session.flash('success', i18n.t('admin.flash.userUpdated'))
      return response.redirect(`/admin/users/${id}/edit`)
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        session.flash('error', i18n.t('admin.flash.notFound'))
        return response.redirect('/admin/users')
      }
      throw error
    }
  }

  async resetPassword({ params, request, response, session, i18n }: HttpContext) {
    const id = Number(params.id)
    try {
      const data = await request.validateUsing(resetPasswordValidator)
      await this.resetUserPassword.execute(id, data.password)
      session.flash('success', i18n.t('admin.flash.passwordReset'))
      return response.redirect(`/admin/users/${id}/edit`)
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        session.flash('error', i18n.t('admin.flash.notFound'))
        return response.redirect('/admin/users')
      }
      throw error
    }
  }

  async destroy({ params, response, session, auth, i18n }: HttpContext) {
    const id = Number(params.id)
    const requesterId = auth.user!.id
    try {
      await this.deleteUser.execute(id, requesterId)
      session.flash('success', i18n.t('admin.flash.userDeleted'))
      return response.redirect('/admin/users')
    } catch (error) {
      if (error instanceof CannotDeleteSelfError) {
        session.flash('error', error.message)
        return response.redirect(`/admin/users/${id}/edit`)
      }
      if (error instanceof UserNotFoundError) {
        session.flash('error', i18n.t('admin.flash.notFound'))
        return response.redirect('/admin/users')
      }
      throw error
    }
  }
}
