import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import type { WeekSummary } from '#domain/value_objects/week_summary'

declare module '@adonisjs/core/types' {
  interface EventsList {
    'session:completed': { sessionId: number; userId: number }
    'week:completed': { userId: number; planId: number; weekSummary: WeekSummary }
    'plan:vdot_increased': { userId: number; planId: number; oldVdot: number; newVdot: number }
    'profile:hr_changed': { userId: number }
  }
}

emitter.on('session:completed', [
  () => import('#listeners/detect_week_completion_listener'),
  'handle',
])

emitter.on('week:completed', [() => import('#listeners/recalibrate_plan_listener'), 'handle'])

emitter.on('profile:hr_changed', [
  () => import('#listeners/recompute_session_metrics_listener'),
  'handle',
])

// Une erreur dans un listener ne doit ni faire échouer la requête d'origine,
// ni passer inaperçue
emitter.onError((event, error: unknown) => {
  logger.error({ err: error, event: String(event) }, 'Event listener failed')
})

export default emitter
