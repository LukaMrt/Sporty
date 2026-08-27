export const ConnectorProvider = {
  Strava: 'strava',
  OpenWearables: 'open-wearables',
} as const

export type ConnectorProvider = (typeof ConnectorProvider)[keyof typeof ConnectorProvider]
