import React from 'react'
import { Head, Link, router } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'
import type { AnalysisData } from '~/components/analysis/shared'
import FitnessSection from '~/components/analysis/FitnessSection'
import VolumeSection from '~/components/analysis/VolumeSection'
import IntensitySection from '~/components/analysis/IntensitySection'
import PerformanceSection from '~/components/analysis/PerformanceSection'
import EfficiencySection from '~/components/analysis/EfficiencySection'
import SwimmingSection from '~/components/analysis/SwimmingSection'
import RecoverySection from '~/components/analysis/RecoverySection'
import LoadCalendar from '~/components/analysis/LoadCalendar'
import ReportSection from '~/components/analysis/ReportSection'

const RANGES = ['3m', '6m', '12m', 'all'] as const
const SECTIONS = [
  'fitness',
  'volume',
  'intensity',
  'performance',
  'efficiency',
  'swimming',
  'recovery',
  'calendar',
  'report',
]

export default function AnalysisIndex({ analysis }: { analysis: AnalysisData }) {
  const { t } = useTranslation()

  return (
    <>
      <Head title={t('analysis.title')} />
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{t('analysis.title')}</h1>
            <nav className="mt-1 flex flex-wrap gap-3 text-sm" aria-label={t('analysis.more')}>
              <Link href="/analysis/report" className="text-primary hover:underline">
                {t('analysis.links.report')}
              </Link>
              <Link href="/analysis/map" className="text-primary hover:underline">
                {t('analysis.links.map')}
              </Link>
              <Link href="/plan" className="text-primary hover:underline">
                {t('analysis.links.plan')}
              </Link>
              <Link href="/help/metrics" className="text-primary hover:underline">
                {t('analysis.links.help')}
              </Link>
            </nav>
          </div>
          <div
            role="group"
            aria-label={t('analysis.range')}
            className="flex gap-1 rounded-lg bg-muted p-1"
          >
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                aria-pressed={analysis.range === range}
                onClick={() => router.get('/analysis', { range }, { preserveScroll: true })}
                className={`rounded-md px-3 py-1 text-sm ${analysis.range === range ? 'bg-background shadow-sm' : ''}`}
              >
                {t(`analysis.ranges.${range}`)}
              </button>
            ))}
          </div>
        </header>

        <nav
          aria-label={t('analysis.sections')}
          className="sticky top-0 z-10 -mx-4 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur"
        >
          <ul className="flex gap-3 text-sm whitespace-nowrap">
            {SECTIONS.map((id) => (
              <li key={id}>
                <a href={`#${id}`} className="text-muted-foreground hover:text-foreground">
                  {t(`analysis.nav.${id}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <FitnessSection fitness={analysis.fitness} />
        <VolumeSection volume={analysis.volume} />
        <IntensitySection intensity={analysis.intensity} hasHeartRate={analysis.hasHeartRate} />
        <PerformanceSection performance={analysis.performance} physiology={analysis.physiology} />
        <EfficiencySection efficiency={analysis.efficiency} range={analysis.range} />
        <SwimmingSection swimming={analysis.swimming} />
        <RecoverySection
          recovery={analysis.recovery}
          correlations={analysis.correlations}
          hasWellness={analysis.hasWellness}
        />
        <LoadCalendar calendar={analysis.calendar} />
        <ReportSection summary={analysis.claudeSummary} />
      </div>
    </>
  )
}

AnalysisIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
