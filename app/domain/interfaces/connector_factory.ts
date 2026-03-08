import type { Connector } from '#domain/interfaces/connector'

export abstract class ConnectorFactory {
  abstract make(userId: number): Promise<Connector | null>
}
