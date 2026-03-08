export const ImportActivityStatus = {
  New: 'new',
  Imported: 'imported',
  Ignored: 'ignored',
} as const

export type ImportActivityStatus = (typeof ImportActivityStatus)[keyof typeof ImportActivityStatus]
