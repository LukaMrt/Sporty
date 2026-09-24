import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnalysisIndex from '~/pages/Analysis/Index'
import type { AnalysisData } from '~/components/analysis/shared'

function emptyAnalysis(overrides: Partial<AnalysisData> = {}): AnalysisData {
  return {
    range: '6m',
    asOf: '2026-03-01',
    hasHeartRate: false,
    hasWellness: false,
    fitness: {
      current: null,
      series: [],
      methods: { trimp_exp: 0, rtss: 0, rpe: 0 },
      monotony: [],
    },
    volume: { weekly: [], monthly: [], previousYearMonthly: [] },
    intensity: [],
    performance: {
      records: [],
      recentRecords: [],
      vdot: null,
      vdotHistory: [],
      predictions: [],
      profileVdot: null,
      watchVo2Max: null,
    },
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
    },
    correlations: { sleepVsEfficiency: [], coefficient: null },
    calendar: [],
    claudeSummary: '## Bilan',
    ...overrides,
  }
}

describe('Page Analyse', () => {
  it('affiche des états vides explicites sans données', () => {
    render(<AnalysisIndex analysis={emptyAnalysis()} />)
    // Sans traductions chargées, useTranslation renvoie les clés
    expect(screen.getAllByText('analysis.empty.noSessions').length).toBeGreaterThan(0)
    expect(screen.getByText('analysis.empty.noWellness')).toBeTruthy()
    expect(screen.getByText('## Bilan')).toBeTruthy()
  })

  it('rend forme, records, prédictions et forme du jour avec des données', () => {
    render(
      <AnalysisIndex
        analysis={emptyAnalysis({
          hasWellness: true,
          fitness: {
            current: {
              chronicTrainingLoad: 42,
              acuteTrainingLoad: 50,
              trainingStressBalance: -8,
              acuteChronicWorkloadRatio: 1.19,
              calculatedAt: new Date(),
            },
            series: [{ date: '2026-03-01', tss: 60, ctl: 42, atl: 50, tsb: -8 }],
            methods: { trimp_exp: 10, rtss: 0, rpe: 2 },
            monotony: [],
          },
          performance: {
            records: [{ distance: 5000, seconds: 1250, sessionId: 3, date: '2026-02-20' }],
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
        })}
      />
    )
    expect(screen.getByText('42')).toBeTruthy()
    expect(screen.getAllByText('20:50').length).toBeGreaterThan(0)
    expect(screen.getByText('43:20')).toBeTruthy()
    expect(screen.getByText('48.2')).toBeTruthy()
    expect(screen.getByText(/analysis\.recovery\.levels\.good/)).toBeTruthy()
  })
})
