import { test } from '@japa/runner'
import {
  dayNameToDow,
  dowToDayName,
  extractJson,
  parsePlanDocument,
  planToDocument,
  sessionsWithOrder,
  timeToMinutes,
} from '#domain/services/plan_document'
import { buildPlanPrompt } from '#domain/services/plan_prompt'
import { SESSION_EXTRAS_DEFAULTS, type PlannedSession } from '#domain/entities/planned_session'
import {
  IntensityZone,
  PlanSource,
  PlanStatus,
  PlanType,
  PlannedSessionStatus,
  SessionType,
  TrainingMethodology,
} from '#domain/value_objects/planning_types'

const SPORTS = ['running', 'cycling', 'swimming', 'strength']

const VALID = {
  version: 1,
  mode: 'replace',
  plan: {
    name: 'Semi 1h45',
    start_date: '2026-10-05', // lundi
    goal: { distance_km: 21.1, target_time: '1:45:00', event_date: '2027-01-17' },
  },
  weeks: [
    {
      week: 1,
      phase: 'Base',
      sessions: [
        {
          day: 'tuesday',
          sport: 'running',
          type: 'interval',
          title: '6 × 1000 m',
          duration_minutes: 60,
          blocks: [
            { type: 'warmup', duration_minutes: 15 },
            {
              type: 'work',
              repeat: 6,
              distance_m: 1000,
              pace_per_km: '4:40',
              recovery_minutes: 2,
              recovery_type: 'jog',
            },
          ],
        },
        {
          day: 'tuesday',
          sport: 'strength',
          type: 'strength',
          duration_minutes: 30,
          rpe: 6,
          exercises: [{ name: 'Squat', sets: 3, reps: 10, load: '20 kg' }],
        },
        {
          day: 'SUNDAY',
          sport: 'cycling',
          type: 'long_run',
          duration_minutes: 120,
          power_watts: 180,
        },
      ],
    },
    { week: 2, sessions: [] },
  ],
}

test.group('Document de plan — validation', () => {
  test('document valide : normalisé, plusieurs séances le même jour, casse ignorée', ({
    assert,
  }) => {
    const result = parsePlanDocument(JSON.stringify(VALID), SPORTS)
    assert.isTrue(result.ok)
    if (!result.ok) return
    const week = result.document.weeks[0]
    assert.lengthOf(week.sessions, 3)
    assert.equal(week.sessions[2].day, 'sunday')
    assert.equal(week.sessions[1].exercises?.[0].reps, '10')
  })

  test('le JSON entouré d’un bloc Markdown ou d’une phrase est extrait', ({ assert }) => {
    const text = `Voici ton plan :\n\`\`\`json\n${JSON.stringify(VALID)}\n\`\`\`\nBon entraînement !`
    assert.isTrue(parsePlanDocument(text, SPORTS).ok)
    assert.equal(extractJson('bla {"a":1} bla'), '{"a":1}')
  })

  test('toutes les erreurs sont remontées, avec leur chemin', ({ assert }) => {
    type Loose = { plan: Record<string, unknown>; weeks: { sessions: Record<string, unknown>[] }[] }
    const broken = structuredClone(VALID) as unknown as Loose
    broken.plan.start_date = '2026-10-06' // mardi
    const [interval, strength, ride] = broken.weeks[0].sessions
    interval.type = 'fartlek'
    ;(interval.blocks as Record<string, unknown>[])[1].pace_per_km = '4m40'
    strength.sport = 'yoga'
    delete ride.duration_minutes
    const result = parsePlanDocument(JSON.stringify(broken), SPORTS)
    assert.isFalse(result.ok)
    if (result.ok) return
    const byPath = Object.fromEntries(result.errors.map((e) => [e.path, e.code]))
    assert.equal(byPath['plan.start_date'], 'not_monday')
    assert.equal(byPath['weeks[0].sessions[0].type'], 'invalid_value')
    assert.equal(byPath['weeks[0].sessions[0].blocks[1].pace_per_km'], 'invalid_pace')
    assert.equal(byPath['weeks[0].sessions[1].sport'], 'invalid_value')
    assert.equal(byPath['weeks[0].sessions[2].duration_minutes'], 'required')
    // Les valeurs possibles accompagnent l'erreur (à renvoyer telles quelles à Claude)
    const sportError = result.errors.find((e) => e.path === 'weeks[0].sessions[1].sport')!
    assert.include(sportError.expected!, 'strength')
  })

  test('JSON illisible, semaines non consécutives, doublons', ({ assert }) => {
    assert.deepEqual(parsePlanDocument('{ oops', SPORTS), {
      ok: false,
      errors: [{ path: '$', code: 'invalid_json' }],
    })
    const gaps = {
      ...VALID,
      weeks: [
        { week: 1, sessions: [] },
        { week: 3, sessions: [] },
      ],
    }
    const r1 = parsePlanDocument(JSON.stringify(gaps), SPORTS)
    assert.isFalse(r1.ok)
    const dup = {
      ...VALID,
      weeks: [
        { week: 1, sessions: [] },
        { week: 1, sessions: [] },
      ],
    }
    const r2 = parsePlanDocument(JSON.stringify(dup), SPORTS)
    assert.isTrue(!r2.ok && r2.errors.some((e) => e.code === 'duplicate_week'))
  })

  test('mode merge : pas de date de début requise, semaines libres, delete_weeks', ({ assert }) => {
    const merge = {
      version: 1,
      mode: 'merge',
      plan: {},
      weeks: [{ week: 5, sessions: [] }],
      delete_weeks: [7],
    }
    const result = parsePlanDocument(JSON.stringify(merge), SPORTS)
    assert.isTrue(result.ok)
    if (result.ok) assert.deepEqual(result.document.delete_weeks, [7])
  })
})

