import { test } from '@japa/runner'
import RecalibratePlanListener from '#listeners/recalibrate_plan_listener'
import type RecalibratePlan from '#use_cases/planning/recalibrate_plan'
import type { WeekSummary } from '#domain/value_objects/week_summary'

const WEEK_SUMMARY: WeekSummary = {
  weekNumber: 2,
  plannedLoadTss: 300,
  actualLoadTss: 250,
  qualitySessions: [],
}

test.group('RecalibratePlanListener', () => {
  test('délègue au use case RecalibratePlan avec userId et bilan', async ({ assert }) => {
    const calls: { userId: number; summary: WeekSummary }[] = []
    const useCase = {
      execute: async (userId: number, summary: WeekSummary) => {
        calls.push({ userId, summary })
      },
    } as unknown as RecalibratePlan

    await new RecalibratePlanListener(useCase).handle({
      userId: 1,
      planId: 1,
      weekSummary: WEEK_SUMMARY,
    })

    assert.deepEqual(calls, [{ userId: 1, summary: WEEK_SUMMARY }])
  })
})
