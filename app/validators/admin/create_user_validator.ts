import vine, { SimpleMessagesProvider } from '@vinejs/vine'

export const createUserValidator = vine.compile(
  vine.object({
    full_name: vine.string().trim().minLength(2),
    email: vine.string().email().normalizeEmail().unique({
      table: 'users',
      column: 'email',
    }),
    password: vine.string().minLength(8),
    role: vine.string().in(['user', 'admin']),
  })
)

createUserValidator.messagesProvider = new SimpleMessagesProvider({
  'email.database.unique': 'Cet email est déjà utilisé',
})