test.group('Document de plan — conversions', () => {
  test('jours et temps', ({ assert }) => {
    assert.equal(dayNameToDow('monday'), 1)
    assert.equal(dayNameToDow('sunday'), 0)
    assert.equal(dowToDayName(0), 'sunday')
    assert.equal(timeToMinutes('1:45:00'), 105)
    assert.equal(timeToMinutes('45:30'), 45.5)
  })

  test('séances : ordre dans la journée, zone par défaut, charge estimée', ({ assert }) => {
    const result = parsePlanDocument(JSON.stringify(VALID), SPORTS)
    if (!result.ok) return assert.fail('document invalide')
    const [interval, strength, ride] = sessionsWithOrder(result.document.weeks[0])
    assert.equal(interval.orderInDay, 0)
    assert.equal(strength.orderInDay, 1)
    assert.equal(interval.intensityZone, IntensityZone.Z4)
    assert.equal(interval.intervals?.[1].repetitions, 6)
    assert.equal(strength.exercises?.[0].name, 'Squat')
    assert.equal(ride.targetPowerWatts, 180)
    assert.isAbove(interval.targetLoadTss!, 0)
  })

  test('aller-retour : plan → document → validation', ({ assert }) => {
    const session = (overrides: Partial<PlannedSession>): PlannedSession => ({
      ...SESSION_EXTRAS_DEFAULTS,
      id: 1,
      planId: 1,
      weekNumber: 1,
      dayOfWeek: 2,
      sessionType: SessionType.Easy,
      targetDurationMinutes: 45,
      targetDistanceKm: null,
      targetPacePerKm: '5:30',
      intensityZone: IntensityZone.Z2,
      intervals: null,
      targetLoadTss: 30,
      completedSessionId: null,
      status: PlannedSessionStatus.Pending,
      createdAt: '',
      updatedAt: '',
      ...overrides,
    })
    const document = planToDocument({
      plan: {
        id: 1,
        userId: 1,
        goalId: null,
        methodology: TrainingMethodology.Custom,
        level: PlanType.Custom,
        status: PlanStatus.Active,
        autoRecalibrate: false,
        vdotAtCreation: 45,
        currentVdot: 45,
        sessionsPerWeek: 2,
        preferredDays: [2],
        startDate: '2026-10-05',
        endDate: '2026-10-12',
        lastRecalibratedAt: null,
        pendingVdotDown: null,
        source: PlanSource.Imported,
        name: 'Mon plan',
        notes: null,
        createdAt: '',
        updatedAt: '',
      },
      goal: null,
      weeks: [
        {
          id: 1,
          planId: 1,
          weekNumber: 1,
          phaseName: 'custom',
          phaseLabel: 'Base',
          isRecoveryWeek: false,
          targetVolumeMinutes: 90,
          notes: 'Reprise',
          createdAt: '',
          updatedAt: '',
        },
      ],
      sessions: [
        session({}),
        session({
          id: 2,
          dayOfWeek: 0,
          sportSlug: 'swimming',
          targetPacePer100m: '1:55',
          status: PlannedSessionStatus.Completed,
        }),
      ],
    })
    assert.equal(document.weeks[0].sessions[1].day, 'sunday')
    assert.isTrue(document.weeks[0].sessions[1].done)
    const reparsed = parsePlanDocument(JSON.stringify(document), SPORTS)
    assert.isTrue(reparsed.ok)
  })
})

test.group('Prompt Claude', () => {
  const base = {
    today: '2026-10-01',
    sports: [
      { slug: 'running', name: 'Course à pied' },
      { slug: 'strength', name: 'Renforcement' },
    ],
    athlete: {
      sex: null,
      maxHeartRate: 190,
      restingHeartRate: 50,
      lthr: null,
      hrZones: [100, 120, 140, 160, 175, 190] as [number, number, number, number, number, number],
      vdot: 45,
      paceZones: null,
      cssPacePer100m: 1.9,
      level: null,
    },
    fitness: { ctl: 42, atl: 50, tsb: -8 },
    recentVolume: [{ sport: 'Course à pied', minutesPerWeek: 180, sessionsPerWeek: 3.5 }],
    goal: null,
    currentPlan: null,
    currentWeekNumber: null,
  }

  test('création : format complet, énumérations, profil et contexte', ({ assert }) => {
    const prompt = buildPlanPrompt({ ...base, mode: 'create' })
    for (const expected of [
      '`strength` (Renforcement)',
      '`long_run`',
      '`pace_per_100m`',
      '`exercises`',
      '`blocks`',
      'lundi',
      'Z1 100-120',
      'FC max : 190 bpm',
      'CSS (allure seuil) : 1:54/100 m',
      'CTL 42',
      '180 min/semaine',
      '```json',
    ]) {
      assert.include(prompt, expected)
    }
  })

  test('révision : plan actuel inclus, règles de fusion', ({ assert }) => {
    const prompt = buildPlanPrompt({
      ...base,
      mode: 'revise',
      currentWeekNumber: 3,
      currentPlan: { version: 1, mode: 'replace', plan: { name: 'Mon plan actuel' }, weeks: [] },
    })
    assert.include(prompt, 'Mon plan actuel')
    assert.include(prompt, 'semaine 3')
    assert.include(prompt, '"mode": "merge"')
  })
})
