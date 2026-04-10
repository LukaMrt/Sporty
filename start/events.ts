import emitter from '@adonisjs/core/services/emitter'
import type { WeekSummary } from '#use_cases/planning/recalibrate_plan'

declare module '@adonisjs/core/types' {
  interface EventsList {
    'session:completed': { sessionId: number; userId: number }
    'week:completed': { userId: number; planId: number; weekSummary: WeekSummary }
    'plan:vdot_increased': { userId: number; planId: number; oldVdot: number; newVdot: number }
  }
}

emitter.on('session:completed', [
  () => import('#listeners/update_fitness_profile_listener'),
  'handle',
])

emitter.on('week:completed', [() => import('#listeners/recalibrate_plan_listener'), 'handle'])

export default emitter
