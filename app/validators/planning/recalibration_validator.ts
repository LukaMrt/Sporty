import vine from '@vinejs/vine'

export const vdotDownProposalValidator = vine.create(
  vine.object({
    action: vine.enum(['confirm', 'dismiss']),
  })
)
