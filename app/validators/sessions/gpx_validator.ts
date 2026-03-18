import vine from '@vinejs/vine'

export const parseGpxValidator = vine.create(
  vine.object({
    gpx_file: vine.file({
      extnames: ['gpx'],
      size: '10mb',
    }),
  })
)
