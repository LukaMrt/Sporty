export const ImportActivityStatus = {
  New: 'new',
  Imported: 'imported',
  Ignored: 'ignored',
  Failed: 'failed',
} as const

export type ImportActivityStatus = (typeof ImportActivityStatus)[keyof typeof ImportActivityStatus]
