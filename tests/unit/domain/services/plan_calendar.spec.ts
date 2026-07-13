import { test } from '@japa/runner'
import {
  WEEK_DAY_ORDER,
  chronologicalDayIndex,
  parseIsoDate,
  formatIsoDate,
  addDaysIso,
  addWeeksIso,
  daysBetween,
  plannedSessionDate,
  computeCurrentWeekNumber,
} from '#domain/services/plan_calendar'

test.group('PlanCalendar — ordre chronologique', () => {
  test('lundi (1) est le premier jour, dimanche (0) le dernier', ({ assert }) => {
    assert.equal(chronologicalDayIndex(1), 0)
    assert.equal(chronologicalDayIndex(6), 5)
    assert.equal(chronologicalDayIndex(0), 6)
  })

  test('WEEK_DAY_ORDER couvre les 7 jours dans l’ordre lundi → dimanche', ({ assert }) => {
    assert.deepEqual([...WEEK_DAY_ORDER], [1, 2, 3, 4, 5, 6, 0])
  })
})

test.group('PlanCalendar — dates', () => {
  test('parse et formate en local sans décalage de jour', ({ assert }) => {
    assert.equal(formatIsoDate(parseIsoDate('2026-07-13')), '2026-07-13')
    assert.equal(formatIsoDate(parseIsoDate('2026-01-01')), '2026-01-01')
    assert.equal(formatIsoDate(parseIsoDate('2026-12-31')), '2026-12-31')
  })

  test('addDaysIso et addWeeksIso', ({ assert }) => {
    assert.equal(addDaysIso('2026-07-13', 1), '2026-07-14')
    assert.equal(addDaysIso('2026-07-31', 1), '2026-08-01')
    assert.equal(addWeeksIso('2026-07-13', 2), '2026-07-27')
  })

  test('daysBetween', ({ assert }) => {
    assert.equal(daysBetween('2026-07-13', '2026-07-20'), 7)
    assert.equal(daysBetween('2026-07-20', '2026-07-13'), -7)
    assert.equal(daysBetween('2026-07-13', '2026-07-13'), 0)
  })
})

test.group('PlanCalendar — plannedSessionDate', () => {
  // 2026-06-01 est un lundi
  test('semaine 1 : lundi (1) = jour de départ, dimanche (0) = 6 jours plus tard', ({ assert }) => {
    assert.equal(formatIsoDate(plannedSessionDate('2026-06-01', 1, 1)), '2026-06-01')
    assert.equal(formatIsoDate(plannedSessionDate('2026-06-01', 1, 3)), '2026-06-03')
    assert.equal(formatIsoDate(plannedSessionDate('2026-06-01', 1, 0)), '2026-06-07')
  })

  test('semaine 3 : décalage de 14 jours', ({ assert }) => {
    assert.equal(formatIsoDate(plannedSessionDate('2026-06-01', 3, 1)), '2026-06-15')
    assert.equal(formatIsoDate(plannedSessionDate('2026-06-01', 3, 0)), '2026-06-21')
  })
})

test.group('PlanCalendar — computeCurrentWeekNumber', () => {
  test('borné entre 1 et totalWeeks', ({ assert }) => {
    const today = new Date()
    const start = formatIsoDate(today)
    assert.equal(computeCurrentWeekNumber(start, 12), 1)

    const threeWeeksAgo = addWeeksIso(start, -3)
    assert.equal(computeCurrentWeekNumber(threeWeeksAgo, 12), 4)

    const longAgo = addWeeksIso(start, -50)
    assert.equal(computeCurrentWeekNumber(longAgo, 12), 12)

    const future = addWeeksIso(start, 2)
    assert.equal(computeCurrentWeekNumber(future, 12), 1)
  })
})
