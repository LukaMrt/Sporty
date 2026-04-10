import emitter from '@adonisjs/core/services/emitter'
import { EventEmitter } from '#domain/interfaces/event_emitter'

export class AdonisEventEmitter extends EventEmitter {
  async emit(event: string, data: Record<string, unknown>): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await emitter.emit(event as any, data as any)
  }
}
