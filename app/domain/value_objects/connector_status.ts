export const ConnectorStatus = {
  Connected: 'connected',
  Error: 'error',
} as const

export type ConnectorStatus = (typeof ConnectorStatus)[keyof typeof ConnectorStatus]
