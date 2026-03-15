export const ImportSessionStatus = {
  New: 'new',
  Imported: 'imported',
  Ignored: 'ignored',
  Failed: 'failed',
} as const

export type ImportSessionStatus = (typeof ImportSessionStatus)[keyof typeof ImportSessionStatus]
