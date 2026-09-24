import vine from '@vinejs/vine'
import { UserRole } from '#domain/value_objects/user_role'

export const updateUserValidator = vine.create(
  vine.object({
    full_name: vine.string().trim().minLength(2).optional(),
    email: vine
      .string()
      .email()
      .normalizeEmail()
      .unique(async (db, value, field) => {
        const userId = field.meta.userId as number
        const row: unknown = await db
          .from('users')
          .where('email', value)
          .whereNot('id', userId)
          .first()
        return !row
      })
      .optional(),
    role: vine.enum(Object.values(UserRole)).optional(),
  })
)
