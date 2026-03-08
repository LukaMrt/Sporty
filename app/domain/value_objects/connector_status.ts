export const ConnectorStatus = {
  Connected: 'connected',
  Error: 'error',
  Disconnected: 'disconnected',
} as const

export type ConnectorStatus = (typeof ConnectorStatus)[keyof typeof ConnectorStatus]
