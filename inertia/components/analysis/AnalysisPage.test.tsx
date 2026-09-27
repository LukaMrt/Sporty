import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import AnalysisIndex from '~/pages/Analysis/Index'
import type { AnalysisData } from '~/components/analysis/shared'

function emptyAnalysis(overrides: Partial<AnalysisData> = {}): AnalysisData {
  return {
    range: '6m',
    from: '2025-09-01',
    to: '2026-03-01',
    asOf: '2026-03-01',
    filters: { sport: null, compare: 'previous', comparison: null, sports: [] },
    coverage: {
      sessions: 0,
      totalSessions: 0,
      hasMaxHr: false,
      hasHeartRateSessions: false,
      hasGps: false,
      hasGoal: false,
      hasPlan: false,
    },
    hasHeartRate: false,
    hasWellness: false,
    insights: [],
    totals: {
      current: { sessions: 0, distanceBySport: {}, durationMinutes: 0, load: 0 },
      comparison: null,
    },
    highlights: { longest: null, biggestWeek: null, mostActiveMonth: null, newRecords: [] },
    regularity: {
      weeks: 26,
      activeWeeks: 0,
      currentStreak: 0,
      longestStreak: 0,
      byWeekday: [0, 0, 0, 0, 0, 0, 0],
      sessionsPerWeek: 0,
    },
    goal: null,
    fitness: {
      current: null,
      series: [],
      methods: { trimp_exp: 0, rtss: 0, stss: 0, rpe: 0 },
      monotony: [],
      acwr: [],
      ramp7: null,
      delta28: null,
      projection: [],
      loadBySport: [],
      adherence: [],
    },
    volume: { weekly: [], monthly: [], previousYearMonthly: [] },
    intensity: [],
    performance: {
      records: [],
      periodRecords: [],
      recentRecords: [],
      vdot: null,
      vdotHistory: [],
      predictions: [],
      profileVdot: null,
      watchVo2Max: null,
    },
    swimming: { hasSessions: false, paceTrend: [], records: [], recentRecords: [], css: null },
    efficiency: { trend: [], decoupling: [], referencePace: null, heartRateAtPace: [] },
    physiology: {
      observedMaxHr: null,
      observedMaxHrSessionId: null,
      estimatedLthr: null,
      lthrSessionId: null,
      currentMaxHr: null,
      currentLthr: null,
    },
    recovery: {
      trend: [],
      hrvLowStreak: 0,
      sleep: [],
      readiness: { level: 'unknown', score: null, components: [] },
      signals: [],
      weight: [],
      activity: [],
      loadVsHrv: [],
      sleepRegularity: { nights: 0, avgMinutes: null, bedtimeSd: null, avgBedtime: null },
      sleepSchedule: [],
      watchScores: [],
      latestScores: [],
      heartRateRecovery: [],
    },
    correlations: { sleepVsEfficiency: [], coefficient: null },
    recentSessions: [],
    calendar: [],
    claudeSummary: '## Bilan',
    ...overrides,
  }
}

const withData = () =>
  emptyAnalysis({
    hasWellness: true,
    insights: [
      {
        id: 'fitnessRising',
        section: 'load',
        tone: 'positive',
        priority: 55,
        params: { delta: 4 },
      },
      {
        id: 'tooGrey',
        section: 'intensity',
        tone: 'warning',
        priority: 70,
        params: { percent: 62 },
      },
    ],
    fitness: {
      ...emptyAnalysis().fitness,
      current: {
        chronicTrainingLoad: 42,
        acuteTrainingLoad: 50,
        trainingStressBalance: -8,
        acuteChronicWorkloadRatio: 1.19,
        calculatedAt: new Date(),
      },
      series: [{ date: '2026-03-01', tss: 60, ctl: 42, atl: 50, tsb: -8 }],
      methods: { trimp_exp: 10, rtss: 0, stss: 0, rpe: 2 },
    },
    performance: {
      records: [{ distance: 5000, seconds: 1250, sessionId: 3, date: '2026-02-20' }],
      periodRecords: [{ distance: 5000, seconds: 1250, sessionId: 3, date: '2026-02-20' }],
      recentRecords: [{ distance: 5000, seconds: 1250, sessionId: 3, date: '2026-02-20' }],
      vdot: 48.2,
      vdotHistory: [],
      predictions: [{ distance: 10000, vdotSeconds: 2600, riegelSeconds: 2605 }],
      profileVdot: 47,
      watchVo2Max: null,
    },
    recovery: {
      ...emptyAnalysis().recovery,
      readiness: {
        level: 'good',
        score: 0.4,
        components: [{ key: 'hrv', score: 0.5, value: 62, reference: 55 }],
      },
    },
  })

