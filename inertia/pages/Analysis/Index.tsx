import React, { useEffect, useMemo, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'
import { useTechMode } from '~/hooks/use_tech_mode'
import { ExpertContext, type AnalysisData, type Insight } from '~/components/analysis/shared'
import FilterBar, { currentParams } from '~/components/analysis/FilterBar'
import OverviewTab from '~/components/analysis/OverviewTab'
import LoadTab from '~/components/analysis/LoadTab'
import VolumeTab from '~/components/analysis/VolumeSection'
import IntensitySection from '~/components/analysis/IntensitySection'
import PerformanceSection from '~/components/analysis/PerformanceSection'
import EfficiencySection, { reloadWithPace } from '~/components/analysis/EfficiencySection'
import SwimmingSection from '~/components/analysis/SwimmingSection'
import RecoverySection from '~/components/analysis/RecoverySection'

const TABS = [
  'overview',
  'load',
  'volume',
  'intensity',
  'performance',
  'efficiency',
  'recovery',
  'swimming',
] as const
type Tab = (typeof TABS)[number]

/** Constat principal de chaque section (les constats arrivent triés par importance) */
function topInsightBySection(insights: Insight[]): Partial<Record<Insight['section'], Insight>> {
  const out: Partial<Record<Insight['section'], Insight>> = {}
  for (const insight of insights) out[insight.section] ??= insight
  return out
}

function tabFromUrl(): Tab {
  if (typeof window === 'undefined') return 'overview'
  const tab = new URLSearchParams(window.location.search).get('tab')
  return (TABS as readonly string[]).includes(tab ?? '') ? (tab as Tab) : 'overview'
}

/**
 * Page Analyse : « comprendre » (l'accueil, lui, dit « comment je vais aujourd'hui »).
 * Un onglet « En bref » qui répond à « et alors ? », puis un onglet par question.
 * Changer d'onglet ne recharge rien : toutes les données sont déjà là.
 */
export default function AnalysisIndex({ analysis }: { analysis: AnalysisData }) {
  const { t } = useTranslation()
  const { techMode, toggleTechMode } = useTechMode()
  const [tab, setTab] = useState<Tab>(tabFromUrl)

  const verdicts = useMemo(() => topInsightBySection(analysis.insights), [analysis.insights])
  const showSwimming = analysis.swimming.hasSessions || analysis.filters.sport === 'swimming'
  const tabs = TABS.filter((id) => id !== 'swimming' || showSwimming)
  const activeTab: Tab = tabs.includes(tab) ? tab : 'overview'

  // L'onglet vit dans l'URL (partage, rechargement) sans visite Inertia
  useEffect(() => {
    const url = new URL(window.location.href)
    if (activeTab === 'overview') url.searchParams.delete('tab')
    else url.searchParams.set('tab', activeTab)
    window.history.replaceState(window.history.state, '', url)
  }, [activeTab])

  const params = currentParams(analysis, activeTab)
  const recoveryInsights = analysis.insights.filter((i) => i.section === 'recovery')

  return (
    <ExpertContext.Provider value={techMode}>
      <Head title={t('analysis.title')} />
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="text-xl font-semibold">{t('analysis.title')}</h1>
            <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm" aria-label={t('analysis.more')}>
              <Link href="/analysis/report" className="text-primary hover:underline">
                {t('analysis.links.report')}
              </Link>
              <Link href="/analysis/map" className="text-primary hover:underline">
                {t('analysis.links.map')}
              </Link>
              <Link href="/plan" className="text-primary hover:underline">
                {t('analysis.links.plan')}
              </Link>
              <Link
                href="/help/metrics"
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                {t('analysis.links.help')}
              </Link>
            </nav>
          </div>
          <FilterBar
            analysis={analysis}
            tab={activeTab}
            expert={techMode}
            onToggleExpert={toggleTechMode}
          />
        </header>

        <nav
          aria-label={t('analysis.sections')}
          className="sticky top-0 z-10 -mx-4 overflow-x-auto border-b bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6"
        >
          <ul role="tablist" className="flex gap-1 text-sm whitespace-nowrap">
            {tabs.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={activeTab === id}
                  aria-controls="analysis-panel"
                  onClick={() => setTab(id)}
                  className={`-mb-px border-b-2 px-3 py-2 transition ${
                    activeTab === id
                      ? 'border-primary font-medium text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(`analysis.nav.${id}`)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div id="analysis-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'overview' && <OverviewTab analysis={analysis} />}
          {activeTab === 'load' && <LoadTab analysis={analysis} verdicts={verdicts} />}
          {activeTab === 'volume' && <VolumeTab analysis={analysis} verdict={verdicts.volume} />}
          {activeTab === 'intensity' && (
            <IntensitySection
              intensity={analysis.intensity}
              hasHeartRate={analysis.hasHeartRate}
              verdict={verdicts.intensity}
            />
          )}
          {activeTab === 'performance' && (
            <PerformanceSection
              performance={analysis.performance}
              physiology={analysis.physiology}
              verdict={verdicts.performance}
            />
          )}
          {activeTab === 'efficiency' && (
            <EfficiencySection
              efficiency={analysis.efficiency}
              verdict={verdicts.efficiency}
              onPaceChange={(pace) => reloadWithPace({ ...params }, pace)}
            />
          )}
          {activeTab === 'recovery' && (
            <RecoverySection
              recovery={analysis.recovery}
              correlations={analysis.correlations}
              hasWellness={analysis.hasWellness}
              insights={recoveryInsights}
            />
          )}
          {activeTab === 'swimming' && (
            <SwimmingSection swimming={analysis.swimming} verdict={verdicts.swimming} />
          )}
        </div>
      </div>
    </ExpertContext.Provider>
  )
}

AnalysisIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
