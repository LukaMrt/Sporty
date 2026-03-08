export const ConnectorProvider = {
  Strava: 'strava',
} as const

export type ConnectorProvider = (typeof ConnectorProvider)[keyof typeof ConnectorProvider]
