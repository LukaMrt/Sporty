import vine, { SimpleMessagesProvider } from '@vinejs/vine'

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
  })
)

updateUserValidator.messagesProvider = new SimpleMessagesProvider({
  'email.database.unique': 'Cet email est déjà utilisé',
})
