import vine from '@vinejs/vine'
import { UserRole } from '#domain/value_objects/user_role'

export const createUserValidator = vine.create(
  vine.object({
    full_name: vine.string().trim().minLength(2),
    email: vine.string().email().normalizeEmail().unique({
      table: 'users',
      column: 'email',
    }),
    password: vine.string().minLength(8),
    role: vine.enum(Object.values(UserRole)),
  })
)
