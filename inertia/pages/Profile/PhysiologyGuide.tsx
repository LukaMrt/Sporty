import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { ArrowLeft, AlertTriangle, Info } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'
import { Button } from '~/components/ui/button'
import { SourceBadge } from '~/components/shared/SourceBadge'

interface Props {
  currentMaxHeartRate: number | null
  currentVma: number | null
}

type SaveState = 'idle' | 'saving' | 'saved'

export default function PhysiologyGuide({ currentMaxHeartRate, currentVma }: Props) {
  const { t } = useTranslation()

  // Calculator states
  const [age, setAge] = useState('')
  const [halfCooperDist, setHalfCooperDist] = useState('')
  const [cooperDist, setCooperDist] = useState('')

  // Save button states
  const [hrSave, setHrSave] = useState<SaveState>('idle')
  const [halfCooperSave, setHalfCooperSave] = useState<SaveState>('idle')
  const [cooperSave, setCooperSave] = useState<SaveState>('idle')

  const tanakaResult = age !== '' && Number(age) > 0 ? Math.round(208 - 0.7 * Number(age)) : null
  const halfCooperResult =
    halfCooperDist !== '' && Number(halfCooperDist) > 0
      ? Math.round(Number(halfCooperDist) * 10 * 10) / 10
      : null
  const cooperResult =
    cooperDist !== '' && Number(cooperDist) > 0
      ? Math.round((Number(cooperDist) / 200) * 10) / 10
      : null

  function triggerSave(setter: (s: SaveState) => void, action: () => void) {
    setter('saving')
    action()
    setTimeout(() => setter('saved'), 800)
    setTimeout(() => setter('idle'), 3000)
  }

  function saveHr(value: number) {
    router.put('/profile', { max_heart_rate: value }, { preserveScroll: true })
  }

  function saveMas(value: number) {
    router.put('/profile', { vma: value }, { preserveScroll: true })
  }

  return (
    <>
      <Head title={t('profile.physiologyGuide.pageTitle')} />
      <div className="flex flex-col items-center p-6 pt-16 pb-16">
        <div className="w-full max-w-2xl space-y-6">
          {/* En-tête */}
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('profile.physiologyGuide.backToProfile')}
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-bold">{t('profile.physiologyGuide.title')}</h1>
            <p className="mt-2 text-muted-foreground">{t('profile.physiologyGuide.subtitle')}</p>
          </div>

          {/* Section FC max */}
          <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <details open>
              <summary className="flex cursor-pointer items-center justify-between p-5 font-semibold text-base select-none hover:bg-muted/40 transition-colors">
                <span>{t('profile.physiologyGuide.hrMax.sectionTitle')}</span>
                <span className="text-muted-foreground text-xs font-normal">
                  {t('profile.physiologyGuide.collapse')}
                </span>
              </summary>

              <div className="px-5 pb-5 space-y-4">
                {/* Formule Tanaka */}
                <div>
                  <h3 className="font-medium mb-2">
                    {t('profile.physiologyGuide.hrMax.tanakaTitle')}
                  </h3>
                  <div className="rounded-lg bg-muted px-4 py-3 font-mono text-sm text-center">
                    {t('profile.physiologyGuide.hrMax.tanakaFormula')}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('profile.physiologyGuide.hrMax.tanakaDescription')}
                  </p>
                  <div className="mt-3 flex gap-2 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950 p-3 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <p className="text-yellow-800 dark:text-yellow-300">
                      {t('profile.physiologyGuide.hrMax.tanakaWarning')}
                    </p>
                  </div>

                  {/* Calculateur Tanaka */}
                  <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium w-28 shrink-0">
                        {t('profile.physiologyGuide.calc.yourAge')}
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={100}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder={t('profile.physiologyGuide.calc.agePlaceholder')}
                        className="w-28 rounded-md border bg-background px-3 py-1.5 text-sm"
                      />
                      {tanakaResult !== null && (
                        <span className="text-sm font-semibold text-primary">
                          → {tanakaResult} bpm
                        </span>
                      )}
                    </div>
                    {tanakaResult !== null && (
                      <div className="flex items-center gap-4">
                        <Button
                          size="sm"
                          disabled={hrSave !== 'idle'}
                          onClick={() => triggerSave(setHrSave, () => saveHr(tanakaResult))}
                        >
                          {hrSave === 'saving'
                            ? t('profile.physiologyGuide.calc.saving')
                            : hrSave === 'saved'
                              ? t('profile.physiologyGuide.calc.saved')
                              : t('profile.physiologyGuide.calc.saveHr')}
                        </Button>
                        {currentMaxHeartRate !== null && (
                          <span className="text-xs text-muted-foreground">
                            {t('profile.physiologyGuide.calc.currentHr', {
                              value: currentMaxHeartRate,
                            })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Test terrain */}
                <div>
                  <h3 className="font-medium mb-2">
                    {t('profile.physiologyGuide.hrMax.fieldTestTitle')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('profile.physiologyGuide.hrMax.fieldTestIntro')}
                  </p>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        1
                      </span>
                      <span>
                        <strong>{t('profile.physiologyGuide.hrMax.step1Bold')}</strong>
                        {t('profile.physiologyGuide.hrMax.step1Rest')}
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        2
                      </span>
                      <span>
                        <strong>{t('profile.physiologyGuide.hrMax.step2Bold')}</strong>
                        {t('profile.physiologyGuide.hrMax.step2Rest')}
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        3
                      </span>
                      <span>
                        <strong>{t('profile.physiologyGuide.hrMax.step3Bold')}</strong>
                        {t('profile.physiologyGuide.hrMax.step3Rest')}
                      </span>
                    </li>
                  </ol>
                  <div className="mt-3 flex gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-3 text-sm">
                    <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <p className="text-blue-800 dark:text-blue-300">
                      {t('profile.physiologyGuide.hrMax.fieldTestInfo')}
                    </p>
                  </div>
                </div>
              </div>
            </details>
          </section>

          {/* Section VMA */}
          <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <details open>
              <summary className="flex cursor-pointer items-center justify-between p-5 font-semibold text-base select-none hover:bg-muted/40 transition-colors">
                <span>{t('profile.physiologyGuide.mas.sectionTitle')}</span>
                <span className="text-muted-foreground text-xs font-normal">
                  {t('profile.physiologyGuide.collapse')}
                </span>
              </summary>

              <div className="px-5 pb-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('profile.physiologyGuide.mas.description')}
                </p>

                {/* Test demi-Cooper */}
                <div>
                  <h3 className="font-medium mb-2">
                    {t('profile.physiologyGuide.mas.halfCooperTitle')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('profile.physiologyGuide.mas.halfCooperIntro')}
                  </p>
                  <div className="rounded-lg bg-muted px-4 py-3 font-mono text-sm text-center">
                    {t('profile.physiologyGuide.mas.halfCooperFormula')}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('profile.physiologyGuide.mas.halfCooperExample')}
                  </p>

                  {/* Calculateur demi-Cooper */}
                  <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium w-28 shrink-0">
                        {t('profile.physiologyGuide.calc.distanceKm')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={halfCooperDist}
                        onChange={(e) => setHalfCooperDist(e.target.value)}
                        placeholder={t('profile.physiologyGuide.calc.distanceKmPlaceholder')}
                        className="w-28 rounded-md border bg-background px-3 py-1.5 text-sm"
                      />
                      {halfCooperResult !== null && (
                        <span className="text-sm font-semibold text-primary">
                          → {halfCooperResult} km/h
                        </span>
                      )}
                    </div>
                    {halfCooperResult !== null && (
                      <div className="flex items-center gap-4">
                        <Button
                          size="sm"
                          disabled={halfCooperSave !== 'idle'}
                          onClick={() =>
                            triggerSave(setHalfCooperSave, () => saveMas(halfCooperResult))
                          }
                        >
                          {halfCooperSave === 'saving'
                            ? t('profile.physiologyGuide.calc.saving')
                            : halfCooperSave === 'saved'
                              ? t('profile.physiologyGuide.calc.saved')
                              : t('profile.physiologyGuide.calc.saveMas')}
                        </Button>
                        {currentVma !== null && (
                          <span className="text-xs text-muted-foreground">
                            {t('profile.physiologyGuide.calc.currentMas', { value: currentVma })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Test Cooper */}
                <div>
                  <h3 className="font-medium mb-2">
                    {t('profile.physiologyGuide.mas.cooperTitle')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('profile.physiologyGuide.mas.cooperIntro')}
                  </p>
                  <div className="rounded-lg bg-muted px-4 py-3 font-mono text-sm text-center">
                    {t('profile.physiologyGuide.mas.cooperFormula')}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('profile.physiologyGuide.mas.cooperExample')}
                  </p>

                  {/* Calculateur Cooper */}
                  <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium w-28 shrink-0">
                        {t('profile.physiologyGuide.calc.distanceM')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={10}
                        value={cooperDist}
                        onChange={(e) => setCooperDist(e.target.value)}
                        placeholder={t('profile.physiologyGuide.calc.distanceMPlaceholder')}
                        className="w-28 rounded-md border bg-background px-3 py-1.5 text-sm"
                      />
                      {cooperResult !== null && (
                        <span className="text-sm font-semibold text-primary">
                          → {cooperResult} km/h
                        </span>
                      )}
                    </div>
                    {cooperResult !== null && (
                      <div className="flex items-center gap-4">
                        <Button
                          size="sm"
                          disabled={cooperSave !== 'idle'}
                          onClick={() => triggerSave(setCooperSave, () => saveMas(cooperResult))}
                        >
                          {cooperSave === 'saving'
                            ? t('profile.physiologyGuide.calc.saving')
                            : cooperSave === 'saved'
                              ? t('profile.physiologyGuide.calc.saved')
                              : t('profile.physiologyGuide.calc.saveMas')}
                        </Button>
                        {currentVma !== null && (
                          <span className="text-xs text-muted-foreground">
                            {t('profile.physiologyGuide.calc.currentMas', { value: currentVma })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* VAMEVAL */}
                <div>
                  <h3 className="font-medium mb-2">
                    {t('profile.physiologyGuide.mas.vamevalTitle')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.physiologyGuide.mas.vamevalDescription')}
                  </p>
                </div>
              </div>
            </details>
          </section>

          {/* Sources */}
          <section className="rounded-xl border bg-muted/50 p-5 text-sm space-y-4">
            <h2 className="font-semibold text-sm">{t('profile.physiologyGuide.sources.title')}</h2>

            {/* Français */}
            <div>
              <h3 className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Français
              </h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>
                  <SourceBadge
                    type="synthesis"
                    label={t('profile.physiologyGuide.sources.synthesis')}
                  />
                  <a
                    href="https://fr.wikipedia.org/wiki/Vitesse_maximale_a%C3%A9robie"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Vitesse maximale aérobie — Wikipédia
                  </a>
                </li>
                <li>
                  <SourceBadge
                    type="protocol"
                    label={t('profile.physiologyGuide.sources.protocol')}
                  />
                  <a
                    href="https://www.irbms.com/test-navette-de-luc-leger/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Test navette de Luc Léger — IRBMS
                  </a>
                </li>
                <li>
                  <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
                  <a
                    href="https://www.sciencedirect.com/science/article/pii/0765159796812883"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Validation des tests VMA — Melin et al., 1996
                  </a>
                </li>
                <li>
                  <SourceBadge
                    type="synthesis"
                    label={t('profile.physiologyGuide.sources.synthesis')}
                  />
                  <a
                    href="https://fr.wikipedia.org/wiki/Test_de_Cooper"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Test de Cooper — Wikipédia
                  </a>
                </li>
                <li>
                  <SourceBadge type="guide" label={t('profile.physiologyGuide.sources.guide')} />
                  <a
                    href="https://www.materiel-velo.com/infos/fr/calculer-frequence-cardiaque-fcmax/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Calculer sa FC max (Tanaka, Gellish) — materiel-velo.com
                  </a>
                </li>
                <li>
                  <SourceBadge type="guide" label={t('profile.physiologyGuide.sources.guide')} />
                  <a
                    href="https://conseilsport.decathlon.fr/comment-calculer-sa-frequence-cardiaque-maximale-fcm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Comment calculer sa FCmax — Decathlon
                  </a>
                </li>
              </ul>
            </div>

            {/* Anglais */}
            <div>
              <h3 className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-2">
                English
              </h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>
                  <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
                  Tanaka H, Monahan KD, Seals DR.{' '}
                  <em>Age-predicted maximal heart rate revisited.</em> JACC, 2001.
                </li>
                <li>
                  <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
                  <a
                    href="https://digitalcommons.wku.edu/ijes/vol13/iss7/6/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Age-predicted HRmax equations — IJES
                  </a>
                </li>
                <li>
                  <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
                  <a
                    href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5862813/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    HRmax in marathon runners — PMC, 2018
                  </a>
                </li>
                <li>
                  <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
                  <a
                    href="https://pubmed.ncbi.nlm.nih.gov/33042384/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Accuracy of age-predicted HRmax equations — PubMed, 2020
                  </a>
                </li>
                <li>
                  <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
                  <a
                    href="https://pubmed.ncbi.nlm.nih.gov/9088842/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    5-min maximal test for VMA — PubMed, 1997
                  </a>
                </li>
                <li>
                  <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
                  <a
                    href="https://pubmed.ncbi.nlm.nih.gov/34319445/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Vmax protocols review — PubMed, 2021
                  </a>
                </li>
                <li>
                  <SourceBadge type="guide" label={t('profile.physiologyGuide.sources.guide')} />
                  <a
                    href="https://www.scienceforsport.com/maximal-aerobic-speed-mas/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Maximal Aerobic Speed (MAS) — Science for Sport
                  </a>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

PhysiologyGuide.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