describe('Page Analyse', () => {
  // Le mode expert est mémorisé dans le navigateur
  beforeEach(() => localStorage.clear())

  it('ouvre sur « En bref » et guide vers les données manquantes', () => {
    render(<AnalysisIndex analysis={emptyAnalysis()} />)
    // Sans traductions chargées, useTranslation renvoie les clés
    expect(screen.getByText('analysis.overview.noInsights')).toBeTruthy()
    expect(screen.getByText('analysis.unlock.title')).toBeTruthy()
    expect(screen.getByText('analysis.unlock.items.maxHr.label')).toBeTruthy()
    expect(screen.getByText('## Bilan')).toBeTruthy()
  })

  it('affiche les constats triés en tête de l’onglet « En bref »', () => {
    render(<AnalysisIndex analysis={withData()} />)
    const items = screen.getAllByText(/analysis\.insights\./)
    expect(items.map((i) => i.textContent)).toEqual([
      'analysis.insights.fitnessRising',
      'analysis.insights.tooGrey',
    ])
  })

  it('rend forme, records, prédictions et forme du jour dans leurs onglets', () => {
    render(<AnalysisIndex analysis={withData()} />)

    fireEvent.click(screen.getByRole('tab', { name: 'analysis.nav.load' }))
    expect(screen.getByText('42')).toBeTruthy()
    // Verdict de la section en tête
    expect(screen.getByText('analysis.insights.fitnessRising')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'analysis.nav.performance' }))
    expect(screen.getAllByText('20:50').length).toBeGreaterThan(0)
    expect(screen.getByText('43:20')).toBeTruthy()
    // Nombres localisés (fr) : virgule décimale
    expect(screen.getByText('48,2')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'analysis.nav.recovery' }))
    expect(screen.getByText(/analysis\.recovery\.levels\.good/)).toBeTruthy()
  })

  it('affiche les scores de la montre quand ils existent', () => {
    const data = withData()
    data.recovery.latestScores = [
      { field: 'bodyBattery', value: 78, date: '2026-03-01' },
      { field: 'readinessScore', value: 64, date: '2026-03-01' },
    ]
    render(<AnalysisIndex analysis={data} />)
    fireEvent.click(screen.getByRole('tab', { name: 'analysis.nav.recovery' }))
    expect(screen.getByText('analysis.recovery.watchScores')).toBeTruthy()
    expect(screen.getByText('78')).toBeTruthy()
    expect(screen.getByText('64')).toBeTruthy()
  })

  it('états vides explicites dans les onglets sans données', () => {
    render(<AnalysisIndex analysis={emptyAnalysis()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'analysis.nav.recovery' }))
    expect(screen.getByText('analysis.empty.noWellness')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'analysis.nav.load' }))
    expect(screen.getAllByText('analysis.empty.noSessions').length).toBeGreaterThan(0)
  })

  it('n’affiche l’onglet natation qu’avec des séances de natation', () => {
    render(<AnalysisIndex analysis={emptyAnalysis()} />)
    expect(screen.queryByRole('tab', { name: 'analysis.nav.swimming' })).toBeNull()
  })

  it('le mode expert remplace les notions simples par leurs sigles', () => {
    render(<AnalysisIndex analysis={withData()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'analysis.nav.load' }))
    expect(screen.getAllByText('analysis.metric.ctl.simple').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('switch'))
    expect(screen.getAllByText('analysis.metric.ctl.expert').length).toBeGreaterThan(0)
  })
})
