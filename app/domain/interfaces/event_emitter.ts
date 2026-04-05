export abstract class EventEmitter {
  abstract emit(event: string, data: Record<string, unknown>): Promise<void>
}
