import emitter from '@adonisjs/core/services/emitter'

declare module '@adonisjs/core/types' {
  interface EventsList {
    'session:completed': { sessionId: number; userId: number }
  }
}

export default emitter
